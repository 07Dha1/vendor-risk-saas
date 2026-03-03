import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { id: 'introduction',       label: 'Introduction' },
  { id: 'information',        label: 'Information We Collect' },
  { id: 'usage',              label: 'How We Use Your Information' },
  { id: 'sharing',            label: 'Information Sharing' },
  { id: 'security',           label: 'Data Security' },
  { id: 'retention',          label: 'Data Retention' },
  { id: 'rights',             label: 'Your Rights' },
  { id: 'cookies',            label: 'Cookies' },
  { id: 'thirdparty',         label: 'Third-Party Services' },
  { id: 'changes',            label: 'Changes to This Policy' },
  { id: 'contact',            label: 'Contact Us' },
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

function PrivacyPolicy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('introduction');

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
            <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition">Terms</button>
            <button onClick={() => navigate('/cookies')} className="hover:text-gray-600 transition">Cookies</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">🔒</div>
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wide">Legal</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
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
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-3xl">

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Summary:</strong> VendorShield collects minimal data needed to provide its services, never sells your personal information, and gives you full control over your data. Read the full policy below for details.
              </p>
            </div>

            <SectionHeading id="introduction">Introduction</SectionHeading>
            <P>VendorShield ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the VendorShield platform — a SaaS tool for vendor risk management and contract analysis.</P>
            <P>By using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of our platform.</P>

            <SectionHeading id="information">Information We Collect</SectionHeading>
            <P>We collect information that you provide directly to us, as well as information generated through your use of our services.</P>
            <p className="text-sm font-semibold text-gray-800 mb-2">Account Information</p>
            <UL items={[
              'Full name and email address',
              'Company name and role',
              'Password (stored in encrypted form — we never store plaintext passwords)',
              'Profile preferences and settings',
            ]} />
            <p className="text-sm font-semibold text-gray-800 mb-2">Service Data</p>
            <UL items={[
              'Contract documents you upload for analysis',
              'Vendor names, contact details, and associated metadata',
              'AI-generated risk analysis results and reports',
              'Notes and annotations you add within the platform',
            ]} />
            <p className="text-sm font-semibold text-gray-800 mb-2">Usage & Technical Data</p>
            <UL items={[
              'IP address, browser type, and operating system',
              'Pages visited, features used, and time spent',
              'Error logs and crash reports (used for debugging)',
              'Device identifiers and session tokens',
            ]} />

            <SectionHeading id="usage">How We Use Your Information</SectionHeading>
            <P>We use the information we collect for the following purposes:</P>
            <UL items={[
              'Providing, maintaining, and improving the VendorShield platform',
              'Processing and analyzing contract documents using AI',
              'Authenticating your identity and securing your account',
              'Sending transactional emails (account confirmations, password resets)',
              'Responding to support requests and feedback',
              'Detecting and preventing fraud, abuse, and security incidents',
              'Generating anonymized, aggregated analytics to improve the product',
              'Complying with legal obligations',
            ]} />
            <P>We will never use your contract data or vendor information for purposes other than providing you the service.</P>

            <SectionHeading id="sharing">Information Sharing</SectionHeading>
            <P>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following limited circumstances:</P>
            <UL items={[
              'Service Providers: Trusted third-party vendors who help us operate our platform (e.g., cloud hosting, email delivery). They are contractually bound to handle data securely.',
              'Legal Requirements: If required to comply with a court order, subpoena, or other legal process, or to protect our rights and safety.',
              'Business Transfers: In connection with a merger, acquisition, or sale of assets, your data may be transferred. You will be notified before transfer.',
              'With Your Consent: For any other purpose with your explicit consent.',
            ]} />

            <SectionHeading id="security">Data Security</SectionHeading>
            <P>We implement industry-standard security measures to protect your information:</P>
            <UL items={[
              'All passwords are hashed using bcrypt — we never store or see your password',
              'Data in transit is encrypted using TLS 1.3',
              'Data at rest is encrypted using AES-256',
              'Access to production systems is restricted to authorized personnel only',
              'Regular security audits and vulnerability assessments',
              'Automated monitoring for unusual access patterns',
            ]} />
            <P>While we take security seriously, no method of transmission over the internet is 100% secure. We encourage you to use strong, unique passwords and enable two-factor authentication where available.</P>

            <SectionHeading id="retention">Data Retention</SectionHeading>
            <P>We retain your information for as long as your account is active or as needed to provide services. Specifically:</P>
            <UL items={[
              'Account data: Retained while your account exists and for 30 days after deletion',
              'Contract documents: Retained while in your account. Deleted within 30 days of account closure.',
              'Usage logs: Retained for 90 days for security and debugging purposes',
              'Support tickets: Retained for 2 years',
            ]} />
            <P>You may request deletion of your data at any time by contacting privacy@vendorshield.com.</P>

            <SectionHeading id="rights">Your Rights</SectionHeading>
            <P>Depending on your location, you may have the following rights under applicable data protection laws (including GDPR and CCPA):</P>
            <UL items={[
              'Access: Request a copy of the personal data we hold about you',
              'Correction: Request correction of inaccurate or incomplete data',
              'Deletion: Request deletion of your personal data ("right to be forgotten")',
              'Portability: Receive your data in a structured, machine-readable format',
              'Objection: Object to processing of your personal data for certain purposes',
              'Restriction: Request restriction of processing in certain circumstances',
              'Withdraw Consent: Withdraw consent at any time where processing is consent-based',
            ]} />
            <P>To exercise any of these rights, contact us at privacy@vendorshield.com. We will respond within 30 days.</P>

            <SectionHeading id="cookies">Cookies</SectionHeading>
            <P>We use essential cookies to maintain your login session and preferences. We do not use third-party advertising cookies. See our <button onClick={() => navigate('/cookies')} className="text-blue-600 hover:underline">Cookie Policy</button> for full details.</P>

            <SectionHeading id="thirdparty">Third-Party Services</SectionHeading>
            <P>Our platform integrates with the following third-party services:</P>
            <UL items={[
              'Google Gemini API: Used for AI-powered contract analysis. Contract text is sent to Google\'s API and subject to Google\'s privacy policy. We do not send personally identifiable information.',
              'Email delivery providers: Used to send transactional emails on our behalf.',
            ]} />

            <SectionHeading id="changes">Changes to This Policy</SectionHeading>
            <P>We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email or by displaying a prominent notice on our platform at least 14 days before the changes take effect.</P>
            <P>Your continued use of VendorShield after changes become effective constitutes your acceptance of the revised policy.</P>

            <SectionHeading id="contact">Contact Us</SectionHeading>
            <P>If you have any questions, concerns, or requests related to this Privacy Policy, please contact us:</P>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 text-sm text-gray-700 space-y-1">
              <p><strong>VendorShield Privacy Team</strong></p>
              <p>Email: <a href="mailto:privacy@vendorshield.com" className="text-blue-600 hover:underline">privacy@vendorshield.com</a></p>
              <p>Response time: Within 2 business days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-12 py-8 text-center text-xs text-gray-400 bg-white">
        <p>© 2026 VendorShield. All rights reserved.</p>
        <div className="flex justify-center space-x-6 mt-2">
          <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition">Terms of Service</button>
          <button onClick={() => navigate('/cookies')} className="hover:text-gray-600 transition">Cookie Policy</button>
          <button onClick={() => navigate('/')} className="hover:text-gray-600 transition">Home</button>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
