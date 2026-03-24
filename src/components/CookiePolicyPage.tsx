import React from 'react';
import { Settings } from 'lucide-react';

interface CookiePolicyPageProps {
  t: any;
  isRtl: boolean;
}

const CookiePolicyPage: React.FC<CookiePolicyPageProps> = ({ t, isRtl }) => {
  return (
    <div className="min-h-screen bg-[#0F172A] py-24" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#10B981]/20 mb-6">
            <Settings className="w-8 h-8 text-[#10B981]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t.nav_cookie}
          </h1>
          <p className="text-xl text-slate-400">
            Understanding how we use cookies.
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-[#1E293B] rounded-2xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-4">What Are Cookies?</h2>
            <p className="text-slate-300 leading-relaxed">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used in order to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
            </p>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-4">How We Use Cookies</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#10B981] mb-2">Strictly Necessary Cookies</h3>
                <p className="text-slate-300">These cookies are essential for you to browse the website and use its features, such as accessing secure areas of the site.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#10B981] mb-2">Analytics Cookies</h3>
                <p className="text-slate-300">Also known as "performance cookies," these cookies collect information about how you use a website, like which pages you visited and which links you clicked on. None of this information can be used to identify you.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#10B981] mb-2">Marketing Cookies</h3>
                <p className="text-slate-300">These cookies track your online activity to help advertisers deliver more relevant advertising or to limit how many times you see an ad.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;
