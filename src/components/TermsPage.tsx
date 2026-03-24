import React from 'react';
import { FileText, Shield, AlertCircle, Scale, RefreshCw } from 'lucide-react';

const TermsPage = ({ t, isRtl }: { t: any, isRtl: boolean }) => {
  const sections = [
    {
      title: t.terms_sec_1_title,
      icon: <FileText className="w-6 h-6 text-emerald-400" />,
      content: t.terms_sec_1_desc
    },
    {
      title: t.terms_sec_2_title,
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      content: t.terms_sec_2_desc
    },
    {
      title: t.terms_sec_3_title,
      icon: <Scale className="w-6 h-6 text-emerald-400" />,
      content: t.terms_sec_3_desc
    },
    {
      title: t.terms_sec_4_title,
      icon: <AlertCircle className="w-6 h-6 text-emerald-400" />,
      content: t.terms_sec_4_desc
    },
    {
      title: t.terms_sec_5_title,
      icon: <RefreshCw className="w-6 h-6 text-emerald-400" />,
      content: t.terms_sec_5_desc
    }
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-6 py-20">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold mb-6 border border-emerald-500/20">
            {t.terms_badge}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            {t.terms_title}
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t.terms_desc}
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid gap-6">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-[#1E293B] p-8 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-800 rounded-xl shrink-0">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-3 text-white">
                    {section.title}
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          {t.terms_footer}
        </div>

      </div>
    </div>
  );
};

export default TermsPage;
