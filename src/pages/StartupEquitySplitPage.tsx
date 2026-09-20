import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface StartupEquitySplitPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const StartupEquitySplitPage: React.FC<StartupEquitySplitPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Startup Equity Split"
    metaDescription="Talk through startup equity splits on EquityTake. Discuss who is doing what, when they joined, and what they are contributing. Everything is a discussion proposal, not a final cap table."
    h1="Startup equity split"
  >
    <div className="space-y-6 text-slate-700">
      <p className="leading-relaxed">
        A startup equity split is one of the hardest early conversations. EquityTake gives your group a place to have it — out in the open, with the people who are actually going to build the thing.
      </p>
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">What to talk about in a split discussion</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-1">•</span>
            <span><strong>Who is doing what</strong> — roles, responsibilities, and time commitment.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-1">•</span>
            <span><strong>When they joined</strong> — early members often carry more risk.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-1">•</span>
            <span><strong>What they are putting in</strong> — skills, capital, network, or sweat equity.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-1">•</span>
            <span><strong>What happens if someone leaves</strong> — vesting and cliff concepts to discuss.</span>
          </li>
        </ul>
      </div>
      <p className="leading-relaxed font-medium">
        Everything on EquityTake is labelled as a discussion proposal, not a final cap table.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <p className="text-amber-900 text-sm leading-relaxed">
          <strong>No tax, securities, or legal advice.</strong> EquityTake does not provide legal, tax, or investment advice. If you are formalising a split, get independent legal advice first.
        </p>
      </div>
    </div>
  </MarketingPage>
);

export default StartupEquitySplitPage;
