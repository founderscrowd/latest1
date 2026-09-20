import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface FindACofounderPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const FindACofounderPage: React.FC<FindACofounderPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Find a Co-founder"
    metaDescription="Find a co-founder on EquityTake. Browse groups, join one that fits, talk in group chat, see whether skills and working style match, then discuss proposed equity."
    h1="Find a co-founder"
    secondaryCtaTo="/"
    secondaryCtaLabel="Browse groups"
  >
    <div className="space-y-6 text-slate-700">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">How to find a co-founder</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600 text-sm">1</span>
            <span><strong>Browse groups</strong> — look at the ideas people are building.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600 text-sm">2</span>
            <span><strong>Join one that fits</strong> — pick a group whose idea you want to help build.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600 text-sm">3</span>
            <span><strong>Talk in group chat</strong> — see whether you actually want to work together.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600 text-sm">4</span>
            <span><strong>See whether skills and working style match</strong> — before committing to anything.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600 text-sm">5</span>
            <span><strong>Discuss proposed equity</strong> — talk through allocations, roles, and contributions inside the group.</span>
          </li>
        </ol>
      </div>
    </div>
  </MarketingPage>
);

export default FindACofounderPage;
