import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';
import { Server } from "socket.io";
import http from 'http'; // لإعداد خادم HTTP
import authRoutes from './src/Router/auth.js';
import postRoutes from './src/Router/post.js';
import chatRoutes from './src/Router/message.js';
import frindsRoutes from './src/Router/addFrindes.js';
import { messageModel } from './src/models/messageModel.js';

const app = express();
const port = process.env.PORT || 3000;
// إنشاء خادم HTTP وربطه بـ Express
const server = http.createServer(app);
export const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/chat', chatRoutes);
app.use('/frindes', frindsRoutes);

// متغير Socket.io في Express
// قائمة المستخدمين المتصلين
const connectedUsers = new Map(); // لتتبع المستخدمين المتصلين
// console.log(connectedUsers)



io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);
    // تسجيل المستخدم عند الاتصال
    socket.on('registerUser', (userId) => {
        connectedUsers.set(userId, socket.id);
        // console.log(connectedUsers)
    });
    // عند إرسال طلب صداقة
    socket.on('sendFriendRequest', (data) => {
        // console.log(receiverId, senderId)
        const receiverSocket = connectedUsers.get(data.receiverId);
        // console.log(receiverSocket)
        if (receiverSocket) {
            io.to(receiverSocket).emit('friendRequestReceived', data);
        }
    });
    // عند قبول طلب الصداقة
    socket.on('acceptFriendRequest', (data) => {
        // console.log(data)
        const senderSocket = connectedUsers.get(data.receiverId);
        if (senderSocket) {
            io.to(senderSocket).emit('friendRequestAccepted', data);
        }
    });
    // عند رفض طلب الصداقة
    socket.on('rejectFriendRequest', (data) => {
        // console.log(data)
        const senderSocket = connectedUsers.get(data.receiverId);
        if (senderSocket) {
            io.to(senderSocket).emit('friendRequestRejected', data);
        }
    });
    // الحصول على قائمة الأصدقاء المتصلين
    socket.on('getOnlineFriends', (friendIds, callback) => {
        const onlineFriends = friendIds.filter((id) => connectedUsers.has(id));
        callback(onlineFriends); // إرسال قائمة الأصدقاء المتصلين إلى العميل
    });
    // عند إرسال رسالة
    socket.on('sendMessage', async (data) => {
        const { sender, receiver, content } = data;
        try {
            const newMessage = new messageModel({ sender, receiver, content });
            await newMessage.save();

            // إرسال الرسالة للطرف الآخر
            const receiverSocket = connectedUsers.get(receiver);
            if (receiverSocket) {
                io.to(receiverSocket).emit('receiveMessage', newMessage);
            }

            // إرسال تأكيد للطرف المُرسل
            socket.emit('messageSent', newMessage);
        } catch (err) {
            console.error('Error saving message:', err.message);
        }
    });
    // عند انقطاع الاتصال
    socket.on('disconnect', () => {
        // console.log('User disconnected:', socket.id);
        for (let [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                // console.log(`User disconnected: ${userId}`);
                break;
            }
        }
    });
});

app.set('socketio', io);
mongoose
    .connect(process.env.DB_URL)
    .then(() => console.log("Connected!"))
    .catch((err) => console.log(err));

server.listen(port, () => console.log(`Server running on http://localhost:${port}`));