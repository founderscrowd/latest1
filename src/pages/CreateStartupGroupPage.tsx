import React from 'react';
import MarketingPage from '../components/MarketingPage';

interface CreateStartupGroupPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
  onCreateGroup: () => void;
}

const CreateStartupGroupPage: React.FC<CreateStartupGroupPageProps> = ({ onBack, siteLogoUrl, onCreateGroup }) => (
  <MarketingPage
    onBack={onBack}
    siteLogoUrl={siteLogoUrl}
    onCreateGroup={onCreateGroup}
    title="Create a Startup Group"
    metaDescription="Create a startup group on EquityTake. Name your idea, describe the problem, say which co-founders you need, and propose equity to discuss. Creating a group is not creating a company."
    h1="Create a startup group"
    secondaryCtaTo="/"
    secondaryCtaLabel="Browse groups"
  >
    <div className="space-y-6 text-slate-700">
      <p className="leading-relaxed">
        Creating a group is not creating a company. It is the first step in finding people who want to build the same idea as you.
      </p>
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">What you fill in when you create a group</h2>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">1</span>
            <span><strong>Name the idea</strong> — give your group a short, clear name.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">2</span>
            <span><strong>Describe the problem</strong> — what are you trying to solve and for whom?</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">3</span>
            <span><strong>Say which co-founders you need</strong> — developers, designers, marketers, domain experts.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">4</span>
            <span><strong>Propose team size</strong> — how many people do you want in the early group?</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">5</span>
            <span><strong>Propose equity to discuss</strong> — share a starting split. This is a proposal for the group to talk about, not a legal issuance of shares.</span>
          </li>
        </ol>
      </div>
      <p className="leading-relaxed">
        Once your group exists, people can find it, join it, and start talking with you in group chat.
      </p>
    </div>
  </MarketingPage>
);

export default CreateStartupGroupPage;
