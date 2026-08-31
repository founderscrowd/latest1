import React from 'react';
import { ArrowLeft, Lightbulb, Target, Users, MessageCircle, Rocket, DollarSign } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface HowItWorksPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
}

const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onBack, siteLogoUrl }) => {
  const canonicalUrl = `${window.location.origin}/how-it-works`;
  const description = 'Discover how EquityTake works. Learn how to create startup groups, find co-founders, claim equity, and build your venture from idea to reality.';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>How It Works | EquityTake</title>
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
                  "text": "EquityTake is a platform that connects aspiring entrepreneurs with co-founders to build startups together. You can create startup groups, offer equity to team members, and find people with complementary skills to bring your idea to life."
                }
              },
              {
                "@type": "Question",
                "name": "How does equity work on EquityTake?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "When you create a startup group, you set a funding goal and decide how much equity to offer to co-founders. The equity pool is the percentage of your startup available to team members. When someone claims equity, they commit to contributing value through skills, funding, or services."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need to pay to join EquityTake?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "You can browse and join existing startup groups for free. Creating a new startup group requires an active subscription. New users can explore the platform and join teams without any cost."
                }
              },
              {
                "@type": "Question",
                "name": "How many co-founders can I have in a group?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Your startup group can range from 2 to 1,000 members. You decide how many co-founders you want on your team when you create the group."
                }
              },
              {
                "@type": "Question",
                "name": "What happens after my group is complete?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Once your group is complete, your team can move into incorporation and fundraising to officially launch your startup. EquityTake is the starting point where ideas meet people and the journey to building something real begins."
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Your journey from idea to startup begins here. Whether you're starting a new venture or joining an existing team, EquityTake makes it simple.
          </p>
        </div>

        <div className="space-y-12">
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
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Post Your Idea</h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Start by creating a startup group.
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    Share your vision, your goals, and the type of cofounders you're looking for — whether that's developers, designers, marketers, or anyone ready to help bring your idea to life.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Set Equity and Goals</h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Decide how much equity you'd like to offer to new cofounders, how many people you want on your team, and the funding goals you hope to reach once your group is complete.
                  </p>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Your startup group can be small and focused or open to many contributors — anywhere from 2 to 1,000 members.
                  </p>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    Remember: the more equity you share, the more partners you'll have to help make it real.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">💰 Equity in Simple Terms</h2>
            </div>

            <p className="text-slate-700 leading-relaxed mb-6">
              When you set a funding goal, you're defining the total value of your startup at this early stage.
            </p>

            <div className="bg-white rounded-lg p-6 mb-6 border border-green-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Example:</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[140px]">Funding goal:</span>
                  <span>$100,000</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[140px]">Equity offered:</span>
                  <span>60%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[140px]">Your base valuation:</span>
                  <span>$40,000 (the value you keep)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[140px]">Equity pool:</span>
                  <span>$60,000 available to cofounders</span>
                </li>
              </ul>
            </div>

            <p className="text-slate-700 leading-relaxed mb-4">
              If someone claims 10% equity, they're effectively committing $10,000 worth of contribution — whether through funding, skills, or services.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-900 text-sm leading-relaxed">
                <strong>Note:</strong> Potential cofounders may ask for evidence of your assets, skills, or contributions included in your equity claim.
              </p>
            </div>

            <p className="text-slate-700 leading-relaxed font-medium">
              Even if you don't have much to offer as a Starter, you can still claim a fair amount of equity and be part of a project you're passionate about.
            </p>
          </section>

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
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Join Existing Groups</h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Browse through ideas and find a project that resonates with you — then join in!
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    Claim the equity offered, contribute your skills, and help the team where you can. Whether you're a developer, designer, strategist, or dreamer — your talent and energy can help shape the next big thing.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Find Your Team</h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Connect with people who share your mission.
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    Use our built-in group chat and community forums to communicate, share progress, and keep everyone aligned as your group grows.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Build and Move Forward</h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Once your group is complete, our mission on Equitytake is fulfilled.
                  </p>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    From there, your team can move into incorporation and fundraising to officially launch your startup.
                  </p>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    Equitytake is the starting point — where ideas meet people and the journey to building something real begins.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-8 text-white">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                <Rocket size={32} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Ready to Launch?</h2>
              <p className="text-lg mb-6 text-white/90">
                Whether you're a visionary founder or a talented builder looking for purpose, EquityTake is your launchpad.
              </p>
              <button
                onClick={onBack}
                className="px-8 py-3 bg-white text-orange-600 rounded-lg font-bold hover:bg-slate-100 transition-colors"
              >
                Get Started Now
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
