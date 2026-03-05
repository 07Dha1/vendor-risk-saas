import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext();
const API_BASE = process.env.REACT_APP_API_URL || 'https://vendorshield-api.onrender.com/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('vendorshield_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('vendorshield_user');
      }
    }
    setLoading(false);
  }, []);

  // Sync latest plan/subscription status from backend into context + localStorage
  const refreshPlan = useCallback(async (userId) => {
    const id = userId || user?.id;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/subscription/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        const planUpdates = {
          plan: data.plan,
          subscription_status: data.subscription_status,
          trial_ends_at: data.trial_ends_at,
          trial_days_remaining: data.trial_days_remaining,
          feature_access: data.feature_access,
          usage: data.usage,
          limits: data.limits,
        };
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev, ...planUpdates };
          localStorage.setItem('vendorshield_user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to refresh plan:', err);
    }
  }, [user?.id]);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      const userData = {
        ...data.user,
        joinedDate: data.user.created_at,
        // Default trial plan if not yet set
        plan: data.user.plan || 'trial',
        subscription_status: data.user.subscription_status || 'trial',
        trial_ends_at: data.user.trial_ends_at || null,
      };

      setUser(userData);
      localStorage.setItem('vendorshield_user', JSON.stringify(userData));

      // Fetch latest plan status in background after login
      setTimeout(() => refreshPlan(userData.id), 500);

      return userData;
    } catch (error) {
      throw error;
    }
  };

  // Signup function
  const signup = async (name, email, password, company = '') => {
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, company })
      });

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      const userData = {
        ...data.user,
        joinedDate: data.user.created_at,
        plan: data.user.plan || 'trial',
        subscription_status: data.user.subscription_status || 'trial',
        trial_ends_at: data.user.trial_ends_at || null,
      };

      setUser(userData);
      localStorage.setItem('vendorshield_user', JSON.stringify(userData));

      return userData;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('vendorshield_user');
  };

  // Update user profile (name, etc.)
  const updateProfile = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('vendorshield_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateProfile,
    refreshPlan,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
