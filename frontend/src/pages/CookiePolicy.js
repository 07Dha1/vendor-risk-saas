import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { id: 'what',       label: 'What Are Cookies' },
  { id: 'why',        label: 'Why We Use Cookies' },
  { id: 'types',      label: 'Types of Cookies We Use' },
  { id: 'table',      label: 'Cookie Reference Table' },
  { id: 'thirdparty', label: 'Third-Party Cookies' },
  { id: 'managing',   label: 'Managing Cookies' },
  { id: 'donottrack', label: 'Do Not Track' },
  { id: 'updates',    label: 'Updates to This Policy' },
  { id: 'contact',    label: 'Contact Us' },
];

const typeColors = {
  Essential:   'bg-blue-100 text-blue-700',
  Functional:  'bg-purple-100 text-purple-700',
  Analytics:   'bg-green-100 text-green-700',
};

const cookieTable = [
  { name: 'session_id',     type: 'Essential',  duration: 'Session',  purpose: 'Maintains your login session so you stay signed in while navigating the app.' },
  { name: 'csrf_token',     type: 'Essential',  duration: 'Session',  purpose: 'Prevents cross-site request forgery attacks.' },
  { name: 'user_prefs',     type: 'Functional', duration: '1 year',   purpose: 'Stores your display preferences such as sidebar state.' },
  { name: '_vs_analytics',  type: 'Analytics',  duration: '6 months', purpose: 'Tracks aggregate usage patterns to help us improve the product. No personal data.' },
];

function SectionHeading({ id, children }) {
  return (
    <h2 id={id} className="text-xl font-bold text-gray-900 mt-10 mb-3 scroll-mt-24 border-b border-gray-200 pb-2">
      {children}
    </h2>
  );
}

function P({ children }) {
  return <p className="text-gray-600 leading-relaxed mb-4 text-sm">{children}</p>;
}

function UL({ items }) {
  return (
    <ul className="list-disc list-outside ml-5 space-y-1.5 mb-4">
      {items.map((item, i) => (
        <li key={i} className="text-gray-600 text-sm leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}

function CookiePolicy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('what');

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to VendorShield</span>
          </button>
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 transition">Privacy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition">Terms</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">🍪</div>
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wide">Legal</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Cookie Policy</h1>
          <p className="text-blue-100 text-sm">Last updated: January 1, 2026 · Effective: January 1, 2026</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex gap-10">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contents</p>
              <nav className="space-y-0.5">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition ${
                      activeSection === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cookie Types</p>
                <div className="space-y-2">
                  {['Essential', 'Functional', 'Analytics'].map(type => (
                    <span key={type} className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-1 ${typeColors[type]}`}>{type}</span>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-3xl">

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Short version:</strong> VendorShield uses only essential and functional cookies. We do not use advertising or tracking cookies. You can control cookies through your browser settings.
              </p>
            </div>

            <SectionHeading id="what">What Are Cookies</SectionHeading>
            <P>Cookies are small text files placed on your computer or mobile device when you visit a website. They are widely used to make websites work efficiently, remember your preferences, and provide useful information to site owners.</P>
            <P>Cookies contain a unique identifier that allows a website to recognize your browser when you return. They cannot access other files on your device or run programs — they are simply small pieces of stored data.</P>
            <P>Similar technologies include local storage, session storage, and web beacons. This policy covers all of these technologies under the term "cookies."</P>

            <SectionHeading id="why">Why We Use Cookies</SectionHeading>
            <P>VendorShield uses cookies strictly to provide a secure and functional experience. Our uses are limited to:</P>
            <UL items={[
              'Keeping you securely logged in during your session',
              'Protecting your account from CSRF and other security threats',
              'Remembering your interface preferences across visits',
              'Understanding (anonymously) how users navigate the platform to improve it',
            ]} />
            <P>We do not use cookies for advertising, retargeting, or selling your data to any third party.</P>

            <SectionHeading id="types">Types of Cookies We Use</SectionHeading>

            <div className="space-y-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Essential Cookies</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Required</span>
                </div>
                <P>These cookies are strictly necessary for the website to function. Without them, you cannot log in, navigate the platform, or use core features. These cannot be disabled.</P>
                <UL items={[
                  'Authentication: Keeps you logged in during your session',
                  'Security: CSRF tokens to prevent cross-site request forgery attacks',
                  'Load balancing: Ensures requests are routed correctly',
                ]} />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Functional Cookies</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Optional</span>
                </div>
                <P>These cookies enable enhanced functionality and personalization. They remember your choices to provide a better experience. Disabling them may affect some non-critical features.</P>
                <UL items={[
                  'Interface preferences (e.g., sidebar open/closed state)',
                  'Recently viewed contracts for quick access',
                  'Language and regional display preferences',
                ]} />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Analytics Cookies</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Optional</span>
                </div>
                <P>We use minimal, privacy-respecting analytics to understand how users interact with VendorShield. This data is aggregated and anonymized — it is never tied to your personal identity.</P>
                <UL items={[
                  'Which features are used most (to prioritize improvements)',
                  'Common error patterns (to fix bugs faster)',
                  'General navigation flows (fully anonymized)',
                ]} />
              </div>
            </div>

            <SectionHeading id="table">Cookie Reference Table</SectionHeading>
            <P>Below is a complete list of cookies currently used by VendorShield:</P>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {['Cookie Name', 'Type', 'Duration', 'Purpose'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cookieTable.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[row.type]}`}>{row.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{row.duration}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SectionHeading id="thirdparty">Third-Party Cookies</SectionHeading>
            <P>VendorShield does not embed third-party advertising networks, social media widgets, or tracking pixels that set cookies on your device. We do not use Google Analytics, Facebook Pixel, or similar third-party tracking tools.</P>
            <P>Any integrations we use (such as the Google Gemini API for AI contract analysis) operate server-to-server and do not place any cookies on your device.</P>

            <SectionHeading id="managing">Managing Cookies</SectionHeading>
            <P>You can control and delete cookies through your browser settings. Here is how to manage cookies in common browsers:</P>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { browser: 'Google Chrome',   path: 'Settings → Privacy and security → Cookies and other site data' },
                { browser: 'Mozilla Firefox', path: 'Settings → Privacy & Security → Cookies and Site Data' },
                { browser: 'Safari',          path: 'Preferences → Privacy → Manage Website Data' },
                { browser: 'Microsoft Edge',  path: 'Settings → Cookies and site permissions → Cookies' },
              ].map(({ browser, path }) => (
                <div key={browser} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-800">{browser}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{path}</p>
                </div>
              ))}
            </div>
            <P>Please note: blocking essential cookies will prevent you from logging into VendorShield, as session management depends on them.</P>

            <SectionHeading id="donottrack">Do Not Track</SectionHeading>
            <P>Some browsers offer a "Do Not Track" (DNT) setting that signals websites to not track your activity. VendorShield respects DNT signals — when DNT is enabled in your browser, we automatically disable all non-essential analytics cookies.</P>

            <SectionHeading id="updates">Updates to This Policy</SectionHeading>
            <P>We may update this Cookie Policy from time to time to reflect changes in our practices or applicable regulations. When we make significant changes, we will revise the "Last updated" date and notify active users via email.</P>
            <P>Your continued use of VendorShield after changes are posted constitutes your acceptance of the updated Cookie Policy.</P>

            <SectionHeading id="contact">Contact Us</SectionHeading>
            <P>If you have questions about our use of cookies or want to exercise your data rights:</P>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 text-sm text-gray-700 space-y-1">
              <p><strong>VendorShield Privacy Team</strong></p>
              <p>Email: <a href="mailto:privacy@vendorshield.com" className="text-blue-600 hover:underline">privacy@vendorshield.com</a></p>
              <p className="text-gray-500 text-xs mt-1">Also see our full <button onClick={() => navigate('/privacy')} className="text-blue-600 hover:underline">Privacy Policy</button> and <button onClick={() => navigate('/terms')} className="text-blue-600 hover:underline">Terms of Service</button></p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-12 py-8 text-center text-xs text-gray-400 bg-white">
        <p>© 2026 VendorShield. All rights reserved.</p>
        <div className="flex justify-center space-x-6 mt-2">
          <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 transition">Privacy Policy</button>
          <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition">Terms of Service</button>
          <button onClick={() => navigate('/')} className="hover:text-gray-600 transition">Home</button>
        </div>
      </div>
    </div>
  );
}

export default CookiePolicy;
