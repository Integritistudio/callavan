const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const { sendResetEmail } = require('../utils/emailService');

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and Password are required.',
      });
    }

    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Generate Admin JWT Token
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET || 'super_secret_jwt_key_123!',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Admin login successful!',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error.',
    });
  }
};

// Admin Forgot Password (OTP Trigger)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required.' });
    }

    const admin = await Admin.findByEmail(email);
    // Security: Do NOT reveal if email exists or not to prevent user enumeration
    if (!admin) {
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
    await Admin.saveResetOtp(email, otp, expiryDate);

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
    console.error('Admin Forgot Password Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Admin Verify Reset OTP
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: 'error', message: 'Email and OTP are required.' });
    }

    const validAdmin = await Admin.findValidOtp(email, otp);

    if (!validAdmin) {
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
    console.error('Admin Verify OTP Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Admin Reset Password using OTP
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

    // Verify OTP one last time before resetting
    const validAdmin = await Admin.findValidOtp(email, otp);
    if (!validAdmin) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid or expired OTP. Password reset failed.' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP
    await Admin.updatePasswordAndClearOtp(email, newPasswordHash);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Password has been reset successfully. You can now log in.' 
    });

  } catch (error) {
    console.error('Admin Reset Password Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Admin Change Password (Authenticated Profile Route)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'Current and new passwords are required.' });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
    if (newPassword.length < 6 || newPassword.length > 64 || !passwordRegex.test(newPassword)) {
      return res.status(400).json({ status: 'error', message: 'Please use a stronger password.' });
    }

    // Fetch admin's hashed password
    const db = require('../config/db');
    const result = await db.query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Admin profile not found.' });
    }

    const passwordHash = result.rows[0].password_hash;
    const isMatch = await bcrypt.compare(currentPassword, passwordHash);

    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Incorrect current password.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update in DB
    await Admin.updatePassword(adminId, newPasswordHash);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Password updated successfully.' 
    });

  } catch (error) {
    console.error('Admin Change Password Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// --- DRIVER MANAGEMENT ---

// Get all drivers in the system
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Admin.getAllDrivers();
    return res.status(200).json({
      status: 'success',
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    console.error('Admin Get Drivers Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error loading drivers.',
    });
  }
};

// Get details of a single driver by id
exports.getDriverDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Admin.getDriverById(id);

    if (!driver) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      driver,
    });
  } catch (error) {
    console.error('Admin Get Driver Details Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error loading driver details.',
    });
  }
};

// Set driver approval status
exports.updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'isApproved status is required.',
      });
    }

    const updated = await Admin.updateDriverApprovalStatus(id, isApproved);

    // If driver is disapproved, broadcast status changed and logout socket events
    const io = req.app.get('io');
    if (io) {
      if (!isApproved) {
        // Broadcast that this driver went offline
        io.emit('driver_status_changed', { driverId: id, isLive: false });
        // Emit driver logged out so they are removed from standard lists
        io.emit('driver_logged_out', { driverId: id });
        
        // Also emit a specific kickout socket message if the driver is currently connected
        io.emit(`driver_kickout_${id}`, { message: 'Your account has been disapproved by the administrator.' });
      } else {
        // If approved, notify clients about approval so they can see updates if any
        io.emit('driver_status_changed', { driverId: id, isLive: false });
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Driver status successfully updated to ${isApproved ? 'Approved' : 'Disapproved'}.`,
      driver: updated,
    });
  } catch (error) {
    console.error('Admin Set Approval Status Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error updating approval status.',
    });
  }
};
