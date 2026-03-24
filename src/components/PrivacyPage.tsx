import React from 'react';
import { Shield } from 'lucide-react';

interface PrivacyPageProps {
  t: any;
  isRtl: boolean;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ t, isRtl }) => {
  return (
    <div className="min-h-screen bg-[#0F172A] py-24" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#10B981]/20 mb-6">
            <Shield className="w-8 h-8 text-[#10B981]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t.nav_privacy}
          </h1>
          <p className="text-xl text-slate-400">
            How we collect, use, and protect your data.
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-[#1E293B] rounded-2xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Name, email, and phone number.</li>
              <li>Property preferences and search history.</li>
              <li>Device and browser information.</li>
            </ul>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-slate-300 leading-relaxed">
              We use the information we collect about you to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support to Users and Agents, develop safety features, authenticate users, and send product updates and administrative messages.
            </p>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
