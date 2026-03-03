// Seed script to create initial admin user
const db = require('./database');

console.log('🌱 Seeding admin user...');

try {
  // Check if admin already exists
  const existingAdmin = db.getUserByEmail('admin@vendorshield.com');
  
  if (existingAdmin) {
    console.log('⚠️  Admin user already exists!');
    console.log('📧 Email:', existingAdmin.email);
    console.log('👤 Name:', existingAdmin.name);
    console.log('🎭 Role:', existingAdmin.role);
    process.exit(0);
  }
  
  // Create admin user
  // In production, you would hash the password properly
  const admin = db.addUser(
    'admin@vendorshield.com',
    'admin123', // Change this to a secure password in production!
    'Admin User',
    'admin',
    'VendorShield'
  );
  
  console.log('✅ Admin user created successfully!');
  console.log('');
  console.log('📧 Email: admin@vendorshield.com');
  console.log('🔑 Password: admin123');
  console.log('👤 Name:', admin.name);
  console.log('🎭 Role:', admin.role);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the password after first login!');
  
  // Also create a regular demo user
  const demoUser = db.addUser(
    'demo@vendorshield.com',
    'demo123',
    'Demo User',
    'user',
    'Demo Company'
  );
  
  console.log('');
  console.log('✅ Demo user created!');
  console.log('📧 Email: demo@vendorshield.com');
  console.log('🔑 Password: demo123');
  
} catch (error) {
  console.error('❌ Error seeding admin:', error);
  process.exit(1);
}