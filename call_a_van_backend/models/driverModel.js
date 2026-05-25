const db = require('../config/db');

class Driver {
  // Find a driver by their unique email
  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM drivers WHERE email = $1', [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  // Update a driver's full profile details (excluding email for security)
  static async updateProfile(id, { 
    fullName, 
    mobileNumber, 
    companyName, 
    baseArea, 
    vehicleType, 
    shortBio, 
    servicesOffered, 
    profileImageUrl, 
    vanImageUrl 
  }) {
    const queryText = `
      UPDATE drivers
      SET full_name = $1,
          mobile_number = $2,
          company_name = $3,
          base_area = $4,
          vehicle_type = $5,
          short_bio = $6,
          services_offered = $7,
          profile_image_url = $8,
          van_image_url = $9
      WHERE id = $10
      RETURNING id, full_name AS "fullName", email, mobile_number AS "mobileNumber", 
                profile_image_url AS "profileImageUrl", van_image_url AS "vanImageUrl",
                company_name AS "companyName", base_area AS "baseArea", 
                vehicle_type AS "vehicleType", short_bio AS "shortBio", 
                services_offered AS "servicesOffered", is_live AS "isLive", is_approved AS "isApproved";
    `;
    const result = await db.query(queryText, [
      fullName.trim(), 
      mobileNumber.trim(), 
      companyName.trim(), 
      baseArea.trim(), 
      vehicleType, 
      (shortBio || '').trim(), 
      JSON.stringify(servicesOffered || []), 
      profileImageUrl, 
      vanImageUrl, 
      id
    ]);
    return result.rows[0];
  }

  // Insert a new driver row securely into PostgreSQL
  static async create({
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
  }) {
    const queryText = `
      INSERT INTO drivers (
        full_name,
        mobile_number,
        email,
        password_hash,
        company_name,
        base_area,
        vehicle_type,
        short_bio,
        services_offered,
        profile_image_url,
        van_image_url,
        is_approved,
        is_live
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, full_name, email, profile_image_url, van_image_url;
    `;

    const values = [
      fullName.trim(),
      mobileNumber.trim(),
      email.toLowerCase().trim(),
      passwordHash,
      companyName ? companyName.trim() : null,
      baseArea ? baseArea.trim() : null,
      vehicleType ? vehicleType.trim() : null,
      shortBio ? shortBio.trim() : null,
      JSON.stringify(servicesOffered || []), // Convert array to JSON string for PG JSONB column
      profileImageUrl || null,
      vanImageUrl || null,
      false, // is_approved (default offline pending approval)
      false, // is_live (default starts offline)
    ];

    const result = await db.query(queryText, values);
    return result.rows[0];
  }

  // --- PASSWORD RESET OTP METHODS ---

  static async saveResetOtp(email, otp, expiryDate) {
    const query = `
      UPDATE drivers 
      SET reset_password_otp = $1, reset_password_expires = $2
      WHERE email = $3
      RETURNING id, email;
    `;
    const result = await db.query(query, [otp, expiryDate, email.toLowerCase().trim()]);
    return result.rows[0];
  }

  static async findValidOtp(email, otp) {
    const query = `
      SELECT id, email, reset_password_otp, reset_password_expires 
      FROM drivers 
      WHERE email = $1 AND reset_password_otp = $2 AND reset_password_expires > NOW();
    `;
    const result = await db.query(query, [email.toLowerCase().trim(), otp]);
    return result.rows[0];
  }

  static async updatePasswordAndClearOtp(email, newPasswordHash) {
    const query = `
      UPDATE drivers 
      SET password_hash = $1, reset_password_otp = NULL, reset_password_expires = NULL
      WHERE email = $2
      RETURNING id, email;
    `;
    const result = await db.query(query, [newPasswordHash, email.toLowerCase().trim()]);
    return result.rows[0];
  }
}

module.exports = Driver;
