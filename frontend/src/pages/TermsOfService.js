import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { id: 'agreement',      label: 'Agreement to Terms' },
  { id: 'services',       label: 'Description of Services' },
  { id: 'accounts',       label: 'User Accounts' },
  { id: 'license',        label: 'Use License' },
  { id: 'conduct',        label: 'Acceptable Use' },
  { id: 'content',        label: 'Your Content' },
  { id: 'payment',        label: 'Payments & Billing' },
  { id: 'ip',             label: 'Intellectual Property' },
  { id: 'disclaimer',     label: 'Disclaimers' },
  { id: 'liability',      label: 'Limitation of Liability' },
  { id: 'termination',    label: 'Termination' },
  { id: 'governing',      label: 'Governing Law' },
  { id: 'changes',        label: 'Changes to Terms' },
  { id: 'contact',        label: 'Contact Information' },
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

function TermsOfService() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('agreement');

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
            <button onClick={() => navigate('/cookies')} className="hover:text-gray-600 transition">Cookies</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-xl">📋</div>
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wide">Legal</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
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

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Please read carefully.</strong> By accessing or using VendorShield, you agree to these Terms of Service. If you do not agree, do not use our services.
              </p>
            </div>

            <SectionHeading id="agreement">Agreement to Terms</SectionHeading>
            <P>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and VendorShield ("Company," "we," "our," or "us") governing your access to and use of the VendorShield platform and services.</P>
            <P>By creating an account, clicking "I Agree," or otherwise accessing or using our services, you confirm that you are at least 18 years of age, have the legal authority to enter into this agreement, and agree to be bound by these Terms.</P>

            <SectionHeading id="services">Description of Services</SectionHeading>
            <P>VendorShield provides a cloud-based platform for vendor risk management, including:</P>
            <UL items={[
              'AI-powered contract analysis and risk detection',
              'Vendor directory management',
              'Risk scoring and reporting dashboards',
              'Contract document storage and organization',
              'Team collaboration features (where applicable)',
            ]} />
            <P>We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice to users.</P>

            <SectionHeading id="accounts">User Accounts</SectionHeading>
            <P>To use VendorShield, you must create an account. You agree to:</P>
            <UL items={[
              'Provide accurate, current, and complete information during registration',
              'Maintain and promptly update your account information',
              'Keep your password secure and confidential',
              'Accept responsibility for all activity occurring under your account',
              'Notify us immediately at security@vendorshield.com of any unauthorized account use',
            ]} />
            <P>You may not share account credentials with others or create accounts on behalf of others without explicit authorization. One person or legal entity may not maintain more than one free account.</P>

            <SectionHeading id="license">Use License</SectionHeading>
            <P>Subject to your compliance with these Terms and payment of applicable fees, VendorShield grants you a limited, non-exclusive, non-transferable, revocable license to:</P>
            <UL items={[
              'Access and use the VendorShield platform for your internal business purposes',
              'Upload contract documents for analysis',
              'View, download, and use the reports generated by our service',
            ]} />
            <P>This license does not include the right to sublicense, resell, or redistribute our services; to reverse engineer or attempt to extract source code; or to use the service to build a competing product.</P>

            <SectionHeading id="conduct">Acceptable Use</SectionHeading>
            <P>You agree not to use VendorShield to:</P>
            <UL items={[
              'Upload or transmit malware, viruses, or any malicious code',
              'Violate any applicable local, national, or international law or regulation',
              'Infringe upon the intellectual property rights of others',
              'Harass, abuse, or harm other users',
              'Attempt to gain unauthorized access to any part of our systems',
              'Use automated tools to scrape, crawl, or download data from the platform without consent',
              'Impersonate any person or entity',
              'Upload content that is illegal, defamatory, or obscene',
            ]} />
            <P>Violation of these rules may result in immediate account suspension or termination without refund.</P>

            <SectionHeading id="content">Your Content</SectionHeading>
            <P>You retain full ownership of all content you upload to VendorShield, including contract documents and vendor data ("Your Content"). By uploading content, you grant VendorShield a limited, non-exclusive license to process and analyze it solely for the purpose of providing our services to you.</P>
            <P>You represent and warrant that you have the necessary rights to upload and process the documents you provide, and that doing so does not violate any third-party agreements or applicable law.</P>
            <P>We will not access, use, or share your content except as necessary to provide the service or as required by law.</P>

            <SectionHeading id="payment">Payments & Billing</SectionHeading>
            <P>Certain features of VendorShield may require payment. By subscribing to a paid plan:</P>
            <UL items={[
              'You authorize us to charge your chosen payment method on a recurring basis',
              'Subscription fees are billed in advance on a monthly or annual cycle',
              'All fees are non-refundable except as required by law or as stated in our refund policy',
              'We reserve the right to change pricing with 30 days notice',
              'Failure to pay may result in service suspension',
            ]} />
            <P>For questions about billing, contact billing@vendorshield.com.</P>

            <SectionHeading id="ip">Intellectual Property</SectionHeading>
            <P>The VendorShield platform, including its design, code, logos, trademarks, and AI models, is the exclusive property of VendorShield and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from our platform without our express written consent.</P>
            <P>The AI analysis results generated by our system are provided for informational purposes only and do not constitute legal advice.</P>

            <SectionHeading id="disclaimer">Disclaimers</SectionHeading>
            <P>VendorShield is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</P>
            <P><strong>AI analysis is not legal advice.</strong> The risk analysis produced by VendorShield is informational only. Always consult qualified legal counsel before making decisions based on contract analysis results.</P>
            <P>We do not warrant that the service will be uninterrupted, error-free, or completely secure.</P>

            <SectionHeading id="liability">Limitation of Liability</SectionHeading>
            <P>To the fullest extent permitted by law, VendorShield shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service — including but not limited to loss of profits, data loss, or business interruption.</P>
            <P>Our total liability to you for all claims arising from your use of the service shall not exceed the greater of (a) the amount you paid to us in the 12 months preceding the claim or (b) $100 USD.</P>

            <SectionHeading id="termination">Termination</SectionHeading>
            <P>Either party may terminate this agreement at any time. You may close your account from the Profile settings or by contacting support@vendorshield.com.</P>
            <P>We may suspend or terminate your account immediately, without notice or liability, for any reason including if we determine you have violated these Terms. Upon termination, your license to use the service ceases immediately.</P>
            <P>Sections covering intellectual property, disclaimers, limitation of liability, and governing law survive termination.</P>

            <SectionHeading id="governing">Governing Law</SectionHeading>
            <P>These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall first be attempted to be resolved through informal negotiation. If that fails, disputes shall be resolved through binding arbitration, except that either party may seek injunctive relief in court for violations of intellectual property rights.</P>

            <SectionHeading id="changes">Changes to Terms</SectionHeading>
            <P>We reserve the right to modify these Terms at any time. We will provide at least 14 days notice of material changes via email or prominent in-app notice. Your continued use of VendorShield after the effective date of the new Terms constitutes your acceptance.</P>

            <SectionHeading id="contact">Contact Information</SectionHeading>
            <P>For questions about these Terms:</P>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 text-sm text-gray-700 space-y-1">
              <p><strong>VendorShield Legal Team</strong></p>
              <p>Email: <a href="mailto:legal@vendorshield.com" className="text-blue-600 hover:underline">legal@vendorshield.com</a></p>
              <p>Response time: Within 3 business days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-12 py-8 text-center text-xs text-gray-400 bg-white">
        <p>© 2026 VendorShield. All rights reserved.</p>
        <div className="flex justify-center space-x-6 mt-2">
          <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 transition">Privacy Policy</button>
          <button onClick={() => navigate('/cookies')} className="hover:text-gray-600 transition">Cookie Policy</button>
          <button onClick={() => navigate('/')} className="hover:text-gray-600 transition">Home</button>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
