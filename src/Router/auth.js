import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/userModel.js';
import 'dotenv/config';
import crypto from "crypto";
import sendEmail from "../sendEmail.js";
import authenticateUser from '../Middleware/authenticateUser.js';
const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, profilePicture } = req.body;
        const findUser = await userModel.findOne({ email: email });
        if (findUser) {
            // console.log(findUser)
            return res.status(400).json({ message: 'User elrady exist' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة
        const newUser = new userModel({
            firstName, lastName, email,
            profilePicture,
            password: hashedPassword,
            verificationToken: verificationToken,
            verificationTokenExpiresAt: verificationTokenExpiresAt,
        });
        await newUser.save();
        // إرسال بريد التحقق
        const verificationLink = `${process.env.FRONT_LINK}/verify-email?token=${verificationToken}`;
        await sendEmail({
            to: email,
            subject: "Verify Your Email",
            text: `Please click the following link to verify your email: ${verificationLink}`,
        });
        res.status(200).json({
            message: 'User created successfully',
            data: newUser
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email }).populate('friends', '_id firstName lastName profilePicture email');
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'password wrong' });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.status(200).json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// مسار التحقق من البريد
router.get("/verify-email", async (req, res) => {
    const { token } = req.query; // احصل على التوكن من رابط الطلب
    try {
        const user = await userModel.findOne({
            verificationToken: token,
            verificationTokenExpiresAt: { $gt: Date.now() }, // تحقق من صلاحية الرمز
        });

        if (!user) {
            return res.status(400).json({ message: `Invalid or expired token` });
        }

        user.isVerified = true; // حدد المستخدم كمُحقق
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        return res.status(200).json({ message: "Email verified successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error verifying email" });
    }
});
router.post("/request-password-reset", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // إنشاء رمز إعادة التعيين
        const resetToken = crypto.randomBytes(32).toString("hex");
        // console.log(resetToken)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // صالح لمدة ساعة واحدة
        await user.save();
        // إرسال البريد الإلكتروني
        const resetLink = `${process.env.FRONT_LINK}/reset-password?token=${resetToken}`;
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            to: email,
            subject: "Reset Your Password",
            html: `<p>Click the link below to reset your password:</p>
                    <a href="${resetLink}">${resetLink}</a>`,
        });

        res.status(200).json({ message: "Password reset link sent to email", data: resetToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending reset email" });
    }
});
router.post("/reset-password", async (req, res) => {
    const { token } = req.query;
    const { newPassword } = req.body;
    try {
        const user = await userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // التحقق من أن التوكن صالح
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token", data: token });
        }
        // تحديث كلمة المرور
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error resetting password" });
    }
});
router.get('/all-users', async (req, res) => {
    // try {
    //     const users = await userModel.find();
    //     res.status(200).send({ message: 'product fitch succesfuly', data: users })
    // } catch (err) {
    //     console.log(err)
    // }
    const { userId } = req.query; // جلب معرف المستخدم من الـ Query Parameters

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // جلب جميع المستخدمين باستثناء المستخدم الحالي
        const users = await userModel.find({ _id: { $ne: userId } }).select('-password'); // حذف كلمة المرور
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
});
router.get('/my-user', authenticateUser, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await userModel.findOne(userId);
        res.status(200).json({ message: 'product fitch succesfuly', user: user })
    } catch (err) {
        console.log(err)
    }
});
router.get('/friends', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id; // الحصول على معرف المستخدم من المصادقة
        console.log(userId)
        const user = await userModel.findById(userId).populate('friends', '_id firstName lastName profilePicture email'); // جلب قائمة الأصدقاء

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ friends: user.friends });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch friends', error: error.message });
    }
});

export default router;