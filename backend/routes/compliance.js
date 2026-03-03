const express    = require('express');
const router     = express.Router();
const PDFDocument = require('pdfkit');
const db         = require('../database');

// ─── Certifications ───────────────────────────────────────────────────────────

router.get('/certifications/:userId', (req, res) => {
  const certs = db.getCertifications(parseInt(req.params.userId));
  res.json(certs);
});

router.post('/certifications', (req, res) => {
  const { userId, ...data } = req.body;
  if (!userId || !data.vendor_name || !data.standard)
    return res.status(400).json({ error: 'userId, vendor_name and standard required' });
  const result = db.addCertification(userId, data);
  if (result.success) {
    db.addAuditLog(userId, 'ADD_CERT', 'certification', result.id,
      `Added ${data.standard} certification for ${data.vendor_name}`);
  }
  res.json(result);
});

router.put('/certifications/:id', (req, res) => {
  const { userId, ...data } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.updateCertification(parseInt(req.params.id), userId, data);
  if (result.success) {
    db.addAuditLog(userId, 'UPDATE_CERT', 'certification', parseInt(req.params.id),
      `Updated ${data.standard} certification for ${data.vendor_name}`);
  }
  res.json(result);
});

router.delete('/certifications/:id', (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.deleteCertification(parseInt(req.params.id), userId);
  if (result.success) {
    db.addAuditLog(userId, 'DELETE_CERT', 'certification', parseInt(req.params.id),
      'Deleted certification record');
  }
  res.json(result);
});

// ─── Expiring certifications ──────────────────────────────────────────────────

router.get('/expiring/:userId', (req, res) => {
  const days  = parseInt(req.query.days) || 90;
  const certs = db.getExpiringCertifications(parseInt(req.params.userId), days);
  res.json(certs);
});

// ─── Audit log ────────────────────────────────────────────────────────────────

router.get('/audit-log/:userId', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs  = db.getAuditLogs(parseInt(req.params.userId), limit);
  res.json(logs);
});

// ─── Risk Actions ─────────────────────────────────────────────────────────────

router.get('/actions/:userId', (req, res) => {
  res.json(db.getRiskActions(parseInt(req.params.userId)));
});

router.post('/actions', (req, res) => {
  const { userId, ...data } = req.body;
  if (!userId || !data.title) return res.status(400).json({ error: 'userId and title required' });
  const result = db.addRiskAction(userId, data);
  if (result.success) {
    db.addAuditLog(userId, 'ADD_ACTION', 'risk_action', result.id,
      `Created action: ${data.title} [${data.priority || 'medium'}]`);
  }
  res.json(result);
});

router.put('/actions/:id', (req, res) => {
  const { userId, ...data } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.updateRiskAction(parseInt(req.params.id), userId, data);
  if (result.success) {
    db.addAuditLog(userId, 'UPDATE_ACTION', 'risk_action', parseInt(req.params.id),
      `Updated action status to ${data.status}: ${data.title}`);
  }
  res.json(result);
});

router.delete('/actions/:id', (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.deleteRiskAction(parseInt(req.params.id), userId);
  if (result.success) {
    db.addAuditLog(userId, 'DELETE_ACTION', 'risk_action', parseInt(req.params.id), 'Deleted risk action');
  }
  res.json(result);
});

// ─── Vendor Assessments ───────────────────────────────────────────────────────

router.get('/assessments/:userId', (req, res) => {
  res.json(db.getAssessments(parseInt(req.params.userId)));
});

router.post('/assessments', (req, res) => {
  const { userId, ...data } = req.body;
  if (!userId || !data.vendor_name) return res.status(400).json({ error: 'userId and vendor_name required' });
  const result = db.addAssessment(userId, data);
  if (result.success) {
    db.addAuditLog(userId, 'ADD_ASSESSMENT', 'assessment', result.id,
      `Created assessment for ${data.vendor_name} [${data.priority || 'medium'} priority]`);
  }
  res.json(result);
});

router.put('/assessments/:id', (req, res) => {
  const { userId, ...data } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.updateAssessment(parseInt(req.params.id), userId, data);
  if (result.success) {
    db.addAuditLog(userId, 'UPDATE_ASSESSMENT', 'assessment', parseInt(req.params.id),
      `Updated assessment for ${data.vendor_name} to ${data.status}`);
  }
  res.json(result);
});

router.delete('/assessments/:id', (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.deleteAssessment(parseInt(req.params.id), userId);
  if (result.success) {
    db.addAuditLog(userId, 'DELETE_ASSESSMENT', 'assessment', parseInt(req.params.id), 'Deleted assessment');
  }
  res.json(result);
});

// ─── Compliance Report PDF ────────────────────────────────────────────────────

