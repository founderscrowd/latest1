import React from 'react';
import { Link } from 'react-router-dom';
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
      <div className="border-t border-slate-200 pt-5 mt-2">
        <p className="text-sm text-slate-500 mb-2 font-medium">Related reading</p>
        <div className="flex flex-col gap-1.5">
          <Link to="/blog/startup-groups-that-actually-help-you-build" className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium">
            What useful startup groups look like →
          </Link>
          <Link to="/blog/how-to-join-a-startup-group-without-wasting-months" className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium">
            Join playbook so you don't waste months →
          </Link>
        </div>
      </div>
    </div>
  </MarketingPage>
);

export default StartupGroupsPage;
