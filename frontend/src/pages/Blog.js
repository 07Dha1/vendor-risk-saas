import React from 'react';

function Blog() {
  const posts = [
    {
      title: "5 Contract Management Trends to Watch in 2025",
      excerpt: "Discover the latest trends shaping the future of contract management and vendor relationships.",
      date: "February 8, 2025",
      category: "Industry Trends"
    },
    {
      title: "How AI is Transforming Vendor Risk Assessment",
      excerpt: "Learn how artificial intelligence is revolutionizing the way companies assess and manage vendor risks.",
      date: "February 5, 2025",
      category: "Technology"
    },
    {
      title: "Best Practices for Contract Renewal Management",
      excerpt: "Never miss a contract renewal again with these proven strategies and automation techniques.",
      date: "February 1, 2025",
      category: "Best Practices"
    },
    {
      title: "Understanding SOC 2 Compliance for SaaS Vendors",
      excerpt: "A comprehensive guide to SOC 2 compliance and why it matters for your vendor relationships.",
      date: "January 28, 2025",
      category: "Compliance"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-6">Blog</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Insights, updates, and best practices from the VendorShield team
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post, index) => (
            <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer">
              <div className="h-48 bg-gradient-to-br from-blue-400 to-indigo-500"></div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {post.category}
                  </span>
                  <span className="text-sm text-gray-500">{post.date}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center text-blue-600 font-medium">
                  Read Article
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Blog;