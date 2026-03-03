import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import VendorShieldLogo from '../components/VendorShieldLogo';
import PlanBadge from '../components/PlanBadge';
import PlanGate from '../components/PlanGate';
import TrialBanner from '../components/TrialBanner';
import UpgradeModal from '../components/UpgradeModal';
import { usePlan } from '../hooks/usePlan';

// ─── Tab IDs ──────────────────────────────────────────────────────────────────
const TABS = {
  OVERVIEW:   'overview',
  CONTRACTS:  'contracts',
  VENDORS:    'vendors',
  REPORTS:    'reports',
  COMPLIANCE: 'compliance',
  SUPPORT:    'support',
  PROFILE:    'profile',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const riskBadge = (level) => {
  if (level === 'High')   return 'bg-red-100 text-red-700';
  if (level === 'Medium') return 'bg-yellow-100 text-yellow-700';
  if (level === 'Low')    return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-500';
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, colorClass, bg, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Risk Bar ─────────────────────────────────────────────────────────────────
function RiskBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Contract Detail Modal (tabbed) ──────────────────────────────────────────
const MODAL_TABS = ['Overview', 'Clauses', 'Risks', 'Chat'];

const recBadge = (rec) => {
  if (rec === 'Approve') return 'bg-green-100 text-green-700 border-green-200';
  if (rec === 'Reject')  return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
};

const importanceBadge = (imp) => {
  if (imp === 'High')   return 'bg-red-100 text-red-600';
  if (imp === 'Medium') return 'bg-yellow-100 text-yellow-600';
  return 'bg-gray-100 text-gray-500';
};

function safeParseJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch (_) { return null; }
}

// ─── Locked feature card (inside modal) ──────────────────────────────────────
function ModalLockCard({ requiredPlan, featureName }) {
  const planLabel = requiredPlan === 'basic' ? 'Basic' : requiredPlan === 'professional' ? 'Professional' : 'Enterprise';
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800 mb-1">{featureName}</p>
      <p className="text-sm text-gray-400 mb-4">
        Available on the <span className="font-medium text-gray-600">{planLabel}</span> plan and above
      </p>
      <a
        href="/pricing"
        className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
      >
        Upgrade Plan
      </a>
    </div>
  );
}

