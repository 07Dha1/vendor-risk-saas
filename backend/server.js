require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const PDFParser = require('pdf2json');
const db = require('./database');
const stripeRouter      = require('./routes/stripe');
const subscriptionRouter = require('./routes/subscription');
const reportsRouter      = require('./routes/reports');
const complianceRouter   = require('./routes/compliance');
const { checkContractLimit, checkVendorLimit, requireFeature, getEffectivePlan } = require('./middleware/featureGate');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware — open CORS (auth uses localStorage, not cookies)
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
// Raw body required for Stripe webhook signature verification — must come BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Subscription / Stripe routes ────────────────────────────────────────────
app.use('/api/stripe', stripeRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/compliance', complianceRouter);

// Configure multer for file uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed!'));
    }
  }
});

// ─── PDF text extraction helper ───────────────────────────────────────────────
async function extractPdfText(filePath) {
  const pdfParser = new PDFParser();
  let text = await new Promise((resolve) => {
    pdfParser.on('pdfParser_dataError', () => resolve(''));
    pdfParser.on('pdfParser_dataReady', () => {
      try { resolve(pdfParser.getRawTextContent() || ''); }
      catch (_) { resolve(''); }
    });
    pdfParser.loadPDF(filePath);
  });
  if (!text || text.trim().length === 0) {
    text = `Contract document: ${path.basename(filePath)}. Unable to extract text content from this PDF format.`;
  }
  return text;
}

// ─── Gemini API helper ────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
  return data.candidates[0].content.parts[0].text;
}

// ─── Parse JSON from AI response (strips markdown fences) ────────────────────
function parseJsonResponse(text) {
  let jsonText = text;
  if (text.includes('```json')) jsonText = text.split('```json')[1].split('```')[0].trim();
  else if (text.includes('```')) jsonText = text.split('```')[1].split('```')[0].trim();
  return JSON.parse(jsonText);
}

