const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendMagicLink(email, token) {
    const link = `${process.env.BASE_URL}/api/auth/verify?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Sign in to InstantHost',
        html: `
      <h1>Welcome to InstantHost</h1>
      <p>Click the link below to sign in to your dashboard and get your API key:</p>
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">Sign In</a>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>Link expires in 15 minutes.</p>
    `,
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendMagicLink };
