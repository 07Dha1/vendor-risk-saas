const db = require('./database');
const bcrypt = require('bcryptjs');

async function createAdminAndTestUser() {
  try {
    console.log('🔧 Creating users...');

    // Delete existing users first
    const Database = require('better-sqlite3');
    const dbInstance = new Database('./contracts.db');
    
    try {
      dbInstance.prepare('DELETE FROM users WHERE email = ?').run('admin@vendorshield.com');
      dbInstance.prepare('DELETE FROM users WHERE email = ?').run('user1@example.com');
      console.log('✅ Cleared existing users');
    } catch (err) {
      // Ignore if users don't exist
    }
    dbInstance.close();

    // Hash passwords properly
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Create admin
    const admin = db.addUser(
      'admin@vendorshield.com',
      adminPassword,
      'Admin User',
      'admin'
    );
    console.log('✅ Admin created:', {
      email: 'admin@vendorshield.com',
      password: 'admin123',
      role: 'admin'
    });

    // Create test user
    const user = db.addUser(
      'user1@example.com',
      userPassword,
      'Test User',
      'user'
    );
    console.log('✅ Test user created:', {
      email: 'user1@example.com',
      password: 'user123',
      role: 'user'
    });

    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Login credentials:');
    console.log('Admin: admin@vendorshield.com / admin123');
    console.log('User: user1@example.com / user123');

  } catch (error) {
    console.error('❌ Failed to create users:', error.message);
    process.exit(1);
  }
}

createAdminAndTestUser();