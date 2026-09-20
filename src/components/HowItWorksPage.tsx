import React from 'react';
import { ArrowLeft, Lightbulb, Users, MessageCircle, Rocket, DollarSign, MessageSquare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface HowItWorksPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
}

const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onBack, siteLogoUrl }) => {
  const canonicalUrl = `${window.location.origin}/how-it-works`;
  const description = 'EquityTake is a startup group and co-founder matching platform. Create a group around your idea, find potential co-founders, build a team, and discuss proposed equity allocations inside the group.';

  const bottomLinks = [
    { href: '/startup-groups', label: 'Startup Groups' },
    { href: '/cofounder-matching', label: 'Co-founder Matching' },
    { href: '/create-startup-group', label: 'Create a Startup Group' },
    { href: '/find-a-cofounder', label: 'Find a Co-founder' },
    { href: '/equity-for-cofounders', label: 'Equity for Co-founders' },
    { href: '/startup-equity-split', label: 'Startup Equity Split' },
    { href: '/startup-team-building', label: 'Startup Team Building' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>How EquityTake Works | Startup Groups & Co-founder Matching</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content="How EquityTake Works" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {siteLogoUrl && <meta property="og:image" content={siteLogoUrl} />}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="How EquityTake Works" />
        <meta name="twitter:description" content={description} />
        {siteLogoUrl && <meta name="twitter:image" content={siteLogoUrl} />}

        {/* FAQ structured data for rich snippets */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is EquityTake?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "EquityTake is a startup group and co-founder matching platform. You can create a group around your idea, find potential co-founders, build a team, and discuss proposed equity allocations inside the group."
                }
              },
              {
                "@type": "Question",
                "name": "How does equity work on EquityTake?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Numbers you see on a group — equity percentage, funding target, team size — are discussion starters for that group. A proposal is not a signed cap table, not a share certificate, and not investment advice. If anyone asks for money, shares, or formal incorporation, get independent legal advice first."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need to pay to use EquityTake?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "EquityTake is free to use. You can create an account, browse groups, create your own group, join groups, and connect with co-founders without paying anything."
                }
              },
              {
                "@type": "Question",
                "name": "Does EquityTake issue shares or hold company assets?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No. EquityTake does not issue shares, hold company assets, or facilitate investment. Equity numbers on the platform are proposals for discussion inside a group — not a legal issuance of shares."
                }
              }
            ]
          })}
        </script>
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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4">
            <span className="text-3xl">⚙️</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">How EquityTake works</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            EquityTake is a startup group and co-founder matching platform. Create a group around your idea, find potential co-founders, build a team, and discuss proposed equity allocations inside the group.
          </p>
        </div>

        <div className="space-y-12">
          {/* For Starters */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Lightbulb size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">For Starters</h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Create a startup group</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Create a group around your idea. Describe the problem, the kind of co-founders you want, and what you are trying to build.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Propose equity and team size</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Share a proposed equity split and how big you want the early team to be. These are proposals for discussion inside the group — not a legal issuance of shares.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Equity in Plain Language */}
          <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Proposed equity — in plain language</h2>
            </div>

            <p className="text-slate-700 leading-relaxed mb-4">
              On EquityTake, numbers you see on a group (equity %, funding target, team size) are discussion starters for that group.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              A proposal is not a signed cap table, not a share certificate, and not investment advice.
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              If anyone asks for money, shares, or formal incorporation, get independent legal advice first.
            </p>

            <div className="bg-white rounded-lg p-6 mb-6 border border-green-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Example discussion (not a legal split):</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[180px]">Founder who started the group:</span>
                  <span>proposes keeping a majority while the idea is unproven</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[180px]">Incoming builder:</span>
                  <span>proposes a % tied to a defined role</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[180px]">Group:</span>
                  <span>talks it through before anyone agrees</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-900 text-sm leading-relaxed">
                <strong>Note:</strong> Potential co-founders may ask for evidence of your skills or contributions included in your equity claim.
              </p>
            </div>
          </section>

          {/* For Joiners */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">For Joiners</h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Browse groups</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Find a group whose idea you want to help build.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Join and talk</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Use group chat to see whether you actually want to work together.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Discuss equity in the group</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Talk through proposed allocations, roles, and contributions before anyone treats numbers as final.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-8 text-white">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                <Rocket size={32} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Create a group or find co-founders</h2>
              <p className="text-lg mb-6 text-white/90 max-w-xl mx-auto">
                Start a startup group, match with people, and discuss equity allocations together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <button
                  onClick={onBack}
                  className="px-8 py-3 bg-white text-orange-600 rounded-lg font-bold hover:bg-slate-100 transition-colors"
                >
                  Create a startup group
                </button>
                <button
                  onClick={onBack}
                  className="text-white underline underline-offset-4 hover:text-white/80 transition-colors text-sm font-medium"
                >
                  Find a co-founder
                </button>
              </div>
            </div>
          </section>

          {/* SEO link row */}
          <nav className="pt-4 pb-2" aria-label="Related pages">
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-slate-500">
              {bottomLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="hover:text-slate-800 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
