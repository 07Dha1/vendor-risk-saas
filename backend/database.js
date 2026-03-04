const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize database
// In production (Render), DB_PATH points to the persistent disk (e.g. /data/contracts.db)
const dbPath = process.env.DB_PATH || path.join(__dirname, 'contracts.db');

// Ensure the directory exists before opening the database
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('✅ Database initialized at:', dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    company TEXT,
    initials TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    vendor_name TEXT,
    status TEXT DEFAULT 'pending',
    analysis_complete INTEGER DEFAULT 0,
    risk_level TEXT,
    risk_score INTEGER DEFAULT 0,
    file_size INTEGER DEFAULT 0,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    risk_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

console.log('✅ Tables created/verified');

// Add AI analysis columns to contracts table (safe: ignore if already exist)
const aiContractColumns = [
  "ALTER TABLE contracts ADD COLUMN ai_summary TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_recommendation TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_recommendation_reason TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_contract_type TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_parties TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_key_dates TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_financial_summary TEXT",
  "ALTER TABLE contracts ADD COLUMN ai_key_clauses TEXT",
];
for (const sql of aiContractColumns) {
  try { db.prepare(sql).run(); } catch (_) { /* column already exists */ }
}

// Add mitigation column to risks table (safe: ignore if already exist)
try { db.prepare("ALTER TABLE risks ADD COLUMN mitigation TEXT").run(); } catch (_) {}

console.log('✅ AI analysis columns ready');

// Add subscription columns to users table (safe: ignore if already exist)
const subscriptionColumns = [
  "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'trial'",
  "ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial'",
  "ALTER TABLE users ADD COLUMN trial_ends_at DATETIME",
  "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT",
  "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT",
  "ALTER TABLE users ADD COLUMN subscription_updated_at DATETIME",
];
for (const sql of subscriptionColumns) {
  try { db.prepare(sql).run(); } catch (_) { /* column already exists */ }
}

// Subscriptions history table
db.prepare(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    amount INTEGER,
    currency TEXT DEFAULT 'inr',
    billing_cycle TEXT DEFAULT 'monthly',
    current_period_start DATETIME,
    current_period_end DATETIME,
    canceled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// Feature usage tracking table (for monthly limits)
db.prepare(`
  CREATE TABLE IF NOT EXISTS feature_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    feature TEXT NOT NULL,
    period_start DATETIME NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, feature, period_start)
  )
`).run();

console.log('✅ Subscription tables ready');

// User functions
db.addUser = function(email, password, name, role = 'user', company = '') {
  try {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    // Set 14-day trial expiry for new users
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, role, company, initials, plan, subscription_status, trial_ends_at)
      VALUES (?, ?, ?, ?, ?, ?, 'trial', 'trial', ?)
    `);
    const result = stmt.run(email, password, name, role, company, initials, trialEndsAt);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding user:', error);
    return { success: false, error: error.message };
  }
};

db.getUserByEmail = function(email) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

db.getUserById = function(id) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

db.getAllUsers = function() {
  try {
    const stmt = db.prepare('SELECT id, email, name, role, status, company, initials, created_at, last_login FROM users ORDER BY created_at DESC');
    return stmt.all();
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

db.updateLastLogin = function(userId) {
  try {
    const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(userId);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

db.updateUserStatus = function(userId, status) {
  try {
    const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
    stmt.run(status, userId);
    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { success: false, error: error.message };
  }
};

db.deleteUser = function(userId) {
  try {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
};

db.getUserStats = function() {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const active = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('active').count;
    const paused = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('paused').count;
    const blocked = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('blocked').count;
    const admins = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count;
    
    return {
      totalUsers: total,
      activeUsers: active,
      pausedUsers: paused,
      blockedUsers: blocked,
      adminUsers: admins
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { totalUsers: 0, activeUsers: 0, pausedUsers: 0, blockedUsers: 0, adminUsers: 0 };
  }
};

// Contract functions
db.addContract = function(userId, filename, filePath, vendorName = null, fileSize = 0) {
  try {
    const stmt = db.prepare(`
      INSERT INTO contracts (user_id, filename, file_path, vendor_name, status, file_size)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);
    const result = stmt.run(userId, filename, filePath, vendorName, fileSize);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding contract:', error);
    return { success: false, error: error.message };
  }
};

