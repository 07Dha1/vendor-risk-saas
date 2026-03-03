import React from 'react';

function Documentation() {
  const docSections = [
    {
      title: "Getting Started",
      items: ["Quick Start Guide", "Installation", "First Contract Upload", "Dashboard Overview"]
    },
    {
      title: "Core Features",
      items: ["Contract Analysis", "Risk Assessment", "Vendor Management", "Analytics & Reporting"]
    },
    {
      title: "Admin Features",
      items: ["User Management", "Permissions", "Settings", "Integrations"]
    },
    {
      title: "API Reference",
      items: ["Authentication", "Endpoints", "Rate Limits", "Webhooks"]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-6">Documentation</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Everything you need to know about using VendorShield effectively
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {docSections.map((section, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">{section.title}</h3>
              <ul className="space-y-3">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex items-center text-gray-700 hover:text-blue-600 cursor-pointer">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Documentation;