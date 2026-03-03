import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import VendorShieldLogo from '../components/VendorShieldLogo';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      // The api helper throws on non-ok responses, but we need the message
      setError('Invalid or expired reset link. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <VendorShieldLogo className="w-16 h-16 mx-auto mb-4" id="reset-password" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
          <p className="text-gray-600">Choose a strong password for your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Password Updated!</h2>
              <p className="text-gray-600 text-sm">Your password has been reset successfully. You can now sign in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900"
                    placeholder="At least 6 characters"
                    required
                    disabled={!token}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900"
                    placeholder="Repeat your new password"
                    required
                    disabled={!token}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
                    loading || !token
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          )}

        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          © 2026 VendorShield. All rights reserved.
        </div>

      </div>
    </div>
  );
}

export default ResetPassword;