// ─── AI Analysis Function ─────────────────────────────────────────────────────
async function analyzeContract(filePath, contractId, userId = null) {
  try {
    console.log('📄 Extracting text from:', filePath);
    const text = await extractPdfText(filePath);
    console.log(`✅ Extracted ${text.length} characters`);

    // Check plan — trial users only get keyword detection, no rich AI
    let richAiEnabled = true;
    if (userId) {
      const planRow = db.getUserPlan(userId);
      const effectivePlan = getEffectivePlan(planRow);
      if (effectivePlan === 'trial') {
        richAiEnabled = false;
        console.log('ℹ️ Trial plan — skipping rich AI, keyword detection only');
      }
    }

    // PHASE 1: KEYWORD DETECTION (fast fallback)
    console.log('🔍 Phase 1: Keyword detection...');
    const keywordRisks = [];
    const textLower = text.toLowerCase();

    if (textLower.includes('indemnif') || textLower.includes('hold harmless')) {
      keywordRisks.push({ type: 'Indemnification', severity: textLower.includes('broad') || textLower.includes('unlimited') ? 'High' : 'Medium', description: 'Contract contains indemnification clauses that may impose liability', mitigation: null });
    }
    if (textLower.includes('auto-renew') || textLower.includes('automatically renew')) {
      keywordRisks.push({ type: 'Auto-Renewal', severity: 'Medium', description: 'Contract may automatically renew unless cancelled in advance', mitigation: null });
    }
    if (textLower.includes('termination') && (textLower.includes('without cause') || textLower.includes('at will'))) {
      keywordRisks.push({ type: 'Termination Without Cause', severity: 'High', description: 'Either party can terminate without providing a reason', mitigation: null });
    }
    const noticeMatch = textLower.match(/(\d+)\s*day.*notice/i);
    if (noticeMatch && parseInt(noticeMatch[1]) < 30) {
      const days = parseInt(noticeMatch[1]);
      keywordRisks.push({ type: 'Short Termination Notice', severity: days < 15 ? 'High' : 'Medium', description: `Only ${days} days notice required for termination`, mitigation: null });
    }
    if (textLower.includes('limit') && textLower.includes('liability')) {
      keywordRisks.push({ type: 'Liability Limits', severity: 'Medium', description: 'Contract contains limitations on liability exposure', mitigation: null });
    }
    if (textLower.includes('insurance') && textLower.includes('require')) {
      keywordRisks.push({ type: 'Insurance Requirements', severity: 'Low', description: 'Specific insurance coverage may be required', mitigation: null });
    }
    if (textLower.includes('confidential') || textLower.includes('non-disclosure')) {
      keywordRisks.push({ type: 'Confidentiality Requirements', severity: 'Medium', description: 'Contract includes confidentiality obligations', mitigation: null });
    }
    if (textLower.includes('price') && (textLower.includes('increase') || textLower.includes('escalat'))) {
      keywordRisks.push({ type: 'Price Escalation', severity: 'High', description: 'Contract allows for price increases over time', mitigation: null });
    }
    if (textLower.includes('data') && (textLower.includes('breach') || textLower.includes('privacy') || textLower.includes('gdpr'))) {
      keywordRisks.push({ type: 'Data Privacy', severity: 'High', description: 'Contract addresses data handling and privacy requirements', mitigation: null });
    }
    const netMatch = textLower.match(/net\s*(\d+)/i);
    if (netMatch && parseInt(netMatch[1]) > 60) {
      keywordRisks.push({ type: 'Extended Payment Terms', severity: 'Medium', description: `Payment terms of Net ${parseInt(netMatch[1])} may impact cash flow`, mitigation: null });
    }
    console.log(`✅ Keyword detection: ${keywordRisks.length} risks found`);

    // PHASE 2: RICH AI ANALYSIS (basic plan and above only)
    let aiAnalysis = null;
    let aiRisks = [];

    try {
      if (!richAiEnabled) throw new Error('Trial plan — rich AI skipped');
      if (!GEMINI_API_KEY) throw new Error('No API key');
      console.log('🤖 Phase 2: Running rich AI analysis...');

      const maxChars = 30000;
      const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '\n...[truncated]' : text;

      const prompt = `You are an expert legal contract analyst specializing in vendor risk management. Perform a comprehensive analysis of the contract below.

CONTRACT TEXT:
${truncatedText}

Return ONLY valid JSON in this EXACT structure (no markdown, no extra text):
{
  "contract_type": "e.g. Software Services Agreement / NDA / SLA / MSA / Purchase Order",
  "parties": [
    {"role": "e.g. Client / Vendor / Licensor", "name": "Party name from contract"}
  ],
  "key_dates": [
    {"label": "e.g. Effective Date / Expiry / Auto-Renewal Notice Deadline", "date": "exact date or period from contract"}
  ],
  "financial_summary": {
    "total_value": "e.g. $120,000 / ₹50,000/month / not specified",
    "payment_terms": "e.g. Net 30 / upfront / milestone-based",
    "currency": "e.g. INR / USD / EUR",
    "penalties": "e.g. 2% monthly late fee / none mentioned"
  },
  "key_clauses": [
    {
      "title": "Clause name e.g. Liability Cap / IP Ownership / SLA / Exclusivity / Non-compete",
      "importance": "High|Medium|Low",
      "summary": "Plain English explanation of what this clause means for your business",
      "excerpt": "Verbatim or near-verbatim key sentence from the contract (max 200 chars)"
    }
  ],
  "risks": [
    {
      "type": "Risk category name",
      "severity": "High|Medium|Low",
      "description": "Specific explanation of the risk with reference to contract language",
      "mitigation": "Concrete action: specific clause language to add/remove/negotiate, or process to implement"
    }
  ],
  "summary": "2-3 sentence executive summary of overall risk posture and most critical concerns",
  "recommendation": "Approve|Review|Reject",
  "recommendation_reason": "1-2 sentences explaining the recommendation"
}

Rules:
- Extract at least 5 key clauses if present
- Identify all material risks with specific mitigations
- Be specific — reference actual contract terms, not generic advice
- If a field is not found in the contract, use null or "Not specified"`;

      const aiText = await callGemini(prompt);
      console.log('🤖 AI Response received');

      try {
        aiAnalysis = parseJsonResponse(aiText);
        aiRisks = aiAnalysis.risks || [];
        console.log(`✅ AI analysis: ${aiRisks.length} risks, ${(aiAnalysis.key_clauses || []).length} clauses, type: ${aiAnalysis.contract_type}`);
      } catch (parseError) {
        console.log('⚠️ Could not parse AI response, using keyword results only');
      }
    } catch (aiError) {
      console.log('⚠️ AI analysis failed (using keyword results only):', aiError.message);
    }

    // MERGE RISKS (AI wins over keyword for duplicates, since AI has mitigations)
    const allRisks = [...aiRisks];
    for (const kr of keywordRisks) {
      const isDuplicate = allRisks.some(ar =>
        ar.type.toLowerCase().includes(kr.type.toLowerCase().split(' ')[0]) ||
        kr.type.toLowerCase().includes(ar.type.toLowerCase().split(' ')[0])
      );
      if (!isDuplicate) allRisks.push(kr);
    }

    console.log(`🎯 Total risks after merge: ${allRisks.length}`);

    const highRisks   = allRisks.filter(r => r.severity === 'High').length;
    const mediumRisks = allRisks.filter(r => r.severity === 'Medium').length;
    const lowRisks    = allRisks.filter(r => r.severity === 'Low').length;
    const riskScore   = Math.min(100, (highRisks * 20) + (mediumRisks * 10) + (lowRisks * 5));
    const finalRiskLevel = riskScore > 60 ? 'High' : riskScore > 30 ? 'Medium' : 'Low';

    for (const risk of allRisks) {
      await db.addRisk(contractId, risk.type, risk.severity, risk.description, risk.mitigation || null);
    }

    await db.updateContract(contractId, {
      analysis_complete: 1,
      risk_level: finalRiskLevel,
      risk_score: riskScore,
      ai_summary: aiAnalysis?.summary || null,
      ai_recommendation: aiAnalysis?.recommendation || null,
      ai_recommendation_reason: aiAnalysis?.recommendation_reason || null,
      ai_contract_type: aiAnalysis?.contract_type || null,
      ai_parties: aiAnalysis?.parties ? JSON.stringify(aiAnalysis.parties) : null,
      ai_key_dates: aiAnalysis?.key_dates ? JSON.stringify(aiAnalysis.key_dates) : null,
      ai_financial_summary: aiAnalysis?.financial_summary ? JSON.stringify(aiAnalysis.financial_summary) : null,
      ai_key_clauses: aiAnalysis?.key_clauses ? JSON.stringify(aiAnalysis.key_clauses) : null,
    });

    const contractRow = db.prepare('SELECT user_id, filename FROM contracts WHERE id = ?').get(contractId);
    if (contractRow) {
      db.addAuditLog(contractRow.user_id, 'ANALYSIS_COMPLETE', 'contract', contractId,
        `AI analysis complete for "${contractRow.filename}" — Risk: ${finalRiskLevel} (${riskScore})`);
    }

    console.log(`✅ Analysis complete and saved to database`);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    await db.updateContractStatus(contractId, 'analysis_failed');
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Upload contract
app.post('/api/contracts/upload', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file uploaded' 
      });
    }

    // Get user ID from request body
    const userId = req.body.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID required'
      });
    }

    console.log('✅ File uploaded:', req.file.filename, 'by user:', userId);

    // Check contract upload limit for this user's plan
    const limitCheck = checkContractLimit(userId);
    if (!limitCheck.allowed) {
      fs.unlinkSync(req.file.path); // remove uploaded file
      return res.status(403).json({
        status: 'error',
        error: 'LIMIT_REACHED',
        message: `You've used ${limitCheck.used}/${limitCheck.limit} contracts this month. Upgrade your plan to upload more.`,
        used: limitCheck.used,
        limit: limitCheck.limit,
      });
    }

    // Save to database with user ID
    const result = db.addContract(userId, req.file.filename, req.file.path, null, req.file.size);
    console.log('✅ Contract saved to database:', result);

    if (result.success) {
      db.addAuditLog(userId, 'CONTRACT_UPLOAD', 'contract', result.id,
        `Uploaded contract "${req.file.filename}"`);
      // Start AI analysis in background
      console.log('🤖 Starting AI analysis...');
      analyzeContract(req.file.path, result.id, userId);

      res.json({
        status: 'success',
        message: 'Contract uploaded successfully',
        contractId: result.id,
        filename: req.file.filename
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to save contract to database'
      });
    }
  } catch (error) {
    console.error('Upload/Analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Get all contracts (user-specific)
app.post('/api/contracts', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID required'
      });
    }

    const contracts = db.getAllContracts(userId);
    res.json({
      status: 'success',
      contracts: contracts
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contracts'
    });
  }
});

