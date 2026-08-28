const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seedAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@callavan.live';
  const password = args[1] || 'AdminPass123';

  console.log('⏳ Hashing password...');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log(`⏳ Seeding admin with email: ${email}...`);
  try {
    // Check if table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        reset_password_otp VARCHAR(10),
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert or update
    const insertQuery = `
      INSERT INTO admins (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email;
    `;
    const res = await db.query(insertQuery, [email.toLowerCase().trim(), hash]);
    console.log(`✅ Admin seeded successfully! ID: ${res.rows[0].id}, Email: ${res.rows[0].email}`);
    console.log(`🔑 Login Password: ${password}`);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
  } finally {
    // End the pool so script exits cleanly
    db.pool.end();
  }
}

seedAdmin();
