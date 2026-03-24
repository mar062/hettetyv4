import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, ShieldCheck, Building2, Box, Clock } from 'lucide-react';

interface ServicePageProps {
  title: string;
  description: string;
  features: { title: string; desc: string; icon: React.ReactNode }[];
  ctaText: string;
  onCta: () => void;
  isRtl: boolean;
}

const ServicePage: React.FC<ServicePageProps> = ({ title, description, features, ctaText, onCta, isRtl }) => {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-white">
            {title}
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            {description}
          </p>
          <button 
            onClick={onCta}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center gap-2 mx-auto"
          >
            {ctaText} {isRtl ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-[#0B1120]/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-[#1E293B] p-8 rounded-2xl border border-slate-700 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 text-emerald-400">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const BuyPropertyPage = ({ onCta, t, isRtl }: { onCta: () => void, t: any, isRtl: boolean }) => (
  <ServicePage
    title={t.buy_title}
    description={t.buy_desc}
    ctaText={t.buy_cta}
    onCta={onCta}
    isRtl={isRtl}
    features={[
      { title: t.buy_feat_1_title, desc: t.buy_feat_1_desc, icon: <Building2 size={28} /> },
      { title: t.buy_feat_2_title, desc: t.buy_feat_2_desc, icon: <CheckCircle size={28} /> },
      { title: t.buy_feat_3_title, desc: t.buy_feat_3_desc, icon: <ShieldCheck size={28} /> }
    ]}
  />
);

export const VerificationPage = ({ onCta, t, isRtl }: { onCta: () => void, t: any, isRtl: boolean }) => (
  <ServicePage
    title={t.verify_title}
    description={t.verify_desc}
    ctaText={t.verify_cta}
    onCta={onCta}
    isRtl={isRtl}
    features={[
      { title: t.verify_feat_1_title, desc: t.verify_feat_1_desc, icon: <ShieldCheck size={28} /> },
      { title: t.verify_feat_2_title, desc: t.verify_feat_2_desc, icon: isRtl ? <ArrowLeft size={28} /> : <ArrowRight size={28} /> },
      { title: t.verify_feat_3_title, desc: t.verify_feat_3_desc, icon: <CheckCircle size={28} /> }
    ]}
  />
);

export const Tours3DPage = ({ onCta, t, isRtl }: { onCta: () => void, t: any, isRtl: boolean }) => (
  <ServicePage
    title={t.tours_title}
    description={t.tours_desc}
    ctaText={t.tours_cta}
    onCta={onCta}
    isRtl={isRtl}
    features={[
      { title: t.tours_feat_1_title, desc: t.tours_feat_1_desc, icon: <Box size={28} /> },
      { title: t.tours_feat_2_title, desc: t.tours_feat_2_desc, icon: <Building2 size={28} /> },
      { title: t.tours_feat_3_title, desc: t.tours_feat_3_desc, icon: <Clock size={28} /> }
    ]}
  />
);
