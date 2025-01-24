import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    content: { type: String, required: true },
    image: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // علاقة بجدول المستخدمين
    createdAt: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    likes: { type: [String], default: [] },
});

export const postModel = mongoose.model('Post', PostSchema);