// Get all vendors (user-specific)
app.post('/api/vendors', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID required'
      });
    }

    const vendors = db.getAllVendors(userId);
    res.json({
      status: 'success',
      vendors: vendors || []
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch vendors',
      vendors: []
    });
  }
});

// Add vendor (user-specific)
app.post('/api/vendors/add', (req, res) => {
  try {
    const { userId, name, contactEmail, contactPhone } = req.body;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID required'
      });
    }

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Vendor name is required'
      });
    }

    // Check vendor limit for this user's plan
    const vendorLimitCheck = checkVendorLimit(userId);
    if (!vendorLimitCheck.allowed) {
      return res.status(403).json({
        status: 'error',
        error: 'LIMIT_REACHED',
        message: `You've reached the ${vendorLimitCheck.limit} vendor limit for your plan. Upgrade to add more.`,
        used: vendorLimitCheck.used,
        limit: vendorLimitCheck.limit,
      });
    }

    const result = db.addVendor(userId, name, contactEmail, contactPhone);

    if (result.success) {
      db.addAuditLog(userId, 'VENDOR_ADD', 'vendor', result.id, `Added vendor "${name}"`);
      res.json({
        status: 'success',
        message: 'Vendor added successfully',
        vendorId: result.id
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to add vendor'
      });
    }
  } catch (error) {
    console.error('Error adding vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add vendor'
    });
  }
});

