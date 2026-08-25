const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/driverModel');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Securely decodes a base64 image string and uploads it to Cloudinary CDN
const uploadToCloudinary = async (base64Str, filename) => {
  if (!base64Str || !filename) return null;
  
  try {
    // 1. Construct standard Data URI format required by Cloudinary
    const dataUri = `data:image/jpeg;base64,${base64Str}`;
    
    // 2. Generate a secure, unique identifier
    const publicId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // 3. Upload directly to Cloudinary servers
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'call_a_van_uploads',
      public_id: publicId,
    });
    
    // 4. Return the permanent, secure CDN URL
    return result.secure_url;
  } catch (error) {
    console.error('Failed to upload image to Cloudinary:', error);
    return null;
  }
};

exports.signup = async (req, res) => {
  try {
    const {
      fullName,
      mobileNumber,
      email,
      password,
      companyName,
      baseArea,
      vehicleType,
      shortBio,
      servicesOffered,
      profileImageBase64,
      profileImageName,
      vanImageBase64,
      vanImageName,
    } = req.body;

    // 1. Mandatory input field validation
    if (!fullName || !mobileNumber || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Full Name, Mobile Number, Email, and Password are required fields.',
      });
    }

    // 2. Query model to verify if the email is already in use
    const existingDriver = await Driver.findByEmail(email);
    if (existingDriver) {
      return res.status(400).json({
        status: 'error',
        message: 'A driver with this email address already exists.',
      });
    }

    // 3. Encrypt the password using bcrypt salt hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Process and decode files if sent by Flutter frontend (now via Cloudinary)
    const profileImageUrl = await uploadToCloudinary(profileImageBase64, profileImageName);
    const vanImageUrl = await uploadToCloudinary(vanImageBase64, vanImageName);

    // 5. Invoke model to insert row into PostgreSQL
    const newDriver = await Driver.create({
      fullName,
      mobileNumber,
      email,
      passwordHash,
      companyName,
      baseArea,
      vehicleType,
      shortBio,
      servicesOffered,
      profileImageUrl,
      vanImageUrl,
    });

    // 5. Return clean structured JSON success back to Flutter
    return res.status(201).json({
      status: 'success',
      message: 'Driver registration successful! Awaiting admin approval.',
      driver: newDriver,
    });

  } catch (error) {
    console.error('Error inside authController.signup:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error. Please try again later.',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Mandatory input field validation
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and Password are required fields.',
      });
    }

    // 2. Query database for driver by email
    const driver = await Driver.findByEmail(email);
    if (!driver) {
      // Security standard: Use a generic error message so attackers cannot guess valid user accounts
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // 3. Verify the hashed password
    const isMatch = await bcrypt.compare(password, driver.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // 4. Check if the driver is approved by admin
    if (!driver.is_approved) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is pending admin approval. You will be able to log in once approved.',
      });
    }

    // 5. Generate secure JSON Web Token (JWT)
    const token = jwt.sign(
      { driverId: driver.id, email: driver.email },
      process.env.JWT_SECRET || 'super_secret_jwt_key_123!',
      { expiresIn: '7d' } // Token remains active for 7 days
    );

    // 6. Return success response with token and non-sensitive user info
    return res.status(200).json({
      status: 'success',
      message: 'Login successful!',
      token,
      driver: {
        id: driver.id,
        fullName: driver.full_name,
        email: driver.email,
        mobileNumber: driver.mobile_number,
        companyName: driver.company_name,
        baseArea: driver.base_area,
        vehicleType: driver.vehicle_type,
        isLive: driver.is_live,
        profileImageUrl: driver.profile_image_url,
        vanImageUrl: driver.van_image_url,
        shortBio: driver.short_bio,
        servicesOffered: driver.services_offered,
      },
    });

  } catch (error) {
    console.error('Error inside authController.login:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error. Please try again later.',
    });
  }
};

// Fetch all approved drivers for mapping
exports.getLiveDrivers = async (req, res) => {
  try {
    const db = require('../config/db'); // Dynamically require database configuration securely

    const query = `
      SELECT 
        d.id AS id,
        dl.latitude, 
        dl.longitude, 
        COALESCE(dl.is_live, false) AS "isLive",
        d.full_name AS "fullName", 
        d.mobile_number AS "phoneNumber", 
        d.company_name AS "companyName", 
        d.services_offered AS "services", 
        d.profile_image_url AS "profileImageUrl", 
        d.van_image_url AS "vanImageUrl", 
        d.vehicle_type AS "vehicleType"
      FROM drivers d
      LEFT JOIN driver_locations dl ON dl.driver_id = d.id
      WHERE d.is_approved = true;
    `;

    const result = await db.query(query);
    
    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      drivers: result.rows,
    });

  } catch (error) {
    console.error('Error inside authController.getLiveDrivers:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while loading live drivers.',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const driverId = req.driver.id; // Extracted from decoded JWT token inside authMiddleware
    const {
      fullName,
      mobileNumber,
      companyName,
      baseArea,
      vehicleType,
      shortBio,
      servicesOffered,
      profileImageBase64,
      profileImageName,
      vanImageBase64,
      vanImageName,
    } = req.body;

    // 1. Validate mandatory fields
    if (!fullName || !mobileNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Full Name and Mobile Number are required fields.',
      });
    }

    // 2. Query driver's existing database details
    const db = require('../config/db');
    const driverQuery = await db.query('SELECT profile_image_url, van_image_url FROM drivers WHERE id = $1', [driverId]);
    if (driverQuery.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver profile not found.',
      });
    }

    let profileImageUrl = driverQuery.rows[0].profile_image_url;
    let vanImageUrl = driverQuery.rows[0].van_image_url;

    // 3. Decode base64 image and save if a new one was uploaded
    if (profileImageBase64 && profileImageName) {
      const newUrl = await uploadToCloudinary(profileImageBase64, profileImageName);
      if (newUrl) {
        profileImageUrl = newUrl;
      }
    }

    if (vanImageBase64 && vanImageName) {
      const newVanUrl = await uploadToCloudinary(vanImageBase64, vanImageName);
      if (newVanUrl) {
        vanImageUrl = newVanUrl;
      }
    }

    let parsedServices = servicesOffered;
    if (typeof servicesOffered === 'string') {
      try {
        parsedServices = JSON.parse(servicesOffered);
      } catch (e) {
        parsedServices = [];
      }
    }

    // 4. Update the PostgreSQL row details
    const updatedDriver = await Driver.updateProfile(driverId, {
      fullName,
      mobileNumber,
      companyName,
      baseArea,
      vehicleType,
      shortBio,
      servicesOffered: parsedServices,
      profileImageUrl,
      vanImageUrl,
    });

    // 5. Send success response back to Flutter
    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully!',
      driver: updatedDriver,
    });

  } catch (error) {
    console.error('Error inside authController.updateProfile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating profile.',
    });
  }
};

// Securely log out and mark driver as logged out/offline
exports.logout = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const db = require('../config/db');

    // Update driver_locations table to set is_logged_in and is_live to false
    await db.query(
      `UPDATE driver_locations 
       SET is_logged_in = false, is_live = false, last_active = NOW() 
       WHERE driver_id = $1`,
      [driverId]
    );

    // Broadcast that this driver went offline (rather than removing from map)
    const io = req.app.get('io');
    if (io) {
      io.emit('driver_status_changed', { driverId, isLive: false });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Driver logged out successfully.',
    });

  } catch (error) {
    console.error('Error inside authController.logout:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while logging out.',
    });
  }
};
