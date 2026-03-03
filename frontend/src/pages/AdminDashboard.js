import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import VendorShieldLogo from '../components/VendorShieldLogo';

const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview',            icon: '▦' },
  { id: 'users',          label: 'User Management',     icon: '👥' },
  { id: 'subscriptions',  label: 'Subscriptions',       icon: '💳' },
  { id: 'revenue',        label: 'Revenue',             icon: '₹' },
  { id: 'contacts',       label: 'Contact Submissions', icon: '✉' },
  { id: 'system',         label: 'System Health',       icon: '⚙' },
];

function AdminDashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]       = useState('overview');
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [users, setUsers]               = useState([]);
  const [userStats, setUserStats]       = useState({ totalUsers: 0, activeUsers: 0, pausedUsers: 0, blockedUsers: 0, adminUsers: 0 });
  const [contacts, setContacts]         = useState([]);
  const [contactStats, setContactStats] = useState({ total: 0, new: 0, inProgress: 0, resolved: 0 });
  const [actionMsg, setActionMsg]       = useState({ text: '', type: 'info' });
  const [userSearch, setUserSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter]     = useState('all');

  // Subscriptions tab
  const [subUsers,      setSubUsers]      = useState([]);
  const [payments,      setPayments]      = useState([]);
  const [subSearch,     setSubSearch]     = useState('');
  const [overrideLoading, setOverrideLoading] = useState('');
  const [refundModal,   setRefundModal]   = useState(null); // { userId, subId, name }
  const [refundAmount,  setRefundAmount]  = useState('');
  const [refundReason,  setRefundReason]  = useState('requested_by_customer');
  const [refundLoading, setRefundLoading] = useState(false);

  // Revenue tab
  const [revenue, setRevenue] = useState({ mrr: 0, arr: 0, totalRevenue: 0, recentRevenue: 0, churned: 0, planCounts: [] });

  // Support / contacts tab
  const [expandedTicket,  setExpandedTicket]  = useState(null);
  const [replyInputs,     setReplyInputs]     = useState({});   // { ticketId: text }
  const [replyLoading,    setReplyLoading]    = useState(null);
  const [statusLoading,   setStatusLoading]   = useState(null);
  const [ticketFilter,    setTicketFilter]    = useState('all');

  const showMsg = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: 'info' }), 3500);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [usersRes, statsRes, contactsRes, contactStatsRes, subRes, paymentsRes, revenueRes] = await Promise.all([
        api.getUsers(user.id),
        api.getUserStats(user.id),
        api.getContactSubmissions(user.id),
        api.getContactStats(user.id),
        api.getAdminSubscriptions(user.id),
        api.getAdminPayments(user.id),
        api.getAdminRevenue(user.id),
      ]);
      if (usersRes.status === 'success')        setUsers(usersRes.users);
      if (statsRes.status === 'success')        setUserStats(statsRes.stats);
      if (contactsRes.status === 'success')     setContacts(contactsRes.submissions);
      if (contactStatsRes.status === 'success') setContactStats(contactStatsRes.stats);
      if (subRes.status === 'success')          setSubUsers(subRes.users);
      if (paymentsRes.status === 'success')     setPayments(paymentsRes.payments);
      if (revenueRes.status === 'success')      setRevenue(revenueRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/dashboard'); return; }
    loadData();
  }, [user, loading, navigate, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStatusChange = async (targetUserId, status) => {
    try {
      const res = await api.updateUserStatus(user.id, targetUserId, status);
      if (res.status === 'success') { showMsg(`User status updated to ${status}`); loadData(); }
    } catch { showMsg('Failed to update user status.', 'error'); }
  };

  const handleDelete = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      const res = await api.deleteUser(user.id, targetUserId);
      if (res.status === 'success') { showMsg('User deleted successfully.'); loadData(); }
    } catch { showMsg('Failed to delete user.', 'error'); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // ── Subscription handlers ──────────────────────────────────────────────────
  const handleOverridePlan = async (targetUserId, plan) => {
    setOverrideLoading(targetUserId + plan);
    try {
      const res = await api.overrideUserPlan(user.id, targetUserId, plan);
      if (res.status === 'success') { showMsg(res.message); loadData(); }
      else showMsg(res.message, 'error');
    } catch { showMsg('Failed to override plan.', 'error'); }
    setOverrideLoading('');
  };

  const handleIssueRefund = async () => {
    if (!refundModal) return;
    setRefundLoading(true);
    try {
      const res = await api.issueRefund(user.id, refundModal.subId, refundAmount ? parseFloat(refundAmount) : null, refundReason);
      if (res.status === 'success') {
        showMsg(res.message);
        setRefundModal(null); setRefundAmount(''); setRefundReason('requested_by_customer');
        loadData();
      } else showMsg(res.message, 'error');
    } catch (e) { showMsg('Refund failed: ' + e.message, 'error'); }
    setRefundLoading(false);
  };

  const exportUsersCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Company', 'Joined', 'Last Login'];
    const rows = users.map(u => [
      u.id, u.name, u.email, u.role, u.status, u.company || '',
      new Date(u.created_at).toLocaleDateString(),
      u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchRole   = roleFilter === 'all'   || u.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const recentUsers    = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const recentContacts = [...contacts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const statusBadge = (s) => {
    if (s === 'active')      return 'bg-green-900/50 text-green-400 border border-green-700';
    if (s === 'paused')      return 'bg-yellow-900/50 text-yellow-400 border border-yellow-700';
    if (s === 'blocked')     return 'bg-red-900/50 text-red-400 border border-red-700';
    if (s === 'new')         return 'bg-blue-900/50 text-blue-400 border border-blue-700';
    if (s === 'in_progress') return 'bg-yellow-900/50 text-yellow-400 border border-yellow-700';
    if (s === 'resolved')    return 'bg-green-900/50 text-green-400 border border-green-700';
    return 'bg-gray-800 text-gray-400 border border-gray-600';
  };

  const msgColor = actionMsg.type === 'error'
    ? 'bg-red-900/40 border-red-700 text-red-400'
    : 'bg-green-900/40 border-green-700 text-green-400';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex text-gray-100">

      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center space-x-3 border-b border-gray-800">
          <VendorShieldLogo className="w-9 h-9 shrink-0" id="admin-nav" />
          {sidebarOpen && (
            <div>
              <p className="text-sm font-bold text-white leading-tight">VendorShield</p>
              <span className="text-xs px-1.5 py-0.5 bg-blue-600 rounded text-white font-medium">Admin</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-800 px-3 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{user?.initials || user?.name?.[0]?.toUpperCase()}</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={handleLogout} className="mt-3 w-full text-xs text-gray-500 hover:text-red-400 transition text-left px-1">
              Sign out →
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-500 hover:text-gray-200 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={loadData} className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition">
              ↻ Refresh
            </button>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Alert banner */}
        {actionMsg.text && (
          <div className={`mx-6 mt-4 px-4 py-3 border rounded-lg text-sm font-medium ${msgColor}`}>
            {actionMsg.text}
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">

          {/* ════ OVERVIEW ════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',   value: userStats.totalUsers,  color: 'text-white',        sub: 'registered accounts' },
                  { label: 'Active Users',  value: userStats.activeUsers, color: 'text-green-400',    sub: 'currently active' },
                  { label: 'Contact Leads', value: contactStats.total,    color: 'text-blue-400',     sub: 'form submissions' },
                  { label: 'Open Tickets',  value: contactStats.new,      color: 'text-orange-400',   sub: 'awaiting response' },
                ].map(card => (
                  <div key={card.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                    <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-gray-600 mt-1">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Admins',   value: userStats.adminUsers,    color: 'text-blue-400' },
                  { label: 'Paused',   value: userStats.pausedUsers,   color: 'text-yellow-400' },
                  { label: 'Blocked',  value: userStats.blockedUsers,  color: 'text-red-400' },
                  { label: 'New Msgs', value: contactStats.new,        color: 'text-blue-400' },
                  { label: 'In Prog.', value: contactStats.inProgress, color: 'text-yellow-400' },
                  { label: 'Resolved', value: contactStats.resolved,   color: 'text-green-400' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800 rounded-lg border border-gray-700 p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent sign-ups */}
                <div className="bg-gray-800 rounded-xl border border-gray-700">
                  <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm">Recent Sign-ups</h3>
                    <button onClick={() => setActiveTab('users')} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">View all</button>
                  </div>
                  <ul className="divide-y divide-gray-700/50">
                    {recentUsers.map(u => (
                      <li key={u.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 bg-blue-900/60 rounded-full flex items-center justify-center">
                            <span className="text-blue-400 text-xs font-bold">{u.initials || u.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-100">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(u.status)}`}>{u.status}</span>
                          <span className="text-xs text-gray-600">{new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent contact messages */}
                <div className="bg-gray-800 rounded-xl border border-gray-700">
                  <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm">Recent Contact Messages</h3>
                    <button onClick={() => setActiveTab('contacts')} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">View all</button>
                  </div>
                  <ul className="divide-y divide-gray-700/50">
                    {recentContacts.length === 0 && (
                      <li className="px-5 py-8 text-center text-gray-600 text-sm">No messages yet</li>
                    )}
                    {recentContacts.map(c => (
                      <li key={c.id} className="px-5 py-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-100 truncate">{c.subject}</p>
                            <p className="text-xs text-gray-500">{c.name} · {c.email}</p>
                          </div>
                          <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusBadge(c.status)}`}>{c.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ════ USER MANAGEMENT ════ */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 px-5 py-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{filteredUsers.length} of {users.length} users</span>
                  <button onClick={exportUsersCSV} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition font-medium">
                    ↓ Export CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60 border-b border-gray-700">
                      <tr>
                        {['User', 'Email', 'Role', 'Status', 'Company', 'Joined', 'Last Login', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-600">No users match the filters.</td></tr>
                      )}
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-900/60 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-blue-400 text-xs font-bold">{u.initials || u.name[0]}</span>
                              </div>
                              <span className="font-medium text-gray-100">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-400">{u.email}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(u.status)}`}>{u.status}</span>
                          </td>
                          <td className="px-5 py-4 text-gray-500">{u.company || '—'}</td>
                          <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : <span className="text-gray-700">Never</span>}
                          </td>
                          <td className="px-5 py-4">
                            {u.id !== user.id ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {u.status !== 'active'  && <button onClick={() => handleStatusChange(u.id, 'active')}  className="text-xs px-2 py-1 rounded bg-green-900/40 text-green-400 hover:bg-green-900/70 border border-green-800 transition">Activate</button>}
                                {u.status !== 'paused'  && <button onClick={() => handleStatusChange(u.id, 'paused')}  className="text-xs px-2 py-1 rounded bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/70 border border-yellow-800 transition">Pause</button>}
                                {u.status !== 'blocked' && <button onClick={() => handleStatusChange(u.id, 'blocked')} className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70 border border-red-800 transition">Block</button>}
                                <button onClick={() => handleDelete(u.id)} className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70 border border-red-800 transition">Delete</button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-700 italic">You</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ SUBSCRIPTIONS ════ */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-5">
              {/* Search */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 px-5 py-4 flex flex-wrap gap-3 items-center justify-between">
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={subSearch}
                  onChange={e => setSubSearch(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 w-72 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-gray-500">{subUsers.length} users</span>
              </div>

              {/* Users + plan table */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60 border-b border-gray-700">
                      <tr>
                        {['User', 'Plan', 'Status', 'Trial Ends', 'Stripe Sub ID', 'Override Plan', 'Refund'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {subUsers.filter(u =>
                        !subSearch || u.name.toLowerCase().includes(subSearch.toLowerCase()) || u.email.toLowerCase().includes(subSearch.toLowerCase())
                      ).map(u => (
                        <tr key={u.id} className="hover:bg-gray-700/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-100 text-sm">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              u.plan === 'enterprise' ? 'bg-purple-900/50 text-purple-400 border border-purple-700' :
                              u.plan === 'professional' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' :
                              u.plan === 'basic' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                              'bg-gray-700 text-gray-400 border border-gray-600'
                            }`}>{u.plan || 'trial'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(u.subscription_status || 'trial')}`}>
                              {u.subscription_status || 'trial'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs font-mono truncate max-w-[140px]">
                            {u.stripe_subscription_id || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              defaultValue=""
                              onChange={e => { if (e.target.value) handleOverridePlan(u.id, e.target.value); e.target.value = ''; }}
                              disabled={overrideLoading.startsWith(String(u.id))}
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                              <option value="" disabled>Set plan…</option>
                              <option value="trial">Trial</option>
                              <option value="basic">Basic</option>
                              <option value="professional">Professional</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {u.stripe_subscription_id ? (
                              <button
                                onClick={() => setRefundModal({ userId: u.id, subId: u.stripe_subscription_id, name: u.name })}
                                className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70 border border-red-800 transition"
                              >
                                Refund
                              </button>
                            ) : <span className="text-xs text-gray-700">No sub</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment history */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-700">
                  <h3 className="font-semibold text-white text-sm">Payment History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60 border-b border-gray-700">
                      <tr>
                        {['User', 'Plan', 'Amount', 'Status', 'Billing', 'Date'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {payments.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600 text-sm">No payment records yet.</td></tr>
                      )}
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-700/30">
                          <td className="px-4 py-3">
                            <p className="text-gray-100 text-sm">{p.name || '—'}</p>
                            <p className="text-xs text-gray-500">{p.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-300 capitalize">{p.plan}</td>
                          <td className="px-4 py-3 text-gray-100 font-medium">
                            {p.amount ? `₹${Number(p.amount).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 capitalize">{p.billing_cycle || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ REVENUE ════ */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'MRR',             value: `₹${revenue.mrr.toLocaleString('en-IN')}`,          color: 'text-green-400',  sub: 'Monthly Recurring Revenue' },
                  { label: 'ARR',             value: `₹${revenue.arr.toLocaleString('en-IN')}`,          color: 'text-blue-400',   sub: 'Annual Recurring Revenue' },
                  { label: 'Last 30d Revenue',value: `₹${revenue.recentRevenue.toLocaleString('en-IN')}`,color: 'text-purple-400', sub: 'Collected this month' },
                  { label: 'Churned (30d)',   value: revenue.churned,                                     color: 'text-red-400',    sub: 'Canceled subscriptions' },
                ].map(card => (
                  <div key={card.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-gray-600 mt-1">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan distribution */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="font-semibold text-white mb-5">Plan Distribution</h3>
                  {(() => {
                    const PRICES = { trial: 0, basic: 2999, professional: 8999, enterprise: 24999 };
                    const COLORS = { trial: 'bg-gray-600', basic: 'bg-green-600', professional: 'bg-blue-600', enterprise: 'bg-purple-600' };
                    const total  = revenue.planCounts.reduce((s, p) => s + p.count, 0) || 1;
                    return (
                      <div className="space-y-4">
                        {['enterprise', 'professional', 'basic', 'trial'].map(plan => {
                          const entry = revenue.planCounts.find(p => p.plan === plan);
                          const count = entry?.count || 0;
                          const pct   = Math.round((count / total) * 100);
                          return (
                            <div key={plan}>
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span className="capitalize font-medium">{plan}</span>
                                <span>{count} users · {pct}%{PRICES[plan] ? ` · ₹${(count * PRICES[plan]).toLocaleString('en-IN')}/mo` : ''}</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className={`h-2 rounded-full ${COLORS[plan]}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Revenue summary */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="font-semibold text-white mb-5">Revenue Summary</h3>
                  <dl className="space-y-1">
                    {[
                      { label: 'Total Revenue (all time)', value: `₹${revenue.totalRevenue.toLocaleString('en-IN')}` },
                      { label: 'Revenue (last 30 days)',   value: `₹${revenue.recentRevenue.toLocaleString('en-IN')}` },
                      { label: 'MRR (active subs)',        value: `₹${revenue.mrr.toLocaleString('en-IN')}` },
                      { label: 'ARR (projected)',          value: `₹${revenue.arr.toLocaleString('en-IN')}` },
                      { label: 'Churned subscriptions',   value: revenue.churned },
                      { label: 'Paying customers',        value: revenue.planCounts.filter(p => p.plan !== 'trial').reduce((s, p) => s + p.count, 0) },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-gray-700/50 last:border-0">
                        <dt className="text-sm text-gray-400">{row.label}</dt>
                        <dd className="text-sm font-semibold text-gray-100">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* ════ SUPPORT / CONTACT SUBMISSIONS ════ */}
          {activeTab === 'contacts' && (() => {
            const TICKET_STATUS_OPTIONS = ['all', 'open', 'in_progress', 'resolved', 'closed'];
            const filteredContacts = ticketFilter === 'all'
              ? contacts
              : contacts.filter(c => (c.status || 'open') === ticketFilter);

            const handleStatusChange = async (ticketId, newStatus) => {
              setStatusLoading(ticketId);
              try {
                await api.updateTicketStatus(user.id, ticketId, newStatus);
                showMsg('Status updated');
                const res = await api.getContactSubmissions(user.id);
                if (res.status === 'success') setContacts(res.submissions);
                const sRes = await api.getContactStats(user.id);
                if (sRes.status === 'success') setContactStats(sRes.stats);
              } catch { showMsg('Failed to update status', 'error'); }
              setStatusLoading(null);
            };

            const handleReply = async (ticketId) => {
              const reply = (replyInputs[ticketId] || '').trim();
              if (!reply) return;
              setReplyLoading(ticketId);
              try {
                await api.replyToTicket(user.id, ticketId, reply);
                showMsg('Reply sent');
                setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
                const res = await api.getContactSubmissions(user.id);
                if (res.status === 'success') setContacts(res.submissions);
              } catch { showMsg('Failed to send reply', 'error'); }
              setReplyLoading(null);
            };

            const tBadge = (s) => {
              if (s === 'open' || s === 'new') return 'bg-blue-900/50 text-blue-400 border border-blue-700';
              if (s === 'in_progress')         return 'bg-yellow-900/50 text-yellow-400 border border-yellow-700';
              if (s === 'resolved')            return 'bg-green-900/50 text-green-400 border border-green-700';
              if (s === 'closed')              return 'bg-gray-700 text-gray-400 border border-gray-600';
              return 'bg-blue-900/50 text-blue-400 border border-blue-700';
            };

            return (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total',       value: contactStats.total,      color: 'text-white' },
                    { label: 'Open',        value: contactStats.new,        color: 'text-blue-400' },
                    { label: 'In Progress', value: contactStats.inProgress, color: 'text-yellow-400' },
                    { label: 'Resolved',    value: contactStats.resolved,   color: 'text-green-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{s.label}</p>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Filter bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  {TICKET_STATUS_OPTIONS.map(f => (
                    <button
                      key={f}
                      onClick={() => setTicketFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        ticketFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {f === 'all' ? `All (${contacts.length})` : f.replace('_', ' ')}
                    </button>
                  ))}
                  <button
                    onClick={() => { api.getContactSubmissions(user.id).then(r => r.status === 'success' && setContacts(r.submissions)); }}
                    className="ml-auto text-xs text-blue-400 hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {/* Ticket list */}
                <div className="space-y-3">
                  {filteredContacts.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 px-5 py-10 text-center text-gray-600">
                      No tickets in this category.
                    </div>
                  ) : filteredContacts.map(c => (
                    <div key={c.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                      {/* Ticket header */}
                      <button
                        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-700/40 transition-colors"
                        onClick={() => setExpandedTicket(expandedTicket === c.id ? null : c.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-gray-100 text-sm">{c.subject}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tBadge(c.status || 'open')}`}>
                              {(c.status || 'open').replace('_', ' ')}
                            </span>
                            {c.admin_reply && (
                              <span className="text-xs bg-purple-900/50 text-purple-400 border border-purple-700 px-2 py-0.5 rounded-full">
                                Replied
                              </span>
                            )}
                            {c.category && (
                              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full capitalize">
                                {c.category.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            <span className="font-medium text-gray-400">{c.name}</span>
                            <span>{c.email}</span>
                            {c.company && <span>· {c.company}</span>}
                            <span>· {new Date(c.created_at).toLocaleDateString()}</span>
                            {c.user_id && <span className="text-blue-500">· Registered user</span>}
                          </div>
                        </div>
                        <svg className={`w-4 h-4 text-gray-500 shrink-0 mt-1 transition-transform ${expandedTicket === c.id ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded content */}
                      {expandedTicket === c.id && (
                        <div className="border-t border-gray-700 px-5 py-4 space-y-4">
                          {/* Message */}
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1.5 font-medium">User message</p>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{c.message}</p>
                          </div>

                          {/* Existing reply */}
                          {c.admin_reply && (
                            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-xs text-blue-400 font-semibold">Your reply</p>
                                {c.replied_at && <span className="text-xs text-blue-600">{new Date(c.replied_at).toLocaleDateString()}</span>}
                              </div>
                              <p className="text-sm text-blue-200 whitespace-pre-wrap leading-relaxed">{c.admin_reply}</p>
                            </div>
                          )}

                          {/* Reply input */}
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 font-medium">{c.admin_reply ? 'Update reply' : 'Send reply'}</p>
                            <textarea
                              value={replyInputs[c.id] || ''}
                              onChange={e => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder="Type your reply to the user…"
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={() => handleReply(c.id)}
                                disabled={!replyInputs[c.id]?.trim() || replyLoading === c.id}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                {replyLoading === c.id ? 'Sending…' : c.admin_reply ? 'Update Reply' : 'Send Reply'}
                              </button>

                              {/* Status changer */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Status:</span>
                                <select
                                  value={c.status || 'open'}
                                  disabled={statusLoading === c.id}
                                  onChange={e => handleStatusChange(c.id, e.target.value)}
                                  className="px-2 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-xs text-gray-300 focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                  <option value="closed">Closed</option>
                                </select>
                                {statusLoading === c.id && (
                                  <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ════ SYSTEM HEALTH ════ */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'API Status',   value: 'Operational', color: 'text-green-400', dot: 'bg-green-500', desc: 'All endpoints responding' },
                  { label: 'Database',     value: 'Healthy',     color: 'text-green-400', dot: 'bg-green-500', desc: 'SQLite connected' },
                  { label: 'Auth Service', value: 'Active',      color: 'text-green-400', dot: 'bg-green-500', desc: 'bcrypt hashing enabled' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.dot} animate-pulse`}></span>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
                    </div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-600 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="font-semibold text-white mb-4">Platform Statistics</h3>
                  <dl className="space-y-1">
                    {[
                      { label: 'Total Registered Users', value: userStats.totalUsers },
                      { label: 'Active Accounts',        value: userStats.activeUsers },
                      { label: 'Admin Accounts',         value: userStats.adminUsers },
                      { label: 'Suspended Accounts',     value: userStats.pausedUsers + userStats.blockedUsers },
                      { label: 'Contact Form Leads',     value: contactStats.total },
                      { label: 'Unresolved Messages',    value: contactStats.new + contactStats.inProgress },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-gray-700/50 last:border-0">
                        <dt className="text-sm text-gray-400">{row.label}</dt>
                        <dd className="text-sm font-semibold text-gray-100">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="font-semibold text-white mb-4">Current Session</h3>
                  <dl className="space-y-1">
                    {[
                      { label: 'Logged in as',  value: user.name },
                      { label: 'Email',         value: user.email },
                      { label: 'Role',          value: user.role },
                      { label: 'Account Status',value: user.status },
                      { label: 'Session Date',  value: new Date().toLocaleString() },
                      { label: 'Environment',   value: 'Development (localhost)' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-gray-700/50 last:border-0">
                        <dt className="text-sm text-gray-400">{row.label}</dt>
                        <dd className="text-sm font-semibold text-gray-100 text-right max-w-[200px] truncate">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    onClick={handleLogout}
                    className="mt-5 w-full py-2 px-4 bg-red-900/40 text-red-400 border border-red-800 rounded-lg text-sm font-medium hover:bg-red-900/70 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Refund Modal ── */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Issue Refund</h2>
            <p className="text-sm text-gray-400 mb-5">
              Refunding subscription for <span className="text-white font-medium">{refundModal.name}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Amount (₹) — leave blank for full refund</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2999"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Reason</label>
                <select
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="requested_by_customer">Requested by customer</option>
                  <option value="duplicate">Duplicate charge</option>
                  <option value="fraudulent">Fraudulent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleIssueRefund}
                  disabled={refundLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                >
                  {refundLoading ? 'Processing…' : 'Confirm Refund'}
                </button>
                <button
                  onClick={() => { setRefundModal(null); setRefundAmount(''); }}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
