// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';

interface FooterProps {
  siteLogoUrl: string | null;
  user: any;
  userSubscription: any;
  setIsCreateModalOpen: (open: boolean) => void;
  setShowProfile: (show: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  onShowPrivacyPolicy?: () => void;
  onShowTermsOfService?: () => void;
  onShowCookiePolicy?: () => void;
  onOpenCookiePreferences?: () => void;
  onShowBlogAndAbout?: () => void;
  onShowHowItWorks?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  onShowPrivacyPolicy,
  onShowTermsOfService,
  onShowCookiePolicy,
  onOpenCookiePreferences,
  onShowHowItWorks,
}) => (
  <footer className="bg-slate-900 text-white">
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Section */}
        <div className="md:col-span-1">
          <Link to={ROUTES.home} className="block mb-4">
            <span className="text-xl font-semibold text-white">EquityTake</span>
          </Link>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            EquityTake is a startup group and co-founder matching platform. Create a group around your idea, find potential co-founders, and discuss proposed equity allocations within the group.
          </p>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <span>✉️</span>
            <a
              href="mailto:admin@groupsandcrowds.com"
              className="hover:text-white transition-colors"
            >
              admin@groupsandcrowds.com
            </a>
          </div>
        </div>

        {/* Platform Links */}
        <div>
          <h4 className="font-semibold text-white mb-4">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to={ROUTES.home} className="text-slate-300 hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to={ROUTES.startupGroups} className="text-slate-300 hover:text-white transition-colors">
                Startup groups
              </Link>
            </li>
            <li>
              <Link to={ROUTES.communitiesAndCooperatives} className="text-slate-300 hover:text-white transition-colors">
                Communities &amp; cooperatives
              </Link>
            </li>
            <li>
              <Link to={ROUTES.createStartupGroup} className="text-slate-300 hover:text-white transition-colors">
                Create a startup group
              </Link>
            </li>
            <li>
              <Link to={ROUTES.cofounderMatching} className="text-slate-300 hover:text-white transition-colors">
                Co-founder matching
              </Link>
            </li>
            <li>
              <Link to={ROUTES.groups} className="text-slate-300 hover:text-white transition-colors">
                Browse groups
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
                <Link to={ROUTES.howItWorks} className="text-slate-300 hover:text-white transition-colors">
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
              <Link to={ROUTES.equityForCofounders} className="text-slate-300 hover:text-white transition-colors">
                Equity for co-founders
              </Link>
            </li>
            <li>
              <Link to={ROUTES.startupEquitySplit} className="text-slate-300 hover:text-white transition-colors">
                Startup equity split
              </Link>
            </li>
            <li>
              <Link to={ROUTES.startupTeamBuilding} className="text-slate-300 hover:text-white transition-colors">
                Startup team building
              </Link>
            </li>
            <li>
              <Link to={ROUTES.findACofounder} className="text-slate-300 hover:text-white transition-colors">
                Find a co-founder
              </Link>
            </li>
            <li>
              <Link to={ROUTES.blog} className="text-slate-300 hover:text-white transition-colors">
                Blog
              </Link>
            </li>
            <li>
              <Link to={ROUTES.about} className="text-slate-300 hover:text-white transition-colors">
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
              {onShowPrivacyPolicy ? (
                <button
                  onClick={onShowPrivacyPolicy}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              ) : (
                <Link to={ROUTES.privacy} className="text-slate-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              )}
            </li>
            <li>
              {onShowTermsOfService ? (
                <button
                  onClick={onShowTermsOfService}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              ) : (
                <Link to={ROUTES.terms} className="text-slate-300 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              )}
            </li>
            <li>
              {onShowCookiePolicy ? (
                <button
                  onClick={onShowCookiePolicy}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Cookie Policy
                </button>
              ) : (
                <Link to={ROUTES.cookies} className="text-slate-300 hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              )}
            </li>
            <li>
              {onOpenCookiePreferences ? (
                <button
                  onClick={onOpenCookiePreferences}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Cookie Preferences
                </button>
              ) : null}
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
