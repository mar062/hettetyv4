import React from 'react';
import { 
  BrainCircuit, 
  ShieldCheck, 
  Box, 
  Lock, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

const AboutPage = ({ onCta, t, isRtl }: { onCta: () => void, t: any, isRtl: boolean }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#0B1120] text-white font-sans animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold mb-6 border border-emerald-500/20">
            {t.about_badge}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight text-white">
            {t.about_title_start} <span className="text-emerald-500">{t.about_title_end}</span>
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {t.about_desc}
          </p>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Vision */}
          <div className="bg-[#1E293B]/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 text-emerald-400">
              <BrainCircuit size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t.about_vision_title}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t.about_vision_desc}
            </p>
          </div>

          {/* Mission */}
          <div className="bg-[#1E293B]/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 text-emerald-400">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">{t.about_mission_title}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t.about_mission_desc}
            </p>
          </div>
        </div>
      </section>

      {/* Why HETTETY */}
      <section className="py-20 px-6 bg-[#0B1120]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.about_why_title}</h2>
            <p className="text-slate-400">{t.about_why_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <BrainCircuit />, title: t.about_feat_1 },
              { icon: <ShieldCheck />, title: t.about_feat_2 },
              { icon: <Box />, title: t.about_feat_3 },
              { icon: <Lock />, title: t.about_feat_4 }
            ].map((item, index) => (
              <div key={index} className="group p-6 rounded-2xl bg-[#1E293B] border border-slate-700 hover:bg-[#1E293B]/80 hover:-translate-y-1 transition-all duration-300 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <h3 className="font-bold text-lg text-white">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-emerald-900/40 to-[#1E293B] p-12 rounded-3xl border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-8 relative z-10">
            {t.about_cta_title}
          </h2>
          
          <button 
            onClick={onCta}
            className="relative z-10 bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center gap-2 mx-auto"
          >
            {t.about_cta_btn} {isRtl ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
          </button>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
