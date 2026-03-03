import React from 'react';

function GuidesTutorials() {
  const guides = [
    { title: "Getting Started with VendorShield", time: "5 min read", category: "Beginner" },
    { title: "Advanced Contract Analysis Techniques", time: "10 min read", category: "Advanced" },
    { title: "Setting Up Automated Workflows", time: "8 min read", category: "Intermediate" },
    { title: "Understanding Risk Scores", time: "6 min read", category: "Beginner" },
    { title: "Integrating with Your ERP System", time: "15 min read", category: "Advanced" },
    { title: "Best Practices for Vendor Management", time: "12 min read", category: "Intermediate" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-6">Guides & Tutorials</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Learn how to get the most out of VendorShield with our comprehensive guides
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {guides.map((guide, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  guide.category === 'Beginner' ? 'bg-green-100 text-green-700' :
                  guide.category === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {guide.category}
                </span>
                <span className="text-sm text-gray-500">{guide.time}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{guide.title}</h3>
              <div className="flex items-center text-blue-600 font-medium">
                Read More
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GuidesTutorials;