db.getAllContracts = function(userId) {
  try {
    const stmt = db.prepare('SELECT * FROM contracts WHERE user_id = ? ORDER BY uploaded_at DESC');
    return stmt.all(userId);
  } catch (error) {
    console.error('Error getting contracts:', error);
    return [];
  }
};

db.getContractById = function(id, userId) {
  try {
    const stmt = db.prepare('SELECT * FROM contracts WHERE id = ? AND user_id = ?');
    return stmt.get(id, userId);
  } catch (error) {
    console.error('Error getting contract:', error);
    return null;
  }
};

db.updateContract = function(id, updates) {
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE contracts SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating contract:', error);
    return { success: false, error: error.message };
  }
};

db.updateContractStatus = function(id, status) {
  try {
    const stmt = db.prepare('UPDATE contracts SET status = ? WHERE id = ?');
    stmt.run(status, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating contract status:', error);
    return { success: false, error: error.message };
  }
};

// Risk functions
db.addRisk = function(contractId, riskType, severity, description, mitigation = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO risks (contract_id, risk_type, severity, description, mitigation)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(contractId, riskType, severity, description, mitigation);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding risk:', error);
    return { success: false, error: error.message };
  }
};

db.getRisksByContractId = function(contractId) {
  try {
    const stmt = db.prepare('SELECT * FROM risks WHERE contract_id = ?');
    return stmt.all(contractId);
  } catch (error) {
    console.error('Error getting risks:', error);
    return [];
  }
};

