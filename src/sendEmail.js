import nodemailer from "nodemailer";
import 'dotenv/config';
const transporter = nodemailer.createTransport({
    service: "gmail", // أو SMTP حسب مزود البريد
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async ({ to, subject, text }) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: `<p>${text}</p>`,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response); // هذه السطر يمكن أن يساعدك في التحقق من نجاح الإرسال
    } catch (error) {
        console.log("Error sending email: ", error); // سجل الخطأ إذا حدث
    }
    // return transporter.sendMail(mailOptions);
};

export default sendEmail;