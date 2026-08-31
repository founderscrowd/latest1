import React from 'react';
import { ArrowLeft, AlertTriangle, FileText, Shield, DollarSign, Users, Scale, Info } from 'lucide-react';
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
        <meta name="description" content="EquityTake's Terms of Service - Read our user agreement, usage rules, and legal guidelines for using our platform." />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${window.location.origin}/terms`} />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
              <p className="text-slate-600">Legal terms and conditions for using EquityTake</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          {/* Last Updated */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> January 15, 2025
            </p>
          </div>

          {/* Critical Risk Warning */}
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-3">⚠️ CRITICAL RISK WARNING</h2>
                <div className="space-y-2 text-red-800 font-medium">
                  <p>
                    <strong>YOU ACKNOWLEDGE AND AGREE</strong> that participation in EquityTake involves significant financial risks, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>TOTAL LOSS OF INVESTMENT:</strong> You may lose 100% of any equity contributions without compensation</li>
                    <li><strong>NO REFUND GUARANTEE:</strong> All equity contributions are permanently non-refundable</li>
                    <li><strong>REMOVAL WITHOUT CAUSE:</strong> You can be removed from groups at any time, forfeiting all equity</li>
                    <li><strong>GROUP DISSOLUTION:</strong> Entire groups may be terminated, resulting in complete loss of investments</li>
                  </ul>
                  <p className="font-bold text-lg">
                    BY USING THIS PLATFORM, YOU ACCEPT FULL RESPONSIBILITY FOR THESE RISKS.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <p className="text-slate-700 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your use of the EquityTake platform ("Platform", "Service", "we", "us", or "our") 
              operated by EquityTake. By accessing or using our Platform, you ("User", "you", or "your") agree to be bound by these Terms.
            </p>
            <p className="text-slate-700 leading-relaxed">
              <strong>IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE PLATFORM.</strong> Your continued use of the Platform 
              constitutes acceptance of any modifications to these Terms.
            </p>
          </div>

          {/* Section 1: Risk Acknowledgment */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">1. RISK ACKNOWLEDGMENT AND FINANCIAL WARNINGS</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 mb-3">HIGH-RISK INVESTMENT WARNING</h3>
                <p className="text-red-800 font-medium mb-3">
                  <strong>YOU ACKNOWLEDGE AND AGREE</strong> that equity participation through EquityTake is extremely high-risk and may result in:
                </p>
                <ul className="list-disc list-inside space-y-2 text-red-800 ml-4">
                  <li><strong>COMPLETE FINANCIAL LOSS:</strong> You may lose 100% of any money, time, or resources invested</li>
                  <li><strong>NO GUARANTEED RETURNS:</strong> There is no guarantee of profit, return on investment, or equity value</li>
                  <li><strong>STARTUP FAILURE RISK:</strong> Most startups fail, and you may receive nothing in return for your contributions</li>
                  <li><strong>ILLIQUID INVESTMENTS:</strong> Equity stakes cannot be easily sold or converted to cash</li>
                  <li><strong>DILUTION RISK:</strong> Your equity percentage may be reduced through future funding rounds</li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">REMOVAL AND FORFEITURE RISKS</h3>
                <p className="text-orange-800 font-medium mb-3">
                  <strong>YOU UNDERSTAND AND ACCEPT</strong> that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-orange-800 ml-4">
                  <li><strong>IMMEDIATE REMOVAL:</strong> Group administrators can remove you from groups at any time, for any reason, or no reason</li>
                  <li><strong>EQUITY FORFEITURE:</strong> Upon removal, you forfeit ALL equity claims and contributions without compensation</li>
                  <li><strong>NO APPEAL PROCESS:</strong> Removal decisions are final and not subject to appeal or review</li>
                  <li><strong>NO LEGAL RECOURSE:</strong> You waive the right to pursue legal action for removal or equity loss</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">INVESTMENT SUITABILITY WARNING</h3>
                <p className="text-yellow-800 mb-2">
                  <strong>ONLY INVEST WHAT YOU CAN AFFORD TO LOSE COMPLETELY.</strong> This platform is suitable only for users who:
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 ml-4">
                  <li>Have sufficient financial resources to absorb total loss</li>
                  <li>Understand startup investment risks and equity structures</li>
                  <li>Can make informed decisions about high-risk investments</li>
                  <li>Do not rely on potential returns for essential expenses</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Group Termination and Dissolution */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">2. GROUP TERMINATION AND DISSOLUTION</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 mb-3">TOTAL LOSS SCENARIOS</h3>
                <p className="text-red-800 font-medium mb-3">
                  <strong>YOU ACKNOWLEDGE</strong> that entire groups may be terminated, resulting in complete loss of all investments:
                </p>
                <ul className="list-disc list-inside space-y-2 text-red-800 ml-4">
                  <li><strong>PLATFORM TERMINATION:</strong> We may terminate any group at our sole discretion</li>
                  <li><strong>CREATOR ABANDONMENT:</strong> Group creators may abandon projects, dissolving the group</li>
                  <li><strong>LEGAL ISSUES:</strong> Groups may be terminated due to legal disputes or compliance issues</li>
                  <li><strong>BUSINESS FAILURE:</strong> Startup failure results in worthless equity stakes</li>
                  <li><strong>TECHNICAL ISSUES:</strong> Platform problems may result in data or equity loss</li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">TERMINATION PROCEDURES</h3>
                <p className="text-orange-800 mb-2">When groups are terminated:</p>
                <ul className="list-disc list-inside space-y-1 text-orange-800 ml-4">
                  <li>All user equity claims become immediately void</li>
                  <li>No compensation or refunds will be provided</li>
                  <li>Group data and communications may be permanently deleted</li>
                  <li>Users have no right to group assets or intellectual property</li>
                  <li>Platform bears no responsibility for user losses</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: No Refund Policy */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">3. ABSOLUTE NO REFUND POLICY</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="text-lg font-bold text-red-900 mb-3">🚫 NO REFUNDS UNDER ANY CIRCUMSTANCES</h3>
                <p className="text-red-800 font-bold mb-3">
                  ALL EQUITY CONTRIBUTIONS, INVESTMENTS, AND PAYMENTS ARE FINAL AND NON-REFUNDABLE.
                </p>
                <p className="text-red-800 mb-3">
                  <strong>YOU WILL NOT RECEIVE REFUNDS</strong> in any situation, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-red-800 ml-4">
                  <li><strong>GROUP REMOVAL:</strong> Being removed from groups for any reason</li>
                  <li><strong>GROUP DISSOLUTION:</strong> Complete termination of startup groups</li>
                  <li><strong>PLATFORM CHANGES:</strong> Modifications to platform features or policies</li>
                  <li><strong>BUSINESS FAILURE:</strong> Startup failure or bankruptcy</li>
                  <li><strong>TECHNICAL ISSUES:</strong> Platform downtime, data loss, or system failures</li>
                  <li><strong>LEGAL DISPUTES:</strong> Conflicts with other users or legal complications</li>
                  <li><strong>PERSONAL CIRCUMSTANCES:</strong> Changes in your financial situation or investment goals</li>
                  <li><strong>MARKET CONDITIONS:</strong> Economic downturns or industry changes</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">INVESTMENT FINALITY</h3>
                <p className="text-yellow-800 text-sm">
                  By making any equity contribution or investment through the Platform, you irrevocably waive any right to 
                  refund, reimbursement, or compensation. This waiver applies regardless of the outcome of your investment 
                  or participation in startup groups.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Platform Rights and Authority */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">4. PLATFORM RIGHTS AND AUTHORITY</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Absolute Platform Authority</h3>
                <p className="text-slate-700 mb-3">
                  <strong>WE RESERVE THE ABSOLUTE RIGHT</strong> to take any of the following actions at our sole discretion, 
                  without notice, and without liability:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                  <li><strong>User Removal:</strong> Terminate user accounts and remove access to all groups and equity</li>
                  <li><strong>Group Termination:</strong> Dissolve any group, regardless of member investments or progress</li>
                  <li><strong>Content Moderation:</strong> Remove, modify, or restrict any user-generated content</li>
                  <li><strong>Feature Changes:</strong> Modify, suspend, or discontinue any platform features</li>
                  <li><strong>Access Restriction:</strong> Limit or block access to specific platform areas</li>
                  <li><strong>Data Management:</strong> Delete, archive, or transfer user data as necessary</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Enforcement Actions</h3>
                <p className="text-slate-700 mb-2">We may take enforcement actions for violations including:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Violation of these Terms or community guidelines</li>
                  <li>Fraudulent, deceptive, or illegal activities</li>
                  <li>Harassment, abuse, or inappropriate behavior toward other users</li>
                  <li>Attempts to manipulate equity structures or platform systems</li>
                  <li>Sharing false or misleading information about startups or investments</li>
                  <li>Any activity that we determine harmful to the Platform or its users</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">No Obligation to Provide Services</h3>
                <p className="text-blue-800 text-sm">
                  We have no obligation to provide any specific level of service, maintain platform availability, 
                  or continue operating the Platform. We may discontinue the Platform at any time without liability to users.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: User Responsibilities and Compliance */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">5. USER RESPONSIBILITIES AND COMPLIANCE</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Mandatory User Obligations</h3>
                <p className="text-slate-700 mb-3">
                  <strong>YOU AGREE TO:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                  <li><strong>Provide Accurate Information:</strong> Submit truthful, complete, and current information about yourself and your startups</li>
                  <li><strong>Maintain Account Security:</strong> Protect your login credentials and notify us immediately of unauthorized access</li>
                  <li><strong>Comply with Laws:</strong> Follow all applicable local, state, federal, and international laws and regulations</li>
                  <li><strong>Respect Intellectual Property:</strong> Not infringe on copyrights, trademarks, or other intellectual property rights</li>
                  <li><strong>Professional Conduct:</strong> Maintain professional, respectful communication with all platform users</li>
                  <li><strong>Financial Responsibility:</strong> Only invest funds you can afford to lose completely</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Prohibited Activities</h3>
                <p className="text-slate-700 mb-3">
                  <strong>YOU AGREE NOT TO:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                  <li><strong>Fraudulent Schemes:</strong> Create fake startups, misrepresent business opportunities, or engage in investment fraud</li>
                  <li><strong>System Manipulation:</strong> Attempt to hack, exploit, or manipulate platform systems or security measures</li>
                  <li><strong>Spam or Abuse:</strong> Send unsolicited communications, harass users, or abuse platform features</li>
                  <li><strong>False Information:</strong> Provide misleading information about your background, startup, or investment capacity</li>
                  <li><strong>Unauthorized Access:</strong> Access other users' accounts, groups, or private information</li>
                  <li><strong>Commercial Misuse:</strong> Use the Platform for unauthorized commercial purposes or competing services</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Compliance Monitoring</h3>
                <p className="text-yellow-800 text-sm">
                  We actively monitor user activity for compliance violations. Users found in violation may face 
                  immediate account termination, equity forfeiture, and potential legal action. We cooperate fully 
                  with law enforcement investigations.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Scale size={20} className="text-purple-600" />
              <h2 className="text-xl font-bold text-slate-900">6. LIMITATION OF LIABILITY AND DISCLAIMERS</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="text-lg font-bold text-red-900 mb-3">MAXIMUM LIABILITY DISCLAIMER</h3>
                <p className="text-red-800 font-bold mb-3">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, EQUITYTAKE SHALL NOT BE LIABLE FOR ANY DAMAGES WHATSOEVER.
                </p>
                <p className="text-red-800 mb-3">
                  <strong>WE DISCLAIM ALL LIABILITY FOR:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-red-800 ml-4">
                  <li><strong>FINANCIAL LOSSES:</strong> Any loss of money, equity, investments, or potential profits</li>
                  <li><strong>BUSINESS DAMAGES:</strong> Lost opportunities, business interruption, or startup failure</li>
                  <li><strong>DATA LOSS:</strong> Loss of user data, communications, or business information</li>
                  <li><strong>THIRD-PARTY ACTIONS:</strong> Actions or omissions of other users, group members, or external parties</li>
                  <li><strong>PLATFORM ISSUES:</strong> Technical failures, security breaches, or service interruptions</li>
                  <li><strong>INDIRECT DAMAGES:</strong> Consequential, incidental, punitive, or special damages</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Service Disclaimers</h3>
                <p className="text-slate-700 mb-3">
                  <strong>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> We disclaim:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Warranties of merchantability, fitness for a particular purpose, or non-infringement</li>
                  <li>Guarantees of platform availability, reliability, or error-free operation</li>
                  <li>Responsibility for the accuracy of user-provided information</li>
                  <li>Liability for third-party content, links, or external services</li>
                  <li>Obligation to verify user identities or startup legitimacy</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Damage Limitation</h3>
                <p className="text-purple-800 text-sm">
                  <strong>IF ANY LIABILITY IS FOUND TO EXIST,</strong> our total liability to you for all claims 
                  shall not exceed the greater of (a) $100 USD or (b) the amount you paid to us in the 12 months 
                  preceding the claim. This limitation applies regardless of the legal theory of liability.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Intellectual Property and Content */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">7. INTELLECTUAL PROPERTY AND CONTENT RIGHTS</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Platform Ownership</h3>
                <p className="text-slate-700 mb-2">
                  EquityTake owns all rights to the Platform, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Software, code, algorithms, and technical infrastructure</li>
                  <li>Platform design, user interface, and user experience elements</li>
                  <li>Trademarks, service marks, logos, and brand elements</li>
                  <li>Proprietary methodologies and business processes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">User Content License</h3>
                <p className="text-slate-700 mb-2">
                  By posting content on the Platform, you grant us a worldwide, royalty-free, perpetual license to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Use, reproduce, modify, and distribute your content</li>
                  <li>Display your content publicly on the Platform</li>
                  <li>Create derivative works based on your content</li>
                  <li>Sublicense these rights to third parties as necessary for platform operation</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Content Responsibility</h3>
                <p className="text-amber-800 text-sm">
                  You are solely responsible for all content you post, including its accuracy, legality, and 
                  appropriateness. We do not endorse, verify, or take responsibility for user-generated content, 
                  startup descriptions, or investment opportunities.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8: Account Termination and Suspension */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">8. ACCOUNT TERMINATION AND SUSPENSION</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Immediate Termination Rights</h3>
                <p className="text-slate-700 mb-3">
                  <strong>WE MAY IMMEDIATELY TERMINATE OR SUSPEND YOUR ACCOUNT</strong> without notice for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                  <li><strong>Terms Violation:</strong> Any breach of these Terms or platform policies</li>
                  <li><strong>Illegal Activity:</strong> Suspected illegal or fraudulent behavior</li>
                  <li><strong>Platform Security:</strong> Actions that threaten platform security or integrity</li>
                  <li><strong>User Safety:</strong> Behavior that endangers other users or their investments</li>
                  <li><strong>Business Reasons:</strong> Any reason we deem necessary for business operations</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Consequences of Termination</h3>
                <p className="text-slate-700 mb-2">Upon account termination:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>You immediately lose access to all groups and equity claims</li>
                  <li>All pending equity allocations are automatically forfeited</li>
                  <li>Your user data may be deleted or archived at our discretion</li>
                  <li>You are prohibited from creating new accounts</li>
                  <li>No refunds or compensation will be provided</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Permanent Equity Forfeiture</h3>
                <p className="text-red-800 text-sm font-medium">
                  <strong>UPON TERMINATION, ALL EQUITY CLAIMS ARE PERMANENTLY FORFEITED.</strong> 
                  You have no right to compensation, transfer of equity to other parties, or future claims 
                  to startup assets or profits.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9: Investment and Financial Disclaimers */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">9. INVESTMENT AND FINANCIAL DISCLAIMERS</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-red-900 mb-3">NOT INVESTMENT ADVICE</h3>
                <p className="text-red-800 font-medium mb-3">
                  <strong>EQUITYTAKE DOES NOT PROVIDE INVESTMENT ADVICE.</strong> We are not:
                </p>
                <ul className="list-disc list-inside space-y-1 text-red-800 ml-4">
                  <li>Licensed investment advisors or financial planners</li>
                  <li>Registered broker-dealers or investment companies</li>
                  <li>Providers of tax, legal, or accounting advice</li>
                  <li>Guarantors of investment performance or startup success</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Investment Risks</h3>
                <p className="text-slate-700 mb-3">
                  <strong>YOU ACKNOWLEDGE</strong> that startup investments involve extreme risks:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                  <li><strong>High Failure Rate:</strong> Statistics show that 90% of startups fail within 10 years</li>
                  <li><strong>Illiquidity:</strong> Equity stakes cannot be easily sold or converted to cash</li>
                  <li><strong>Dilution:</strong> Your ownership percentage may decrease through future funding rounds</li>
                  <li><strong>No Dividends:</strong> Most startups do not pay dividends or distributions to equity holders</li>
                  <li><strong>Long-Term Commitment:</strong> Returns, if any, may take many years to materialize</li>
                  <li><strong>Total Loss:</strong> You may lose your entire investment with no recovery</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Professional Advice Recommendation</h3>
                <p className="text-yellow-800 text-sm">
                  <strong>WE STRONGLY RECOMMEND</strong> consulting with qualified financial, legal, and tax professionals 
                  before making any investment decisions through the Platform. Professional advice can help you understand 
                  the risks and implications of equity participation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 10: Dispute Resolution and Legal Terms */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Scale size={20} className="text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">10. DISPUTE RESOLUTION AND LEGAL TERMS</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Binding Arbitration</h3>
                <p className="text-slate-700 mb-3">
                  <strong>YOU AGREE</strong> that any disputes arising from your use of the Platform will be resolved through 
                  binding arbitration rather than court litigation:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>Arbitration will be conducted under the rules of the American Arbitration Association</li>
                  <li>The arbitration will take place in [JURISDICTION TO BE SPECIFIED]</li>
                  <li>You waive your right to participate in class action lawsuits</li>
                  <li>Arbitration decisions are final and binding</li>
                  <li>Each party bears their own legal costs and fees</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Governing Law</h3>
                <p className="text-slate-700 mb-2">
                  These Terms are governed by the laws of [JURISDICTION TO BE SPECIFIED], without regard to conflict of law principles. 
                  Any legal proceedings must be brought in the courts of [JURISDICTION TO BE SPECIFIED].
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Severability and Modification</h3>
                <p className="text-slate-700 mb-2">
                  If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect. 
                  We may modify these Terms at any time by posting updated terms on the Platform. Continued use after 
                  modifications constitutes acceptance of the new terms.
                </p>
              </div>
            </div>
          </section>

          {/* Section 11: Acceptance and Acknowledgment */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Info size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">11. ACCEPTANCE AND ACKNOWLEDGMENT</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4">REQUIRED ACKNOWLEDGMENTS</h3>
                <p className="text-blue-800 font-medium mb-4">
                  By using the EquityTake Platform, <strong>YOU EXPLICITLY ACKNOWLEDGE AND AGREE</strong> that:
                </p>
                <div className="space-y-3 text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="font-bold">✓</span>
                    <p><strong>RISK UNDERSTANDING:</strong> You fully understand the high-risk nature of startup investments and equity participation</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">✓</span>
                    <p><strong>FINANCIAL CAPACITY:</strong> You have the financial capacity to lose your entire investment without affecting your essential needs</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">✓</span>
                    <p><strong>NO GUARANTEES:</strong> No returns, profits, or equity value are guaranteed or implied</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">✓</span>
                    <p><strong>REMOVAL ACCEPTANCE:</strong> You accept that you may be removed from groups and forfeit all equity without compensation</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">✓</span>
                    <p><strong>LEGAL WAIVER:</strong> You waive rights to legal recourse for investment losses or platform decisions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">✓</span>
                    <p><strong>TERMS ACCEPTANCE:</strong> You have read, understood, and agree to be bound by all terms in this document</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Contact for Legal Questions</h3>
                <p className="text-green-800 text-sm mb-2">
                  For questions about these Terms of Service, please contact:
                </p>
                <div className="text-green-800 text-sm">
                  <p><strong>Email:</strong> equitytake@gmail.com</p>
                  <p><strong>Subject Line:</strong> "Terms of Service Inquiry"</p>
                  <p><strong>Response Time:</strong> Within 5 business days</p>
                </div>
              </div>
            </div>
          </section>

          {/* Final Warning */}
          <div className="border-t border-slate-200 pt-6 mt-8">
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-red-900 mb-3">FINAL RISK ACKNOWLEDGMENT</h3>
                  <p className="text-red-800 font-medium mb-3">
                    <strong>BY CLICKING "I AGREE" OR USING THE PLATFORM, YOU CONFIRM THAT:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-red-800 ml-4">
                    <li>You have read and understood these Terms in their entirety</li>
                    <li>You accept full responsibility for all financial risks and potential losses</li>
                    <li>You understand that equity participation may result in total loss of investment</li>
                    <li>You waive any claims against EquityTake for investment losses or platform decisions</li>
                    <li>You agree to hold EquityTake harmless from any damages arising from your platform use</li>
                  </ul>
                  <p className="text-red-800 font-bold text-lg mt-4">
                    IF YOU DO NOT ACCEPT THESE RISKS, DO NOT USE THE PLATFORM.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-xs text-slate-500">
                These Terms of Service are effective as of the date listed above and apply to all users of the EquityTake platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;