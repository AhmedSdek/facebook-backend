import express from 'express';
import { postModel } from '../models/postModel.js';
import authenticateUser from '../Middleware/authenticateUser.js';

const router = express.Router();
router.get('/', async (req, res) => {
    try {
        const allPosts = await postModel.find().populate('createdBy', 'name email profilePicture firstName lastName');
        // 'name email' لتحديد الحقول التي تريد جلبها من المستخدم
        // console.log(allPosts)
        res.status(200).json(allPosts);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get posts', error: err.message });
    }
});
router.get('/my-posts', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        // console.log(req.user.id)
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const myPosts = await postModel.find({ createdBy: userId }).populate('createdBy', 'name email profilePicture firstName lastName');
        res.status(200).json(myPosts);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get posts', error: err.message });
    }
});
router.post('/creat-post', async (req, res) => {
    const { createdBy, content, userId } = req.body;
    if (!createdBy || !content, !userId) {
        return res.status(400).json({ message: 'User ID and content are required' });
    }
    try {
        const newPost = new postModel({
            content,
            createdBy,// ربط البوست بالمستخدم الذي أنشأه
            userId
        });
        await newPost.save();
        // استخدام populate لملء بيانات اليوزر الذي أنشأ البوست
        const populatedPost = await newPost.populate('createdBy', 'name email profilePicture firstName lastName');
        // إرجاع البوست مع بيانات اليوزر
        res.status(201).json(populatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create post', error: err.message });
    }
});

export default router;