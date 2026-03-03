import React from 'react';

function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-6">About VendorShield</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            We're on a mission to make vendor risk management simple, intelligent, and accessible for businesses of all sizes.
          </p>
        </div>
      </div>

      {/* Story Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-lg text-gray-600 mb-4">
              Founded in 2024, VendorShield was born from a simple observation: managing vendor relationships and contracts was unnecessarily complex and time-consuming.
            </p>
            <p className="text-lg text-gray-600 mb-4">
              Our founders, experienced in procurement and risk management, saw organizations struggling with spreadsheets, missed renewals, and hidden contract risks. They knew there had to be a better way.
            </p>
            <p className="text-lg text-gray-600">
              Today, VendorShield helps thousands of companies streamline their vendor management processes, reduce risks, and make data-driven decisions.
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-12 text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">5000+</div>
            <div className="text-xl text-gray-700 mb-8">Companies Trust VendorShield</div>
            <div className="text-6xl font-bold text-indigo-600 mb-2">$2B+</div>
            <div className="text-xl text-gray-700">In Managed Contract Value</div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Innovation",
                description: "We continuously push boundaries with AI and automation to deliver cutting-edge solutions."
              },
              {
                title: "Transparency",
                description: "We believe in open communication and honest relationships with our customers and partners."
              },
              {
                title: "Excellence",
                description: "We're committed to delivering exceptional quality in everything we do, from product to support."
              }
            ].map((value, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div>
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Leadership Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { name: "M.Sai Sathya Dhawan", role: "CEO & Co-Founder", initials: "MSSD" },
              { name: "Michael Chen", role: "CTO & Co-Founder", initials: "MC" },
              { name: "Emily Rodriguez", role: "VP of Product", initials: "ER" },
              { name: "David Park", role: "VP of Engineering", initials: "DP" }
            ].map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                  {member.initials}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutUs;