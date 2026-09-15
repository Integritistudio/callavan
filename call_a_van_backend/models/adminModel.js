const db = require('../config/db');

const DRIVER_SELECT_FIELDS = `
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
  dl.offline_latitude AS "offlineLatitude",
  dl.offline_longitude AS "offlineLongitude",
  COALESCE(dl.is_live, false) AS "locationLive",
  COALESCE(dl.is_logged_in, false) AS "isLoggedIn",
  dl.last_active AS "locationLastActive"
`;

function hasValidCoords(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) return false;
  if (la === 0 && ln === 0) return false;
  return la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
}

function parseServices(servicesOffered) {
  if (!servicesOffered) return [];
  if (Array.isArray(servicesOffered)) return servicesOffered;
  if (typeof servicesOffered === 'string') {
    try {
      const parsed = JSON.parse(servicesOffered);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

class Admin {
  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query('SELECT id, email, created_at FROM admins WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async updatePassword(id, passwordHash) {
    const result = await db.query(
      'UPDATE admins SET password_hash = $1 WHERE id = $2 RETURNING id, email',
      [passwordHash, id]
    );
    return result.rows[0];
  }

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

  static async getAllDrivers() {
    const query = `
      SELECT ${DRIVER_SELECT_FIELDS}
      FROM drivers d
      LEFT JOIN driver_locations dl ON dl.driver_id = d.id
      ORDER BY d.created_at DESC;
    `;
    const result = await db.query(query);
    return result.rows;
  }

  static async getDriverById(id) {
    const query = `
      SELECT ${DRIVER_SELECT_FIELDS}
      FROM drivers d
      LEFT JOIN driver_locations dl ON dl.driver_id = d.id
      WHERE d.id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updateDriverApprovalStatus(id, isApproved) {
    const query = `
      UPDATE drivers 
      SET is_approved = $1, is_live = CASE WHEN $1 = false THEN false ELSE is_live END
      WHERE id = $2
      RETURNING id, full_name AS "fullName", email, is_approved AS "isApproved", is_live AS "isLive";
    `;
    const result = await db.query(query, [isApproved, id]);

    if (!isApproved) {
      await db.query(
        `UPDATE driver_locations 
         SET is_live = false, is_logged_in = false, last_active = NOW() 
         WHERE driver_id = $1`,
        [id]
      );
    }

    return result.rows[0];
  }

  static resolveDisplayCoords(driver) {
    if (!driver) return null;
    const live = driver.locationLive === true || driver.isLive === true;

    if (live && hasValidCoords(driver.latitude, driver.longitude)) {
      return {
        latitude: parseFloat(driver.latitude),
        longitude: parseFloat(driver.longitude),
      };
    }

    if (hasValidCoords(driver.offlineLatitude, driver.offlineLongitude)) {
      return {
        latitude: parseFloat(driver.offlineLatitude),
        longitude: parseFloat(driver.offlineLongitude),
      };
    }

    if (hasValidCoords(driver.latitude, driver.longitude)) {
      return {
        latitude: parseFloat(driver.latitude),
        longitude: parseFloat(driver.longitude),
      };
    }

    return null;
  }

  static hasAnyLocation(driver) {
    return Boolean(Admin.resolveDisplayCoords(driver));
  }

  static async setDriverLiveStatus(id, isLive) {
    const driver = await Admin.getDriverById(id);
    if (!driver) {
      const err = new Error('Driver not found.');
      err.statusCode = 404;
      throw err;
    }

    if (isLive) {
      if (!(driver.isApproved === true || driver.isApproved === 1)) {
        const err = new Error('Driver must be approved before going live.');
        err.statusCode = 400;
        throw err;
      }

      let latitude = hasValidCoords(driver.latitude, driver.longitude)
        ? parseFloat(driver.latitude)
        : null;
      let longitude = hasValidCoords(driver.latitude, driver.longitude)
        ? parseFloat(driver.longitude)
        : null;

      if (latitude === null && hasValidCoords(driver.offlineLatitude, driver.offlineLongitude)) {
        latitude = parseFloat(driver.offlineLatitude);
        longitude = parseFloat(driver.offlineLongitude);
      }

      if (latitude === null) {
        const err = new Error(
          'Coordinates are required before setting a driver live. Set an offline location or wait for a GPS fix.'
        );
        err.statusCode = 400;
        throw err;
      }

      await db.query(
        `INSERT INTO driver_locations (driver_id, latitude, longitude, is_live, is_logged_in, last_active)
         VALUES ($1, $2, $3, true, true, NOW())
         ON CONFLICT (driver_id)
         DO UPDATE SET
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           is_live = true,
           is_logged_in = true,
           last_active = NOW()`,
        [id, latitude, longitude]
      );

      await db.query('UPDATE drivers SET is_live = true WHERE id = $1', [id]);

      const updated = await Admin.getDriverById(id);
      return {
        driver: updated,
        broadcast: {
          driverId: Number(id),
          isLive: true,
          latitude,
          longitude,
        },
      };
    }

    // Going offline — use offline pin when set, otherwise keep last location
    const display = hasValidCoords(driver.offlineLatitude, driver.offlineLongitude)
      ? {
          latitude: parseFloat(driver.offlineLatitude),
          longitude: parseFloat(driver.offlineLongitude),
        }
      : hasValidCoords(driver.latitude, driver.longitude)
        ? {
            latitude: parseFloat(driver.latitude),
            longitude: parseFloat(driver.longitude),
          }
        : null;

    await db.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude, is_live, is_logged_in, last_active)
       VALUES ($1, $2, $3, false, true, NOW())
       ON CONFLICT (driver_id)
       DO UPDATE SET
         is_live = false,
         last_active = NOW()`,
      [id, display?.latitude ?? 0, display?.longitude ?? 0]
    );

    await db.query('UPDATE drivers SET is_live = false WHERE id = $1', [id]);

    const updated = await Admin.getDriverById(id);
    return {
      driver: updated,
      broadcast: {
        driverId: Number(id),
        isLive: false,
        latitude: display?.latitude ?? null,
        longitude: display?.longitude ?? null,
      },
    };
  }

  static async updateOfflineLocation(id, offlineLatitude, offlineLongitude) {
    const driver = await Admin.getDriverById(id);
    if (!driver) {
      const err = new Error('Driver not found.');
      err.statusCode = 404;
      throw err;
    }

    if (!hasValidCoords(offlineLatitude, offlineLongitude)) {
      const err = new Error('Valid offline latitude and longitude are required.');
      err.statusCode = 400;
      throw err;
    }

    const lat = parseFloat(offlineLatitude);
    const lng = parseFloat(offlineLongitude);

    await db.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude, offline_latitude, offline_longitude, is_live, is_logged_in, last_active)
       VALUES ($1, $2, $3, $2, $3, false, false, NOW())
       ON CONFLICT (driver_id)
       DO UPDATE SET
         offline_latitude = EXCLUDED.offline_latitude,
         offline_longitude = EXCLUDED.offline_longitude,
         last_active = NOW()`,
      [id, lat, lng]
    );

    // If currently offline, move map pin to the new offline location immediately
    const updated = await Admin.getDriverById(id);
    const isCurrentlyLive = updated.locationLive === true;
    return {
      driver: updated,
      broadcast: !isCurrentlyLive
        ? {
            driverId: Number(id),
            isLive: false,
            latitude: lat,
            longitude: lng,
          }
        : null,
    };
  }

  static async updateDriverDetails(id, payload) {
    const driver = await Admin.getDriverById(id);
    if (!driver) {
      const err = new Error('Driver not found.');
      err.statusCode = 404;
      throw err;
    }

    const {
      fullName,
      mobileNumber,
      email,
      companyName,
      baseArea,
      vehicleType,
      shortBio,
      servicesOffered,
      profileImageUrl,
      vanImageUrl,
    } = payload;

    if (!fullName || !mobileNumber) {
      const err = new Error('Full name and mobile number are required.');
      err.statusCode = 400;
      throw err;
    }

    const services = parseServices(servicesOffered);

    const result = await db.query(
      `UPDATE drivers SET
         full_name = $1,
         mobile_number = $2,
         email = COALESCE($3, email),
         company_name = $4,
         base_area = $5,
         vehicle_type = $6,
         short_bio = $7,
         services_offered = $8::jsonb,
         profile_image_url = COALESCE($9, profile_image_url),
         van_image_url = COALESCE($10, van_image_url)
       WHERE id = $11
       RETURNING id`,
      [
        fullName.trim(),
        mobileNumber.trim(),
        email ? email.toLowerCase().trim() : null,
        companyName || null,
        baseArea || null,
        vehicleType || null,
        shortBio || null,
        JSON.stringify(services),
        profileImageUrl || null,
        vanImageUrl || null,
        id,
      ]
    );

    if (!result.rows[0]) {
      const err = new Error('Driver not found.');
      err.statusCode = 404;
      throw err;
    }

    return Admin.getDriverById(id);
  }

  static async getInsights() {
    const drivers = await Admin.getAllDrivers();
    const totalDrivers = drivers.length;
    const approvedDrivers = drivers.filter((d) => d.isApproved === true || d.isApproved === 1).length;
    const pendingReview = totalDrivers - approvedDrivers;

    const missingLocations = drivers.filter((d) => !Admin.hasAnyLocation(d)).length;

    const liveDrivers = drivers.filter(
      (d) =>
        (d.isApproved === true || d.isApproved === 1) &&
        (d.locationLive === true || d.isLive === true)
    ).length;

    const offlineDrivers = approvedDrivers - liveDrivers;

    const serviceCounts = {};
    drivers.forEach((d) => {
      parseServices(d.servicesOffered).forEach((service) => {
        const key = String(service).trim();
        if (!key) return;
        serviceCounts[key] = (serviceCounts[key] || 0) + 1;
      });
    });

    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const pct = (n, of) => (of === 0 ? 0 : Math.round((n / of) * 1000) / 10);

    return {
      totalDrivers,
      approvedDrivers,
      pendingReview,
      missingLocations,
      liveAvailability: {
        live: liveDrivers,
        offline: Math.max(offlineDrivers, 0),
        approved: approvedDrivers,
      },
      statusDistribution: {
        approved: approvedDrivers,
        notApproved: pendingReview,
      },
      topServices,
      driverReadiness: {
        approvedDrivers: {
          count: approvedDrivers,
          percent: pct(approvedDrivers, totalDrivers),
        },
        pendingReview: {
          count: pendingReview,
          percent: pct(pendingReview, totalDrivers),
        },
        missingLocations: {
          count: missingLocations,
          percent: pct(missingLocations, totalDrivers),
        },
        approvedOnline: {
          count: liveDrivers,
          percent: pct(liveDrivers, approvedDrivers || totalDrivers),
        },
      },
    };
  }
}

Admin.hasValidCoords = hasValidCoords;

module.exports = Admin;
