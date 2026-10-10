import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Users, Scale, MessageCircle, Rocket, Building2, ShieldCheck, HelpCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface HowItWorksPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
}

const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onBack, siteLogoUrl }) => {
  const canonicalUrl = `${window.location.origin}/how-it-works/`;
  const title = 'How EquityTake Works | Idea to Team to Startup';
  const description =
    'See how EquityTake turns an idea into a founding team: create a group, discuss contributions, and propose equity using Proposed Company Value and Reference Value. Free to use.';

  const faqs = [
    {
      q: 'What is Proposed Company Value?',
      a: 'The value the group creator assigns to 100% of the business. It is a reference for equity talks, not a professional valuation.',
    },
    {
      q: 'How is Reference Value calculated?',
      a: 'Proposed Company Value multiplied by the equity percentage. A $20,000 Proposed Company Value and 5% equity is a $1,000 Reference Value.',
    },
    {
      q: 'Does a Skills / Tasks claim mean cash was invested?',
      a: 'No. Reference Value is only the reference attached to that proposed equity. It is not cash invested.',
    },
    {
      q: 'Does EquityTake issue shares?',
      a: 'No. Claims and allocations on EquityTake are proposed. They do not issue shares, transfer ownership, or create a binding agreement by themselves.',
    },
    {
      q: 'Is EquityTake free?',
      a: 'Yes. Sign-in is the only gate. Create a group or browse groups after you sign in.',
    },
  ];

  const bottomLinks = [
    { href: '/startup-groups/', label: 'Startup Groups' },
    { href: '/cofounder-matching/', label: 'Co-founder Matching' },
    { href: '/create-startup-group/', label: 'Create a Startup Group' },
    { href: '/find-a-cofounder/', label: 'Find a Co-founder' },
    { href: '/equity-for-cofounders/', label: 'Equity for Co-founders' },
    { href: '/startup-equity-split/', label: 'Startup Equity Split' },
    { href: '/startup-team-building/', label: 'Startup Team Building' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:title" content="How EquityTake Works" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {siteLogoUrl && <meta property="og:image" content={siteLogoUrl} />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="How EquityTake Works" />
        <meta name="twitter:description" content={description} />
        {siteLogoUrl && <meta name="twitter:image" content={siteLogoUrl} />}

        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
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
            <img src={siteLogoUrl} alt="Site Logo" className="h-12 max-w-[200px] object-contain" />
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4">
            <Lightbulb size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">How EquityTake Works</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            From Idea to Team to Startup. Great businesses often start with an idea. An idea still
            needs the right people around it before it becomes something real.
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-900">
            Idea &rarr; Group &rarr; Contributions &rarr; Proposed Equity &rarr; Team &rarr; Startup
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link
              to="/create-startup-group/"
              className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Create a group
            </Link>
            <Link
              to="/groups/"
              className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Browse startup groups
            </Link>
          </div>
        </div>

        <div className="space-y-10">
          {/* Step 1 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Lightbulb size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">1. Start With an Idea</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Have an idea for a business, project or startup? Create a group and explain what you
                want to build.
              </p>
              <p>
                It does not need to be fully developed. The group is where interested people explore
                the opportunity, ask questions and help shape it.
              </p>
              <p className="font-semibold text-slate-900">When you create a group, you can set:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>what the business or project is about</li>
                <li>the type of people you are looking for</li>
                <li>the maximum number of co-founders</li>
                <li>the <strong>Proposed Company Value</strong></li>
                <li>how much equity is available</li>
                <li>whether the business is pre-incorporation or already incorporated</li>
              </ul>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-2">What is Proposed Company Value?</h3>
              <p className="text-slate-700 leading-relaxed mb-3">
                <strong>Proposed Company Value is the value the group creator assigns to 100% of the business.</strong>
              </p>
              <p className="text-slate-700 leading-relaxed mb-3">
                It is a shared reference for discussing proposed equity. It is not an independent or
                professional valuation.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Example: Proposed Company Value of $100,000. A proposed 5% equity allocation has a{' '}
                <strong>$5,000 Reference Value</strong>.
              </p>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              Step-by-step:{' '}
              <Link to="/blog/create-a-startup-group-around-your-idea/" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                create a startup group around your idea
              </Link>
              .
            </p>
          </section>

          {/* Step 2 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">2. Build a Group Around the Idea</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Once the group is published, other people can discover it and learn what you are
                trying to build.
              </p>
              <p>
                EquityTake brings people together <strong>around the idea</strong>, not by matching
                profiles.
              </p>
              <p>
                Potential co-founders can explore the opportunity, join the discussion and decide
                whether their experience, skills, resources or capital fit. Everyone can evaluate{' '}
                <strong>the idea and the people</strong> before committing.
              </p>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              <Link to="/blog/startup-groups-that-actually-help-you-build/" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                What useful startup groups look like
              </Link>
              {' \u00b7 '}
              <Link to="/blog/how-to-join-a-startup-group-without-wasting-months/" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                How to join without wasting months
              </Link>
            </p>
          </section>

          {/* Step 3 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Scale size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">3. Decide What You Can Contribute</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>Different people bring different things.</p>
              <p>
                <strong>Cash</strong> is money someone is prepared to put toward building the business.
              </p>
              <p>
                <strong>Skills / Tasks</strong> is work, expertise, time or specific responsibilities they
                are prepared to take on.
              </p>
              <p>
                A group might include the person with the original idea, a developer who can build the
                product, a marketer who can acquire customers, and someone prepared to contribute
                capital. The aim is a team whose contributions complement each other.
              </p>
            </div>
          </section>

          {/* Step 4 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <MessageCircle size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">4. Apply for Equity</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>If someone wants to join, they can submit an equity application. The application shows:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>the percentage of equity requested</li>
                <li>whether the contribution is <strong>Cash</strong> or <strong>Skills / Tasks</strong></li>
                <li>what the person proposes to contribute</li>
                <li>the corresponding <strong>Reference Value</strong></li>
              </ul>
            </div>

            <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-2">How Reference Value works</h3>
              <p className="text-slate-700 leading-relaxed mb-3">
                <strong>Reference Value = Proposed Company Value &times; equity percentage</strong>
              </p>
              <p className="text-slate-700 leading-relaxed mb-3">
                Example: Proposed Company Value $20,000, proposed equity 5%, Reference Value $1,000.
              </p>
              <p className="text-slate-700 leading-relaxed">
                If the contribution is Cash, that figure is a basis for discussing the proposed cash
                amount. If it is Skills / Tasks, it does <strong>not</strong> mean that cash was
                invested. It is the reference value of the proposed equity allocation.
              </p>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              More on the conversation:{' '}
              <Link to="/blog/how-to-split-startup-equity-fairly/" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                how to split startup equity fairly
              </Link>
              .
            </p>
          </section>

          {/* Step 5 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">5. Review, Discuss and Agree</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                An equity application is not accepted automatically. Applications stay{' '}
                <strong>Pending</strong> while the group administrator and members consider them.
              </p>
              <p>
                The group can discuss the contribution, role, skills, responsibilities, time, any
                cash, and the equity percentage requested.
              </p>
              <p>
                If the application is approved, that proposed equity is allocated to the member and removed
                from the equity still available. The group can see how the potential founding team is
                taking shape.
              </p>
            </div>
          </section>

          {/* Step 6 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">6. Build the Team</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                As people join and proposed equity is allocated, an idea can become a structured
                founding team.
              </p>
              <p>The equity picture is:</p>
              <p className="font-semibold text-slate-900 text-center text-lg py-2">
                Founder equity + approved proposed allocations + available equity
              </p>
              <p>
                Members can see who is involved, what has been proposed, and how much equity is left
                for more co-founders.
              </p>
              <p>
                Full allocation can mean a potential founding team has formed. It does not mean a
                company has been incorporated, or that legal shares have been issued.
              </p>
            </div>
          </section>

          {/* Step 7 */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">7. Take the Startup Forward</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                EquityTake covers the stage between &ldquo;I have an idea&rdquo; and &ldquo;we have a
                team that can build it.&rdquo;
              </p>
              <p>
                When a team is ready, the next steps are theirs: build the product, validate the
                business, prepare founder agreements, incorporate, raise finance, or get professional
                legal and financial advice. Teams can work together outside EquityTake as the
                relationship develops.
              </p>
            </div>
          </section>

          {/* Pre-incorporation & Incorporated */}
          <section className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Pre-incorporation and incorporated groups
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                <strong>Pre-incorporation.</strong> The business is not yet a company. Equity on
                EquityTake is a <strong>proposed, informal arrangement</strong>. It does not create
                legal shares or ownership.
              </p>
              <p>
                <strong>Incorporated.</strong> The business already exists. Equity on EquityTake is
                still a <strong>proposed allocation</strong> until the company has properly agreed and
                legally implemented it.
              </p>
            </div>
          </section>

          {/* Does not sell shares */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">EquityTake does not sell shares</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              EquityTake is a place to discover ideas, form groups, discuss contributions and explore
              potential equity arrangements.
            </p>
            <p className="text-slate-700 leading-relaxed">
              <strong>
                EquityTake does not issue shares, transfer legal ownership, hold investment funds, or
                automatically create legally binding equity agreements.
              </strong>
            </p>
            <p className="text-slate-700 leading-relaxed mt-4">
              Proposed Company Value, Reference Value and equity applications are discussion tools. Before
              formalising ownership, investment or company arrangements, get independent legal,
              financial and tax advice.
            </p>
          </section>

          {/* Build something together */}
          <section className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-8 text-white">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                <Rocket size={32} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Build something together</h2>
              <p className="text-lg mb-4 text-white/90 max-w-xl mx-auto leading-relaxed">
                You do not need every skill, every connection or all the capital yourself. Start with
                the idea. Create the group. Bring the right people around it. Decide what everyone can
                contribute. Work out the proposed equity together. Build the team. Then build the
                business.
              </p>
              <p className="font-semibold mb-6">
                Idea &rarr; Group &rarr; Contributions &rarr; Proposed Equity &rarr; Team &rarr; Startup
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Link
                  to="/create-startup-group/"
                  className="px-8 py-3 bg-white text-orange-600 rounded-lg font-bold hover:bg-slate-100 transition-colors"
                >
                  Create a group
                </Link>
                <Link
                  to="/groups/"
                  className="px-8 py-3 bg-white/10 text-white border border-white/30 rounded-lg font-bold hover:bg-white/20 transition-colors"
                >
                  Explore active groups
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                <HelpCircle size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">FAQ</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.q} className="bg-slate-50 rounded-lg p-5 border border-slate-200 group">
                  <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-900 list-none">
                    {faq.q}
                    <HelpCircle size={20} className="text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* SEO link row */}
          <nav className="pt-4 pb-2" aria-label="Related pages">
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-slate-500">
              {bottomLinks.map((link) => (
                <Link key={link.href} to={link.href} className="hover:text-slate-800 transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
