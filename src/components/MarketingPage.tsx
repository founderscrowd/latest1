import React from 'react';
import { ArrowLeft, Rocket, Search, Users } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

interface MarketingPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
  title: string;
  metaDescription: string;
  h1: string;
  children: React.ReactNode;
  secondaryCtaTo?: string;
  secondaryCtaLabel?: string;
}

const footerLinks = [
  { to: '/startup-groups', label: 'Startup groups' },
  { to: '/create-startup-group', label: 'Create a startup group' },
  { to: '/cofounder-matching', label: 'Co-founder matching' },
  { to: '/', label: 'Browse groups' },
  { to: '/equity-for-cofounders', label: 'Equity for co-founders' },
  { to: '/startup-equity-split', label: 'Startup equity split' },
  { to: '/startup-team-building', label: 'Startup team building' },
  { to: '/how-it-works', label: 'How it works' },
];

const MarketingPage: React.FC<MarketingPageProps> = ({
  onBack,
  siteLogoUrl,
  onCreateGroup,
  title,
  metaDescription,
  h1,
  children,
  secondaryCtaTo,
  secondaryCtaLabel,
}) => {
  const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{title} | EquityTake</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${title} | EquityTake`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {siteLogoUrl && <meta property="og:image" content={siteLogoUrl} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${title} | EquityTake`} />
        <meta name="twitter:description" content={metaDescription} />
        {siteLogoUrl && <meta name="twitter:image" content={siteLogoUrl} />}
      </Helmet>

      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          {siteLogoUrl && (
            <img
              src={siteLogoUrl}
              alt="Site Logo"
              className="h-12 max-w-[200px] object-contain"
            />
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          {h1}
        </h1>
        <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-8">
          EquityTake is a startup group and co-founder matching platform. Create a startup group around your idea, find potential co-founders, build your team, and discuss proposed equity allocations within the group.
        </p>

        {children}

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={onCreateGroup}
            className="px-6 py-3 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-red-600 hover:-translate-y-0.5 transition-all"
          >
            Create a startup group
          </button>
          <Link
            to={secondaryCtaTo ?? "/"}
            className="px-6 py-3 text-sm font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 hover:-translate-y-0.5 transition-all"
          >
            {secondaryCtaLabel ?? "Browse groups"}
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/how-it-works"
            className="text-sm text-slate-500 hover:text-slate-800 underline underline-offset-4 transition-colors"
          >
            See how it works
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 bg-amber-50 border border-amber-200 rounded-lg p-5">
          <p className="text-amber-900 text-sm leading-relaxed">
            Numbers and percentages on a group are proposals for discussion. EquityTake does not issue shares, collect investment, or incorporate companies. If anyone asks for funds, shares, or formal incorporation, get independent legal advice first.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-slate-300 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-700 mt-8 pt-6 text-center text-sm text-slate-400">
            &copy; 2025 EquityTake. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingPage;
