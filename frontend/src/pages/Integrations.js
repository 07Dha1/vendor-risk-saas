import React from 'react';

function Integrations() {
  const integrations = [
    { name: "Salesforce", category: "CRM", logo: "S" },
    { name: "Microsoft 365", category: "Productivity", logo: "M" },
    { name: "Slack", category: "Communication", logo: "Sl" },
    { name: "Jira", category: "Project Management", logo: "J" },
    { name: "Workday", category: "HR", logo: "W" },
    { name: "SAP", category: "ERP", logo: "SA" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Integrations</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Connect VendorShield with your favorite tools and platforms
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {integrations.map((integration, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-2xl font-bold mx-auto mb-4">
                {integration.logo}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{integration.name}</h3>
              <p className="text-gray-600">{integration.category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Integrations;