// Link contract to vendor
app.post('/api/contracts/:id/link-vendor', (req, res) => {
  try {
    const contractId = req.params.id;
    const { vendorName } = req.body;

    if (!vendorName) {
      return res.status(400).json({
        status: 'error',
        message: 'Vendor name is required'
      });
    }

    const result = db.updateContract(contractId, {
      vendor_name: vendorName
    });

    if (result.success) {
      res.json({
        status: 'success',
        message: 'Vendor linked successfully'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to link vendor'
      });
    }
  } catch (error) {
    console.error('Error linking vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to link vendor'
    });
  }
});

// Get contract analysis (user-specific)
app.post('/api/contracts/:id/analysis', (req, res) => {
  try {
    const contractId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID required'
      });
    }

    const contract = db.getContractById(contractId, userId);
    
    if (!contract) {
      return res.status(404).json({
        status: 'error',
        message: 'Contract not found'
      });
    }

    const risks = db.getRisksByContractId(contractId);

    res.json({
      status: 'success',
      contract: contract,
      risks: risks
    });
  } catch (error) {
    console.error('Error getting analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get analysis'
    });
  }
});

// Chat with a contract (AI Q&A) — requires Professional plan
app.post('/api/contracts/:id/chat', requireFeature('ai_contract_chat'), async (req, res) => {
  try {
    const contractId = req.params.id;
    const { userId, question } = req.body;

    if (!userId || !question) {
      return res.status(400).json({ status: 'error', message: 'userId and question are required' });
    }

    const contract = db.getContractById(contractId, userId);
    if (!contract) {
      return res.status(404).json({ status: 'error', message: 'Contract not found' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(503).json({ status: 'error', message: 'AI service not configured' });
    }

    // Build context: use stored AI analysis fields + re-extract PDF text if available
    let contractContext = '';
    if (contract.ai_summary) contractContext += `SUMMARY: ${contract.ai_summary}\n\n`;
    if (contract.ai_contract_type) contractContext += `CONTRACT TYPE: ${contract.ai_contract_type}\n\n`;
    if (contract.ai_key_clauses) {
      try {
        const clauses = JSON.parse(contract.ai_key_clauses);
        contractContext += `KEY CLAUSES:\n${clauses.map(c => `- ${c.title}: ${c.summary}`).join('\n')}\n\n`;
      } catch (_) {}
    }

    // Also include raw PDF text for deeper answers
    let rawText = '';
    try {
      rawText = await extractPdfText(contract.file_path);
      if (rawText.length > 20000) rawText = rawText.substring(0, 20000) + '\n...[truncated]';
    } catch (_) {}

    const prompt = `You are an expert contract analyst assistant. Answer the user's question about this contract accurately and concisely. Base your answer only on the contract content provided.

CONTRACT CONTEXT:
${contractContext}

FULL CONTRACT TEXT:
${rawText}

USER QUESTION: ${question}

Provide a clear, direct answer. If the information is not in the contract, say so explicitly. Do not make up information.`;

    const answer = await callGemini(prompt);

    res.json({ status: 'success', answer });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get AI answer' });
  }
});

// Get stats (user-specific)
app.post('/api/stats', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID required'
      });
    }

    const stats = db.getStats(userId);
    res.json({
      status: 'success',
      stats: stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get stats'
    });
  }
});

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, password, and name are required'
      });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    const result = db.addUser(email, password, name);

    if (result.success) {
      const user = db.getUserById(result.id);
      res.json({
        status: 'success',
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          initials: user.initials
        }
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to create user'
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Signup failed'
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    const user = db.getUserByEmail(email);

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // CHECK USER STATUS - NEW CODE
    if (user.status === 'paused') {
      console.log('⏸️ User account is paused:', email);
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been paused. Please contact support.'
      });
    }

    if (user.status === 'blocked') {
      console.log('🚫 User account is blocked:', email);
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Update last login
    db.updateLastLogin(user.id);

    console.log('✅ Login successful for:', email);
    res.json({
      status: 'success',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase()
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed. Please try again.'
    });
  }
});

