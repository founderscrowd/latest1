import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Globe, Users, FileText, Mail } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  siteLogoUrl?: string | null;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack, siteLogoUrl }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Privacy Policy | EquityTake</title>
        <meta name="description" content="EquityTake's Privacy Policy - Learn how we protect and handle your personal information, data collection practices, and your rights." />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${window.location.origin}/privacy`} />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
              <p className="text-slate-600">How we protect and handle your personal information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          {/* Last Updated */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> January 15, 2025
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <p className="text-slate-700 leading-relaxed mb-4">
              At EquityTake, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, share, and protect your information when you use our platform 
              to connect with co-founders and participate in startup groups.
            </p>
            <p className="text-slate-700 leading-relaxed">
              By using our services, you agree to the collection and use of information in accordance with this policy. 
              We encourage you to read this policy carefully and contact us if you have any questions.
            </p>
          </div>

          {/* Section 1: Information We Collect */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Personal Information You Provide</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Account Information:</strong> Email address, username, password, and profile details</li>
                  <li><strong>Profile Data:</strong> Display name, avatar image, bio, and professional background</li>
                  <li><strong>Group Information:</strong> Startup descriptions, equity details, funding requirements, and business plans</li>
                  <li><strong>Communication Data:</strong> Messages, forum posts, comments, and file attachments</li>
                  <li><strong>Contact Information:</strong> Phone numbers for equity claims and business communications</li>
                  <li><strong>Financial Information:</strong> Equity percentages, investment types, and funding amounts (no payment card data)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Automatically Collected Information</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent, and interaction patterns</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and screen resolution</li>
                  <li><strong>Location Data:</strong> IP address-based location for security and localization purposes</li>
                  <li><strong>Performance Data:</strong> Page load times, error reports, and system performance metrics</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Cookies and Tracking Technologies</h3>
                <p className="text-slate-700 mb-2">We use cookies and similar technologies to enhance your experience:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Essential Cookies:</strong> Required for authentication, security, and basic functionality</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and customization choices</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Service Provision (Legal Basis: Contract Performance)</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Create and manage your user account and profile</li>
                  <li>Enable participation in startup groups and equity discussions</li>
                  <li>Facilitate communication between co-founders and group members</li>
                  <li>Process equity claims and manage ownership structures</li>
                  <li>Provide customer support and respond to inquiries</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Platform Improvement (Legal Basis: Legitimate Interest)</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Analyze usage patterns to improve features and user experience</li>
                  <li>Monitor platform performance and identify technical issues</li>
                  <li>Develop new features and services based on user needs</li>
                  <li>Conduct research and analytics for business optimization</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Legal and Security (Legal Basis: Legal Obligation & Legitimate Interest)</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Comply with applicable laws, regulations, and legal processes</li>
                  <li>Protect against fraud, abuse, and security threats</li>
                  <li>Enforce our Terms of Service and community guidelines</li>
                  <li>Maintain records for business and legal purposes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Communication (Legal Basis: Consent & Legitimate Interest)</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Send important updates about your account and groups</li>
                  <li>Notify you of equity claim status changes and group activities</li>
                  <li>Provide technical support and customer service communications</li>
                  <li>Send promotional content (only with your explicit consent)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Information Sharing and Disclosure */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-purple-600" />
              <h2 className="text-xl font-bold text-slate-900">3. Information Sharing and Disclosure</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Within the Platform</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Group Members:</strong> Your profile information is visible to members of groups you join</li>
                  <li><strong>Public Groups:</strong> Basic information may be visible to non-members for discovery purposes</li>
                  <li><strong>Equity Information:</strong> Ownership percentages may be shared with relevant group administrators</li>
                  <li><strong>Communication Data:</strong> Messages and forum posts are shared with intended recipients</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Third-Party Service Providers</h3>
                <p className="text-slate-700 mb-2">We may share information with trusted service providers who assist us in:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Cloud hosting and data storage (Supabase/AWS)</li>
                  <li>Analytics and performance monitoring</li>
                  <li>Customer support and communication tools</li>
                  <li>Security and fraud prevention services</li>
                </ul>
                <p className="text-slate-700 text-sm mt-2">
                  All service providers are contractually bound to protect your information and use it only for specified purposes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Legal Requirements</h3>
                <p className="text-slate-700 mb-2">We may disclose your information when required by law or to:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Comply with legal processes, court orders, or government requests</li>
                  <li>Protect our rights, property, or safety, or that of our users</li>
                  <li>Investigate potential violations of our Terms of Service</li>
                  <li>Prevent fraud, abuse, or illegal activities</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 mb-2">We Never Sell Your Personal Information</h3>
                <p className="text-red-800 text-sm">
                  We do not sell, rent, or trade your personal information to third parties for their marketing purposes. 
                  Your data is used solely to provide and improve our services.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Security Measures */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={20} className="text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Data Security Measures</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Technical Safeguards</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Encryption:</strong> All data is encrypted in transit using TLS 1.3 and at rest using AES-256</li>
                  <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication for administrative accounts</li>
                  <li><strong>Database Security:</strong> Row-level security policies and regular security audits</li>
                  <li><strong>Infrastructure:</strong> Secure cloud hosting with regular security updates and monitoring</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Organizational Measures</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Staff Training:</strong> Regular privacy and security training for all team members</li>
                  <li><strong>Access Limitation:</strong> Data access is limited to authorized personnel on a need-to-know basis</li>
                  <li><strong>Incident Response:</strong> Established procedures for detecting and responding to security breaches</li>
                  <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Data Breach Notification</h3>
                <p className="text-yellow-800 text-sm">
                  In the unlikely event of a data breach that poses a risk to your rights and freedoms, 
                  we will notify you within 72 hours and provide clear information about the incident, 
                  its impact, and the steps we're taking to address it.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Your Rights and Choices */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">5. Your Rights and Choices</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Your Data Protection Rights</h3>
                <p className="text-green-800 text-sm mb-3">
                  Under GDPR, CCPA, and other privacy laws, you have the following rights regarding your personal information:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">🔍 Right to Access</h4>
                  <p className="text-sm text-slate-700">
                    Request a copy of all personal information we hold about you, including how it's being used.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">✏️ Right to Rectification</h4>
                  <p className="text-sm text-slate-700">
                    Correct any inaccurate or incomplete personal information in your profile or account.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">🗑️ Right to Erasure</h4>
                  <p className="text-sm text-slate-700">
                    Request deletion of your personal information, subject to legal and contractual obligations.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">📦 Right to Data Portability</h4>
                  <p className="text-sm text-slate-700">
                    Receive your personal information in a structured, machine-readable format.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">⏸️ Right to Restrict Processing</h4>
                  <p className="text-sm text-slate-700">
                    Limit how we process your information in certain circumstances.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">🚫 Right to Object</h4>
                  <p className="text-sm text-slate-700">
                    Object to processing based on legitimate interests or for direct marketing purposes.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Exercise Your Rights</h3>
                <p className="text-blue-800 text-sm mb-2">
                  To exercise any of these rights, please contact us at:
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-4">
                  <li><strong>Email:</strong> equitytake@gmail.com</li>
                  <li><strong>Subject Line:</strong> "Privacy Rights Request - [Your Request Type]"</li>
                  <li><strong>Include:</strong> Your account email and specific details about your request</li>
                </ul>
                <p className="text-blue-800 text-sm mt-2">
                  We will respond to your request within 30 days and may require identity verification for security purposes.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Cookie Policy */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">6. Cookie Policy</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-700">
                Cookies are small text files stored on your device that help us provide and improve our services. 
                Here's how we use different types of cookies:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🔧 Essential Cookies</h4>
                  <p className="text-sm text-green-800 mb-2">Required for basic functionality:</p>
                  <ul className="list-disc list-inside space-y-1 text-green-800 text-sm ml-2">
                    <li>User authentication and session management</li>
                    <li>Security features and fraud prevention</li>
                    <li>Basic site functionality and navigation</li>
                  </ul>
                  <p className="text-xs text-green-700 mt-2 font-medium">Cannot be disabled</p>
                </div>

                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📊 Analytics Cookies</h4>
                  <p className="text-sm text-blue-800 mb-2">Help us understand usage:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-2">
                    <li>Page views and user interactions</li>
                    <li>Feature usage and performance metrics</li>
                    <li>Error tracking and debugging information</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2 font-medium">Can be disabled in browser settings</p>
                </div>

                <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">⚙️ Functional Cookies</h4>
                  <p className="text-sm text-purple-800 mb-2">Remember your preferences:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-800 text-sm ml-2">
                    <li>Language and region settings</li>
                    <li>Display preferences and customizations</li>
                    <li>Form data and user interface state</li>
                  </ul>
                  <p className="text-xs text-purple-700 mt-2 font-medium">Can be managed in account settings</p>
                </div>

                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">📢 Marketing Cookies</h4>
                  <p className="text-sm text-orange-800 mb-2">For personalized content:</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-800 text-sm ml-2">
                    <li>Relevant group recommendations</li>
                    <li>Personalized feature suggestions</li>
                    <li>Targeted communications (with consent)</li>
                  </ul>
                  <p className="text-xs text-orange-700 mt-2 font-medium">Requires explicit consent</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Managing Cookies</h3>
                <p className="text-slate-700 text-sm mb-2">You can control cookies through:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm ml-4">
                  <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies</li>
                  <li><strong>Account Preferences:</strong> Manage functional and marketing cookies in your account settings</li>
                  <li><strong>Opt-Out Tools:</strong> Use industry opt-out tools for advertising cookies</li>
                </ul>
                <p className="text-slate-600 text-xs mt-2">
                  Note: Disabling essential cookies may affect site functionality.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Third-Party Services and Links */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-teal-600" />
              <h2 className="text-xl font-bold text-slate-900">7. Third-Party Services and Links</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Integrated Services</h3>
                <p className="text-slate-700 mb-2">Our platform integrates with the following third-party services:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Supabase:</strong> Database hosting, authentication, and real-time features</li>
                  <li><strong>Cloud Storage:</strong> File uploads and document storage</li>
                  <li><strong>Analytics Services:</strong> Usage tracking and performance monitoring</li>
                  <li><strong>Communication Tools:</strong> Email delivery and notification services</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">External Links</h3>
                <p className="text-slate-700 mb-2">
                  Our platform may contain links to external websites, social media platforms, or other services. 
                  Please note that:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>We are not responsible for the privacy practices of external sites</li>
                  <li>Each external service has its own privacy policy and terms</li>
                  <li>We encourage you to review privacy policies before sharing information</li>
                  <li>Links do not constitute endorsement of external services</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Social Media Integration</h3>
                <p className="text-amber-800 text-sm">
                  If you choose to connect social media accounts or share content on social platforms, 
                  those interactions are governed by the respective social media platform's privacy policy. 
                  We recommend reviewing their data practices before connecting accounts.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8: Children's Privacy */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-pink-600" />
              <h2 className="text-xl font-bold text-slate-900">8. Children's Privacy</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-pink-900 mb-2">Age Restrictions</h3>
                <p className="text-pink-800 text-sm mb-2">
                  Our platform is designed for adults and business professionals. We have the following age requirements:
                </p>
                <ul className="list-disc list-inside space-y-1 text-pink-800 text-sm ml-4">
                  <li><strong>Minimum Age:</strong> 18 years old in most jurisdictions</li>
                  <li><strong>EU/UK Users:</strong> 16 years old with parental consent where required</li>
                  <li><strong>Business Context:</strong> Users must be legally able to enter into business agreements</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">COPPA Compliance</h3>
                <p className="text-slate-700 mb-2">
                  We do not knowingly collect personal information from children under 13 years of age. If we discover that we have collected information from a child under 13:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>We will delete the information immediately</li>
                  <li>We will terminate the associated account</li>
                  <li>We will notify parents/guardians if contact information is available</li>
                  <li>We will take steps to prevent future underage registrations</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Parental Rights</h3>
                <p className="text-slate-700 text-sm">
                  If you believe your child has provided personal information to us, please contact us immediately at 
                  equitytake@gmail.com. We will investigate and take appropriate action to protect the child's privacy.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9: International Data Transfers */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-cyan-600" />
              <h2 className="text-xl font-bold text-slate-900">9. International Data Transfers</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Cross-Border Data Processing</h3>
                <p className="text-slate-700 mb-2">
                  As a global platform, your information may be transferred to and processed in countries other than your own. 
                  We ensure adequate protection through:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Adequacy Decisions:</strong> Transfers to countries with EU adequacy decisions</li>
                  <li><strong>Standard Contractual Clauses:</strong> EU-approved contracts for international transfers</li>
                  <li><strong>Certification Programs:</strong> Privacy Shield successors and similar frameworks</li>
                  <li><strong>Binding Corporate Rules:</strong> Internal policies ensuring consistent protection</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Data Processing Locations</h3>
                <p className="text-slate-700 mb-2">Your information may be processed in:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>United States:</strong> Primary hosting and processing infrastructure</li>
                  <li><strong>European Union:</strong> EU user data processing and backup systems</li>
                  <li><strong>Canada:</strong> Additional data processing and analytics services</li>
                  <li><strong>Other Regions:</strong> As needed for service delivery and legal compliance</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Rights Regarding International Transfers</h3>
                <p className="text-blue-800 text-sm">
                  You have the right to obtain information about international transfers of your data, 
                  including details about safeguards in place. You may also object to transfers in certain circumstances. 
                  Contact us for more information about specific transfer mechanisms.
                </p>
              </div>
            </div>
          </section>

          {/* Section 10: Policy Updates and Contact Information */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Mail size={20} className="text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">10. Policy Updates and Contact Information</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Policy Updates</h3>
                <p className="text-slate-700 mb-2">
                  We may update this Privacy Policy periodically to reflect changes in our practices, 
                  technology, legal requirements, or other factors. When we make changes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li><strong>Notification:</strong> We will notify you via email and platform notifications</li>
                  <li><strong>Effective Date:</strong> Changes take effect 30 days after notification</li>
                  <li><strong>Material Changes:</strong> Significant changes may require your renewed consent</li>
                  <li><strong>Version History:</strong> Previous versions are available upon request</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Data Retention</h3>
                <p className="text-slate-700 mb-2">We retain your information for as long as necessary to:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Provide our services and maintain your account</li>
                  <li>Comply with legal obligations and resolve disputes</li>
                  <li>Maintain business records and prevent fraud</li>
                  <li>Honor your data retention preferences where applicable</li>
                </ul>
                <p className="text-slate-700 text-sm mt-2">
                  Typical retention periods: Account data (until deletion requested), 
                  Communication data (7 years), Analytics data (2 years), Security logs (1 year).
                </p>
              </div>

              <div className="bg-slate-100 border border-slate-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">General Privacy Inquiries</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><strong>Email:</strong> equitytake@gmail.com</p>
                      <p><strong>Subject:</strong> "Privacy Policy Question"</p>
                      <p><strong>Response Time:</strong> Within 5 business days</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Data Protection Officer</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><strong>Email:</strong> equitytake@gmail.com</p>
                      <p><strong>Subject:</strong> "DPO - Data Protection Inquiry"</p>
                      <p><strong>For:</strong> GDPR-related questions and complaints</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-300">
                  <h4 className="font-semibold text-slate-900 mb-2">Regulatory Complaints</h4>
                  <p className="text-sm text-slate-700">
                    If you're not satisfied with our response to your privacy concerns, you have the right to 
                    lodge a complaint with your local data protection authority. For EU residents, you can find 
                    your local authority at <span className="font-medium">edpb.europa.eu</span>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-6 mt-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Our Commitment to Privacy</h3>
              <p className="text-green-800 text-sm">
                Privacy is fundamental to building trust in the startup ecosystem. We are committed to transparency, 
                security, and giving you control over your personal information. This policy reflects our dedication 
                to protecting your privacy while enabling meaningful connections between entrepreneurs and co-founders.
              </p>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-xs text-slate-500">
                This privacy policy is effective as of the date listed above and applies to all users of the EquityTake platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;