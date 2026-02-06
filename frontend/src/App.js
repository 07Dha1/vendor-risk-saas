import React from 'react';
import { api } from './api';
import ContractsList from './ContractsList';

function App() {
  const [uploadStatus, setUploadStatus] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [stats, setStats] = React.useState({ 
    contractsAnalyzed: 0, 
    risksDetected: 0, 
    activeVendors: 0 
  });
  const [refreshContracts, setRefreshContracts] = React.useState(0);
  const fileInputRef = React.useRef(null);

  // Test backend connection and load stats when component loads
  React.useEffect(() => {
    const initialize = async () => {
      try {
        // Test connection
        const response = await api.checkHealth();
        console.log('✅ Backend connected!', response);
        
        // Load stats
        console.log('📊 Fetching stats...');
        const statsResponse = await api.getStats();
        console.log('📊 Stats response:', statsResponse);
        
        if (statsResponse && statsResponse.status === 'success') {
          setStats(statsResponse.stats);
          console.log('✅ Stats loaded:', statsResponse.stats);
        } else {
          console.log('❌ Stats response invalid:', statsResponse);
        }
      } catch (error) {
        console.error('❌ Initialization failed:', error);
      }
    };
    
    initialize();
  }, []);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus('❌ Please upload a PDF or Word document');
      return;
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('❌ File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadStatus('📤 Uploading...');

    try {
      const response = await api.uploadContract(file);
      setUploadStatus(`✅ ${response.message}`);
      console.log('Upload successful:', response);
      
      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(''), 3000);
      
      // Refresh stats
      const statsResponse = await api.getStats();
      if (statsResponse && statsResponse.status === 'success') {
        setStats(statsResponse.stats);
        console.log('✅ Stats refreshed:', statsResponse.stats);
      }
      // Trigger contracts list refresh
      setRefreshContracts(prev => prev + 1);
    } catch (error) {
      setUploadStatus('❌ Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle click on upload zone
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Clean & Professional */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">V</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900">VendorShield</span>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              <button className="text-blue-600 font-medium hover:text-blue-700 transition">
                Dashboard
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition">
                Contracts
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition">
                Vendors
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition">
                Reports
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">
                Settings
              </button>
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Vendor Risk Management
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Comprehensive platform for contract intelligence, risk assessment, and vendor lifecycle management.
          </p>
        </div>

        {/* Key Metrics - Clean Card Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.contractsAnalyzed}
            </div>
            <div className="text-sm font-medium text-gray-600">Contracts Analyzed</div>
            <div className="mt-4 text-xs text-green-600 font-medium">
              ↑ Ready to upload
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.risksDetected}
            </div>
            <div className="text-sm font-medium text-gray-600">Risk Issues Detected</div>
            <div className="mt-4 text-xs text-gray-500 font-medium">
              No alerts
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.activeVendors}
            </div>
            <div className="text-sm font-medium text-gray-600">Active Vendors</div>
            <div className="mt-4 text-xs text-blue-600 font-medium">
              + Add vendors
            </div>
          </div>
        </div>

        {/* Action Section - Upload Contract */}
        <div 
          onClick={handleUploadClick}
          className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
        >
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload Your First Contract
            </h3>
            <p className="text-gray-600 mb-6">
              Drop your PDF or Word document here, or click to browse
            </p>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button 
              onClick={handleUploadClick}
              disabled={isUploading}
              className={`px-8 py-3 font-medium rounded-lg shadow-sm transition ${
                isUploading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </button>

            {/* Upload Status Message */}
            {uploadStatus && (
              <div className="mt-4 text-sm font-medium">
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
            {/* Contracts List */}
        {stats.contractsAnalyzed > 0 && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Contracts
              </h2>
            </div>
            <ContractsList key={refreshContracts} />
          </div>
        )}
        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Analysis</h4>
            <p className="text-sm text-gray-600">Automatically detect risks, obligations, and key terms</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Risk Assessment</h4>
            <p className="text-sm text-gray-600">Comprehensive vendor risk scoring and monitoring</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Advanced Reporting</h4>
            <p className="text-sm text-gray-600">Executive dashboards and compliance reports</p>
          </div>

        </div>

      </main>
    </div>
  );
}

export default App;