import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ScrollSystem from './systems/ScrollSystem';
import UnifiedScene from './components/Scene/UnifiedScene';
import VendorShieldLogo from './components/VendorShieldLogo';
import LoadingOverlay from './components/LoadingOverlay';
import { useSceneStore } from './store/sceneStore';
import Footer from './Footer';

// ── Animated stat counter ─────────────────────────────────────────────────────
function StatCard({ value, suffix, label, color = 'text-white' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState(0);
  const numericEnd = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const hasDecimal = String(value).includes('.');

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const step = (ts) => {
      const p = Math.min((ts - start) / 2000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(eased * numericEnd);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, numericEnd]);

  const fmt = hasDecimal
    ? displayed.toFixed(1)
    : displayed >= 1000
    ? Math.round(displayed).toLocaleString()
    : Math.round(displayed);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="text-center px-6"
    >
      <div className={`text-5xl lg:text-6xl font-black mb-2 ${color}`}>
        {fmt}{suffix}
      </div>
      <div className="text-gray-400 text-sm uppercase tracking-widest font-light">{label}</div>
    </motion.div>
  );
}

// ── Animated contract-analysis product preview ────────────────────────────────
function ProductPreview() {
  const [phase, setPhase] = useState(0); // 0=upload 1=analyzing 2=report
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase === 0) {
      const iv = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(iv);
            setTimeout(() => setPhase(1), 300);
            return 100;
          }
          return p + 3;
        });
      }, 60);
      return () => clearInterval(iv);
    }
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 2200);
      return () => clearTimeout(t);
    }
    if (phase === 2) {
      const t = setTimeout(() => { setPhase(0); setProgress(0); }, 4500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const riskItems = [
    { label: 'Data Security',    score: 'Safe',     color: 'green' },
    { label: 'Liability',        score: 'Medium',   color: 'yellow' },
    { label: 'Compliance',       score: 'High Risk', color: 'red' },
    { label: 'IP Rights',        score: 'Safe',     color: 'green' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 2.0, duration: 1.0, ease: [0.65, 0, 0.35, 1] }}
      className="bg-gray-950/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5 w-80 shadow-2xl shadow-blue-500/10"
    >
      {/* Mac-style dots */}
      <div className="flex items-center space-x-1.5 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="text-gray-600 text-xs ml-2 font-light">VendorShield · Analysis</span>
      </div>

      {/* File row */}
      <div className="flex items-center space-x-3 mb-4 p-2.5 bg-white/5 rounded-xl">
        <div className="w-9 h-9 bg-blue-500/15 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-blue-400 text-base">📄</span>
        </div>
        <div>
          <p className="text-white text-xs font-semibold">vendor_agreement_2026.pdf</p>
          <p className="text-gray-500 text-xs">3.2 MB · Uploaded just now</p>
        </div>
      </div>

      {/* Phase 0: Upload progress */}
      {phase === 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400">Uploading contract...</span>
            <span className="text-blue-400 font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase 1: AI analyzing */}
      {phase === 1 && (
        <div className="mb-3 p-3 bg-blue-500/8 rounded-xl border border-blue-500/15">
          <div className="flex items-center space-x-2 mb-1.5">
            <div className="flex space-x-1">
              {[0, 0.2, 0.4].map((d, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 0.9, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="text-blue-300 text-xs">Gemini scanning 50+ risk factors</span>
          </div>
          <div className="text-gray-500 text-xs">Clause extraction · Liability review · Compliance check</div>
        </div>
      )}

      {/* Phase 2: Risk report */}
      {phase === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center justify-between p-2.5 bg-green-500/8 rounded-xl border border-green-500/15 mb-2.5">
            <span className="text-gray-400 text-xs">Overall Risk Score</span>
            <span className="text-green-400 font-bold text-sm">23 · LOW RISK</span>
          </div>
          <div className="space-y-1.5">
            {riskItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="flex items-center justify-between px-1"
              >
                <span className="text-gray-400 text-xs">{item.label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.color === 'green'  ? 'text-green-400 bg-green-500/10 border border-green-500/20' :
                  item.color === 'yellow' ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' :
                                           'text-red-400 bg-red-500/10 border border-red-500/20'
                }`}>{item.score}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-gray-600 text-xs">Powered by Gemini 2.5 Flash</span>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-500 text-xs">Live</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🧠',
    title: 'AI Contract Analysis',
    desc: 'Google Gemini 2.5 Flash extracts key clauses, obligations, and red flags from any vendor contract in seconds.',
    accent: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  },
  {
    icon: '🎯',
    title: 'Risk Scoring Engine',
    desc: 'Comprehensive risk scores across 50+ categories including legal liability, financial exposure, and operational SLAs.',
    accent: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
  },
  {
    icon: '👁',
    title: 'Vendor Monitoring',
    desc: 'Continuous monitoring of vendor risk profiles. Get instant alerts when a vendor\'s risk level changes.',
    accent: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20',
  },
  {
    icon: '✅',
    title: 'Compliance Tracking',
    desc: 'Built-in frameworks for SOC 2, GDPR, ISO 27001, HIPAA, and PCI-DSS. Stay audit-ready at all times.',
    accent: 'from-green-500/20 to-green-600/10 border-green-500/20',
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    desc: 'Shared workspaces, comment threads, and approval workflows designed for modern procurement teams.',
    accent: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
  },
  {
    icon: '📊',
    title: 'Advanced Analytics',
    desc: 'Executive dashboards, risk trend reports, and vendor comparison matrices to inform strategic decisions.',
    accent: 'from-rose-500/20 to-rose-600/10 border-rose-500/20',
  },
];

const RISK_CATEGORIES = [
  { label: 'Data Security & Privacy',       pct: 94, color: 'bg-blue-500'   },
  { label: 'Contract & Legal Liability',    pct: 88, color: 'bg-violet-500' },
  { label: 'Financial & Credit Risk',       pct: 82, color: 'bg-amber-500'  },
  { label: 'Operational & SLA Breaches',    pct: 91, color: 'bg-cyan-500'   },
  { label: 'Regulatory & Compliance Gaps',  pct: 97, color: 'bg-green-500'  },
];

// ── Main landing page ─────────────────────────────────────────────────────────
export default function FlagshipLandingPage({ onSwitchToLogin, onSwitchToSignup }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollProgress } = useSceneStore();
  const navigate = useNavigate();

  // Progressive dark overlay – clear on hero, darker for content sections
  const overlayOpacity = Math.min(scrollProgress / 22, 0.78);

  return (
    <>
      <LoadingOverlay onComplete={() => setIsLoaded(true)} />

      {isLoaded && (
        <>
          <ScrollSystem />
          <UnifiedScene />

          {/* Progressive dark overlay */}
          <div
            className="fixed inset-0 bg-black pointer-events-none z-[1]"
            style={{ opacity: overlayOpacity }}
          />

          <div className="relative z-10">

            {/* ── Navbar ───────────────────────────────────────────────────── */}
            <motion.nav
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
              className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
                scrollProgress > 4 ? 'bg-black/70 backdrop-blur-2xl border-b border-white/5' : 'bg-transparent'
              }`}
            >
              <div className="max-w-7xl mx-auto px-8 lg:px-12 py-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <VendorShieldLogo className="w-9 h-9" id="landing-nav" />
                  <span className="text-xl font-bold text-white tracking-tight">VendorShield</span>
                </div>

                <div className="hidden md:flex items-center space-x-10">
                  <button onClick={() => navigate('/features')}   className="text-slate-300 hover:text-white transition-colors text-sm tracking-wide">Features</button>
                  <button onClick={() => navigate('/pricing')}    className="text-slate-300 hover:text-white transition-colors text-sm tracking-wide">Pricing</button>
                  <button onClick={() => navigate('/security')}   className="text-slate-300 hover:text-white transition-colors text-sm tracking-wide">Security</button>
                  <button onClick={onSwitchToLogin}               className="text-slate-300 hover:text-white transition-colors text-sm">Log in</button>
                  <button
                    onClick={onSwitchToSignup}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:shadow-xl hover:shadow-blue-500/25 transition-all hover:scale-105"
                  >
                    Get Started Free
                  </button>
                </div>
              </div>
            </motion.nav>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="min-h-screen flex items-center pt-24 pb-16 px-8 lg:px-12">
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                {/* Left – copy */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.8 }}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-300 text-xs font-medium tracking-wide uppercase">AI-Powered Vendor Risk Management</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6, duration: 1.0, ease: [0.65, 0, 0.35, 1] }}
                    className="text-5xl lg:text-7xl font-black text-white leading-[0.92] tracking-tighter mb-6"
                    style={{ textShadow: '0 0 60px rgba(59,130,246,0.25)' }}
                  >
                    Defend Your
                    <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                      Vendor Ecosystem
                    </span>
                    Before Risks Strike.
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.1, duration: 0.9 }}
                    className="text-lg text-slate-300 leading-relaxed mb-10 max-w-xl font-light"
                  >
                    Upload vendor contracts and receive AI-driven risk scores, compliance gaps, and
                    remediation playbooks — in under 60 seconds. Protect your business before third-party
                    risks become crises.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.4, duration: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <button
                      onClick={onSwitchToSignup}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold text-base hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:scale-105"
                    >
                      Start Free Trial
                    </button>
                    <button
                      onClick={onSwitchToLogin}
                      className="px-8 py-4 border border-white/15 text-white rounded-xl font-semibold text-base backdrop-blur-sm hover:border-white/30 hover:bg-white/5 transition-all"
                    >
                      Sign In →
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.8, duration: 0.8 }}
                    className="flex items-center space-x-6 mt-8"
                  >
                    {['SOC 2 Certified', 'GDPR Compliant', 'ISO 27001'].map((badge) => (
                      <div key={badge} className="flex items-center space-x-1.5">
                        <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                          <span className="text-green-400 text-[9px]">✓</span>
                        </div>
                        <span className="text-gray-500 text-xs">{badge}</span>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Right – animated product preview */}
                <div className="flex justify-center lg:justify-end">
                  <ProductPreview />
                </div>
              </div>
            </section>

            {/* ── Stats Bar ────────────────────────────────────────────────── */}
            <section className="py-16 px-8 lg:px-12">
              <div className="max-w-5xl mx-auto">
                <div className="bg-white/3 backdrop-blur-md border border-white/8 rounded-2xl px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x-0 lg:divide-x divide-white/8">
                  <StatCard value="10000"  suffix="+"    label="Contracts Analyzed"     color="text-blue-400" />
                  <StatCard value="98.7"   suffix="%"    label="Risk Detection Rate"    color="text-green-400" />
                  <StatCard value="60"     suffix="s"    label="Avg. Analysis Time"     color="text-cyan-400" />
                  <StatCard value="500"    suffix="+"    label="Enterprises Protected"  color="text-violet-400" />
                </div>
              </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────────────── */}
            <section className="py-24 px-8 lg:px-12">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-16"
                >
                  <span className="text-blue-400 text-sm uppercase tracking-widest font-medium">How It Works</span>
                  <h2 className="text-4xl lg:text-6xl font-black text-white mt-3 mb-4 tracking-tighter">
                    From contract to
                    <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      risk report in 60 seconds
                    </span>
                  </h2>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
                    Three simple steps. Zero manual work. Full visibility into every vendor relationship.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                  {/* Connector line (desktop) */}
                  <div className="hidden lg:block absolute top-12 left-[33%] right-[33%] h-px bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-cyan-500/30" />

                  {[
                    {
                      step: '01',
                      title: 'Upload Vendor Contracts',
                      desc: 'Drag & drop PDFs, Word documents, or paste contract text. VendorShield supports all common vendor agreement formats.',
                      icon: '📤',
                      color: 'border-blue-500/30 from-blue-500/10 to-blue-600/5',
                      dot: 'bg-blue-500',
                    },
                    {
                      step: '02',
                      title: 'AI Analyzes 50+ Risk Factors',
                      desc: 'Gemini 2.5 Flash scans every clause across legal liability, data security, financial exposure, SLA terms, IP rights, and compliance gaps.',
                      icon: '🧠',
                      color: 'border-violet-500/30 from-violet-500/10 to-violet-600/5',
                      dot: 'bg-violet-500',
                    },
                    {
                      step: '03',
                      title: 'Get Actionable Risk Reports',
                      desc: 'Receive color-coded risk scores, flagged clauses, critical findings, and step-by-step remediation playbooks — instantly.',
                      icon: '📋',
                      color: 'border-cyan-500/30 from-cyan-500/10 to-cyan-600/5',
                      dot: 'bg-cyan-500',
                    },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15, duration: 0.8 }}
                      className={`relative p-8 rounded-2xl bg-gradient-to-br ${s.color} border backdrop-blur-sm`}
                    >
                      <div className={`w-10 h-10 ${s.dot} rounded-full flex items-center justify-center mb-6 shadow-lg`}>
                        <span className="text-white font-bold text-sm">{s.step}</span>
                      </div>
                      <div className="text-4xl mb-4">{s.icon}</div>
                      <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed font-light">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Features Grid ─────────────────────────────────────────────── */}
            <section className="py-24 px-8 lg:px-12">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-16"
                >
                  <span className="text-violet-400 text-sm uppercase tracking-widest font-medium">Platform Capabilities</span>
                  <h2 className="text-4xl lg:text-6xl font-black text-white mt-3 tracking-tighter">
                    Everything you need to
                    <span className="block bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                      manage vendor risk
                    </span>
                  </h2>
                </motion.div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                >
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={i}
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
                      }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className={`p-7 rounded-2xl bg-gradient-to-br ${f.accent} border backdrop-blur-sm cursor-default group`}
                    >
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200 inline-block">{f.icon}</div>
                      <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed font-light">{f.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </section>

            {/* ── Risk Coverage ─────────────────────────────────────────────── */}
            <section className="py-24 px-8 lg:px-12">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9 }}
                  >
                    <span className="text-green-400 text-sm uppercase tracking-widest font-medium">Risk Intelligence</span>
                    <h2 className="text-4xl lg:text-5xl font-black text-white mt-3 mb-6 tracking-tighter leading-tight">
                      Detect every category
                      <span className="block bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                        of vendor risk
                      </span>
                    </h2>
                    <p className="text-gray-400 text-base leading-relaxed mb-8 font-light">
                      VendorShield's AI doesn't just scan for keywords. It understands the intent and impact of
                      every contract clause across five critical risk domains — giving you a true 360° view of
                      your vendor exposure.
                    </p>
                    <button
                      onClick={onSwitchToSignup}
                      className="px-7 py-3.5 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-xl font-semibold text-sm hover:shadow-xl hover:shadow-green-500/25 transition-all hover:scale-105"
                    >
                      See Full Risk Framework →
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.2 }}
                    className="space-y-4"
                  >
                    {RISK_CATEGORIES.map((cat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.7 }}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-gray-300 text-sm font-medium">{cat.label}</span>
                          <span className="text-gray-500 text-xs">{cat.pct}% detection</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${cat.color} rounded-full`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${cat.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 1.2, ease: 'easeOut' }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </section>

            {/* ── Trust & Compliance ────────────────────────────────────────── */}
            <section className="py-20 px-8 lg:px-12">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-12"
                >
                  <span className="text-gray-500 text-sm uppercase tracking-widest">Built for enterprise compliance</span>
                </motion.div>
                <motion.div
                  className="flex flex-wrap justify-center gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                >
                  {['SOC 2 Type II', 'GDPR', 'ISO 27001', 'HIPAA', 'PCI-DSS', 'CCPA', 'FedRAMP Ready'].map((badge, i) => (
                    <motion.div
                      key={i}
                      variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
                      className="px-5 py-2.5 bg-white/4 border border-white/10 rounded-xl text-gray-300 text-sm font-medium backdrop-blur-sm hover:border-white/20 transition-colors"
                    >
                      ✓ {badge}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="py-28 px-8 lg:px-12">
              <div className="max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.0 }}
                  className="relative text-center p-12 lg:p-20 rounded-3xl bg-gradient-to-br from-blue-600/15 via-violet-600/10 to-cyan-600/15 border border-white/10 backdrop-blur-sm overflow-hidden"
                >
                  {/* Subtle glow orbs */}
                  <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative">
                    <span className="text-blue-400 text-sm uppercase tracking-widest font-medium">Get started today</span>
                    <h2 className="text-4xl lg:text-6xl font-black text-white mt-4 mb-6 tracking-tighter leading-tight">
                      Start protecting your
                      <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        vendor ecosystem
                      </span>
                    </h2>
                    <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto font-light leading-relaxed">
                      Join 500+ enterprises already using VendorShield to reduce third-party risk, accelerate
                      procurement, and stay audit-ready.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={onSwitchToSignup}
                        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:scale-105"
                      >
                        Start Free Trial — No Credit Card
                      </button>
                      <button
                        onClick={() => navigate('/pricing')}
                        className="px-10 py-5 border border-white/15 text-white rounded-2xl font-semibold text-lg backdrop-blur-sm hover:border-white/30 hover:bg-white/5 transition-all"
                      >
                        View Pricing
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm mt-6">
                      14-day free trial · Full access · Cancel anytime
                    </p>
                  </div>
                </motion.div>
              </div>
            </section>

            <Footer />
          </div>
        </>
      )}
    </>
  );
}
