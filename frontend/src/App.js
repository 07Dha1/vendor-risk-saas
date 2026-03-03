import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import FlagshipLandingPage from './FlagshipLandingPage';
import Login from './Login';
import Signup from './Signup';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Integrations from './pages/Integrations';
import Security from './pages/Security';
import Documentation from './pages/Documentation';
import APIReference from './pages/APIReference';
import GuidesTutorials from './pages/GuidesTutorials';
import Blog from './pages/Blog';
import AboutUs from './pages/AboutUs';
import Careers from './pages/Careers';
import Partners from './pages/Partners';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import SubscriptionManagement from './pages/SubscriptionManagement';
import './index.css';

function AppContent() {
  const navigate = useNavigate();
  const [, setCurrentView] = useState('landing');

  const handleSwitchToLogin = () => {
    setCurrentView('login');
    navigate('/login');
  };

  const handleSwitchToSignup = () => {
    setCurrentView('signup');
    navigate('/signup');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    navigate('/');
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <FlagshipLandingPage
            onSwitchToLogin={handleSwitchToLogin}
            onSwitchToSignup={handleSwitchToSignup}
          />
        } 
      />
      <Route
        path="/login"
        element={
          <Login onBackToLanding={handleBackToLanding} onSwitchToSignup={handleSwitchToSignup} />
        }
      />
      <Route
        path="/signup"
        element={
          <Signup onBackToLanding={handleBackToLanding} onSwitchToLogin={handleSwitchToLogin} />
        }
      />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/security" element={<Security />} />
      <Route path="/documentation" element={<Documentation />} />
      <Route path="/api" element={<APIReference />} />
      <Route path="/guides" element={<GuidesTutorials />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/partners" element={<Partners />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/subscription" element={<SubscriptionManagement />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;