function ContractDetailModal({ contract, risks, loading, userId, onClose }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [expandedClause, setExpandedClause] = useState(null);
  const [expandedRisk, setExpandedRisk] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const { hasFeature } = usePlan();

  const canDeepAnalysis = hasFeature('ai_deep_analysis');   // basic+
  const canChat         = hasFeature('ai_contract_chat');   // professional+

  const parties  = safeParseJson(contract.ai_parties);
  const dates    = safeParseJson(contract.ai_key_dates);
  const finance  = safeParseJson(contract.ai_financial_summary);
  const clauses  = safeParseJson(contract.ai_key_clauses);

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const res = await api.chatWithContract(contract.id, userId, q);
      setChatMessages(prev => [...prev, { role: 'ai', text: res.answer || 'No response.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Error getting answer. Please try again.' }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">AI Contract Analysis</h2>
              {contract.ai_contract_type && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                  {contract.ai_contract_type}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate max-w-lg mt-0.5">{contract.filename}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-light ml-4 shrink-0">×</button>
        </div>

        {/* Risk score bar + meta */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {contract.risk_level && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskBadge(contract.risk_level)}`}>
                {contract.risk_level} Risk
              </span>
            )}
            {contract.ai_recommendation && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${recBadge(contract.ai_recommendation)}`}>
                AI: {contract.ai_recommendation}
              </span>
            )}
            {contract.risk_score != null && (
              <div className="flex items-center gap-2 flex-1 min-w-32">
                <span className="text-xs text-gray-400 shrink-0">Score {contract.risk_score}/100</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${contract.risk_score > 60 ? 'bg-red-500' : contract.risk_score > 30 ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${contract.risk_score}%` }}
                  />
                </div>
              </div>
            )}
            <span className="text-xs text-gray-400 ml-auto">{new Date(contract.uploaded_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 shrink-0">
          {MODAL_TABS.map(tab => {
            const isLocked =
              (tab === 'Overview' && !canDeepAnalysis) ||
              (tab === 'Clauses'  && !canDeepAnalysis) ||
              (tab === 'Chat'     && !canChat);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {isLocked && (
                  <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {tab === 'Risks' && risks && risks.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{risks.length}</span>
                )}
                {tab === 'Clauses' && clauses && clauses.length > 0 && canDeepAnalysis && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{clauses.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── OVERVIEW ── */}
          {activeTab === 'Overview' && (
            <div className="space-y-5">
              {!canDeepAnalysis ? (
                <ModalLockCard requiredPlan="basic" featureName="AI Analysis Overview" />
              ) : loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Running AI analysis…</span>
                </div>
              ) : (
                <>
                  {/* AI Summary */}
                  {contract.ai_summary ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">AI Summary</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{contract.ai_summary}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400">
                      AI summary not available — re-upload the contract for full analysis.
                    </div>
                  )}

                  {/* Recommendation reason */}
                  {contract.ai_recommendation_reason && (
                    <div className={`rounded-xl p-4 border ${recBadge(contract.ai_recommendation)}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5">
                        Recommendation: {contract.ai_recommendation}
                      </p>
                      <p className="text-sm leading-relaxed">{contract.ai_recommendation_reason}</p>
                    </div>
                  )}

                  {/* Parties + Key Dates side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parties && parties.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parties</p>
                        <div className="space-y-1.5">
                          {parties.map((p, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="text-gray-400 shrink-0">{p.role}:</span>
                              <span className="font-medium text-gray-800">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {dates && dates.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Dates</p>
                        <div className="space-y-1.5">
                          {dates.map((d, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="text-gray-400 shrink-0">{d.label}:</span>
                              <span className="font-medium text-gray-800">{d.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  {finance && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Financial Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { k: 'Total Value',    v: finance.total_value },
                          { k: 'Payment Terms',  v: finance.payment_terms },
                          { k: 'Currency',       v: finance.currency },
                          { k: 'Late Penalties', v: finance.penalties },
                        ].filter(x => x.v && x.v !== 'null').map(({ k, v }) => (
                          <div key={k}>
                            <span className="text-gray-400 text-xs">{k}</span>
                            <p className="font-medium text-gray-800">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Vendor</p>
                      <p className="text-sm font-medium text-gray-900">{contract.vendor_name || 'Not linked'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Risk Score</p>
                      <p className="text-sm font-medium text-gray-900">{contract.risk_score != null ? `${contract.risk_score} / 100` : '—'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CLAUSES ── */}
          {activeTab === 'Clauses' && (
            <div className="space-y-3">
              {!canDeepAnalysis ? (
                <ModalLockCard requiredPlan="basic" featureName="AI Clause Extraction" />
              ) : loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Extracting clauses…</span>
                </div>
              ) : !clauses || clauses.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-sm text-gray-400">
                  No key clauses extracted yet — re-upload the contract for full AI analysis.
                </div>
              ) : (
                clauses.map((c, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedClause(expandedClause === i ? null : i)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{c.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${importanceBadge(c.importance)}`}>{c.importance}</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedClause === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedClause === i && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                        <p className="text-sm text-gray-700">{c.summary}</p>
                        {c.excerpt && (
                          <blockquote className="border-l-2 border-blue-300 pl-3 text-xs text-gray-500 italic">
                            "{c.excerpt}"
                          </blockquote>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── RISKS ── */}
          {activeTab === 'Risks' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Loading risks…</span>
                </div>
              ) : !risks || risks.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-sm text-gray-400">
                  No risks detected yet — analysis may still be in progress.
                </div>
              ) : (
                risks.map((r, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedRisk(expandedRisk === i ? null : i)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{r.risk_type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskBadge(r.severity)}`}>{r.severity}</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRisk === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 ${expandedRisk === i ? '' : 'hidden'}`}>
                      <p className="text-sm text-gray-700 leading-relaxed">{r.description}</p>
                      {canDeepAnalysis ? (
                        r.mitigation ? (
                          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Mitigation</p>
                            <p className="text-sm text-green-800 leading-relaxed">{r.mitigation}</p>
                          </div>
                        ) : null
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-xs text-gray-400">Mitigation suggestions available on </span>
                          <a href="/pricing" className="text-xs text-blue-600 hover:underline font-medium">Basic plan</a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── CHAT ── */}
          {activeTab === 'Chat' && (
            <div className="flex flex-col h-full" style={{ minHeight: '340px' }}>
              {!canChat ? (
                <ModalLockCard requiredPlan="professional" featureName="Chat with Contract" />
              ) : null}
              {/* Messages */}
              {canChat && <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                {chatMessages.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm text-gray-500 font-medium">Ask anything about this contract</p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                      {[
                        'What are the payment terms?',
                        'Who can terminate this contract?',
                        'What is the liability cap?',
                        'Are there any penalties?',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => setChatInput(q)}
                          className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>}

              {/* Input */}
              {canChat && <div className="flex gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Ask a question about this contract…"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ stats, contracts }) {
  const analyzed = contracts.filter(c => c.risk_level);
  const highCount = analyzed.filter(c => c.risk_level === 'High').length;
  const medCount  = analyzed.filter(c => c.risk_level === 'Medium').length;
  const lowCount  = analyzed.filter(c => c.risk_level === 'Low').length;
  const avgScore  = analyzed.length
    ? Math.round(analyzed.reduce((s, c) => s + (c.risk_score || 0), 0) / analyzed.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Contracts Analyzed" value={stats.contractsAnalyzed} colorClass="text-blue-600"  bg="bg-blue-50"   icon="📄" />
        <StatCard label="Risks Detected"     value={stats.risksDetected}     colorClass="text-red-600"   bg="bg-red-50"    icon="⚠️" />
        <StatCard label="Active Vendors"     value={stats.activeVendors}     colorClass="text-green-600" bg="bg-green-50"  icon="🏢" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          {analyzed.length === 0 ? (
            <p className="text-sm text-gray-400">Upload and analyze contracts to see distribution.</p>
          ) : (
            <div className="space-y-3">
              <RiskBar label="High Risk"   count={highCount} total={analyzed.length} color="bg-red-500" />
              <RiskBar label="Medium Risk" count={medCount}  total={analyzed.length} color="bg-yellow-400" />
              <RiskBar label="Low Risk"    count={lowCount}  total={analyzed.length} color="bg-green-500" />
            </div>
          )}
        </div>

        {/* Average Score + quick stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk Overview</h3>
          {analyzed.length === 0 ? (
            <p className="text-sm text-gray-400">No analyzed contracts yet.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Average Risk Score</p>
                <div className="flex items-end space-x-2">
                  <span className="text-3xl font-bold text-gray-900">{avgScore}</span>
                  <span className="text-sm text-gray-400 mb-1">/ 100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${
                      avgScore > 60 ? 'bg-red-500' : avgScore > 30 ? 'bg-yellow-400' : 'bg-green-500'
                    }`}
                    style={{ width: `${avgScore}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">{highCount}</p>
                  <p className="text-xs text-red-400">High Risk</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{lowCount}</p>
                  <p className="text-xs text-green-400">Low Risk</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent contracts */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Contracts</h3>
        </div>
        {contracts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No contracts yet — head to the Contracts tab to upload one.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contracts.slice(0, 5).map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800 truncate max-w-xs">{c.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(c.uploaded_at).toLocaleDateString()}</p>
                </div>
                {c.risk_level
                  ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskBadge(c.risk_level)}`}>{c.risk_level}</span>
                  : <span className="text-xs text-gray-300 animate-pulse">Analyzing…</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contracts Tab ────────────────────────────────────────────────────────────
function ContractsTab({ contracts, userId, onRefresh }) {
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All');
  const [sortBy,   setSortBy]   = useState('newest');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isContractLimitReached, limits, usage, contractUsagePercent } = usePlan();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    setUploadError('');
    try {
      const { status, data } = await api.uploadContractSafe(file, userId);
      if (status === 403 && data.error === 'LIMIT_REACHED') {
        setUploadError(data.message);
        setShowUpgradeModal(true);
      } else if (data.status === 'success') {
        setUploadMsg('Uploaded! AI analysis started — refresh in a moment.');
        setTimeout(onRefresh, 2500);
      } else {
        setUploadError(data.message || 'Upload failed. Please try again.');
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openDetail = async (contract) => {
    setSelected(contract);
    setAnalysis(null);
    setLoadingAnalysis(true);
    try {
      const res = await api.getContractAnalysis(contract.id, userId);
      if (res.status === 'success') {
        setSelected(res.contract); // use full contract from DB (includes AI fields)
        setAnalysis(res.risks);
      }
    } catch {}
    setLoadingAnalysis(false);
  };

  const handleDelete = async (contractId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this contract and all its risk data?')) return;
    setDeleting(contractId);
    try {
      await api.deleteContract(userId, contractId);
      onRefresh();
    } catch {}
    setDeleting(null);
  };

  const filtered = contracts
    .filter(c => {
      const q = search.toLowerCase();
      return c.filename.toLowerCase().includes(q) || (c.vendor_name || '').toLowerCase().includes(q);
    })
    .filter(c => filter === 'All' || c.risk_level === filter)
    .sort((a, b) => {
      if (sortBy === 'newest')  return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      if (sortBy === 'oldest')  return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      if (sortBy === 'highest') return (b.risk_score || 0) - (a.risk_score || 0);
      if (sortBy === 'lowest')  return (a.risk_score || 0) - (b.risk_score || 0);
      return 0;
    });

  return (
    <div className="space-y-5">
      {/* Upgrade modal for limit hit */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        requiredPlan="professional"
        featureName="more contract uploads"
      />

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Upload New Contract</h3>
          {limits.contracts && (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              isContractLimitReached()
                ? 'bg-red-100 text-red-700'
                : contractUsagePercent() >= 80
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {usage.contracts?.used ?? 0} / {limits.contracts} this month
            </span>
          )}
        </div>

        {/* Usage progress bar */}
        {limits.contracts && (
          <div className="mb-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isContractLimitReached() ? 'bg-red-500' : contractUsagePercent() >= 80 ? 'bg-amber-400' : 'bg-blue-500'
                }`}
                style={{ width: `${contractUsagePercent()}%` }}
              />
            </div>
          </div>
        )}

        {isContractLimitReached() ? (
          <div className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-red-200 bg-red-50 rounded-lg gap-2">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-red-600 font-medium">Monthly limit reached</p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Upgrade to upload more →
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
            <svg className="w-7 h-7 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm text-gray-500">{uploading ? 'Uploading…' : 'Click to upload PDF or Word document'}</span>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUpload} disabled={uploading} />
          </label>
        )}

        {uploadMsg && <p className="mt-2 text-sm text-green-600">{uploadMsg}</p>}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by filename or vendor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Risk</option>
          <option value="lowest">Lowest Risk</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Contracts</h3>
          <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            {contracts.length === 0 ? 'No contracts uploaded yet.' : 'No contracts match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Filename', 'Vendor', 'Risk', 'Score', 'Uploaded', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(c)}>
                    <td className="px-5 py-3 text-gray-900 max-w-xs truncate font-medium">{c.filename}</td>
                    <td className="px-5 py-3 text-gray-500">{c.vendor_name || '—'}</td>
                    <td className="px-5 py-3">
                      {c.risk_level
                        ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskBadge(c.risk_level)}`}>{c.risk_level}</span>
                        : <span className="text-xs text-gray-300 animate-pulse">Analyzing…</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.risk_score ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400">{new Date(c.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDelete(c.id, e)}
                        disabled={deleting === c.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {deleting === c.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ContractDetailModal
          contract={selected}
          risks={analysis}
          loading={loadingAnalysis}
          userId={userId}
          onClose={() => { setSelected(null); setAnalysis(null); }}
        />
      )}
    </div>
  );
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────
function VendorsTab({ vendors, contracts, userId, onRefresh }) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [adding,  setAdding]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [deleting, setDeleting] = useState(null);
  const [linkContractId, setLinkContractId] = useState('');
  const [linkVendorId,   setLinkVendorId]   = useState('');
  const [linking, setLinking] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    setMsg('');
    try {
      await api.addVendor(userId, name, email, phone);
      setMsg('Vendor added successfully!');
      setName(''); setEmail(''); setPhone('');
      onRefresh();
    } catch {
      setMsg('Failed to add vendor.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Delete this vendor?')) return;
    setDeleting(vendorId);
    try {
      await api.deleteVendor(userId, vendorId);
      onRefresh();
    } catch {}
    setDeleting(null);
  };

  const handleLink = async (e) => {
    e.preventDefault();
    if (!linkVendorId || !linkContractId) return;
    setLinking(true);
    setMsg('');
    try {
      const vendor = vendors.find(v => String(v.id) === linkVendorId);
      await api.linkContractToVendor(linkContractId, vendor.name);
      setMsg('Vendor linked to contract!');
      setLinkVendorId(''); setLinkContractId('');
      onRefresh();
    } catch {
      setMsg('Failed to link vendor.');
    } finally {
      setLinking(false);
    }
  };

  const unlinkableContracts = contracts.filter(c => !c.vendor_name);

  return (
    <div className="space-y-5">
      {/* Add vendor */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Vendor</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={name}  onChange={e => setName(e.target.value)}  placeholder="Vendor name *" required className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Contact email"  type="email" className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number"   className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button type="submit" disabled={adding} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
            {adding ? 'Adding…' : '+ Add Vendor'}
          </button>
        </form>
        {msg && <p className={`mt-2 text-sm ${msg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
      </div>

      {/* Link vendor to contract */}
      {vendors.length > 0 && unlinkableContracts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Link Vendor to Contract</h3>
          <form onSubmit={handleLink} className="flex flex-wrap gap-3 items-end">
            <select value={linkContractId} onChange={e => setLinkContractId(e.target.value)} required className="flex-1 min-w-48 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Select contract…</option>
              {unlinkableContracts.map(c => <option key={c.id} value={c.id}>{c.filename}</option>)}
            </select>
            <select value={linkVendorId} onChange={e => setLinkVendorId(e.target.value)} required className="flex-1 min-w-48 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button type="submit" disabled={linking} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
              {linking ? 'Linking…' : 'Link'}
            </button>
          </form>
        </div>
      )}

      {/* Vendor list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Your Vendors</h3>
          <span className="text-xs text-gray-400">{vendors.length} total</span>
        </div>
        {vendors.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No vendors yet — add one above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {vendors.map(v => {
              const linkedContracts = contracts.filter(c => c.vendor_name === v.name).length;
              return (
                <div key={v.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                      {v.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[v.contact_email, v.contact_phone].filter(Boolean).join(' · ') || 'No contact info'}
                        {linkedContracts > 0 && ` · ${linkedContracts} contract${linkedContracts > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={deleting === v.id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {deleting === v.id ? '…' : 'Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab({ contracts, userId, userEmail }) {
  // PDF state
  const [pdfContractId, setPdfContractId] = useState('');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [pdfMsg,        setPdfMsg]        = useState('');

  // Excel state
  const [xlsLoading, setXlsLoading] = useState(false);
  const [xlsMsg,     setXlsMsg]     = useState('');

  // Custom report state
  const [customVendor,    setCustomVendor]    = useState('');
  const [customDateFrom,  setCustomDateFrom]  = useState('');
  const [customDateTo,    setCustomDateTo]    = useState('');
  const [customRiskLevel, setCustomRiskLevel] = useState('all');
  const [customLoading,   setCustomLoading]   = useState(false);
  const [customMsg,       setCustomMsg]       = useState('');

  // Schedule state
  const [schedFreq,       setSchedFreq]       = useState('weekly');
  const [schedEmail,      setSchedEmail]      = useState(userEmail || '');
  const [schedLoading,    setSchedLoading]    = useState(false);
  const [sendNowLoading,  setSendNowLoading]  = useState(false);
  const [schedMsg,        setSchedMsg]        = useState('');

  // AI summary state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError,   setAiError]   = useState('');

  const handleDownloadPdf = async () => {
    if (!pdfContractId) { setPdfMsg('Please select a contract.'); return; }
    setPdfLoading(true); setPdfMsg('');
    try {
      const c = contracts.find(x => String(x.id) === String(pdfContractId));
      await api.downloadContractPdf(userId, pdfContractId, c?.filename);
      setPdfMsg('PDF downloaded successfully.');
    } catch (e) { setPdfMsg('Error: ' + e.message); }
    finally { setPdfLoading(false); }
  };

  const handleDownloadExcel = async () => {
    setXlsLoading(true); setXlsMsg('');
    try {
      await api.downloadExcel(userId);
      setXlsMsg('Excel file downloaded.');
    } catch (e) { setXlsMsg('Error: ' + e.message); }
    finally { setXlsLoading(false); }
  };

  const handleCustomReport = async (e) => {
    e.preventDefault();
    setCustomLoading(true); setCustomMsg('');
    try {
      await api.downloadCustomReport(userId, {
        vendorFilter: customVendor,
        dateFrom:     customDateFrom,
        dateTo:       customDateTo,
        riskLevel:    customRiskLevel,
      });
      setCustomMsg('Custom report downloaded.');
    } catch (e) { setCustomMsg('Error: ' + e.message); }
    finally { setCustomLoading(false); }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSchedLoading(true); setSchedMsg('');
    try {
      const r = await api.saveReportSchedule(userId, schedFreq, schedEmail);
      setSchedMsg(r.message || 'Schedule saved!');
    } catch (e) { setSchedMsg('Error: ' + e.message); }
    finally { setSchedLoading(false); }
  };

  const handleSendNow = async () => {
    if (!schedEmail) { setSchedMsg('Enter an email address first.'); return; }
    setSendNowLoading(true); setSchedMsg('');
    try {
      const r = await api.sendReportNow(userId, schedEmail);
      setSchedMsg(r.message || 'Report sent!');
    } catch (e) { setSchedMsg('Error: ' + e.message); }
    finally { setSendNowLoading(false); }
  };

  const handleAiSummary = async () => {
    setAiLoading(true); setAiSummary(''); setAiError('');
    try {
      const r = await api.getAiSummary(userId);
      setAiSummary(r.summary);
    } catch (e) { setAiError('Failed to generate summary: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const btnCls   = 'px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50';

  return (
    <div className="space-y-5">

      {/* 1 — PDF Download */}
      <PlanGate feature="download_pdf" featureLabel="PDF Report Downloads">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">📄</div>
            <div>
              <h3 className="font-semibold text-gray-900">Download Risk Reports</h3>
              <p className="text-xs text-gray-400">Export contract analysis as PDF</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Select contract</label>
              <select value={pdfContractId} onChange={e => setPdfContractId(e.target.value)} className={`w-full ${inputCls}`}>
                <option value="">— Choose a contract —</option>
                {contracts.filter(c => c.analysis_complete).map(c => (
                  <option key={c.id} value={c.id}>{c.filename} {c.risk_level ? `(${c.risk_level})` : ''}</option>
                ))}
              </select>
            </div>
            <button onClick={handleDownloadPdf} disabled={pdfLoading || !pdfContractId} className={`${btnCls} bg-blue-600 hover:bg-blue-700 text-white`}>
              {pdfLoading ? 'Generating…' : '⬇ Download PDF'}
            </button>
          </div>
          {contracts.filter(c => c.analysis_complete).length === 0 && (
            <p className="text-xs text-amber-600 mt-2">No analysed contracts yet. Upload and wait for AI analysis to complete.</p>
          )}
          {pdfMsg && <p className={`text-xs mt-2 ${pdfMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{pdfMsg}</p>}
        </div>
      </PlanGate>

      {/* 2 — Excel Export */}
      <PlanGate feature="download_excel" featureLabel="Excel Report Export">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">📊</div>
              <div>
                <h3 className="font-semibold text-gray-900">Excel Export</h3>
                <p className="text-xs text-gray-400">All contracts + risks in one spreadsheet</p>
              </div>
            </div>
            <button onClick={handleDownloadExcel} disabled={xlsLoading} className={`${btnCls} bg-green-600 hover:bg-green-700 text-white`}>
              {xlsLoading ? 'Generating…' : '⬇ Download Excel'}
            </button>
          </div>
          {xlsMsg && <p className={`text-xs mt-3 ${xlsMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{xlsMsg}</p>}
        </div>
      </PlanGate>

      {/* 3 — Custom Report Builder */}
      <PlanGate feature="custom_report_builder" featureLabel="Custom Report Builder">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl">🛠️</div>
            <div>
              <h3 className="font-semibold text-gray-900">Custom Report Builder</h3>
              <p className="text-xs text-gray-400">Filter by vendor, date range, or risk level</p>
            </div>
          </div>
          <form onSubmit={handleCustomReport} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vendor name (optional)</label>
                <input value={customVendor} onChange={e => setCustomVendor(e.target.value)} placeholder="e.g. Acme Corp" className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Risk level</label>
                <select value={customRiskLevel} onChange={e => setCustomRiskLevel(e.target.value)} className={`w-full ${inputCls}`}>
                  <option value="all">All levels</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From date</label>
                <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To date</label>
                <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
            </div>
            <button type="submit" disabled={customLoading} className={`${btnCls} bg-purple-600 hover:bg-purple-700 text-white`}>
              {customLoading ? 'Generating…' : '⬇ Generate & Download'}
            </button>
            {customMsg && <p className={`text-xs ${customMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{customMsg}</p>}
          </form>
        </div>
      </PlanGate>

      {/* 4 — Scheduled Email Reports */}
      <PlanGate feature="scheduled_reports" featureLabel="Scheduled Email Reports">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">📬</div>
            <div>
              <h3 className="font-semibold text-gray-900">Scheduled Email Reports</h3>
              <p className="text-xs text-gray-400">Auto-send risk reports to any email</p>
            </div>
          </div>
          <form onSubmit={handleSaveSchedule} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                <select value={schedFreq} onChange={e => setSchedFreq(e.target.value)} className={`w-full ${inputCls}`}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email address</label>
                <input type="email" required value={schedEmail} onChange={e => setSchedEmail(e.target.value)} placeholder="you@company.com" className={`w-full ${inputCls}`} />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button type="submit" disabled={schedLoading} className={`${btnCls} bg-amber-500 hover:bg-amber-600 text-white`}>
                {schedLoading ? 'Saving…' : '💾 Save Schedule'}
              </button>
              <button type="button" onClick={handleSendNow} disabled={sendNowLoading} className={`${btnCls} bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300`}>
                {sendNowLoading ? 'Sending…' : '📤 Send Now'}
              </button>
            </div>
            {schedMsg && <p className={`text-xs ${schedMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{schedMsg}</p>}
          </form>
        </div>
      </PlanGate>

      {/* 5 — AI Executive Summary */}
      <PlanGate feature="ai_executive_summary" featureLabel="AI Executive Summary">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">🤖</div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Executive Summary</h3>
                <p className="text-xs text-gray-400">Gemini-powered plain-language risk brief</p>
              </div>
            </div>
            <button onClick={handleAiSummary} disabled={aiLoading} className={`${btnCls} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              {aiLoading ? 'Generating…' : '✨ Generate Summary'}
            </button>
          </div>
          {aiError && <p className="text-xs text-red-500 mb-2">{aiError}</p>}
          {aiLoading && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-4 py-3">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Analysing all contracts with Gemini AI…
            </div>
          )}
          {aiSummary && !aiLoading && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Executive Summary</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(aiSummary); }}
                  className="text-xs text-blue-600 hover:underline"
                >Copy</button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
            </div>
          )}
        </div>
      </PlanGate>
    </div>
  );
}

// ─── Compliance Tab ────────────────────────────────────────────────────────────
function ComplianceTab({ userId }) {
  const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const btnCls   = 'px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50';

  const STANDARDS = ['ISO 27001', 'SOC 2 Type II', 'GDPR', 'HIPAA', 'PCI-DSS', 'CCPA'];

  // ── Certifications state ──────────────────────────────────────────────────
  const [certs, setCerts]             = useState([]);
  const [certForm, setCertForm]       = useState({ vendor_name: '', standard: 'ISO 27001', status: 'active', issued_date: '', expiry_date: '', notes: '' });
  const [editingCert, setEditingCert] = useState(null);
  const [certMsg, setCertMsg]         = useState('');
  const [showCertForm, setShowCertForm] = useState(false);

  // ── Expiring state ────────────────────────────────────────────────────────
  const [expiring, setExpiring]   = useState([]);
  const [expiryDays, setExpiryDays] = useState(90);

  // ── Audit log state ───────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ── Risk actions state ────────────────────────────────────────────────────
  const [actions, setActions]           = useState([]);
  const [actionForm, setActionForm]     = useState({ title: '', description: '', assignee: '', priority: 'medium', status: 'open', due_date: '', contract_name: '', risk_type: '' });
  const [editingAction, setEditingAction] = useState(null);
  const [actionMsg, setActionMsg]       = useState('');
  const [showActionForm, setShowActionForm] = useState(false);

  // ── Assessments state ─────────────────────────────────────────────────────
  const [assessments, setAssessments]         = useState([]);
  const [assessForm, setAssessForm]           = useState({ vendor_name: '', priority: 'medium', owner: '', status: 'pending', due_date: '', notes: '' });
  const [editingAssess, setEditingAssess]     = useState(null);
  const [assessMsg, setAssessMsg]             = useState('');
  const [showAssessForm, setShowAssessForm]   = useState(false);

  // ── Compliance PDF state ──────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMsg, setPdfMsg]         = useState('');

  // ── Load all data on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    api.getCertifications(userId).then(setCerts).catch(() => {});
    api.getExpiringCertifications(userId, 90).then(setExpiring).catch(() => {});
    loadAuditLog();
    api.getRiskActions(userId).then(setActions).catch(() => {});
    api.getAssessments(userId).then(setAssessments).catch(() => {});
  }, [userId]);

  const loadAuditLog = async () => {
    setAuditLoading(true);
    try { setAuditLogs(await api.getAuditLog(userId, 50)); } catch (_) {}
    setAuditLoading(false);
  };

  // ── Cert helpers ──────────────────────────────────────────────────────────
  const handleCertSubmit = async (e) => {
    e.preventDefault(); setCertMsg('');
    try {
      if (editingCert) {
        await api.updateCertification(editingCert.id, userId, certForm);
        setCertMsg('Certification updated.');
      } else {
        await api.addCertification(userId, certForm);
        setCertMsg('Certification added.');
      }
      const updated = await api.getCertifications(userId);
      setCerts(updated);
      setExpiring(await api.getExpiringCertifications(userId, expiryDays));
      loadAuditLog();
      setCertForm({ vendor_name: '', standard: 'ISO 27001', status: 'active', issued_date: '', expiry_date: '', notes: '' });
      setEditingCert(null); setShowCertForm(false);
    } catch (err) { setCertMsg('Error: ' + err.message); }
  };

  const startEditCert = (c) => {
    setEditingCert(c);
    setCertForm({ vendor_name: c.vendor_name, standard: c.standard, status: c.status, issued_date: c.issued_date || '', expiry_date: c.expiry_date || '', notes: c.notes || '' });
    setShowCertForm(true);
  };

  const handleDeleteCert = async (id) => {
    if (!window.confirm('Delete this certification?')) return;
    await api.deleteCertification(id, userId);
    setCerts(await api.getCertifications(userId));
    setExpiring(await api.getExpiringCertifications(userId, expiryDays));
    loadAuditLog();
  };

  // ── Action helpers ────────────────────────────────────────────────────────
  const handleActionSubmit = async (e) => {
    e.preventDefault(); setActionMsg('');
    try {
      if (editingAction) {
        await api.updateRiskAction(editingAction.id, userId, actionForm);
        setActionMsg('Action updated.');
      } else {
        await api.addRiskAction(userId, actionForm);
        setActionMsg('Action created.');
      }
      setActions(await api.getRiskActions(userId));
      loadAuditLog();
      setActionForm({ title: '', description: '', assignee: '', priority: 'medium', status: 'open', due_date: '', contract_name: '', risk_type: '' });
      setEditingAction(null); setShowActionForm(false);
    } catch (err) { setActionMsg('Error: ' + err.message); }
  };

  const startEditAction = (a) => {
    setEditingAction(a);
    setActionForm({ title: a.title, description: a.description || '', assignee: a.assignee || '', priority: a.priority, status: a.status, due_date: a.due_date || '', contract_name: a.contract_name || '', risk_type: a.risk_type || '' });
    setShowActionForm(true);
  };

  const handleDeleteAction = async (id) => {
    if (!window.confirm('Delete this action?')) return;
    await api.deleteRiskAction(id, userId);
    setActions(await api.getRiskActions(userId));
    loadAuditLog();
  };

  const cycleActionStatus = async (a) => {
    const next = { open: 'investigating', investigating: 'closed', closed: 'open' };
    await api.updateRiskAction(a.id, userId, { ...a, status: next[a.status] });
    setActions(await api.getRiskActions(userId));
    loadAuditLog();
  };

  // ── Assessment helpers ────────────────────────────────────────────────────
  const handleAssessSubmit = async (e) => {
    e.preventDefault(); setAssessMsg('');
    try {
      if (editingAssess) {
        await api.updateAssessment(editingAssess.id, userId, assessForm);
        setAssessMsg('Assessment updated.');
      } else {
        await api.addAssessment(userId, assessForm);
        setAssessMsg('Assessment added.');
      }
      setAssessments(await api.getAssessments(userId));
      loadAuditLog();
      setAssessForm({ vendor_name: '', priority: 'medium', owner: '', status: 'pending', due_date: '', notes: '' });
      setEditingAssess(null); setShowAssessForm(false);
    } catch (err) { setAssessMsg('Error: ' + err.message); }
  };

  const startEditAssess = (a) => {
    setEditingAssess(a);
    setAssessForm({ vendor_name: a.vendor_name, priority: a.priority, owner: a.owner || '', status: a.status, due_date: a.due_date || '', notes: a.notes || '' });
    setShowAssessForm(true);
  };

  const handleDeleteAssess = async (id) => {
    if (!window.confirm('Delete this assessment?')) return;
    await api.deleteAssessment(id, userId);
    setAssessments(await api.getAssessments(userId));
    loadAuditLog();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusDot = (s) => {
    if (s === 'active')   return 'bg-green-400';
    if (s === 'expired')  return 'bg-red-400';
    return 'bg-amber-400';
  };

  const priorityColor = (p) => {
    if (p === 'high')   return 'text-red-600 bg-red-50';
    if (p === 'medium') return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const actionStatusColor = (s) => {
    if (s === 'open')          return 'bg-red-100 text-red-700';
    if (s === 'investigating') return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  const assessStatusColor = (s) => {
    if (s === 'pending')     return 'bg-red-100 text-red-700';
    if (s === 'in_progress') return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const urgencyColor = (days) => {
    if (days <= 30)  return 'border-red-300 bg-red-50';
    if (days <= 60)  return 'border-amber-300 bg-amber-50';
    return 'border-yellow-200 bg-yellow-50';
  };

  const auditIcon = (action) => {
    if (action.startsWith('CONTRACT'))   return '📄';
    if (action.startsWith('VENDOR'))     return '🏢';
    if (action.startsWith('ANALYSIS'))   return '🤖';
    if (action.startsWith('ADD_CERT') || action.startsWith('UPDATE_CERT') || action.startsWith('DELETE_CERT')) return '🛡️';
    if (action.startsWith('ADD_ACTION') || action.startsWith('UPDATE_ACTION')) return '✅';
    if (action.startsWith('ADD_ASSESS') || action.startsWith('UPDATE_ASSESS')) return '📌';
    if (action.startsWith('GENERATE'))   return '📑';
    return '🔹';
  };

  return (
    <div className="space-y-5">

      {/* 1 — Compliance Status (Vendor Certifications) */}
      <PlanGate feature="compliance_status" featureLabel="Compliance Status Tracking">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🛡️</div>
              <div>
                <h3 className="font-semibold text-gray-900">Vendor Certifications</h3>
                <p className="text-xs text-gray-400">ISO 27001, SOC 2, GDPR, HIPAA, PCI-DSS, CCPA</p>
              </div>
            </div>
            <button onClick={() => { setShowCertForm(v => !v); setEditingCert(null); setCertForm({ vendor_name: '', standard: 'ISO 27001', status: 'active', issued_date: '', expiry_date: '', notes: '' }); }}
              className={`${btnCls} bg-blue-600 hover:bg-blue-700 text-white`}>
              {showCertForm ? 'Cancel' : '+ Add Certification'}
            </button>
          </div>

          {showCertForm && (
            <form onSubmit={handleCertSubmit} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">{editingCert ? 'Edit Certification' : 'New Certification'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vendor name *</label>
                  <input required value={certForm.vendor_name} onChange={e => setCertForm(f => ({ ...f, vendor_name: e.target.value }))} className={`w-full ${inputCls}`} placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Standard *</label>
                  <select value={certForm.standard} onChange={e => setCertForm(f => ({ ...f, standard: e.target.value }))} className={`w-full ${inputCls}`}>
                    {STANDARDS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={certForm.status} onChange={e => setCertForm(f => ({ ...f, status: e.target.value }))} className={`w-full ${inputCls}`}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Issued date</label>
                  <input type="date" value={certForm.issued_date} onChange={e => setCertForm(f => ({ ...f, issued_date: e.target.value }))} className={`w-full ${inputCls}`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expiry date</label>
                  <input type="date" value={certForm.expiry_date} onChange={e => setCertForm(f => ({ ...f, expiry_date: e.target.value }))} className={`w-full ${inputCls}`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <input value={certForm.notes} onChange={e => setCertForm(f => ({ ...f, notes: e.target.value }))} className={`w-full ${inputCls}`} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnCls} bg-blue-600 hover:bg-blue-700 text-white`}>{editingCert ? 'Update' : 'Add Certification'}</button>
                <button type="button" onClick={() => { setShowCertForm(false); setEditingCert(null); }} className={`${btnCls} bg-gray-100 hover:bg-gray-200 text-gray-700`}>Cancel</button>
              </div>
              {certMsg && <p className={`text-xs ${certMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{certMsg}</p>}
            </form>
          )}

          {certs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No certifications recorded. Add one to track vendor compliance.</p>
          ) : (
            <div className="space-y-2">
              {certs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(c.status)}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.vendor_name} — {c.standard}</p>
                      <p className="text-xs text-gray-400">
                        {c.status.toUpperCase()}
                        {c.expiry_date && ` · Expires ${c.expiry_date}`}
                        {c.notes && ` · ${c.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditCert(c)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteCert(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PlanGate>

      {/* 2 — Expiring Certification Alerts */}
      <PlanGate feature="cert_alerts" featureLabel="Expiring Certification Alerts">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">⏰</div>
              <div>
                <h3 className="font-semibold text-gray-900">Expiring Certification Alerts</h3>
                <p className="text-xs text-gray-400">Certifications expiring within selected window</p>
              </div>
            </div>
            <select value={expiryDays} onChange={async e => { const d = parseInt(e.target.value); setExpiryDays(d); setExpiring(await api.getExpiringCertifications(userId, d)); }} className={`${inputCls} w-32`}>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          {expiring.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No certifications expiring within {expiryDays} days.</p>
          ) : (
            <div className="space-y-2">
              {expiring.map(c => {
                const days = daysUntil(c.expiry_date);
                return (
                  <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border ${urgencyColor(days)}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.vendor_name} — {c.standard}</p>
                      <p className="text-xs text-gray-500">Expires {c.expiry_date}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${days <= 30 ? 'bg-red-100 text-red-700' : days <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {days}d left
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PlanGate>

      {/* 3 — Audit History */}
      <PlanGate feature="audit_history" featureLabel="Audit History">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl">📋</div>
              <div>
                <h3 className="font-semibold text-gray-900">Audit History</h3>
                <p className="text-xs text-gray-400">Full activity log of all platform actions</p>
              </div>
            </div>
            <button onClick={loadAuditLog} disabled={auditLoading} className={`${btnCls} bg-gray-100 hover:bg-gray-200 text-gray-700`}>
              {auditLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No activity logged yet. Actions like uploading contracts, adding vendors, and running analysis will appear here.</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base shrink-0 mt-0.5">{auditIcon(log.action)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{log.description || log.action}</p>
                    <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 font-mono">{log.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PlanGate>

      {/* 4 — Action Tracking */}
      <PlanGate feature="action_tracking" featureLabel="Action Tracking Workflow">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">✅</div>
              <div>
                <h3 className="font-semibold text-gray-900">Risk Action Tracking</h3>
                <p className="text-xs text-gray-400">Open → Investigating → Closed workflow</p>
              </div>
            </div>
            <button onClick={() => { setShowActionForm(v => !v); setEditingAction(null); setActionForm({ title: '', description: '', assignee: '', priority: 'medium', status: 'open', due_date: '', contract_name: '', risk_type: '' }); }}
              className={`${btnCls} bg-green-600 hover:bg-green-700 text-white`}>
              {showActionForm ? 'Cancel' : '+ New Action'}
            </button>
          </div>

          {showActionForm && (
            <form onSubmit={handleActionSubmit} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">{editingAction ? 'Edit Action' : 'New Risk Action'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Action title *</label>
                  <input required value={actionForm.title} onChange={e => setActionForm(f => ({ ...f, title: e.target.value }))} className={`w-full ${inputCls}`} placeholder="e.g. Review GDPR clause 7 with legal team" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select value={actionForm.priority} onChange={e => setActionForm(f => ({ ...f, priority: e.target.value }))} className={`w-full ${inputCls}`}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={actionForm.status} onChange={e => setActionForm(f => ({ ...f, status: e.target.value }))} className={`w-full ${inputCls}`}>
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assignee</label>
                  <input value={actionForm.assignee} onChange={e => setActionForm(f => ({ ...f, assignee: e.target.value }))} className={`w-full ${inputCls}`} placeholder="Name or email" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Due date</label>
                  <input type="date" value={actionForm.due_date} onChange={e => setActionForm(f => ({ ...f, due_date: e.target.value }))} className={`w-full ${inputCls}`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Related contract</label>
                  <input value={actionForm.contract_name} onChange={e => setActionForm(f => ({ ...f, contract_name: e.target.value }))} className={`w-full ${inputCls}`} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Risk type</label>
                  <input value={actionForm.risk_type} onChange={e => setActionForm(f => ({ ...f, risk_type: e.target.value }))} className={`w-full ${inputCls}`} placeholder="e.g. Data Privacy" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`w-full ${inputCls}`} placeholder="What needs to be done?" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnCls} bg-green-600 hover:bg-green-700 text-white`}>{editingAction ? 'Update' : 'Create Action'}</button>
                <button type="button" onClick={() => { setShowActionForm(false); setEditingAction(null); }} className={`${btnCls} bg-gray-100 hover:bg-gray-200 text-gray-700`}>Cancel</button>
              </div>
              {actionMsg && <p className={`text-xs ${actionMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{actionMsg}</p>}
            </form>
          )}

          {actions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No actions yet. Create one to start tracking risk remediation tasks.</p>
          ) : (
            <div className="space-y-2">
              {actions.map(a => (
                <div key={a.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(a.priority)}`}>{a.priority}</span>
                      <button onClick={() => cycleActionStatus(a)} className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${actionStatusColor(a.status)}`} title="Click to advance status">
                        {a.status}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      {a.assignee && `Assignee: ${a.assignee}`}
                      {a.due_date && ` · Due: ${a.due_date}`}
                      {a.contract_name && ` · Contract: ${a.contract_name}`}
                    </p>
                    {a.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{a.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditAction(a)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteAction(a.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PlanGate>

      {/* 5 — Pending Assessments */}
      <PlanGate feature="pending_assessments" featureLabel="Pending Assessments">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl">📌</div>
              <div>
                <h3 className="font-semibold text-gray-900">Vendor Assessments</h3>
                <p className="text-xs text-gray-400">Pending → In Progress → Completed</p>
              </div>
            </div>
            <button onClick={() => { setShowAssessForm(v => !v); setEditingAssess(null); setAssessForm({ vendor_name: '', priority: 'medium', owner: '', status: 'pending', due_date: '', notes: '' }); }}
              className={`${btnCls} bg-red-600 hover:bg-red-700 text-white`}>
              {showAssessForm ? 'Cancel' : '+ New Assessment'}
            </button>
          </div>

          {showAssessForm && (
            <form onSubmit={handleAssessSubmit} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">{editingAssess ? 'Edit Assessment' : 'New Vendor Assessment'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vendor name *</label>
                  <input required value={assessForm.vendor_name} onChange={e => setAssessForm(f => ({ ...f, vendor_name: e.target.value }))} className={`w-full ${inputCls}`} placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select value={assessForm.priority} onChange={e => setAssessForm(f => ({ ...f, priority: e.target.value }))} className={`w-full ${inputCls}`}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Owner</label>
                  <input value={assessForm.owner} onChange={e => setAssessForm(f => ({ ...f, owner: e.target.value }))} className={`w-full ${inputCls}`} placeholder="Name or team" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={assessForm.status} onChange={e => setAssessForm(f => ({ ...f, status: e.target.value }))} className={`w-full ${inputCls}`}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Due date</label>
                  <input type="date" value={assessForm.due_date} onChange={e => setAssessForm(f => ({ ...f, due_date: e.target.value }))} className={`w-full ${inputCls}`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <input value={assessForm.notes} onChange={e => setAssessForm(f => ({ ...f, notes: e.target.value }))} className={`w-full ${inputCls}`} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnCls} bg-red-600 hover:bg-red-700 text-white`}>{editingAssess ? 'Update' : 'Add Assessment'}</button>
                <button type="button" onClick={() => { setShowAssessForm(false); setEditingAssess(null); }} className={`${btnCls} bg-gray-100 hover:bg-gray-200 text-gray-700`}>Cancel</button>
              </div>
              {assessMsg && <p className={`text-xs ${assessMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{assessMsg}</p>}
            </form>
          )}

          {assessments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No assessments yet. Add one to track vendor due-diligence progress.</p>
          ) : (
            <div className="space-y-2">
              {assessments.map(a => (
                <div key={a.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-gray-900">{a.vendor_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(a.priority)}`}>{a.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${assessStatusColor(a.status)}`}>{a.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {a.owner && `Owner: ${a.owner}`}
                      {a.due_date && ` · Due: ${a.due_date}`}
                      {a.notes && ` · ${a.notes}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditAssess(a)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteAssess(a.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PlanGate>

      {/* 6 — Auto-Generated Compliance Report PDF */}
      <PlanGate feature="compliance_reports_pdf" featureLabel="Auto-Generated Compliance Reports">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl">📑</div>
              <div>
                <h3 className="font-semibold text-gray-900">Compliance Report PDF</h3>
                <p className="text-xs text-gray-400">Regulator-ready export of all compliance data</p>
              </div>
            </div>
            <button onClick={async () => { setPdfLoading(true); setPdfMsg(''); try { await api.downloadCompliancePdf(userId); setPdfMsg('Compliance report downloaded.'); } catch (e) { setPdfMsg('Error: ' + e.message); } finally { setPdfLoading(false); } }}
              disabled={pdfLoading}
              className={`${btnCls} bg-purple-600 hover:bg-purple-700 text-white`}>
              {pdfLoading ? 'Generating…' : '⬇ Download PDF'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">Exports all vendor certifications, risk actions, pending assessments and a compliance summary into a single regulator-ready PDF.</p>
          {pdfMsg && <p className={`text-xs mt-2 ${pdfMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{pdfMsg}</p>}
        </div>
      </PlanGate>
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────────────────────────
const TICKET_CATEGORIES = [
  { value: 'general',         label: 'General Inquiry' },
  { value: 'billing',         label: 'Billing & Subscription' },
  { value: 'technical',       label: 'Technical Issue' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'account',         label: 'Account & Access' },
];

const ticketStatusBadge = (s) => {
  if (s === 'open')        return 'bg-blue-100 text-blue-700';
  if (s === 'in_progress') return 'bg-yellow-100 text-yellow-700';
  if (s === 'resolved')    return 'bg-green-100 text-green-700';
  if (s === 'closed')      return 'bg-gray-100 text-gray-500';
  return 'bg-blue-100 text-blue-700';
};

const ticketStatusLabel = (s) => {
  if (s === 'open')        return 'Open';
  if (s === 'in_progress') return 'In Progress';
  if (s === 'resolved')    return 'Resolved';
  if (s === 'closed')      return 'Closed';
  return 'Open';
};

function SupportTab({ userId, user }) {
  const [tickets,     setTickets]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [successMsg,  setSuccessMsg]  = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');

  // Form fields
  const [category,    setCategory]    = useState('general');
  const [subject,     setSubject]     = useState('');
  const [message,     setMessage]     = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUserTickets(userId);
      if (res.status === 'success') setTickets(res.tickets);
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.submitSupportTicket(userId, subject.trim(), message.trim(), category);
      if (res.status === 'success') {
        setSuccessMsg('Your ticket has been submitted. We\'ll get back to you soon!');
        setSubject('');
        setMessage('');
        setCategory('general');
        setShowForm(false);
        loadTickets();
      } else {
        setErrorMsg('Failed to submit. Please try again.');
      }
    } catch {
      setErrorMsg('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Customer Support</h3>
          <p className="text-xs text-gray-400 mt-0.5">Submit a ticket and our team will respond within 24 hours.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSuccessMsg(''); setErrorMsg(''); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Submit New Ticket</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TICKET_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue in detail…"
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Your Tickets</h3>
          <button onClick={loadTickets} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-8">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading tickets…</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-4xl mb-3">🎧</div>
            <p className="text-sm text-gray-500 font-medium">No tickets yet</p>
            <p className="text-xs text-gray-400 mt-1">Submit a ticket above and our team will respond within 24 hours.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <div key={t.id}>
                <button
                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{t.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ticketStatusBadge(t.status)}`}>
                        {ticketStatusLabel(t.status)}
                      </span>
                      {t.admin_reply && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                          Reply received
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{TICKET_CATEGORIES.find(c => c.value === t.category)?.label || 'General Inquiry'}</span>
                      <span>·</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded === t.id && (
                  <div className="px-5 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    {/* Original message */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Your message</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{t.message}</p>
                    </div>

                    {/* Admin reply */}
                    {t.admin_reply ? (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-700">VendorShield Support</span>
                          {t.replied_at && (
                            <span className="text-xs text-blue-400">{new Date(t.replied_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">{t.admin_reply}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                        Awaiting response from our support team…
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-wrap gap-6 text-sm text-gray-500">
        <div>
          <p className="font-medium text-gray-700 mb-0.5">Email Us</p>
          <p className="text-xs">support@vendorshield.in</p>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-0.5">Response Time</p>
          <p className="text-xs">Within 24 hours on business days</p>
        </div>
        <div>
          <p className="font-medium text-gray-700 mb-0.5">Hours</p>
          <p className="text-xs">Mon–Fri, 9 AM – 6 PM IST</p>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user }) {
  const [name,    setName]    = useState(user?.name || '');
  const [nameMsg, setNameMsg] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg,   setPwdMsg]   = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setNameMsg('');
    setNameLoading(true);
    try {
      await api.updateProfile(user.id, { name: name.trim() });
      setNameMsg('Name updated successfully!');
    } catch {
      setNameMsg('Failed to update name.');
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPwdMsg('');
    if (newPwd !== confirmPwd) return setPwdMsg('New passwords do not match.');
    if (newPwd.length < 6)     return setPwdMsg('Password must be at least 6 characters.');
    setPwdLoading(true);
    try {
      await api.updateProfile(user.id, { currentPassword: currentPwd, newPassword: newPwd });
      setPwdMsg('Password updated successfully!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch {
      setPwdMsg('Failed to update password. Make sure your current password is correct.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      {/* User card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center space-x-4">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-700">
          {user?.initials || user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Update name */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Update Display Name</h3>
        <form onSubmit={handleNameUpdate} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button type="submit" disabled={nameLoading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
            {nameLoading ? 'Saving…' : 'Save Name'}
          </button>
          {nameMsg && (
            <p className={`text-sm ${nameMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{nameMsg}</p>
          )}
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Current password" required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password (min 6 characters)" required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirm new password" required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button type="submit" disabled={pwdLoading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
            {pwdLoading ? 'Updating…' : 'Update Password'}
          </button>
          {pwdMsg && (
            <p className={`text-sm ${pwdMsg.includes('Failed') || pwdMsg.includes('match') || pwdMsg.includes('6') ? 'text-red-600' : 'text-green-600'}`}>
              {pwdMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────
function NavItem({ id, label, icon, active, onClick, badge }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function UserDashboard() {
  const { user, logout, loading, refreshPlan } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasFeature, plan, isTrialActive, trialDaysLeft } = usePlan();

  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [stats,     setStats]     = useState({ contractsAnalyzed: 0, risksDetected: 0, activeVendors: 0 });
  const [contracts, setContracts] = useState([]);
  const [vendors,   setVendors]   = useState([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [sR, cR, vR] = await Promise.all([
        api.getStats(user.id),
        api.getContracts(user.id),
        api.getVendors(user.id),
      ]);
      if (sR.status === 'success') setStats(sR.stats);
      if (cR.status === 'success') setContracts(cR.contracts);
      if (vR.status === 'success') setVendors(vR.vendors);
    } catch (err) {
      console.error('Dashboard load failed:', err);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login'); return; }
    loadData();

    // Stripe redirect: upgrade=success → refresh plan data
    if (searchParams.get('upgrade') === 'success') {
      refreshPlan(user.id);
    }
  }, [user, loading, navigate, loadData]); // eslint-disable-line

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => { logout(); navigate('/'); };

  const tabHeaders = {
    [TABS.OVERVIEW]:    { title: `Welcome back, ${user?.name?.split(' ')[0]}!`, sub: "Here's your vendor risk activity at a glance." },
    [TABS.CONTRACTS]:   { title: 'Contracts',          sub: 'Upload, search, filter and analyze your contracts.' },
    [TABS.VENDORS]:     { title: 'Vendors',             sub: 'Manage your vendor directory and link them to contracts.' },
    [TABS.REPORTS]:     { title: 'Reports',             sub: 'Download, schedule and build custom risk reports.' },
    [TABS.COMPLIANCE]:  { title: 'Compliance',          sub: 'Track certification status, audit history and action workflows.' },
    [TABS.SUPPORT]:     { title: 'Customer Support',    sub: 'Submit tickets and track your support requests.' },
    [TABS.PROFILE]:     { title: 'Profile & Settings',  sub: 'Update your name, password and subscription.' },
  };

  const highRiskCount = contracts.filter(c => c.risk_level === 'High').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Trial / expiry banner */}
      <TrialBanner />

      {/* Top navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <VendorShieldLogo className="w-8 h-8" id="dashboard-nav" />
          <span className="text-base font-bold text-gray-900">VendorShield</span>
        </div>
        <div className="flex items-center space-x-3">
          {highRiskCount > 0 && (
            <div className="flex items-center space-x-1.5 bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded-full">
              <span>⚠️</span>
              <span>{highRiskCount} high-risk contract{highRiskCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {isTrialActive && trialDaysLeft > 7 && (
            <button
              onClick={() => navigate('/pricing')}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition"
            >
              {trialDaysLeft}d trial left · Upgrade
            </button>
          )}
          <div className="flex items-center space-x-2">
            <PlanBadge />
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-bold text-xs">{user?.initials}</span>
            </div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition font-medium">
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-5 px-3 shrink-0">
          <nav className="space-y-0.5">
            <NavItem id={TABS.OVERVIEW}   label="Overview"    icon="🏠" active={activeTab === TABS.OVERVIEW}   onClick={setActiveTab} />
            <NavItem id={TABS.CONTRACTS}  label="Contracts"   icon="📄" active={activeTab === TABS.CONTRACTS}  onClick={setActiveTab} badge={contracts.length || null} />
            <NavItem id={TABS.VENDORS}    label="Vendors"     icon="🏢" active={activeTab === TABS.VENDORS}    onClick={setActiveTab} badge={vendors.length || null} />

            {/* Divider */}
            <div className="pt-2 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Advanced</p>
            </div>

            {/* Reports — Basic+ */}
            <NavItem
              id={TABS.REPORTS}
              label={
                <span className="flex items-center justify-between w-full">
                  Reports
                  {!hasFeature('download_pdf') && (
                    <span className="text-xs text-gray-300 ml-1">🔒</span>
                  )}
                </span>
              }
              icon="📊"
              active={activeTab === TABS.REPORTS}
              onClick={setActiveTab}
            />

            {/* Compliance — Professional+ */}
            <NavItem
              id={TABS.COMPLIANCE}
              label={
                <span className="flex items-center justify-between w-full">
                  Compliance
                  {!hasFeature('compliance_status') && (
                    <span className="text-xs text-gray-300 ml-1">🔒</span>
                  )}
                </span>
              }
              icon="🛡️"
              active={activeTab === TABS.COMPLIANCE}
              onClick={setActiveTab}
            />

            <NavItem id={TABS.SUPPORT} label="Support" icon="🎧" active={activeTab === TABS.SUPPORT} onClick={setActiveTab} />

            <div className="pt-2 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
            </div>
            <NavItem id={TABS.PROFILE}    label="Profile"     icon="👤" active={activeTab === TABS.PROFILE}    onClick={setActiveTab} />
          </nav>

          {/* Plan info + upgrade CTA */}
          <div className="mt-auto pt-4 border-t border-gray-100 px-1 space-y-3">
            {plan === 'trial' || plan === 'basic' ? (
              <button
                onClick={() => navigate('/pricing')}
                className="w-full text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition text-left"
              >
                ⚡ Upgrade Plan
                <span className="block text-blue-400 font-normal mt-0.5">Unlock all features</span>
              </button>
            ) : null}

            {contracts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quick Stats</p>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Contracts</span><span className="font-semibold">{stats.contractsAnalyzed}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Risks Found</span><span className="font-semibold text-red-500">{stats.risksDetected}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Vendors</span><span className="font-semibold text-green-600">{stats.activeVendors}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">{tabHeaders[activeTab]?.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{tabHeaders[activeTab]?.sub}</p>
            </div>

            {activeTab === TABS.OVERVIEW   && <OverviewTab    stats={stats} contracts={contracts} />}
            {activeTab === TABS.CONTRACTS  && <ContractsTab   contracts={contracts} userId={user.id} onRefresh={loadData} />}
            {activeTab === TABS.VENDORS    && <VendorsTab     vendors={vendors} contracts={contracts} userId={user.id} onRefresh={loadData} />}
            {activeTab === TABS.REPORTS    && <ReportsTab contracts={contracts} userId={user.id} userEmail={user.email} />}
            {activeTab === TABS.COMPLIANCE && <ComplianceTab />}
            {activeTab === TABS.SUPPORT    && <SupportTab userId={user.id} user={user} />}
            {activeTab === TABS.PROFILE    && <ProfileTab     user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default UserDashboard;
