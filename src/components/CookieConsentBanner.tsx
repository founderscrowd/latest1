import React, { useState, useEffect } from 'react';
import { Cookie, Shield, BarChart3, Megaphone, Check } from 'lucide-react';
import { getConsent, setConsent, hasConsentRecord } from '../lib/cookieConsent';

interface CookieConsentBannerProps {
  forceOpen?: boolean;
  onClosed?: () => void;
}

const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ forceOpen, onClosed }) => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      const consent = getConsent();
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
      setExpanded(true);
      setVisible(true);
      return;
    }
    if (!hasConsentRecord()) {
      setVisible(true);
    }
  }, [forceOpen]);

  if (!visible) return null;

  const handleAcceptAll = () => {
    setConsent(true, true);
    setVisible(false);
    setExpanded(false);
    onClosed?.();
  };

  const handleRejectOptional = () => {
    setConsent(false, false);
    setVisible(false);
    setExpanded(false);
    onClosed?.();
  };

  const handleSavePreferences = () => {
    setConsent(analytics, marketing);
    setVisible(false);
    setExpanded(false);
    onClosed?.();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Collapsed view */}
        {!expanded && (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <Cookie size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">Cookie preferences</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We use cookies to improve your experience and understand how the site is used.
                  Essential cookies are always active. Choose whether to allow analytics and marketing cookies.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
              <button
                onClick={() => setExpanded(true)}
                className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors sm:mr-auto"
              >
                Customise
              </button>
              <button
                onClick={handleRejectOptional}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 border border-slate-600 hover:bg-slate-800 transition-colors"
              >
                Reject optional
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 transition-colors"
              >
                Accept all
              </button>
            </div>
          </div>
        )}

        {/* Expanded / customise view */}
        {expanded && (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <Cookie size={20} className="text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm mb-1">Customise cookie preferences</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Choose which categories of cookies you allow. You can change these at any time via the footer.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {/* Essential */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">Essential</p>
                    <p className="text-slate-500 text-xs">Required for the site to function. Always active.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-xs font-medium">On</span>
                  <div className="w-9 h-5 rounded-full bg-green-500/30 flex items-center justify-center">
                    <Check size={12} className="text-green-400" />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">Analytics</p>
                    <p className="text-slate-500 text-xs">Google Analytics — understand how visitors use the site.</p>
                  </div>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    analytics ? 'bg-orange-600' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle analytics consent"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      analytics ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Megaphone size={18} className="text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">Marketing</p>
                    <p className="text-slate-500 text-xs">Meta Pixel & TikTok Pixel — measure ad performance.</p>
                  </div>
                </div>
                <button
                  onClick={() => setMarketing(!marketing)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    marketing ? 'bg-orange-600' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle marketing consent"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      marketing ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 transition-colors"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieConsentBanner;