// One-time admin setup — promotes a user to admin using a secret token
// Usage: POST /api/admin/setup  { "email": "you@example.com", "secret": "<ADMIN_SETUP_SECRET>" }
app.post('/api/admin/setup', (req, res) => {
  const { email, secret } = req.body;
  const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET;
  if (!SETUP_SECRET) return res.status(403).json({ status: 'error', message: 'Admin setup not enabled' });
  if (secret !== SETUP_SECRET) return res.status(403).json({ status: 'error', message: 'Invalid secret' });
  const user = db.getUserByEmail(email);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
  res.json({ status: 'success', message: `${email} is now an admin` });
});

// Admin Routes
app.post('/api/admin/users', (req, res) => {
  try {
    const { userId } = req.body;
    
    const requestUser = db.getUserById(userId);
    if (!requestUser || requestUser.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const users = db.getAllUsers();
    res.json({
      status: 'success',
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

app.post('/api/admin/stats', (req, res) => {
  try {
    const { userId } = req.body;
    
    const requestUser = db.getUserById(userId);
    if (!requestUser || requestUser.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const stats = db.getUserStats();
    res.json({
      status: 'success',
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch stats'
    });
  }
});

app.post('/api/admin/users/:id/status', (req, res) => {
  try {
    const { userId, status } = req.body;
    const targetUserId = req.params.id;
    
    const requestUser = db.getUserById(userId);
    if (!requestUser || requestUser.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    if (parseInt(userId) === parseInt(targetUserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot modify your own status'
      });
    }

    const result = db.updateUserStatus(targetUserId, status);
    
    if (result.success) {
      res.json({
        status: 'success',
        message: 'User status updated'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to update user status'
      });
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user status'
    });
  }
});

app.post('/api/admin/users/:id/delete', (req, res) => {
  try {
    const { userId } = req.body;
    const targetUserId = req.params.id;
    
    const requestUser = db.getUserById(userId);
    if (!requestUser || requestUser.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    if (parseInt(userId) === parseInt(targetUserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    const result = db.deleteUser(targetUserId);
    
    if (result.success) {
      res.json({
        status: 'success',
        message: 'User deleted'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete user'
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
});

// Contact Form Routes
app.post('/api/contact/submit', (req, res) => {
  try {
    const { name, email, company, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, subject, and message are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
    }

    const result = db.addContactSubmission(name, email, company, subject, message);

    if (result.success) {
      res.json({
        status: 'success',
        message: 'Message sent successfully'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send message'
      });
    }
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
});

app.post('/api/admin/contact/submissions', (req, res) => {
  try {
    const { userId } = req.body;
    
    const requestUser = db.getUserById(userId);
    if (!requestUser || requestUser.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const submissions = db.getAllContactSubmissions();
    res.json({
      status: 'success',
      submissions: submissions
    });
  } catch (error) {
    console.error('Error getting contact submissions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get submissions'
    });
  }
});

app.post('/api/admin/contact/stats', (req, res) => {
  try {
    const { userId } = req.body;
    
    const requestUser = db.getUserById(userId);
    if (!requestUser || requestUser.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const stats = db.getContactStats();
    res.json({
      status: 'success',
      stats: stats
    });
  } catch (error) {
    console.error('Error getting contact stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get stats'
    });
  }
});

// ─── Support Ticket Routes (logged-in users) ─────────────────────────────────

// Submit a support ticket (logged-in user)
app.post('/api/support/submit', (req, res) => {
  try {
    const { userId, subject, message, category } = req.body;
    if (!userId || !subject || !message) {
      return res.status(400).json({ status: 'error', message: 'userId, subject, and message are required' });
    }
    const user = db.getUserById(userId);
    if (!user) return res.status(401).json({ status: 'error', message: 'User not found' });

    const result = db.addSupportTicket(userId, user.name, user.email, subject, message, category || 'general');
    if (result.success) {
      db.addAuditLog(userId, 'SUPPORT_TICKET', 'contact_submission', result.id, `Support ticket submitted: "${subject}"`);
      res.json({ status: 'success', message: 'Support ticket submitted', id: result.id });
    } else {
      res.status(500).json({ status: 'error', message: 'Failed to submit ticket' });
    }
  } catch (error) {
    console.error('Support submit error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit ticket' });
  }
});

// Get all tickets for a user
app.post('/api/support/tickets', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(401).json({ status: 'error', message: 'User ID required' });
    const tickets = db.getTicketsByUserId(userId);
    res.json({ status: 'success', tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get tickets' });
  }
});

// ─── Admin: Support Management ────────────────────────────────────────────────

// Admin: Update ticket status
app.post('/api/admin/support/update-status', (req, res) => {
  try {
    const { userId, ticketId, status } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ status: 'error', message: 'Invalid status' });
    db.updateTicketStatus(ticketId, status);
    res.json({ status: 'success', message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update status' });
  }
});

// Admin: Reply to a ticket
app.post('/api/admin/support/reply', (req, res) => {
  try {
    const { userId, ticketId, reply } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    if (!reply || !reply.trim()) return res.status(400).json({ status: 'error', message: 'Reply text required' });
    db.replyToTicket(ticketId, reply.trim());
    res.json({ status: 'success', message: 'Reply sent' });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send reply' });
  }
});

// ─── Admin: Subscription Management ─────────────────────────────────────────

// All users + subscription data
app.post('/api/admin/subscriptions', (req, res) => {
  try {
    const { userId } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    const users = db.getAllUsersWithSubscriptions();
    res.json({ status: 'success', users });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Manually override a user's plan
app.post('/api/admin/subscriptions/:targetId/override-plan', (req, res) => {
  try {
    const { userId, plan } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    const target = db.getUserById(parseInt(req.params.targetId));
    if (!target) return res.status(404).json({ status: 'error', message: 'User not found' });
    const status = plan === 'trial' ? 'trial' : 'active';
    db.updateUserPlan(parseInt(req.params.targetId), plan, status);
    db.addSubscriptionRecord(parseInt(req.params.targetId), plan, 'admin_override', {});
    res.json({ status: 'success', message: `Plan updated to ${plan}` });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

// All payment records
app.post('/api/admin/payments', (req, res) => {
  try {
    const { userId } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    const payments = db.getAllSubscriptionRecords();
    res.json({ status: 'success', payments });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Issue Stripe refund
app.post('/api/admin/refund', async (req, res) => {
  try {
    const { userId, stripeSubscriptionId, amount, reason } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ status: 'error', message: 'Stripe not configured' });

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get latest paid invoice for this subscription
    const invoices = await stripe.invoices.list({ subscription: stripeSubscriptionId, limit: 5 });
    const paidInvoice = invoices.data.find(inv => inv.status === 'paid' && inv.payment_intent);
    if (!paidInvoice) return res.status(404).json({ status: 'error', message: 'No paid invoice found for this subscription' });

    const refundParams = {
      payment_intent: paidInvoice.payment_intent,
      reason: reason || 'requested_by_customer',
    };
    if (amount && amount > 0) refundParams.amount = Math.round(amount * 100); // INR paise

    const refund = await stripe.refunds.create(refundParams);
    res.json({ status: 'success', message: `Refund of ₹${(refund.amount / 100).toLocaleString('en-IN')} issued`, refundId: refund.id });
  } catch (e) {
    console.error('Refund error:', e);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Revenue metrics
app.post('/api/admin/revenue', (req, res) => {
  try {
    const { userId } = req.body;
    const admin = db.getUserById(userId);
    if (!admin || admin.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    const metrics = db.getRevenueMetrics();
    res.json({ status: 'success', ...metrics });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Update user profile (name and/or password)
app.post('/api/auth/update-profile', async (req, res) => {
  try {
    const { userId, name, currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID required' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Update name if provided
    if (name && name.trim()) {
      const result = db.updateUserProfile(userId, name.trim());
      if (!result.success) {
        return res.status(500).json({ status: 'error', message: 'Failed to update name' });
      }
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ status: 'error', message: 'Current password is required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters' });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      db.updateUserPassword(userId, hashed);
    }

    res.json({ status: 'success', message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update profile' });
  }
});

// Delete a contract (user-owned)
app.post('/api/contracts/:id/delete', (req, res) => {
  try {
    const contractId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'User ID required' });
    }

    const result = db.deleteContractByUser(contractId, userId);
    if (result.success) {
      db.addAuditLog(userId, 'CONTRACT_DELETE', 'contract', contractId, `Deleted contract #${contractId}`);
      res.json({ status: 'success', message: 'Contract deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Contract not found or not owned by user' });
    }
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete contract' });
  }
});

// Delete a vendor (user-owned)
app.post('/api/vendors/:id/delete', (req, res) => {
  try {
    const vendorId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'User ID required' });
    }

    const result = db.deleteVendorByUser(vendorId, userId);
    if (result.success) {
      db.addAuditLog(userId, 'VENDOR_DELETE', 'vendor', vendorId, `Deleted vendor #${vendorId}`);
      res.json({ status: 'success', message: 'Vendor deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Vendor not found or not owned by user' });
    }
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete vendor' });
  }
});

// Email transporter (nodemailer)
const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendResetEmail(toEmail, resetUrl) {
  if (!transporter) {
    // Dev mode: print link to console instead of sending email
    console.log('\n📧 =============================================');
    console.log('   [DEV MODE] Password Reset Link for:', toEmail);
    console.log('   ' + resetUrl);
    console.log('=============================================\n');
    return;
  }

  await transporter.sendMail({
    from: `"VendorShield" <${process.env.EMAIL_FROM || 'noreply@vendorshield.com'}>`,
    to: toEmail,
    subject: 'Reset your VendorShield password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">Reset Your Password</h2>
        <p>We received a request to reset the password for your VendorShield account.</p>
        <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:0.85em">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:0.8em">© 2026 VendorShield. All rights reserved.</p>
      </div>
    `,
  });
}

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    const user = db.getUserByEmail(email);

    // Always respond with success to avoid leaking which emails are registered
    if (!user) {
      return res.json({ status: 'success', message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.saveResetToken(user.id, token, expiresAt);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendResetEmail(email, resetUrl);

    console.log(`✅ Password reset requested for: ${email}`);

    res.json({ status: 'success', message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process request. Please try again.' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ status: 'error', message: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
    }

    const resetToken = db.getResetToken(token);

    if (!resetToken) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Check expiry
    if (new Date(resetToken.expires_at) < new Date()) {
      db.deleteResetToken(token);
      return res.status(400).json({ status: 'error', message: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.updateUserPassword(resetToken.user_id, hashedPassword);
    db.deleteResetToken(token);

    console.log(`✅ Password reset successful for user ID: ${resetToken.user_id}`);

    res.json({ status: 'success', message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reset password. Please try again.' });
  }
});

// Auto-seed admin on every startup (safe — skips if already exists)
function seedAdmin() {
  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'dhawansai1@gmail.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';
  try {
    const existing = db.getUserByEmail(ADMIN_EMAIL);
    if (!existing) {
      const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      db.addUser(ADMIN_EMAIL, hashed, ADMIN_NAME, 'admin', 'VendorShield');
      db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(ADMIN_EMAIL);
      console.log(`✅ Admin seeded: ${ADMIN_EMAIL}`);
    } else if (existing.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(ADMIN_EMAIL);
      console.log(`✅ Admin role restored: ${ADMIN_EMAIL}`);
    } else {
      console.log(`✅ Admin already exists: ${ADMIN_EMAIL}`);
    }
  } catch (e) {
    console.error('Admin seed error:', e.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
  console.log(`📡 Test it at: http://localhost:${PORT}/api/health`);
  seedAdmin();
});