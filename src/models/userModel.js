import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // قائمة الأصدقاء
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // طلبات الصداقة الواردة
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // طلبات الصداقة المرسلة
    profilePicture: { type: String, default: "" },
    online: { type: Boolean, default: false },
    role: {
        type: String,
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false, // للتحقق إذا كان البريد قد تم التحقق منه
    },
    verificationToken: {
        type: String, // لتخزين رمز التحقق الخاص بالبريد
    },
    verificationTokenExpiresAt: {
        type: Date, // تاريخ انتهاء صلاحية رمز التحقق
    },
    resetPasswordToken: { type: String }, // الرمز المستخدم لإعادة تعيين كلمة المرور
    resetPasswordExpires: { type: Date }, // تاريخ انتهاء صلاحية الرمز
}, {
    timestamps: true, // لإنشاء الحقلين createdAt و updatedAt تلقائيًا
});

export const userModel = mongoose.model('User', UserSchema);
