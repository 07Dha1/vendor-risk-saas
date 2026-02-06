// Database setup and management
const Database = require('better-sqlite3');
const path = require('path');

// Create or open database file
const db = new Database(path.join(__dirname, 'contracts.db'), { verbose: console.log });

// Create tables if they don't exist
function initializeDatabase() {
  // Contracts table
  const createContractsTable = `
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER,
      upload_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      risk_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Risks table - stores detected risks for each contract
  const createRisksTable = `
    CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      risk_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contract_id) REFERENCES contracts(id)
    )
  `;

  // Vendors table
  const createVendorsTable = `
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      risk_level TEXT DEFAULT 'low',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.exec(createContractsTable);
  db.exec(createRisksTable);
  db.exec(createVendorsTable);

  console.log('✅ Database tables initialized');
}

// Initialize database on startup
initializeDatabase();

// Database functions
const dbFunctions = {
  // Add a new contract
  addContract: (filename, originalName, fileSize) => {
    const stmt = db.prepare(`
      INSERT INTO contracts (filename, original_name, file_size, upload_date, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const uploadDate = new Date().toISOString();
    const result = stmt.run(filename, originalName, fileSize, uploadDate, 'pending');
    
    return {
      id: result.lastInsertRowid,
      filename,
      originalName,
      fileSize,
      uploadDate,
      status: 'pending'
    };
  },

  // Get all contracts
  getAllContracts: () => {
    const stmt = db.prepare('SELECT * FROM contracts ORDER BY created_at DESC');
    return stmt.all();
  },

  // Get contract by ID
  getContractById: (id) => {
    const stmt = db.prepare('SELECT * FROM contracts WHERE id = ?');
    return stmt.get(id);
  },

  // Update contract status
  updateContractStatus: (id, status, riskScore = 0) => {
    const stmt = db.prepare(`
      UPDATE contracts 
      SET status = ?, risk_score = ? 
      WHERE id = ?
    `);
    return stmt.run(status, riskScore, id);
  },

  // Add a risk
  addRisk: (contractId, riskType, severity, description) => {
    const stmt = db.prepare(`
      INSERT INTO risks (contract_id, risk_type, severity, description)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(contractId, riskType, severity, description);
  },

  // Get risks for a contract
  getRisksByContractId: (contractId) => {
    const stmt = db.prepare('SELECT * FROM risks WHERE contract_id = ?');
    return stmt.all(contractId);
  },

  // Get statistics for dashboard
  getStats: () => {
    const totalContracts = db.prepare('SELECT COUNT(*) as count FROM contracts').get();
    const totalRisks = db.prepare('SELECT COUNT(*) as count FROM risks').get();
    const totalVendors = db.prepare('SELECT COUNT(*) as count FROM vendors').get();
    
    return {
      contractsAnalyzed: totalContracts.count,
      risksDetected: totalRisks.count,
      activeVendors: totalVendors.count
    };
  },

  // Delete a contract
  deleteContract: (id) => {
    // First delete associated risks
    const deleteRisks = db.prepare('DELETE FROM risks WHERE contract_id = ?');
    deleteRisks.run(id);
    
    // Then delete the contract
    const deleteContract = db.prepare('DELETE FROM contracts WHERE id = ?');
    return deleteContract.run(id);
  }
};

module.exports = dbFunctions;