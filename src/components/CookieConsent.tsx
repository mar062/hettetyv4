import React, { useState, useEffect } from 'react';
import { Shield, Check, Settings, X } from 'lucide-react';
import { api } from '../mockApi';

interface CookieConsentProps {
  t: any;
  isRtl: boolean;
  onNavigateToLegal: (page: 'terms' | 'privacy' | 'cookie-policy') => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ t, isRtl, onNavigateToLegal }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [view, setView] = useState<'main' | 'preferences'>('main');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('hettety_consent');
    if (!consent) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
  }, []);

  const handleAcceptAll = async () => {
    if (!agreedToTerms) return;

    const allPrefs = { necessary: true, analytics: true, marketing: true };
    await saveConsent(allPrefs);
  };

  const handleSavePreferences = async () => {
    if (!agreedToTerms) return;
    await saveConsent(preferences);
  };

  const saveConsent = async (prefs: any) => {
    // 1. Save to LocalStorage
    localStorage.setItem('hettety_consent', JSON.stringify(prefs));
    
    // 2. Save to Cookies (valid for 1 year)
    document.cookie = `hettety_consent=true; max-age=${60 * 60 * 24 * 365}; path=/`;

    // 3. Save to Backend Database
    await api.saveConsent(prefs);

    setIsVisible(false);
    document.body.style.overflow = 'auto'; // Restore scrolling
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-sm p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
        
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-[#10B981]" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t.consent_title}</h2>
          </div>

          {view === 'main' ? (
            <div className="space-y-6 animate-fade-in">
              <p className="text-slate-300 leading-relaxed">
                {t.consent_desc}
              </p>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-1">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-slate-500 rounded bg-transparent peer-checked:bg-[#10B981] peer-checked:border-[#10B981] transition-all"></div>
                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm text-slate-300">
                    {isRtl ? (
                      <>
                        لقد قرأت وأوافق على
                        <button onClick={() => onNavigateToLegal('terms')} className="text-[#10B981] hover:underline mx-1">الشروط والأحكام</button>
                        و
                        <button onClick={() => onNavigateToLegal('privacy')} className="text-[#10B981] hover:underline mx-1">سياسة الخصوصية</button>
                      </>
                    ) : (
                      <>
                        I have read and agree to the
                        <button onClick={() => onNavigateToLegal('terms')} className="text-[#10B981] hover:underline mx-1">Terms & Conditions</button>
                        and
                        <button onClick={() => onNavigateToLegal('privacy')} className="text-[#10B981] hover:underline mx-1">Privacy Policy</button>
                      </>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleAcceptAll}
                  disabled={!agreedToTerms}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                    agreedToTerms 
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-lg shadow-[#10B981]/20' 
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t.consent_accept}
                </button>
                <button 
                  onClick={() => setView('preferences')}
                  className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {t.consent_manage}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <h3 className="text-white font-semibold mb-1">{t.consent_necessary}</h3>
                    <p className="text-sm text-slate-400">{t.consent_necessary_desc}</p>
                  </div>
                  <div className="text-[#10B981] text-sm font-semibold px-3 py-1 bg-[#10B981]/10 rounded-full">
                    Always Active
                  </div>
                </div>

                {/* Analytics Cookies */}
                <label className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                  <div>
                    <h3 className="text-white font-semibold mb-1">{t.consent_analytics}</h3>
                    <p className="text-sm text-slate-400">{t.consent_analytics_desc}</p>
                  </div>
                  <div className="relative flex items-center justify-center mt-1 ml-4">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                    />
                    <div className="w-12 h-6 bg-slate-600 rounded-full peer-checked:bg-[#10B981] transition-colors relative">
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${preferences.analytics ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </div>
                </label>

                {/* Marketing Cookies */}
                <label className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                  <div>
                    <h3 className="text-white font-semibold mb-1">{t.consent_marketing}</h3>
                    <p className="text-sm text-slate-400">{t.consent_marketing_desc}</p>
                  </div>
                  <div className="relative flex items-center justify-center mt-1 ml-4">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                    />
                    <div className="w-12 h-6 bg-slate-600 rounded-full peer-checked:bg-[#10B981] transition-colors relative">
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${preferences.marketing ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-1">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-slate-500 rounded bg-transparent peer-checked:bg-[#10B981] peer-checked:border-[#10B981] transition-all"></div>
                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm text-slate-300">
                    {isRtl ? (
                      <>
                        لقد قرأت وأوافق على
                        <button onClick={() => onNavigateToLegal('terms')} className="text-[#10B981] hover:underline mx-1">الشروط والأحكام</button>
                        و
                        <button onClick={() => onNavigateToLegal('privacy')} className="text-[#10B981] hover:underline mx-1">سياسة الخصوصية</button>
                      </>
                    ) : (
                      <>
                        I have read and agree to the
                        <button onClick={() => onNavigateToLegal('terms')} className="text-[#10B981] hover:underline mx-1">Terms & Conditions</button>
                        and
                        <button onClick={() => onNavigateToLegal('privacy')} className="text-[#10B981] hover:underline mx-1">Privacy Policy</button>
                      </>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleSavePreferences}
                  disabled={!agreedToTerms}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                    agreedToTerms 
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-lg shadow-[#10B981]/20' 
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t.consent_save}
                </button>
                <button 
                  onClick={() => setView('main')}
                  className="py-3 px-6 bg-transparent hover:bg-white/5 text-slate-300 rounded-xl font-semibold transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
