const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/driverModel');

// Securely decodes a base64 image string and writes it to static server disk
const saveBase64Image = (base64Str, filename, host) => {
  if (!base64Str || !filename) return null;
  
  try {
    // 1. Resolve and create public/uploads directory path if missing
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 2. Generate a highly secure, unique filename to prevent duplicates or directory attacks
    const cleanExt = path.extname(filename) || '.jpg';
    const cleanFilename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${cleanExt}`;
    const filePath = path.join(uploadDir, cleanFilename);
    
    // 3. Decode base64 content to standard binary buffer
    const buffer = Buffer.from(base64Str, 'base64');
    
    // 4. Save file to server disk
    fs.writeFileSync(filePath, buffer);
    
    // 5. Construct the public HTTP static asset URL
    return `http://${host}/uploads/${cleanFilename}`;
  } catch (error) {
    console.error('Failed to save base64 image on server:', error);
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

    // 4. Process and decode files if sent by Flutter frontend
    const profileImageUrl = saveBase64Image(profileImageBase64, profileImageName, req.headers.host);
    const vanImageUrl = saveBase64Image(vanImageBase64, vanImageName, req.headers.host);

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

// Fetch all approved, live drivers within the active 5-minute threshold
exports.getLiveDrivers = async (req, res) => {
  try {
    const db = require('../config/db'); // Dynamically require database configuration securely

    const query = `
      SELECT dl.driver_id AS id, dl.latitude, dl.longitude, d.full_name AS "fullName", d.van_image_url AS "vanImageUrl", d.vehicle_type AS "vehicleType"
      FROM driver_locations dl
      JOIN drivers d ON dl.driver_id = d.id
      WHERE dl.is_live = true 
        AND d.is_approved = true
        AND dl.last_active > NOW() - INTERVAL '5 minutes';
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
      profileImageBase64,
      profileImageName,
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
    const driverQuery = await db.query('SELECT profile_image_url FROM drivers WHERE id = $1', [driverId]);
    if (driverQuery.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver profile not found.',
      });
    }

    let profileImageUrl = driverQuery.rows[0].profile_image_url;

    // 3. Decode base64 image and save if a new one was uploaded
    if (profileImageBase64 && profileImageName) {
      const newUrl = saveBase64Image(profileImageBase64, profileImageName, req.headers.host);
      if (newUrl) {
        profileImageUrl = newUrl;
      }
    }

    // 4. Update the PostgreSQL row details
    const updatedDriver = await Driver.updateProfile(driverId, {
      fullName,
      mobileNumber,
      profileImageUrl,
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
