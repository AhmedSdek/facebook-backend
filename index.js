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
export const io = new Server(server, {
    pingInterval: 25000, // الوقت بين كل "ping" (بالمللي ثانية)
    pingTimeout: 60000,  // الوقت قبل قطع الاتصال (بالمللي ثانية)
    cors: {
        origin: "*", // رابط Vercel الخاص بالواجهة الأمامية
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"], // السماح بالنقل عبر WebSocket وPolling
});

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/chat', chatRoutes);
app.use('/frindes', frindsRoutes);

// متغير Socket.io في Express
// قائمة المستخدمين المتصلين
// const connectedUsers = new Map(); // لتتبع المستخدمين المتصلين
// io.on('connection', (socket) => {
//     // console.log('User connected:', socket.id);
//     // تسجيل المستخدم عند الاتصال
//     socket.on('registerUser', (userId) => {
//         if (connectedUsers.has(userId)) {
//             console.log(`User ${userId} is already connected.`);
//         } else {
//             connectedUsers.set(userId, socket.id);
//             console.log(`User ${userId} has been registered.`);
//         }
//         // connectedUsers.set(userId, socket.id);
//         // console.log(connectedUsers)
//     });
//     // عند إرسال طلب صداقة
//     socket.on('sendFriendRequest', (data) => {
//         console.log(data)
//         const receiverSocket = connectedUsers.get(data.receiverId);
//         // console.log(receiverSocket)
//         if (receiverSocket) {
//             io.to(receiverSocket).emit('friendRequestReceived', data);
//         }
//     });
//     // عند قبول طلب الصداقة
//     socket.on('acceptFriendRequest', (data) => {
//         // console.log(data)
//         const senderSocket = connectedUsers.get(data.receiverId);
//         if (senderSocket) {
//             io.to(senderSocket).emit('friendRequestAccepted', data);
//         }
//     });
//     // عند رفض طلب الصداقة
//     socket.on('rejectFriendRequest', (data) => {
//         // console.log(data)
//         const senderSocket = connectedUsers.get(data.receiverId);
//         if (senderSocket) {
//             io.to(senderSocket).emit('friendRequestRejected', data);
//         }
//     });
//     // الحصول على قائمة الأصدقاء المتصلين
//     socket.on('getOnlineFriends', (friendIds, callback) => {
//         const onlineFriends = friendIds.filter((id) => connectedUsers.has(id));
//         callback(onlineFriends); // إرسال قائمة الأصدقاء المتصلين إلى العميل
//     });

//     // استقبال الرسائل
//     socket.on("sendMessage", async (data) => {
//         const { sender, receiver, content } = data;
//         try {
//             const newMessage = new messageModel({ sender, receiver, content });
//             await newMessage.save();
//             // إرسال الرسالة للطرف الآخر
//             const receiverSocket = connectedUsers.get(receiver);
//             if (receiverSocket) {
//                 io.to(receiverSocket).emit("receiveMessage", newMessage);
//             }
//             // إرسال تأكيد للمُرسل
//             socket.emit("messageSent", newMessage);
//         } catch (err) {
//             console.error("Error saving message:", err.message);
//         }
//     });
//     // عند انقطاع الاتصال
//     socket.on('disconnect', () => {
//         // console.log('User disconnected:', socket.id);
//         for (let [userId, socketId] of connectedUsers.entries()) {
//             if (socketId === socket.id) {
//                 connectedUsers.delete(userId);
//                 // console.log(`User disconnected: ${userId}`);
//                 break;
//             }
//         }
//     });
// });

io.on('connection', (socket) => {
    // console.log(`User connected: ${socket.id}`);

    // تسجيل المستخدم عند الاتصال عن طريق الانضمام إلى غرفة
    socket.on('joinRoom', (userId) => {
        socket.join(userId); // المستخدم ينضم إلى غرفة بمعرفه (userId)
    // console.log(`User ${userId} has joined room ${userId}`);
    });

    // عند إرسال طلب صداقة
    socket.on('sendFriendRequest', (data) => {
        // console.log(data);
        // إرسال طلب الصداقة إلى غرفة المستلم
        io.to(data.receiverId).emit('friendRequestReceived', data);
    });

    // عند قبول طلب الصداقة
    socket.on('acceptFriendRequest', (data) => {
        // console.log(data);
        // إرسال إشعار قبول الطلب إلى غرفة المرسل
        io.to(data.receiverId).emit('friendRequestAccepted', data);
    });

    // عند رفض طلب الصداقة
    socket.on('rejectFriendRequest', (data) => {
        // console.log(data);
        // إرسال إشعار رفض الطلب إلى غرفة المرسل
        io.to(data.senderId).emit('friendRequestRejected', data);
    });

    // الحصول على قائمة الأصدقاء المتصلين
    socket.on('getOnlineFriends', (friendIds, callback) => {
        // الأصدقاء المتصلون هم فقط المستخدمون الذين انضموا لغرف خاصة بمعرفاتهم
        const onlineFriends = friendIds.filter((id) => {
            const room = io.sockets.adapter.rooms.get(id);
            return room && room.size > 0; // إذا كانت الغرفة موجودة ولديها مستخدمون
        });

        callback(onlineFriends); // إرسال قائمة الأصدقاء المتصلين إلى العميل
    });

    // استقبال الرسائل
    socket.on('sendMessage', async (data) => {
        const { sender, receiver, content } = data;
        try {
            const newMessage = new messageModel({ sender, receiver, content });
            await newMessage.save();

            // إرسال الرسالة للطرف الآخر باستخدام غرفته
            io.to(receiver).emit('receiveMessage', newMessage);

            // إرسال تأكيد للمُرسل
            socket.emit('messageSent', newMessage);
        } catch (err) {
            console.error('Error saving message:', err.message);
        }
    });

    // عند انقطاع الاتصال
    socket.on('disconnect', () => {
        // console.log(`User disconnected: ${socket.id}`);
    });
});
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
app.set('socketio', io);
mongoose
    .connect(process.env.DB_URL)
    .then(() => console.log("Connected!"))
    .catch((err) => console.log(err));

server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
