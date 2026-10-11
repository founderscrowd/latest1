import React from 'react';
import { ArrowLeft, Cookie, Shield, Eye, Settings, Info, CheckCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface CookiePolicyPageProps {
  onBack: () => void;
  siteLogoUrl?: string | null;
}

const CookiePolicyPage: React.FC<CookiePolicyPageProps> = ({ onBack, siteLogoUrl }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Cookie Policy | EquityTake</title>
        <meta name="description" content="EquityTake's Cookie Policy - Learn about how we use cookies and similar technologies to enhance your experience on our platform." />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${window.location.origin}/cookies/`} />
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
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Cookie size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cookie Policy</h1>
              <p className="text-slate-600">How we use cookies and similar technologies</p>
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
              <strong>Last Updated:</strong> October 11, 2026
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <p className="text-slate-700 leading-relaxed mb-4">
              This Cookie Policy explains how EquityTake uses cookies and similar tracking
              technologies when you visit our website and use our platform. This policy should be read alongside
              our Privacy Policy for a complete understanding of how we handle your personal information.
            </p>
            <p className="text-slate-700 leading-relaxed">
              When you visit EquityTake for the first time, a cookie consent banner appears at the bottom of the
              screen. You can choose to accept all cookies, reject optional cookies, or customise your preferences
              by enabling or disabling Analytics and Marketing cookies individually. Essential cookies are always
              active and cannot be disabled.
            </p>
          </div>

          {/* Section 1: What Are Cookies */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Cookie size={20} className="text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">1. What Are Cookies?</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-700 leading-relaxed">
                Cookies are small text files that are placed on your computer, smartphone, or other device when you 
                visit a website. They are widely used to make websites work more efficiently and to provide information 
                to website owners about how users interact with their sites.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Types of Information Cookies Store</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-4">
                  <li>User preferences and settings</li>
                  <li>Login status and authentication tokens</li>
                  <li>Shopping cart contents and form data</li>
                  <li>Language and region preferences</li>
                  <li>Analytics and usage patterns</li>
                  <li>Security and fraud prevention data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Types of Cookies We Use */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">2. Types of Cookies We Use</h2>
            </div>

            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="border border-green-200 bg-green-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={20} className="text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Essential Cookies (Always Active)</h3>
                </div>
                <p className="text-green-800 mb-4">
                  These cookies are necessary for the website to function properly and cannot be disabled.
                  They are usually set in response to actions you take, such as logging in or filling out forms.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Authentication & Security</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• User login sessions</li>
                      <li>• Security tokens and CSRF protection</li>
                      <li>• Account verification status</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Core Functionality</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Form submission data</li>
                      <li>• Navigation and page state</li>
                      <li>• Load balancing and performance</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Analytics Cookies (Optional — Google Analytics)</h3>
                </div>
                <p className="text-blue-800 mb-4">
                  These cookies help us understand how visitors interact with our website by collecting
                  and reporting information anonymously. We use Google Analytics 4 (GA4) for this purpose.
                  These cookies are disabled by default and only load after you explicitly opt in.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Usage Analytics</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Page views and session duration</li>
                      <li>• Feature usage and click tracking</li>
                      <li>• User journey and navigation patterns</li>
                      <li>• Device and browser information</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Performance Monitoring</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Page load times and performance</li>
                      <li>• Error tracking and debugging</li>
                      <li>• API response times</li>
                      <li>• System stability metrics</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-orange-200 bg-orange-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={20} className="text-orange-600" />
                  <h3 className="text-lg font-semibold text-orange-900">Marketing Cookies (Optional — Meta Pixel & TikTok Pixel)</h3>
                </div>
                <p className="text-orange-800 mb-4">
                  These cookies are used to measure advertising performance and track conversion events.
                  We use the Meta (Facebook) Pixel and the TikTok Pixel for this purpose.
                  These cookies are disabled by default and only load after you explicitly opt in.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-orange-900 mb-2">Meta (Facebook) Pixel</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• Page view tracking</li>
                      <li>• Registration and login conversion events</li>
                      <li>• Checkout and purchase conversion events</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-900 mb-2">TikTok Pixel</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• Page view tracking (native ttq.page())</li>
                      <li>• Content view, group join, and group creation events</li>
                      <li>• Registration conversion events</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Managing Your Cookie Preferences */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">3. Managing Your Cookie Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Cookie Consent Banner</h3>
                <p className="text-green-800 text-sm mb-3">
                  When you first visit EquityTake, a cookie consent banner appears with three options:
                </p>
                <ul className="list-disc list-inside space-y-1 text-green-800 text-sm ml-4">
                  <li><strong>Accept all</strong> — enables Analytics and Marketing cookies</li>
                  <li><strong>Reject optional</strong> — disables Analytics and Marketing cookies; only Essential cookies are used</li>
                  <li><strong>Customise</strong> — lets you enable or disable Analytics and Marketing cookies separately</li>
                </ul>
                <p className="text-green-800 text-sm mt-3">
                  You can change your preferences at any time by clicking <strong>Cookie Preferences</strong> in the website footer.
                  Withdrawing consent stops further optional tracking and clears existing tracking cookies from your browser.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">How Consent Works</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-4">
                  <li>Analytics and Marketing tracking scripts do not load until you opt in</li>
                  <li>If you do not make a choice, no optional cookies are set</li>
                  <li>Your preferences are saved in your browser so you are not asked again unless the policy changes</li>
                  <li>Withdrawing consent stops all further tracking and removes existing tracking cookies</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={16} className="text-yellow-600" />
                  <h4 className="font-semibold text-yellow-900">Important Note</h4>
                </div>
                <p className="text-yellow-800 text-sm">
                  Essential cookies cannot be disabled as they are necessary for basic site operation, user authentication,
                  and security features. You can also control cookies directly through your browser settings.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Contact Information */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Contact Information</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Questions About Cookies?</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">General Cookie Questions</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><strong>Email:</strong> admin@groupsandcrowds.com</p>
                      <p><strong>Subject:</strong> Cookie Policy Question</p>
                      <p><strong>Response Time:</strong> Within 3 business days</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Privacy Officer</h4>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><strong>Email:</strong> admin@groupsandcrowds.com</p>
                      <p><strong>Subject:</strong> Privacy Officer - Cookie Inquiry</p>
                      <p><strong>For:</strong> GDPR and privacy-related cookie questions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-6 mt-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Our Commitment to Transparency</h3>
              <p className="text-blue-800 text-sm">
                We believe in being transparent about how we use cookies and giving you control over your data. 
                This policy is part of our commitment to protecting your privacy while providing you with the 
                best possible experience on our platform.
              </p>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-xs text-slate-500">
                This cookie policy is effective as of the date listed above and applies to all users of the EquityTake platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;