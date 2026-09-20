// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';

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
  onShowPrivacyPolicy,
  onShowTermsOfService,
  onShowCookiePolicy,
  onShowHowItWorks,
}) => (
  <footer className="bg-slate-900 text-white">
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Section */}
        <div className="md:col-span-1">
          <Link to="/" className="block mb-4">
            <span className="text-xl font-semibold text-white">EquityTake</span>
          </Link>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            EquityTake is a startup group and co-founder matching platform. Create a group around your idea, find potential co-founders, and discuss proposed equity allocations within the group.
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
              <Link to="/" className="text-slate-300 hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/startup-groups" className="text-slate-300 hover:text-white transition-colors">
                Startup groups
              </Link>
            </li>
            <li>
              <Link to="/create-startup-group" className="text-slate-300 hover:text-white transition-colors">
                Create a startup group
              </Link>
            </li>
            <li>
              <Link to="/cofounder-matching" className="text-slate-300 hover:text-white transition-colors">
                Co-founder matching
              </Link>
            </li>
            <li>
              <Link to="/find-a-cofounder" className="text-slate-300 hover:text-white transition-colors">
                Find a co-founder
              </Link>
            </li>
            <li>
              {onShowHowItWorks ? (
                <button
                  onClick={onShowHowItWorks}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  How it works
                </button>
              ) : (
                <Link to="/how-it-works" className="text-slate-300 hover:text-white transition-colors">
                  How it works
                </Link>
              )}
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-semibold text-white mb-4">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/equity-for-cofounders" className="text-slate-300 hover:text-white transition-colors">
                Equity for co-founders
              </Link>
            </li>
            <li>
              <Link to="/startup-equity-split" className="text-slate-300 hover:text-white transition-colors">
                Startup equity split
              </Link>
            </li>
            <li>
              <Link to="/startup-team-building" className="text-slate-300 hover:text-white transition-colors">
                Startup team building
              </Link>
            </li>
            <li>
              <Link to="/blog" className="text-slate-300 hover:text-white transition-colors">
                Blog
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-slate-300 hover:text-white transition-colors">
                About
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-white mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
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
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-700 mt-8 pt-6 text-center">
        <div className="text-sm text-slate-400">
          &copy; EquityTake
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
