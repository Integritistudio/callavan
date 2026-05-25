const db = require('./db');

const initializeDatabase = async () => {
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'drivers'
    );
  `;

  try {
    const res = await db.query(tableCheckQuery);
    const tableExists = res.rows[0].exists;

    if (!tableExists) {
      console.log('⏳ [Database] Table "drivers" does not exist. Initializing schema...');
      
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS drivers (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            mobile_number VARCHAR(20) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            company_name VARCHAR(150),
            base_area VARCHAR(100),
            vehicle_type VARCHAR(100),
            short_bio TEXT,
            services_offered JSONB DEFAULT '[]'::jsonb,
            is_approved BOOLEAN DEFAULT FALSE,
            is_live BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await db.query(createTableQuery);
      console.log('✅ [Database] Table "drivers" created successfully!');
    } else {
      console.log('🟢 [Database] Table "drivers" is already active.');
    }

    // Dynamic schema expansion: ensure image url and password reset columns exist on startup
    await db.query(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
      ADD COLUMN IF NOT EXISTS van_image_url TEXT,
      ADD COLUMN IF NOT EXISTS reset_password_otp VARCHAR(10),
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;
    `);

    // Create driver_locations table for decoupled high-frequency live tracking
    await db.query(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        driver_id INTEGER PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
        latitude DECIMAL(9,6) DEFAULT 0.0,
        longitude DECIMAL(9,6) DEFAULT 0.0,
        is_live BOOLEAN DEFAULT false,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Dynamic schema expansion: ensure is_logged_in column exists on startup
    await db.query(`
      ALTER TABLE driver_locations 
      ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT false;
    `);

    console.log('✅ [Database] Schema integrity checks verified.');

  } catch (err) {
    console.error('❌ [Database] Failed to check/initialize database tables:', err);
  }
};

module.exports = initializeDatabase;
