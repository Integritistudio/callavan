const db = require('../config/db');

class Admin {
  // Find admin by email
  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  // Find admin by ID
  static async findById(id) {
    const result = await db.query('SELECT id, email, created_at FROM admins WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Update password directly (e.g. change password when logged in)
  static async updatePassword(id, passwordHash) {
    const result = await db.query(
      'UPDATE admins SET password_hash = $1 WHERE id = $2 RETURNING id, email',
      [passwordHash, id]
    );
    return result.rows[0];
  }

  // OTP Methods for Admin Reset Password
  static async saveResetOtp(email, otp, expiryDate) {
    const query = `
      UPDATE admins 
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
      FROM admins 
      WHERE email = $1 AND reset_password_otp = $2 AND reset_password_expires > NOW();
    `;
    const result = await db.query(query, [email.toLowerCase().trim(), otp]);
    return result.rows[0];
  }

  static async updatePasswordAndClearOtp(email, newPasswordHash) {
    const query = `
      UPDATE admins 
      SET password_hash = $1, reset_password_otp = NULL, reset_password_expires = NULL
      WHERE email = $2
      RETURNING id, email;
    `;
    const result = await db.query(query, [newPasswordHash, email.toLowerCase().trim()]);
    return result.rows[0];
  }

  // --- DRIVER MANAGEMENT METHODS FOR ADMIN ---

  // Get all drivers in the system
  static async getAllDrivers() {
    const query = `
      SELECT 
        d.id,
        d.full_name AS "fullName",
        d.email,
        d.mobile_number AS "mobileNumber",
        d.company_name AS "companyName",
        d.base_area AS "baseArea",
        d.vehicle_type AS "vehicleType",
        d.short_bio AS "shortBio",
        d.services_offered AS "servicesOffered",
        d.profile_image_url AS "profileImageUrl",
        d.van_image_url AS "vanImageUrl",
        d.is_approved AS "isApproved",
        d.is_live AS "isLive",
        d.created_at AS "createdAt",
        dl.latitude,
        dl.longitude,
        COALESCE(dl.is_live, false) AS "locationLive"
      FROM drivers d
      LEFT JOIN driver_locations dl ON dl.driver_id = d.id
      ORDER BY d.created_at DESC;
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Get details of a single driver by id
  static async getDriverById(id) {
    const query = `
      SELECT 
        d.id,
        d.full_name AS "fullName",
        d.email,
        d.mobile_number AS "mobileNumber",
        d.company_name AS "companyName",
        d.base_area AS "baseArea",
        d.vehicle_type AS "vehicleType",
        d.short_bio AS "shortBio",
        d.services_offered AS "servicesOffered",
        d.profile_image_url AS "profileImageUrl",
        d.van_image_url AS "vanImageUrl",
        d.is_approved AS "isApproved",
        d.is_live AS "isLive",
        d.created_at AS "createdAt",
        dl.latitude,
        dl.longitude,
        COALESCE(dl.is_live, false) AS "locationLive",
        COALESCE(dl.is_logged_in, false) AS "isLoggedIn",
        dl.last_active AS "locationLastActive"
      FROM drivers d
      LEFT JOIN driver_locations dl ON dl.driver_id = d.id
      WHERE d.id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Update a driver's approval status
  static async updateDriverApprovalStatus(id, isApproved) {
    // If disapproving, set is_live = false in drivers, and update driver_locations as well
    const query = `
      UPDATE drivers 
      SET is_approved = $1, is_live = CASE WHEN $1 = false THEN false ELSE is_live END
      WHERE id = $2
      RETURNING id, full_name AS "fullName", email, is_approved AS "isApproved", is_live AS "isLive";
    `;
    const result = await db.query(query, [isApproved, id]);

    if (!isApproved) {
      // Disapproved driver must be forced offline immediately in the tracking table
      await db.query(
        `UPDATE driver_locations 
         SET is_live = false, is_logged_in = false, last_active = NOW() 
         WHERE driver_id = $1`,
        [id]
      );
    }

    return result.rows[0];
  }
}

module.exports = Admin;
