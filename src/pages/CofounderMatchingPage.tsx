import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface CofounderMatchingPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const CofounderMatchingPage: React.FC<CofounderMatchingPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Co-founder Matching"
    metaDescription="Co-founder matching on EquityTake happens through groups. Join or start a group around an idea and see who wants to build that idea with you."
    h1="Co-founder matching"
  >
    <div className="space-y-6 text-slate-700">
      <p className="leading-relaxed">
        Matching happens through groups. You do not swipe in the abstract. You join or start a group around an idea and see who wants to build that idea with you.
      </p>
      <p className="leading-relaxed">
        This means every match starts with shared context — the same idea, the same group chat, the same proposed equity discussion. You are not matching with a profile picture alone. You are matching with people who chose the same problem.
      </p>
    </div>
  </MarketingPage>
);

export default CofounderMatchingPage;
