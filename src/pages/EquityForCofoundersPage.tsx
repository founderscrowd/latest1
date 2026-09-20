import React from 'react';
import { Link } from 'react-router-dom';
import MarketingPage from '../components/MarketingPage';

interface EquityForCofoundersPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const EquityForCofoundersPage: React.FC<EquityForCofoundersPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Equity for Co-founders"
    metaDescription="Equity for co-founders on EquityTake is about discussing proposed equity inside a group. It is not a stock exchange and not a law firm."
    h1="Equity for co-founders"
  >
    <div className="space-y-6 text-slate-700">
      <p className="leading-relaxed">
        This product is for discussing proposed co-founder equity inside a group. It is not a stock exchange and not a law firm.
      </p>
      <p className="leading-relaxed">
        When you see equity percentages on a group, they are starting points for a conversation. The group talks through who is doing what, when they joined, and what they are putting in — then decides together what feels fair.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/startup-equity-split"
          className="inline-block px-5 py-2.5 text-sm font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-center"
        >
          Read about equity splits
        </Link>
        <Link
          to="/how-it-works"
          className="inline-block px-5 py-2.5 text-sm font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-center"
        >
          How it works
        </Link>
      </div>
    </div>
  </MarketingPage>
);

export default EquityForCofoundersPage;