router.post('/report-pdf', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const uid          = parseInt(userId);
  const certs        = db.getCertifications(uid);
  const actions      = db.getRiskActions(uid);
  const assessments  = db.getAssessments(uid);
  const contracts    = db.getAllContracts(uid);
  const expiring     = db.getExpiringCertifications(uid, 90);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="compliance-report.pdf"');
  doc.pipe(res);

  // ── Header ──
  doc.rect(0, 0, doc.page.width, 90).fill('#1e40af');
  doc.fontSize(22).fillColor('#ffffff').text('VendorShield', 50, 25);
  doc.fontSize(10).fillColor('#bfdbfe').text('Compliance & Audit Report', 50, 52);
  doc.fontSize(10).fillColor('#bfdbfe').text(`Generated: ${new Date().toLocaleString()}`, 50, 67);

  doc.moveDown(3);

  // ── Summary ──
  doc.fontSize(14).fillColor('#111827').text('Compliance Summary');
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.5);

  const summary = [
    ['Total Certifications', certs.length],
    ['Active Certifications', certs.filter(c => c.status === 'active').length],
    ['Expiring in 90 days', expiring.length],
    ['Total Contracts', contracts.length],
    ['Open Actions', actions.filter(a => a.status === 'open').length],
    ['Pending Assessments', assessments.filter(a => a.status === 'pending').length],
  ];
  summary.forEach(([label, value]) => {
    doc.fontSize(10).fillColor('#6b7280').text(`${label}: `, { continued: true }).fillColor('#111827').text(String(value));
  });

  doc.moveDown(1);

  // ── Certifications ──
  doc.fontSize(13).fillColor('#1e40af').text('Vendor Certifications');
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.4);

  if (certs.length === 0) {
    doc.fontSize(10).fillColor('#6b7280').text('No certifications recorded.');
  } else {
    certs.forEach(c => {
      const statusColor = c.status === 'active' ? '#16a34a' : c.status === 'expired' ? '#dc2626' : '#d97706';
      doc.fontSize(10).fillColor('#111827').text(`${c.vendor_name} — ${c.standard}`, { continued: true })
         .fillColor(statusColor).text(`  [${c.status.toUpperCase()}]`);
      if (c.expiry_date) {
        doc.fontSize(9).fillColor('#6b7280').text(`   Expires: ${c.expiry_date}`);
      }
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(0.8);

  // ── Actions ──
  if (actions.length > 0) {
    if (doc.y > 650) doc.addPage();
    doc.fontSize(13).fillColor('#1e40af').text('Risk Actions');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(0.4);

    actions.forEach(a => {
      const pColor = a.priority === 'high' ? '#dc2626' : a.priority === 'medium' ? '#d97706' : '#16a34a';
      doc.fontSize(10).fillColor('#111827').text(a.title);
      doc.fontSize(9).fillColor(pColor).text(`   Priority: ${a.priority.toUpperCase()}  |  Status: ${a.status.toUpperCase()}`);
      if (a.assignee) doc.fontSize(9).fillColor('#6b7280').text(`   Assignee: ${a.assignee}`);
      if (a.due_date)  doc.fontSize(9).fillColor('#6b7280').text(`   Due: ${a.due_date}`);
      doc.moveDown(0.4);
    });
    doc.moveDown(0.5);
  }

  // ── Assessments ──
  if (assessments.length > 0) {
    if (doc.y > 650) doc.addPage();
    doc.fontSize(13).fillColor('#1e40af').text('Vendor Assessments');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(0.4);

    assessments.forEach(a => {
      const pColor = a.priority === 'high' ? '#dc2626' : a.priority === 'medium' ? '#d97706' : '#16a34a';
      doc.fontSize(10).fillColor('#111827').text(a.vendor_name);
      doc.fontSize(9).fillColor(pColor).text(`   Priority: ${a.priority.toUpperCase()}  |  Status: ${a.status.toUpperCase()}`);
      if (a.owner)    doc.fontSize(9).fillColor('#6b7280').text(`   Owner: ${a.owner}`);
      if (a.due_date) doc.fontSize(9).fillColor('#6b7280').text(`   Due: ${a.due_date}`);
      if (a.notes)    doc.fontSize(9).fillColor('#6b7280').text(`   Notes: ${a.notes}`);
      doc.moveDown(0.4);
    });
  }

  // ── Footer ──
  doc.fontSize(8).fillColor('#9ca3af')
     .text('Confidential — VendorShield Compliance Report', 50, doc.page.height - 40, { align: 'center' });

  doc.end();

  db.addAuditLog(uid, 'GENERATE_COMPLIANCE_PDF', 'report', null, 'Generated compliance PDF report');
});

module.exports = router;
