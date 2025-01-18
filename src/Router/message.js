import { messageModel } from "../models/messageModel.js";
import express from 'express';

const router = express.Router();

// إرسال رسالة جديدة
router.post('/send-message', async (req, res) => {
    const { sender, receiver, content } = req.body;

    if (!sender || !receiver || !content) {
        return res.status(400).json({ message: 'Sender, receiver, and content are required' });
    }

    try {
        const newMessage = new messageModel({ sender, receiver, content });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
});

// الحصول على المحادثات بين مستخدمين معينين
router.get('/:userId/:friendId', async (req, res) => {
    const { userId, friendId } = req.params;
    try {
        const messages = await messageModel.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        }).sort({ createdAt: 1 });  // ترتيب الرسائل حسب تاريخ الإرسال

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get messages', error: err.message });
    }
});

export default router;