// Vendor functions
db.getAllVendors = function(userId) {
  try {
    const stmt = db.prepare('SELECT * FROM vendors WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  } catch (error) {
    console.error('Error getting vendors:', error);
    return [];
  }
};

db.addVendor = function(userId, name, contactEmail, contactPhone) {
  try {
    const stmt = db.prepare(`
      INSERT INTO vendors (user_id, name, contact_email, contact_phone)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(userId, name, contactEmail, contactPhone);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding vendor:', error);
    return { success: false, error: error.message };
  }
};

// Stats function
db.getStats = function(userId) {
  try {
    const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE user_id = ?').get(userId).count;
    const riskCount = db.prepare(`
      SELECT COUNT(*) as count FROM risks 
      WHERE contract_id IN (SELECT id FROM contracts WHERE user_id = ?)
    `).get(userId).count;
    const vendorCount = db.prepare('SELECT COUNT(*) as count FROM vendors WHERE user_id = ?').get(userId).count;
    
    return {
      contractsAnalyzed: contractCount,
      risksDetected: riskCount,
      activeVendors: vendorCount
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { contractsAnalyzed: 0, risksDetected: 0, activeVendors: 0 };
  }
};

// Migrate contact_submissions — add support ticket columns safely
const supportColumns = [
  "ALTER TABLE contact_submissions ADD COLUMN user_id INTEGER",
  "ALTER TABLE contact_submissions ADD COLUMN category TEXT DEFAULT 'general'",
  "ALTER TABLE contact_submissions ADD COLUMN admin_reply TEXT",
  "ALTER TABLE contact_submissions ADD COLUMN replied_at DATETIME",
  "ALTER TABLE contact_submissions ADD COLUMN updated_at DATETIME",
];
for (const sql of supportColumns) {
  try { db.prepare(sql).run(); } catch (_) { /* already exists */ }
}

// Contact submission functions
db.addContactSubmission = function(name, email, company, subject, message) {
  try {
    const stmt = db.prepare(`
      INSERT INTO contact_submissions (name, email, company, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, company, subject, message);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding contact submission:', error);
    return { success: false, error: error.message };
  }
};

// Add support ticket from logged-in user
db.addSupportTicket = function(userId, name, email, subject, message, category = 'general') {
  try {
    const result = db.prepare(`
      INSERT INTO contact_submissions (user_id, name, email, subject, message, category, status)
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `).run(userId, name, email, subject, message, category);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    console.error('Error adding support ticket:', e);
    return { success: false, error: e.message };
  }
};

// Get all tickets for a user
db.getTicketsByUserId = function(userId) {
  try {
    return db.prepare('SELECT * FROM contact_submissions WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  } catch (e) { return []; }
};

// Admin: get all submissions (including tickets) joined with user info
db.getAllContactSubmissions = function() {
  try {
    return db.prepare(`
      SELECT cs.*, u.name AS user_name, u.email AS user_email_addr
      FROM contact_submissions cs
      LEFT JOIN users u ON cs.user_id = u.id
      ORDER BY cs.created_at DESC
    `).all();
  } catch (error) {
    console.error('Error getting contact submissions:', error);
    return [];
  }
};

db.getContactStats = function() {
  try {
    const total      = db.prepare('SELECT COUNT(*) as count FROM contact_submissions').get().count;
    const openCount  = db.prepare("SELECT COUNT(*) as count FROM contact_submissions WHERE status IN ('new','open')").get().count;
    const inProgress = db.prepare("SELECT COUNT(*) as count FROM contact_submissions WHERE status = 'in_progress'").get().count;
    const resolved   = db.prepare("SELECT COUNT(*) as count FROM contact_submissions WHERE status = 'resolved'").get().count;
    return { total, new: openCount, inProgress, resolved };
  } catch (error) {
    console.error('Error getting contact stats:', error);
    return { total: 0, new: 0, inProgress: 0, resolved: 0 };
  }
};

// Admin: update ticket status
db.updateTicketStatus = function(ticketId, status) {
  try {
    db.prepare('UPDATE contact_submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, ticketId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

// Admin: reply to a ticket
db.replyToTicket = function(ticketId, reply) {
  try {
    db.prepare(`
      UPDATE contact_submissions
      SET admin_reply = ?, replied_at = CURRENT_TIMESTAMP, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reply, ticketId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

console.log('✅ Contact submissions table ready');

// Update user profile (name)
db.updateUserProfile = function(userId, name) {
  try {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const stmt = db.prepare('UPDATE users SET name = ?, initials = ? WHERE id = ?');
    stmt.run(name, initials, userId);
    return { success: true, initials };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Delete a contract owned by a user
db.deleteContractByUser = function(contractId, userId) {
  try {
    const stmt = db.prepare('DELETE FROM contracts WHERE id = ? AND user_id = ?');
    const result = stmt.run(contractId, userId);
    return { success: result.changes > 0 };
  } catch (error) {
    console.error('Error deleting contract:', error);
    return { success: false, error: error.message };
  }
};

// Delete a vendor owned by a user
db.deleteVendorByUser = function(vendorId, userId) {
  try {
    const stmt = db.prepare('DELETE FROM vendors WHERE id = ? AND user_id = ?');
    const result = stmt.run(vendorId, userId);
    return { success: result.changes > 0 };
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return { success: false, error: error.message };
  }
};

// Password reset token functions
db.saveResetToken = function(userId, token, expiresAt) {
  try {
    // Remove any existing tokens for this user first
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);
    const stmt = db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, token, expiresAt);
    return { success: true };
  } catch (error) {
    console.error('Error saving reset token:', error);
    return { success: false, error: error.message };
  }
};

db.getResetToken = function(token) {
  try {
    const stmt = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?');
    return stmt.get(token);
  } catch (error) {
    console.error('Error getting reset token:', error);
    return null;
  }
};

db.deleteResetToken = function(token) {
  try {
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
    return { success: true };
  } catch (error) {
    console.error('Error deleting reset token:', error);
    return { success: false };
  }
};

db.updateUserPassword = function(userId, hashedPassword) {
  try {
    const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    stmt.run(hashedPassword, userId);
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }
};

// ─── Subscription / Plan helper functions ────────────────────────────────────

db.getUserPlan = function(userId) {
  try {
    const stmt = db.prepare(
      'SELECT plan, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?'
    );
    return stmt.get(userId);
  } catch (error) {
    console.error('Error getting user plan:', error);
    return null;
  }
};

db.updateUserPlan = function(userId, plan, status, stripeCustomerId = null, stripeSubId = null) {
  try {
    const stmt = db.prepare(`
      UPDATE users
      SET plan = ?, subscription_status = ?, stripe_customer_id = ?, stripe_subscription_id = ?, subscription_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(plan, status, stripeCustomerId, stripeSubId, userId);
    return { success: true };
  } catch (error) {
    console.error('Error updating user plan:', error);
    return { success: false, error: error.message };
  }
};

db.getUserByStripeCustomerId = function(stripeCustomerId) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?');
    return stmt.get(stripeCustomerId);
  } catch (error) {
    console.error('Error getting user by stripe customer id:', error);
    return null;
  }
};

db.getUserByStripeSubId = function(stripeSubId) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE stripe_subscription_id = ?');
    return stmt.get(stripeSubId);
  } catch (error) {
    console.error('Error getting user by stripe sub id:', error);
    return null;
  }
};

db.addSubscriptionRecord = function(userId, plan, status, stripeData = {}) {
  try {
    const stmt = db.prepare(`
      INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, stripe_customer_id, amount, currency, billing_cycle, current_period_start, current_period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId, plan, status,
      stripeData.subscriptionId || null,
      stripeData.customerId || null,
      stripeData.amount || null,
      stripeData.currency || 'inr',
      stripeData.billingCycle || 'monthly',
      stripeData.periodStart || null,
      stripeData.periodEnd || null
    );
    return { success: true };
  } catch (error) {
    console.error('Error adding subscription record:', error);
    return { success: false, error: error.message };
  }
};

db.getSubscriptionHistory = function(userId) {
  try {
    const stmt = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  } catch (error) {
    console.error('Error getting subscription history:', error);
    return [];
  }
};

db.getContractCountThisMonth = function(userId) {
  try {
    // Start of current month in ISO format
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM contracts WHERE user_id = ? AND uploaded_at >= ?"
    );
    return stmt.get(userId, monthStart).count;
  } catch (error) {
    console.error('Error getting contract count:', error);
    return 0;
  }
};

db.getVendorCount = function(userId) {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM vendors WHERE user_id = ?');
    return stmt.get(userId).count;
  } catch (error) {
    console.error('Error getting vendor count:', error);
    return 0;
  }
};

// ─── Compliance tables ────────────────────────────────────────────────────────

db.prepare(`
  CREATE TABLE IF NOT EXISTS vendor_certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vendor_name TEXT NOT NULL,
    standard TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    issued_date TEXT,
    expiry_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS risk_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contract_name TEXT,
    risk_type TEXT,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS vendor_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vendor_name TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    owner TEXT,
    status TEXT DEFAULT 'pending',
    due_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

console.log('✅ Compliance tables ready');

// ─── vendor_certifications helpers ───────────────────────────────────────────

db.getCertifications = function(userId) {
  try {
    return db.prepare('SELECT * FROM vendor_certifications WHERE user_id = ? ORDER BY expiry_date ASC').all(userId);
  } catch (e) { return []; }
};

db.addCertification = function(userId, data) {
  try {
    const result = db.prepare(`
      INSERT INTO vendor_certifications (user_id, vendor_name, standard, status, issued_date, expiry_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, data.vendor_name, data.standard, data.status || 'active', data.issued_date || null, data.expiry_date || null, data.notes || null);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) { return { success: false, error: e.message }; }
};

db.updateCertification = function(id, userId, data) {
  try {
    db.prepare(`
      UPDATE vendor_certifications SET vendor_name=?, standard=?, status=?, issued_date=?, expiry_date=?, notes=?
      WHERE id=? AND user_id=?
    `).run(data.vendor_name, data.standard, data.status, data.issued_date || null, data.expiry_date || null, data.notes || null, id, userId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

db.deleteCertification = function(id, userId) {
  try {
    db.prepare('DELETE FROM vendor_certifications WHERE id=? AND user_id=?').run(id, userId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

db.getExpiringCertifications = function(userId, days) {
  try {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today  = new Date().toISOString().slice(0, 10);
    return db.prepare(`
      SELECT * FROM vendor_certifications
      WHERE user_id=? AND expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ? AND status != 'expired'
      ORDER BY expiry_date ASC
    `).all(userId, today, cutoff);
  } catch (e) { return []; }
};

// ─── audit_logs helpers ───────────────────────────────────────────────────────

db.addAuditLog = function(userId, action, entityType, entityId, description) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, action, entityType || null, entityId || null, description || null);
  } catch (e) { /* non-critical */ }
};

db.getAuditLogs = function(userId, limit) {
  try {
    return db.prepare('SELECT * FROM audit_logs WHERE user_id=? ORDER BY created_at DESC LIMIT ?').all(userId, limit || 100);
  } catch (e) { return []; }
};

// ─── risk_actions helpers ─────────────────────────────────────────────────────

db.getRiskActions = function(userId) {
  try {
    return db.prepare('SELECT * FROM risk_actions WHERE user_id=? ORDER BY created_at DESC').all(userId);
  } catch (e) { return []; }
};

db.addRiskAction = function(userId, data) {
  try {
    const result = db.prepare(`
      INSERT INTO risk_actions (user_id, contract_name, risk_type, title, description, assignee, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, data.contract_name || null, data.risk_type || null, data.title, data.description || null,
           data.assignee || null, data.status || 'open', data.priority || 'medium', data.due_date || null);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) { return { success: false, error: e.message }; }
};

db.updateRiskAction = function(id, userId, data) {
  try {
    db.prepare(`
      UPDATE risk_actions SET title=?, description=?, assignee=?, status=?, priority=?, due_date=?, contract_name=?, risk_type=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND user_id=?
    `).run(data.title, data.description || null, data.assignee || null, data.status, data.priority, data.due_date || null,
           data.contract_name || null, data.risk_type || null, id, userId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

db.deleteRiskAction = function(id, userId) {
  try {
    db.prepare('DELETE FROM risk_actions WHERE id=? AND user_id=?').run(id, userId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

// ─── vendor_assessments helpers ───────────────────────────────────────────────

db.getAssessments = function(userId) {
  try {
    return db.prepare('SELECT * FROM vendor_assessments WHERE user_id=? ORDER BY created_at DESC').all(userId);
  } catch (e) { return []; }
};

db.addAssessment = function(userId, data) {
  try {
    const result = db.prepare(`
      INSERT INTO vendor_assessments (user_id, vendor_name, priority, owner, status, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, data.vendor_name, data.priority || 'medium', data.owner || null, data.status || 'pending', data.due_date || null, data.notes || null);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) { return { success: false, error: e.message }; }
};

db.updateAssessment = function(id, userId, data) {
  try {
    db.prepare(`
      UPDATE vendor_assessments SET vendor_name=?, priority=?, owner=?, status=?, due_date=?, notes=?
      WHERE id=? AND user_id=?
    `).run(data.vendor_name, data.priority, data.owner || null, data.status, data.due_date || null, data.notes || null, id, userId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

db.deleteAssessment = function(id, userId) {
  try {
    db.prepare('DELETE FROM vendor_assessments WHERE id=? AND user_id=?').run(id, userId);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
};

// ─── Report Schedule helpers ──────────────────────────────────────────────────

db.prepare(`
  CREATE TABLE IF NOT EXISTS report_schedules (
    user_id  INTEGER PRIMARY KEY,
    frequency TEXT NOT NULL,
    email     TEXT NOT NULL,
    last_sent DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.saveReportSchedule = function(userId, frequency, email) {
  try {
    db.prepare(`
      INSERT INTO report_schedules (user_id, frequency, email)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET frequency = excluded.frequency, email = excluded.email
    `).run(userId, frequency, email);
    return { success: true };
  } catch (e) {
    console.error('Error saving report schedule:', e);
    return { success: false };
  }
};

db.getReportSchedule = function(userId) {
  try {
    return db.prepare('SELECT * FROM report_schedules WHERE user_id = ?').get(parseInt(userId));
  } catch (e) {
    return null;
  }
};

// ─── Admin helpers ────────────────────────────────────────────────────────────

db.getAllUsersWithSubscriptions = function() {
  try {
    return db.prepare(`
      SELECT id, email, name, company, role, status, created_at,
             plan, subscription_status, trial_ends_at,
             stripe_customer_id, stripe_subscription_id, subscription_updated_at
      FROM users ORDER BY created_at DESC
    `).all();
  } catch (e) { console.error(e); return []; }
};

db.getAllSubscriptionRecords = function() {
  try {
    return db.prepare(`
      SELECT s.*, u.email, u.name
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `).all();
  } catch (e) { console.error(e); return []; }
};

db.getRevenueMetrics = function() {
  const PLAN_PRICES = { basic: 2999, professional: 8999, enterprise: 24999 };
  try {
    const activeUsers   = db.prepare(`SELECT plan FROM users WHERE subscription_status = 'active'`).all();
    const mrr           = activeUsers.reduce((sum, u) => sum + (PLAN_PRICES[u.plan] || 0), 0);
    const planCounts    = db.prepare(`SELECT plan, COUNT(*) as count FROM users GROUP BY plan`).all();
    const totalRevenue  = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM subscriptions WHERE status != 'refunded'`).get().total;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM subscriptions WHERE created_at >= ? AND status != 'refunded'`).get(thirtyDaysAgo).total;
    const churned       = db.prepare(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'canceled' AND created_at >= ?`).get(thirtyDaysAgo).count;
    return { mrr, arr: mrr * 12, totalRevenue, recentRevenue, churned, planCounts };
  } catch (e) {
    return { mrr: 0, arr: 0, totalRevenue: 0, recentRevenue: 0, churned: 0, planCounts: [] };
  }
};

module.exports = db;