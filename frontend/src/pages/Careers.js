import React from 'react';

function Careers() {
  const openings = [
    { title: "Senior Full Stack Engineer", department: "Engineering", location: "Remote" },
    { title: "Product Designer", department: "Design", location: "San Francisco, CA" },
    { title: "Customer Success Manager", department: "Customer Success", location: "Remote" },
    { title: "Sales Development Representative", department: "Sales", location: "New York, NY" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Join Our Team</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Help us build the future of vendor risk management
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Work at VendorShield?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Remote-First", desc: "Work from anywhere in the world" },
              { title: "Competitive Pay", desc: "Top-of-market compensation and equity" },
              { title: "Growth", desc: "Unlimited learning and development budget" }
            ].map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Open Positions</h2>
          <div className="space-y-4">
            {openings.map((job, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition cursor-pointer flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span>{job.department}</span>
                    <span>•</span>
                    <span>{job.location}</span>
                  </div>
                </div>
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Careers;