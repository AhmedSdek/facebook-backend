import express from 'express';
import { userModel } from '../models/userModel.js';
import authenticateUser from '../Middleware/authenticateUser.js';
// import { users } from '../../index.js';
const router = express.Router();

// Route for adding a friend
// router.post('/add-friend', async (req, res) => {
//     const { userId, friendId } = req.body;

//     if (!userId || !friendId) {
//         return res.status(400).json({ message: 'User ID and Friend ID are required' });
//     }

//     try {
//         // العثور على المستخدم والصديق في قاعدة البيانات
//         const user = await userModel.findById(userId);
//         const friend = await userModel.findById(friendId).select('firstName lastName  profilePicture'); // البيانات المراد إضافتها;

//         if (!user || !friend) {
//             return res.status(404).json({ message: 'User or Friend not found' });
//         }

//         // تحقق إذا كان الصديق موجود بالفعل في قائمة الأصدقاء
//         // تحقق ما إذا كان الصديق موجودًا بالفعل
//         const isFriend = user.friends.some((f) => f._id.toString() === friendId);
//         if (isFriend) {
//             return res.status(400).json({ message: 'Already friends' });
//         }

//         // إضافة الصديق إلى قائمة الأصدقاء في كلا الجانبين
//         user.friends.push(friend);
//         friend.friends.push(user);

//         // حفظ التغييرات في قاعدة البيانات
//         await user.save();
//         await friend.save();

//         res.status(200).json({ message: 'Friend added successfully' });
//     } catch (err) {
//         res.status(500).json({ message: 'Failed to add friend', error: err.message });
//     }
// });

router.post('/send-friend-request', authenticateUser, async (req, res) => {
    const { userId, friendId } = req.body;
    if (!userId || !friendId) {
        return res.status(400).json({ message: 'User ID and Friend ID are required' });
    }
    try {
        const user = await userModel.findById(userId).populate('friends', '_id firstName lastName profilePicture email');
        const friend = await userModel.findById(friendId).populate('friends', '_id firstName lastName profilePicture email');
        if (!user || !friend) {
            return res.status(404).json({ message: 'User or Friend not found' });
        }
        // تحقق إذا تم إرسال طلب من قبل
        if (user.sentRequests.includes(friendId) || friend.friendRequests.includes(userId)) {
            return res.status(400).json({ message: 'Friend request already sent' });
        }
        // إضافة الطلب إلى قائمة الطلبات المرسلة والواردة
        user.sentRequests.push(friendId);
        friend.friendRequests.push(userId);
        await user.save();
        await friend.save();
        res.status(200).json({ message: 'Friend request sent successfully', data: { user: user, friend: friend } });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send friend request', error: err.message });
    }
});


router.post('/accept-friend-request', authenticateUser, async (req, res) => {
    const { userId, friendId } = req.body;
    if (!userId || !friendId) {
        return res.status(400).json({ message: 'User ID and Friend ID are required' });
    }
    try {
        const user = await userModel.findById(userId);
        const friend = await userModel.findById(friendId);
        if (!user || !friend) {
            return res.status(404).json({ message: 'User or Friend not found' });
        }
        // تحقق من وجود الطلب
        if (!user.friendRequests.includes(friendId)) {
            return res.status(400).json({ message: 'Friend request not found' });
        }
        // تحقق من عدم وجود الصديق مسبقًا
        if (user.friends.includes(friendId) || friend.friends.includes(userId)) {
            return res.status(400).json({ message: 'Already friends' });
        }
        // إضافة كأصدقاء
        user.friends.push(friendId);
        friend.friends.push(userId);
        // إزالة الطلبات
        user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId);
        friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== userId);
        // تحديث البيانات في كلا المستخدمين
        await Promise.all([user.save(), friend.save()]);
        // إرجاع البيانات المحدثة
        const updatedUser = await userModel.findById(userId).populate('friends', '_id firstName lastName profilePicture email');
        const updatedFriend = await userModel.findById(friendId).populate('friends', '_id firstName lastName profilePicture email');
        res.status(200).json({
            message: 'Friend request accepted successfully',
            data: {
                user: updatedUser,
                friend: updatedFriend
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to accept friend request', error: err.message });
    }
});

// إحضار طلبات الصداقة الواردة
router.get('/get-friend-requests', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id; // الحصول على الـ userId من middleware
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const user = await userModel.findById(userId).populate('friendRequests', '_id firstName lastName profilePicture email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ friendRequests: user.friendRequests });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch friend requests', error: err.message });
    }
});


router.post('/reject-friend-request', authenticateUser, async (req, res) => {
    const { userId, friendId } = req.body;
    if (!userId || !friendId) {
        return res.status(400).json({ message: 'User ID and Friend ID are required' });
    }

    try {
        const user = await userModel.findById(userId);
        const friend = await userModel.findById(friendId);

        if (!user || !friend) {
            return res.status(404).json({ message: 'User or Friend not found' });
        }

        // تحقق من وجود الطلب
        if (!user.friendRequests.includes(friendId)) {
            return res.status(400).json({ message: 'Friend request not found' });
        }

        // إزالة طلب الصداقة من كلا الجانبين
        user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId);
        friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== userId);

        // تحديث البيانات في كلا المستخدمين
        await Promise.all([user.save(), friend.save()]);

        res.status(200).json({
            message: 'Friend request rejected successfully',
            data: { user, friend }
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reject friend request', error: err.message });
    }
});

// router.post('/reject-friend-request', authenticateUser, async (req, res) => {
//     const { userId, friendId } = req.body;
//     if (!userId || !friendId) {
//         return res.status(400).json({ message: 'User ID and Friend ID are required' });
//     }
//     try {
//         const user = await userModel.findById(userId);
//         const friend = await userModel.findById(friendId);
//         if (!user || !friend) {
//             return res.status(404).json({ message: 'User or Friend not found' });
//         }
//         // إزالة الطلبات
//         user.friendRequests = user.friendRequests.filter(id => id.toString() !== friendId);
//         friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== userId);
//         await user.save();
//         await friend.save();
//         res.status(200).json({ message: 'Friend request rejected successfully' });
//     } catch (err) {
//         res.status(500).json({ message: 'Failed to reject friend request', error: err.message });
//     }
// });

export default router;