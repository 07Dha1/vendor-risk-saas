// Import required libraries
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const analyzer = require('./analyzer');

// Create the Express app (our server)
const app = express();

// Middleware - these help our server understand different types of data
app.use(cors()); // Allows frontend to talk to backend
app.use(bodyParser.json()); // Helps read JSON data
app.use(bodyParser.urlencoded({ extended: true })); // Helps read form data

// Define the port (address) where our server will run
const PORT = 5000;

// Test route - this is like a "hello world" to check if server works
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Backend server is running!',
    timestamp: new Date().toISOString()
  });
});

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept PDF and Word documents only
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Upload endpoint with AI analysis
app.post('/api/upload', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file uploaded' 
      });
    }

    console.log('✅ File uploaded:', req.file.filename);

    // Save contract info to database (status: analyzing)
    const contract = db.addContract(
      req.file.filename,
      req.file.originalname,
      req.file.size
    );

    console.log('✅ Contract saved to database:', contract);

    // Start AI analysis in the background
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    
    console.log('🤖 Starting AI analysis...');
    const analysis = await analyzer.analyzeContract(filePath);

    if (analysis.success) {
      // Update contract status and risk score
      db.updateContractStatus(contract.id, 'analyzed', analysis.riskScore);
      
      // Save detected risks to database
      analysis.risks.forEach(risk => {
        db.addRisk(
          contract.id,
          risk.type,
          risk.severity,
          risk.description
        );
      });

      console.log(`✅ Analysis complete: ${analysis.riskCount} risks detected`);
    } else {
      // Mark as failed
      db.updateContractStatus(contract.id, 'failed', 0);
      console.log('❌ Analysis failed');
    }

    res.json({
      status: 'success',
      message: 'Contract uploaded and analyzed successfully!',
      file: {
        id: contract.id,
        filename: contract.filename,
        originalName: contract.originalName,
        size: contract.fileSize,
        uploadedAt: contract.uploadDate
      },
      analysis: {
        risksDetected: analysis.riskCount,
        riskScore: analysis.riskScore,
        status: analysis.success ? 'analyzed' : 'failed'
      }
    });
  } catch (error) {
    console.error('Upload/Analysis error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Upload or analysis failed' 
    });
  }
});

// Get list of uploaded contracts
app.get('/api/contracts', (req, res) => {
  try {
    const contracts = db.getAllContracts();

    res.json({
      status: 'success',
      count: contracts.length,
      contracts
    });
  } catch (error) {
    console.error('Error reading contracts:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve contracts' 
    });
  }
});

// Get dashboard statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    
    res.json({
      status: 'success',
      stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve statistics' 
    });
  }
});

// Get contract analysis details
app.get('/api/contracts/:id/analysis', (req, res) => {
  try {
    const contractId = req.params.id;
    
    // Get contract info
    const contract = db.getContractById(contractId);
    
    if (!contract) {
      return res.status(404).json({
        status: 'error',
        message: 'Contract not found'
      });
    }
    
    // Get detected risks
    const risks = db.getRisksByContractId(contractId);
    
    res.json({
      status: 'success',
      contract: {
        id: contract.id,
        filename: contract.original_name,
        uploadDate: contract.upload_date,
        status: contract.status,
        riskScore: contract.risk_score
      },
      risks: risks,
      riskCount: risks.length
    });
  } catch (error) {
    console.error('Error getting analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve analysis'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
  console.log(`📡 Test it at: http://localhost:${PORT}/api/health`);
});