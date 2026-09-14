// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

interface FooterProps {
  siteLogoUrl: string | null;
  user: any;
  userSubscription: any;
  setIsCreateModalOpen: (open: boolean) => void;
  setShowProfile: (show: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  onShowPrivacyPolicy: () => void;
  onShowTermsOfService: () => void;
  onShowCookiePolicy: () => void;
  onShowBlogAndAbout?: () => void;
  onShowHowItWorks?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  siteLogoUrl,
  user,
  userSubscription,
  setIsCreateModalOpen,
  setShowProfile,
  setIsAuthModalOpen,
  onShowPrivacyPolicy,
  onShowTermsOfService,
  onShowCookiePolicy,
  onShowBlogAndAbout,
  onShowHowItWorks
}) => (
  <footer className="bg-slate-900 text-white">
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Section */}
        <div className="md:col-span-1">
          <div className="flex items-center mb-4">
            {siteLogoUrl && siteLogoUrl.trim() !== '' ? (
              <img
                src={siteLogoUrl}
                alt="EquityTake Logo"
                className="h-8 max-w-[200px] object-contain brightness-0 invert"
                onError={() => {
                  console.warn('Logo failed to load in footer. URL was:', siteLogoUrl);
                }}
              />
            ) : (
              <span className="text-xl font-bold">EquityTake</span>
            )}
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            Connect with co-founders, claim equity, and turn your startup ideas into reality through collaborative groups.
          </p>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <span>✉️</span>
            <a 
              href="mailto:equitytake@gmail.com"
              className="hover:text-white transition-colors"
            >
              equitytake@gmail.com
            </a>
          </div>
        </div>

        {/* Platform Links */}
        <div>
          <h4 className="font-semibold text-white mb-4">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">
                Browse Groups
              </a>
            </li>
            <li>
              <button 
                onClick={() => {
                  if (!user) {
                    setIsAuthModalOpen(true);
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                className="text-slate-300 hover:text-white transition-colors text-left"
              >
                Create Group
              </button>
            </li>
            <li>
              {onShowHowItWorks ? (
                <button
                  onClick={onShowHowItWorks}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  How It Works
                </button>
              ) : (
                <a href="#" className="text-slate-300 hover:text-white transition-colors">
                  How It Works
                </a>
              )}
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-semibold text-white mb-4">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                to="/blog"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Blog
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="text-slate-300 hover:text-white transition-colors"
              >
                About
              </Link>
            </li>
            <li>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showContactModal'))}
                className="text-slate-300 hover:text-white transition-colors text-left"
              >
                Help Center
              </button>
            </li>
            <li>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showFeedbackModal'))}
                className="text-slate-300 hover:text-white transition-colors text-left"
              >
                Suggestions & Feedback
              </button>
            </li>
            <li>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">
                Startup Guide
              </a>
            </li>
          </ul>
        </div>

        {/* Legal & Social */}
        <div>
          <h4 className="font-semibold text-white mb-4">Legal & Social</h4>
          <ul className="space-y-2 text-sm mb-6">
            <li>
              <button 
                onClick={onShowPrivacyPolicy}
                className="text-slate-300 hover:text-white transition-colors text-left"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button 
                onClick={onShowTermsOfService}
                className="text-slate-300 hover:text-white transition-colors text-left"
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                onClick={onShowCookiePolicy}
                className="text-slate-300 hover:text-white transition-colors text-left"
              >
                Cookie Policy
              </button>
            </li>
          </ul>
          
          {/* Social Media Links */}
          <div>
            <h5 className="font-medium text-white mb-3 text-sm">Follow Us</h5>
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors"
                title="LinkedIn"
              >
                <span className="text-sm">💼</span>
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors"
                title="Twitter"
              >
                <span className="text-sm">🐦</span>
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-600 transition-colors"
                title="Facebook"
              >
                <span className="text-sm">📘</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-slate-400">
          © 2025 EquityTake. All rights reserved.
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <span>Made with ❤️ for entrepreneurs</span>
          <div className="flex items-center gap-1">
            <span>🚀</span>
            <span>Building the future together</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;