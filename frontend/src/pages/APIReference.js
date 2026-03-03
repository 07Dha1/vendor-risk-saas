import React from 'react';

function APIReference() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-6">API Reference</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Build powerful integrations with the VendorShield API
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentication</h2>
          <p className="text-gray-600 mb-6">All API requests require authentication using API keys.</p>
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
            curl https://api.vendorshield.com/v1/contracts \<br/>
            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { method: "GET", endpoint: "/v1/contracts", desc: "List all contracts" },
            { method: "POST", endpoint: "/v1/contracts", desc: "Create a new contract" },
            { method: "GET", endpoint: "/v1/vendors", desc: "List all vendors" },
            { method: "POST", endpoint: "/v1/analysis", desc: "Analyze a contract" }
          ].map((api, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center mb-3">
                <span className={`px-3 py-1 rounded font-semibold text-sm mr-3 ${
                  api.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {api.method}
                </span>
                <code className="text-gray-700">{api.endpoint}</code>
              </div>
              <p className="text-gray-600">{api.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default APIReference;