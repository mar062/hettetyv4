import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles, PlayCircle } from 'lucide-react';

interface PremiumHeroProps {
  onPrimaryCta?: () => void;
  onSecondaryCta?: () => void;
  t: any;
  isRtl: boolean;
}

const PremiumHero: React.FC<PremiumHeroProps> = ({ 
  onPrimaryCta = () => {}, 
  onSecondaryCta = () => {},
  t,
  isRtl
}) => {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0F172A] font-sans" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000" 
          alt="Modern Architecture" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/80 to-[#0F172A]/40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#10B981]/10 via-transparent to-transparent"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 mb-8 animate-slide-up shadow-lg shadow-black/20">
          <Sparkles className="w-4 h-4 text-[#10B981]" />
          <span className="text-[#10B981] text-xs font-bold tracking-wider uppercase">
            {t.hero_badge}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight tracking-tight animate-fade-in">
          {t.hero_title_start} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            {t.hero_title_end}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed font-light animate-slide-up opacity-90">
          {t.hero_subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          <button 
            onClick={onPrimaryCta}
            className="group relative px-8 py-4 bg-[#10B981] hover:bg-[#059669] text-white text-lg font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-2 overflow-hidden"
          >
            <span className="relative z-10">{t.hero_cta_primary}</span>
            {isRtl ? (
              <ArrowLeft className="w-5 h-5 relative z-10 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            )}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>

          <button 
            onClick={onSecondaryCta}
            className="group px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-lg font-bold rounded-2xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            <span>{t.hero_cta_secondary}</span>
          </button>

        </div>

      </div>
    </div>
  );
};

export default PremiumHero;
