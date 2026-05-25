const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your provider (SendGrid, SES, etc.)
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendResetEmail = async (toEmail, otpCode) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    // console.error('❌ SMTP configuration is missing in .env file!');
    return false;
  }

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Call A Van Support'}" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: 'Password Reset Verification Code - Call A Van',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0d47a1; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Call A Van Portal</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h3 style="color: #333333; margin-top: 0;">Password Reset Request</h3>
          <p style="color: #555555; line-height: 1.6;">
            We received a request to reset the password for your driver account. 
            Please use the following 6-digit verification code to proceed. This code is valid for <strong>15 minutes</strong>.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0d47a1; padding: 15px 25px; background-color: #f0f7ff; border-radius: 8px; border: 1px solid #bbdefb;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #555555; line-height: 1.6;">
            If you did not request this password reset, please ignore this email or contact support if you have concerns.
          </p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
          <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ [SMTP] Password reset OTP sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ [SMTP] Error sending email to ${toEmail}:`, error);
    return false;
  }
};

module.exports = {
  sendResetEmail,
};
