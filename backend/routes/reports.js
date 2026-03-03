const express    = require('express');
const router     = express.Router();
const PDFDocument = require('pdfkit');
const XLSX       = require('xlsx');
const nodemailer = require('nodemailer');
const db         = require('../database');

// ─── Shared helpers ────────────────────────────────────────────────────────────

function sevColor(level) {
  if (!level) return '#6b7280';
  const l = level.toLowerCase();
  if (l === 'high' || l === 'critical') return '#dc2626';
  if (l === 'medium')                   return '#d97706';
  return '#16a34a';
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ─── POST /api/reports/contract-pdf ───────────────────────────────────────────
router.post('/contract-pdf', (req, res) => {
  const { userId, contractId } = req.body;
  if (!userId || !contractId) return res.status(400).json({ error: 'userId and contractId required' });

  const contract = db.getContractById(contractId, userId);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const risks = db.getRisksByContractId(contractId);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="risk-report-${contractId}.pdf"`);
  doc.pipe(res);

  // ── Header ──
  doc.rect(0, 0, doc.page.width, 90).fill('#1e40af');
  doc.fontSize(22).fillColor('#ffffff').text('VendorShield', 50, 25);
  doc.fontSize(10).fillColor('#bfdbfe').text('Vendor Risk Management Platform', 50, 52);
  doc.fontSize(10).fillColor('#bfdbfe').text(`Generated: ${new Date().toLocaleString()}`, 50, 67);

  // ── Title ──
  doc.moveDown(3);
  doc.fontSize(18).fillColor('#111827').text('Contract Risk Analysis Report', { align: 'left' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.8);

  // ── Contract meta ──
  doc.fontSize(12).fillColor('#1e40af').text('Contract Details');
  doc.moveDown(0.4);
  const meta = [
    ['Filename',    contract.filename],
    ['Vendor',      contract.vendor_name || 'Not assigned'],
    ['Uploaded',    contract.uploaded_at ? new Date(contract.uploaded_at).toLocaleDateString() : '—'],
    ['Status',      contract.status || '—'],
    ['File Size',   contract.file_size ? `${Math.round(contract.file_size / 1024)} KB` : '—'],
  ];
  meta.forEach(([label, value]) => {
    doc.fontSize(10)
      .fillColor('#6b7280').text(`${label}: `, { continued: true })
      .fillColor('#111827').text(value);
  });

  doc.moveDown(1);

  // ── Risk assessment box ──
  const boxY = doc.y;
  doc.rect(50, boxY, 495, 72).fill('#f9fafb').stroke('#e5e7eb');
  doc.fontSize(12).fillColor('#111827').text('Risk Assessment', 65, boxY + 10);
  const rl = (contract.risk_level || 'N/A').toUpperCase();
  const rc = sevColor(contract.risk_level);
  doc.fontSize(11).fillColor(rc).text(`Risk Level: ${rl}`, 65, boxY + 28);
  doc.fillColor('#374151').text(`Risk Score: ${contract.risk_score || 0} / 100`, 65, boxY + 45);
  doc.moveDown(5);

  // ── Risks list ──
  doc.fontSize(12).fillColor('#1e40af').text(`Detected Risks (${risks.length})`);
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.6);

  if (risks.length === 0) {
    doc.fontSize(10).fillColor('#6b7280').text('No risks detected for this contract.');
  } else {
    risks.forEach((risk, i) => {
      doc.fontSize(11).fillColor('#111827').text(`${i + 1}. ${risk.risk_type}`);
      doc.fontSize(9).fillColor(sevColor(risk.severity)).text(`   Severity: ${(risk.severity || '').toUpperCase()}`);
      if (risk.description) {
        doc.fontSize(9).fillColor('#6b7280').text(`   ${risk.description}`, { width: 460, indent: 12 });
      }
      doc.moveDown(0.6);
    });
  }

  // ── Footer ──
  doc.fontSize(8).fillColor('#9ca3af')
    .text('Confidential — VendorShield Risk Report', 50, doc.page.height - 40, { align: 'center' });

  doc.end();
});

// ─── POST /api/reports/excel ───────────────────────────────────────────────────
router.post('/excel', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const contracts = db.getAllContracts(userId);

  const contractRows = contracts.map(c => ({
    'Contract Name': c.filename,
    'Vendor':        c.vendor_name || '',
    'Status':        c.status || '',
    'Risk Level':    c.risk_level || '',
    'Risk Score':    c.risk_score || 0,
    'Upload Date':   c.uploaded_at ? new Date(c.uploaded_at).toLocaleDateString() : '',
    'File Size (KB)': Math.round((c.file_size || 0) / 1024),
  }));

  const riskRows = [];
  for (const c of contracts) {
    for (const r of db.getRisksByContractId(c.id)) {
      riskRows.push({
        'Contract':    c.filename,
        'Vendor':      c.vendor_name || '',
        'Risk Type':   r.risk_type,
        'Severity':    r.severity,
        'Description': r.description || '',
        'Detected At': r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
      });
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contractRows.length ? contractRows : [{ Message: 'No contracts found' }]), 'Contracts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riskRows.length    ? riskRows    : [{ Message: 'No risks found'    }]), 'Risks');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="vendorshield-contracts.xlsx"');
  res.send(buf);
});

// ─── POST /api/reports/custom ─────────────────────────────────────────────────
router.post('/custom', (req, res) => {
  const { userId, vendorFilter, dateFrom, dateTo, riskLevel } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  let contracts = db.getAllContracts(userId);

  if (vendorFilter)               contracts = contracts.filter(c => (c.vendor_name || '').toLowerCase().includes(vendorFilter.toLowerCase()));
  if (dateFrom)                   contracts = contracts.filter(c => new Date(c.uploaded_at) >= new Date(dateFrom));
  if (dateTo)                     { const to = new Date(dateTo); to.setHours(23,59,59); contracts = contracts.filter(c => new Date(c.uploaded_at) <= to); }
  if (riskLevel && riskLevel !== 'all') contracts = contracts.filter(c => (c.risk_level || '').toLowerCase() === riskLevel.toLowerCase());

  const contractRows = contracts.map(c => ({
    'Contract Name': c.filename,
    'Vendor':        c.vendor_name || '',
    'Risk Level':    c.risk_level || '',
    'Risk Score':    c.risk_score || 0,
    'Upload Date':   c.uploaded_at ? new Date(c.uploaded_at).toLocaleDateString() : '',
  }));

  const riskRows = [];
  for (const c of contracts) {
    for (const r of db.getRisksByContractId(c.id)) {
      riskRows.push({ 'Contract': c.filename, 'Vendor': c.vendor_name || '', 'Risk Type': r.risk_type, 'Severity': r.severity, 'Description': r.description || '' });
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contractRows.length ? contractRows : [{ Message: 'No contracts match filters' }]), 'Filtered Contracts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riskRows.length    ? riskRows    : [{ Message: 'No risks found'              }]), 'Risks');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="custom-report.xlsx"');
  res.send(buf);
});

// ─── POST /api/reports/schedule ───────────────────────────────────────────────
router.post('/schedule', (req, res) => {
  const { userId, frequency, email } = req.body;
  if (!userId || !frequency || !email) return res.status(400).json({ error: 'userId, frequency, and email required' });
  const result = db.saveReportSchedule(userId, frequency, email);
  if (!result.success) return res.status(500).json({ error: 'Failed to save schedule' });
  res.json({ success: true, message: `Reports scheduled ${frequency} to ${email}` });
});

// ─── GET /api/reports/schedule/:userId ────────────────────────────────────────
router.get('/schedule/:userId', (req, res) => {
  const schedule = db.getReportSchedule(req.params.userId);
  res.json(schedule || {});
});

// ─── POST /api/reports/send-now ───────────────────────────────────────────────
router.post('/send-now', async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' });

  const contracts = db.getAllContracts(userId);
  const stats     = db.getStats(userId);
  const highRisk  = contracts.filter(c => (c.risk_level || '').toLowerCase() === 'high').length;
  const medRisk   = contracts.filter(c => (c.risk_level || '').toLowerCase() === 'medium').length;

  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:20px">
  <div style="background:#1e40af;padding:24px;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">VendorShield Risk Report</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Generated ${new Date().toLocaleString()}</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
    <h2 style="font-size:16px;color:#111827;margin-top:0">Summary</h2>
    <table width="100%" cellpadding="10" style="background:#f3f4f6;border-radius:8px;margin-bottom:20px">
      <tr>
        <td style="font-size:13px"><strong>Total Contracts:</strong> ${stats.contractsAnalyzed}</td>
        <td style="font-size:13px"><strong>Total Risks:</strong> ${stats.risksDetected}</td>
        <td style="font-size:13px"><strong>Vendors:</strong> ${stats.activeVendors}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#dc2626"><strong>High Risk:</strong> ${highRisk}</td>
        <td style="font-size:13px;color:#d97706"><strong>Medium Risk:</strong> ${medRisk}</td>
        <td style="font-size:13px;color:#16a34a"><strong>Low Risk:</strong> ${contracts.length - highRisk - medRisk}</td>
      </tr>
    </table>
    <h2 style="font-size:16px;color:#111827">Contracts Overview</h2>
    <table width="100%" cellpadding="8" border="1" style="border-collapse:collapse;font-size:12px;border-color:#e5e7eb">
      <thead style="background:#1e40af;color:#fff">
        <tr><th>Contract</th><th>Vendor</th><th>Risk Level</th><th>Score</th></tr>
      </thead>
      <tbody>
        ${contracts.map(c => `<tr>
          <td>${c.filename}</td>
          <td>${c.vendor_name || '—'}</td>
          <td style="color:${sevColor(c.risk_level)};font-weight:600">${c.risk_level || '—'}</td>
          <td>${c.risk_score || 0}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p style="font-size:11px;color:#9ca3af;margin-top:20px">VendorShield · Vendor Risk Management Platform</p>
  </div>
</body></html>`;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || process.env.SMTP_USER,
      to:      email,
      subject: `VendorShield Risk Report — ${new Date().toLocaleDateString()}`,
      html,
    });
    res.json({ success: true, message: `Report sent to ${email}` });
  } catch (e) {
    console.error('Report email error:', e);
    res.status(500).json({ error: 'Failed to send email: ' + e.message });
  }
});

// ─── POST /api/reports/ai-summary ─────────────────────────────────────────────
router.post('/ai-summary', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const contracts = db.getAllContracts(userId);
  if (contracts.length === 0) return res.json({ summary: 'No contracts found. Upload contracts first to generate an AI executive summary.' });

  const contractData = contracts.map(c => ({
    contract:  c.filename,
    vendor:    c.vendor_name || 'Unknown',
    riskLevel: c.risk_level || 'Unknown',
    riskScore: c.risk_score || 0,
    risks:     db.getRisksByContractId(c.id).map(r => ({ type: r.risk_type, severity: r.severity, description: r.description })),
  }));

  const prompt = `You are a senior vendor risk analyst. Analyze the following contract risk data and write a concise executive summary (3-4 paragraphs) suitable for a board or leadership presentation.

Contract Data:
${JSON.stringify(contractData, null, 2)}

Structure your summary as follows:
1. Overall risk posture (1-2 sentences on high-level risk status)
2. Top risk areas requiring immediate attention (specific and actionable)
3. Vendor-level observations and recommendations
4. Suggested next steps

Write in plain professional English. Be specific, data-driven, and actionable. Do not use bullet points — use paragraph form.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data    = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary. Please try again.';
    res.json({ summary });
  } catch (e) {
    console.error('AI summary error:', e);
    res.status(500).json({ error: 'AI summary failed: ' + e.message });
  }
});

module.exports = router;
