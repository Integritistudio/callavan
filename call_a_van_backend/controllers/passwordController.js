const bcrypt = require('bcryptjs');
const Driver = require('../models/driverModel');
const { sendResetEmail } = require('../utils/emailService');

// ==========================================
// PASSWORD RESET FLOW
// ==========================================

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required.' });
    }

    const driver = await Driver.findByEmail(email);
    // Security: Do NOT reveal if email exists or not to prevent user enumeration
    if (!driver) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'If this email is registered, an OTP has been sent.' 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 15 minutes from now
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15);

    // Save to DB
    await Driver.saveResetOtp(email, otp, expiryDate);

    // Send Email
    const emailSent = await sendResetEmail(email, otp);

    if (emailSent) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'If this email is registered, an OTP has been sent.' 
      });
    } else {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to send OTP email. Please try again later.' 
      });
    }

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: 'error', message: 'Email and OTP are required.' });
    }

    const validDriver = await Driver.findValidOtp(email, otp);

    if (!validDriver) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid or expired OTP. Please request a new one.' 
      });
    }

    return res.status(200).json({ 
      status: 'success', 
      message: 'OTP verified successfully.' 
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'Email, OTP, and New Password are required.' });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
    if (newPassword.length < 6 || newPassword.length > 64 || !passwordRegex.test(newPassword)) {
      return res.status(400).json({ status: 'error', message: 'Please use a stronger password.' });
    }

    // Verify OTP one last time before resetting to ensure security
    const validDriver = await Driver.findValidOtp(email, otp);
    if (!validDriver) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid or expired OTP. Password reset failed.' 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the database and instantly clear the OTP
    await Driver.updatePasswordAndClearOtp(email, newPasswordHash);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Password has been reset successfully. You can now log in.' 
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// ==========================================
// AUTHENTICATED PASSWORD CHANGE
// ==========================================

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const driverId = req.driver.id; // Injected by authMiddleware.protect

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'Current and new passwords are required.' });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
    if (newPassword.length < 6 || newPassword.length > 64 || !passwordRegex.test(newPassword)) {
      return res.status(400).json({ status: 'error', message: 'Please use a stronger password. ' });
    }

    // Fetch the driver to get the current hash
    const db = require('../config/db');
    const result = await db.query('SELECT password_hash FROM drivers WHERE id = $1', [driverId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Driver not found.' });
    }

    const passwordHash = result.rows[0].password_hash;
    const isMatch = await bcrypt.compare(currentPassword, passwordHash);

    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Incorrect current password.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the database
    await db.query('UPDATE drivers SET password_hash = $1 WHERE id = $2', [newPasswordHash, driverId]);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Password updated successfully.' 
    });

  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};
