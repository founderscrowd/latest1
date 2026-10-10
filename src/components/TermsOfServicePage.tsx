import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface TermsOfServicePageProps {
  onBack: () => void;
  siteLogoUrl?: string | null;
}

const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack, siteLogoUrl }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Terms of Service | EquityTake</title>
        <meta name="description" content="Rules for using EquityTake — a free discussion site. No money, no shares, no documents." />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${window.location.origin}/terms/`} />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
              <p className="text-slate-500 text-sm">Rules for a free discussion site. No money, no shares, no documents.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl p-8 sm:p-10 shadow-sm border border-slate-200">
          {/* Last Updated */}
          <p className="text-xs text-slate-400 mb-8">
            Last updated: October 4, 2026
          </p>

          {/* Intro */}
          <p className="text-slate-700 leading-relaxed mb-10 text-[15px]">
            EquityTake is a free place to form groups around an idea and talk about who might do what. A number on a group is a discussion note. It is not a share, a payment, or a contract.
          </p>

          {/* Sections */}
          <div className="space-y-10">

            {/* 1 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">1. What this site is not</h2>
              <p className="text-sm text-slate-500 mb-4">EquityTake does not handle money, shares, or legal documents.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>EquityTake does not collect money. There is no checkout, no investment, and no wallet. We do not ask for bank details.</p>
                <p>EquityTake does not issue shares, options, or ownership. A percentage on a group is a proposed interest only. Clicking &ldquo;Register interest&rdquo; records that you would like to talk. It does not give you equity.</p>
                <p>EquityTake does not create or collect legal documents. We do not incorporate companies, hold a cap table, or sign agreements for you.</p>
                <p>We are not a broker, crowdfunding platform, exchange, or law firm. Nothing on the site is an offer of securities or legal, tax, or investment advice.</p>
              </div>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">2. Using the site</h2>
              <p className="text-sm text-slate-500 mb-4">Who can use it, and what you agree to.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>You must be 18 or older. You agree to these terms by using the site. If you do not agree, do not use it.</p>
                <p>Accounts are for real people. Keep your login to yourself. You are responsible for what you post.</p>
                <p>We may change these terms. The date at the top will change. If you keep using the site after that, you accept the new terms.</p>
              </div>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">3. Groups and numbers</h2>
              <p className="text-sm text-slate-500 mb-4">What a percentage on a group means — and what it does not.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>A group creator may show a proposed split and a proposed company value. Those figures are a shared reference for conversation. They are not a valuation, a price, or an amount anyone has to pay.</p>
                <p>Joining a group, posting in it, or registering interest creates no partnership, employment, or ownership. Any real company, share issue, or payment happens off EquityTake, with the group&rsquo;s own advisers.</p>
                <p>Group admins may decline a join request or remove a member from the conversation. Removal deletes a discussion note. It does not forfeit property, because the site never held any.</p>
              </div>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">4. What you must not do</h2>
              <p className="text-sm text-slate-500 mb-4">Rules that keep the site a discussion space, not a marketplace.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>Do not ask anyone on EquityTake for money, bank details, crypto, or a signed document.</p>
                <p>Do not describe a group as an investment, a share offer, or a crowdfunding round.</p>
                <p>Do not post land, property, or other pooled-money schemes that invite people to pay in.</p>
                <p>Do not impersonate anyone, scrape the site, or abuse other members.</p>
                <p>We may remove a group or account that breaks these rules.</p>
              </div>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">5. Your content</h2>
              <p className="text-sm text-slate-500 mb-4">Who owns what you post, and who is responsible for it.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>You keep ownership of what you post. You give EquityTake permission to display it on the site while your account and the group exist.</p>
                <p>You are responsible for your posts. We do not check that a group idea is real, lawful, or worth joining.</p>
              </div>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">6. The site is provided as is</h2>
              <p className="text-sm text-slate-500 mb-4">No guarantees about availability, outcomes, or deals made off-site.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>The site may be unavailable, and we may change or close a feature. We do not promise that a group will become a company, or that a discussion note will become equity.</p>
                <p>To the extent the law allows, EquityTake is not liable for what members say, for a group that goes nowhere, or for deals members make off the site. Nothing in these terms limits liability that the law says cannot be limited.</p>
              </div>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">7. Closing an account</h2>
              <p className="text-sm text-slate-500 mb-4">You can leave at any time, and we can suspend accounts that break the rules.</p>
              <div className="space-y-4 text-[15px] text-slate-700 leading-relaxed">
                <p>You may stop using the site at any time. We may suspend an account that breaks these terms or puts other people at risk. Closing an account removes access to the conversation. It does not refund money, because no money was taken.</p>
              </div>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">8. Contact</h2>
              <p className="text-sm text-slate-500 mb-4">Where to send questions about these terms.</p>
              <div className="text-[15px] text-slate-700 leading-relaxed">
                <p>Questions about these terms: <a href="mailto:admin@groupsandcrowds.com" className="text-slate-900 font-medium underline hover:text-slate-700 transition-colors">admin@groupsandcrowds.com</a></p>
              </div>
            </section>

          </div>

          {/* Draft note */}
          <div className="border-t border-slate-100 mt-10 pt-6">
            <p className="text-xs text-slate-400 italic">
              Draft for review by a qualified solicitor before publication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
