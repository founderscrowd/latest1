import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface CommunitiesAndCooperativesPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const CommunitiesAndCooperativesPage: React.FC<CommunitiesAndCooperativesPageProps> = ({
  onBack,
  siteLogoUrl,
  onCreateGroup,
}) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Communities and Cooperatives"
    metaDescription="The same group format on EquityTake works for communities, cooperatives, and non-profit projects. Create a group, invite people, and discuss how the group should work."
    h1="Communities and cooperatives"
    secondaryCtaTo="/"
    secondaryCtaLabel="Browse groups"
  >
    <div className="space-y-6 text-slate-700">
      <p className="leading-relaxed">
        EquityTake is a startup group and co-founder matching platform. The same group format also works if you are starting a community, a cooperative, or a non-profit project: someone begins with an idea, creates a group, invites people, and discusses how the group should work — including whether it is for-profit, non-profit, or a cooperative.
      </p>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Same process</h2>
        <p className="leading-relaxed">
          Create a group around an idea or project. Find people who want to build it. Talk inside the group.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Profit, non-profit, or cooperative — as a discussion</h2>
        <p className="leading-relaxed">
          The group can say it wants to be a business, a community project, or a cooperative. That label is a proposal for the group to discuss. EquityTake does not register charities, cooperatives, or companies.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">What you can talk about in the group</h2>
        <p className="leading-relaxed">
          Purpose, who can join, how decisions are made, how work is shared, and any proposed ownership or contribution rules.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">What this site does not do</h2>
        <p className="leading-relaxed">
          No money or assets are collected here. Creating a group is not incorporation and not charity registration. If anyone asks for funds, shares, or formal legal status, get independent legal advice first.
        </p>
      </div>
    </div>
  </MarketingPage>
);

export default CommunitiesAndCooperativesPage;
