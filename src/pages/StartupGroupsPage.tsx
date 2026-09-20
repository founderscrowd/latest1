import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface StartupGroupsPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const StartupGroupsPage: React.FC<StartupGroupsPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Startup Groups"
    metaDescription="Browse startup groups on EquityTake. Each group is one idea and one team conversation — create a group, match co-founders, and discuss proposed equity inside the group."
    h1="Startup groups"
    secondaryCtaTo="/"
    secondaryCtaLabel="Browse groups"
  >
    <div className="space-y-6 text-slate-700">
      <p className="leading-relaxed">
        A group is one idea and one team conversation. You create a group, invite or match people, and talk about roles and proposed equity inside that group.
      </p>
      <p className="leading-relaxed">
        Each group has its own chat, its own members, and its own proposed equity numbers. The numbers are there to start a discussion — they are not a signed cap table.
      </p>
    </div>
  </MarketingPage>
);

export default StartupGroupsPage;
