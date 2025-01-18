import jwt from 'jsonwebtoken';
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // استخراج التوكن
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // فك التشفير
        // console.log(decoded)
        req.user = decoded; // إضافة بيانات المستخدم إلى الطلب
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid token' });
    }
};
export default authenticateUser;