import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface StartupTeamBuildingPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const StartupTeamBuildingPage: React.FC<StartupTeamBuildingPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Startup Team Building"
    metaDescription="Build a startup team on EquityTake. Start or join a group, meet people around one idea, agree roles, talk in chat, discuss equity, then take legal steps outside EquityTake if the team is real."
    h1="Startup team building"
  >
    <div className="space-y-6 text-slate-700">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Team building on EquityTake means</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">1</span>
            <span>Start or join a group</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">2</span>
            <span>Meet people around one idea</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">3</span>
            <span>Agree roles</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">4</span>
            <span>Talk in chat</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">5</span>
            <span>Discuss equity</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">6</span>
            <span>Take legal and company steps outside EquityTake if the team is real</span>
          </li>
        </ol>
      </div>
      <p className="leading-relaxed">
        EquityTake is where the team comes together and the conversation starts. Formal incorporation, share issuance, and contracts happen off-platform, with professional advice.
      </p>
    </div>
  </MarketingPage>
);

export default StartupTeamBuildingPage;
