import React from 'react';

function Partners() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Partner Program</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Join our partner ecosystem and grow your business with VendorShield
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              title: "Technology Partners",
              desc: "Integrate your solution with VendorShield",
              benefits: ["Technical support", "Co-marketing opportunities", "Revenue share"]
            },
            {
              title: "Reseller Partners",
              desc: "Sell VendorShield to your customers",
              benefits: ["Attractive margins", "Sales enablement", "Deal registration"]
            },
            {
              title: "Consulting Partners",
              desc: "Help clients implement VendorShield",
              benefits: ["Training & certification", "Lead sharing", "Partner portal"]
            }
          ].map((partner, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{partner.title}</h3>
              <p className="text-gray-600 mb-6">{partner.desc}</p>
              <ul className="space-y-2">
                {partner.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Become a Partner</h2>
          <p className="text-xl text-blue-100 mb-8">Ready to grow together?</p>
          <button className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition">
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default Partners;