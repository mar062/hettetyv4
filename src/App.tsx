/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, MapPin, Users, Globe, ShieldCheck, 
  Sparkles, Code2, Menu, X, Home, Search, 
  MessageSquareText, FileText, Box, ArrowRight,
  CheckCircle, PlayCircle, Send, Upload, Clock,
  DollarSign, BedDouble, Bath, Maximize, Loader2,
  Check, FileCheck, Key, RefreshCw, LayoutTemplate,
  User, ArrowLeft, Phone, Target, CreditCard, PlusCircle, Edit2, Save, LogOut, Shield
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_ENTITY_DATA, TRANSLATIONS } from './constants';
import { Property, ChatMessage, UserDocument, Page } from './types';
import { api } from './mockApi';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, collection, getDocs, query, where, onSnapshot,
  addDoc, updateDoc,
  handleFirestoreError, OperationType
} from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import AboutPage from './components/AboutPage';
import { BuyPropertyPage, VerificationPage, Tours3DPage } from './components/ServicePages';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import CookiePolicyPage from './components/CookiePolicyPage';
import CookieConsent from './components/CookieConsent';
import PremiumHero from './components/PremiumHero';

// --- Components ---

const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'white' | 'black'; 
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ children, onClick, variant = 'primary', className = "", disabled = false, type = "button" }) => {
  const base = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 disabled:active:scale-100 cursor-pointer";
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-lg shadow-brand-500/20",
    accent: "bg-accent-500 text-white hover:bg-accent-600 hover:shadow-lg shadow-accent-500/20",
    outline: "border-2 border-brand-500 text-brand-600 hover:bg-brand-50",
    ghost: "text-slate-600 hover:text-brand-600 hover:bg-slate-100",
    white: "bg-white text-brand-900 hover:bg-brand-50 hover:shadow-xl",
    black: "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl"
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
};

const Logo: React.FC<{ color?: string; className?: string }> = ({ color = "#1e3a8a", className = "h-10" }) => {
  const isWhite = color === "white" || color === "#ffffff";
  const textColor = isWhite ? "#ffffff" : "#1e3a8a";
  const primaryColor = isWhite ? "#ffffff" : "#1e3a8a";
  const accentColor = "#f97316";

  return (
    <svg viewBox="0 0 200 60" className={className} xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(100, 20)">
        {/* Orange Roof (Outer) */}
        <path 
          d="M -35 12 L 0 -12 L 35 12 L 28 12 L 0 -7 L -28 12 Z" 
          fill={accentColor} 
        />
        {/* Navy Roof (Inner) */}
        <path 
          d="M -18 12 L 0 0 L 18 12 L 12 12 L 0 4 L -12 12 Z" 
          fill={primaryColor} 
        />
        {/* Window */}
        <rect x="-4" y="2" width="3" height="3" fill={accentColor} />
        <rect x="1" y="2" width="3" height="3" fill={accentColor} />
        <rect x="-4" y="6" width="3" height="3" fill={accentColor} />
        <rect x="1" y="6" width="3" height="3" fill={accentColor} />
      </g>
      <text 
        x="100" 
        y="52" 
        textAnchor="middle" 
        fontFamily="Montserrat, sans-serif" 
        fontWeight="800" 
        fontSize="22" 
        letterSpacing="2" 
        fill={textColor}
      >
        HETTETY
      </text>
    </svg>
  );
};

const PropertyCard: React.FC<{ property: Property; onView3D: () => void; onClick?: () => void; t: any; isRtl: boolean }> = ({ property, onView3D, onClick, t, isRtl }) => (
  <div onClick={onClick} className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full animate-fade-in ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="relative h-64 overflow-hidden">
      <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm`}>
        {property.status === 'For Sale' ? t.prop_forsale : t.prop_forrent}
      </div>
      {property.isVerified && (
        <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm`}>
          <ShieldCheck size={12} /> {t.prop_verified}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
        <button onClick={(e) => { e.stopPropagation(); onView3D(); }} className="bg-white/20 hover:bg-white text-white hover:text-brand-900 backdrop-blur border border-white/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer">
          <Box size={16} /> {t.prop_view_3d}
        </button>
      </div>
    </div>
    <div className="p-6 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-heading font-bold text-slate-900 line-clamp-1">{property.title}</h3>
        <span className="text-brand-600 font-bold whitespace-nowrap">
          {property.price.toLocaleString()} EGP
        </span>
      </div>
      <div className="flex items-center text-slate-500 text-sm mb-3">
        <MapPin size={14} className={isRtl ? "ml-1" : "mr-1"} /> {property.location}
      </div>
      {property.paymentMethods && property.paymentMethods.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {property.paymentMethods.map(method => (
            <span key={method} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold rounded">
              {method}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100 mt-auto">
        <div className="flex flex-col items-center text-slate-600">
          <BedDouble size={20} className="mb-1 text-brand-400" />
          <span className="text-xs font-medium">{property.bedrooms} {t.prop_beds}</span>
        </div>
        <div className="flex flex-col items-center text-slate-600">
          <Bath size={20} className="mb-1 text-brand-400" />
          <span className="text-xs font-medium">{property.bathrooms} {t.prop_baths}</span>
        </div>
        <div className="flex flex-col items-center text-slate-600">
          <Maximize size={20} className="mb-1 text-brand-400" />
          <span className="text-xs font-medium">{property.area} m²</span>
        </div>
      </div>
    </div>
  </div>
);

// --- Sections ---

const AuthForm = ({ type, onSwitch, onSubmit, t, isRtl }: { type: 'login' | 'register', onSwitch: () => void, onSubmit: (email: string) => void, t: any, isRtl: boolean }) => {
  const isLogin = type === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 0) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Za-z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // 0 to 4
  };

  const strength = calculateStrength(password);
  const strengthLabels = ['', t.auth_pass_weak || 'Weak', t.auth_pass_fair || 'Fair', t.auth_pass_good || 'Good', t.auth_pass_strong || 'Strong'];
  const strengthColors = ['bg-slate-200', 'bg-red-500', 'bg-yellow-500', 'bg-brand-400', 'bg-green-500'];

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        if (isLogin) {
          // If trying to login but doesn't exist, prompt to register
          await signOut(auth);
          setError(isRtl ? 'هذا الحساب غير موجود، يرجى التسجيل أولاً' : 'This account does not exist. Please register first.');
          setLoading(false);
          return;
        } else {
          // Create new user profile
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            role: (user.email === 'abdallahahmedpilot2426@gmail.com' || user.email === 'marwaneltaweel0@gmail.com') ? 'admin' : 'user',
            createdAt: new Date().toISOString()
          });
        }
      }
      
      onSubmit(user.email || '');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User intentionally closed the popup or cancelled, no need to show a scary error
        setError('');
      } else {
        console.error("Google Sign In Error:", err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getDoc(doc(db, 'users', result.user.uid));
          if (!userDoc.exists()) {
            await signOut(auth);
            setError(isRtl ? 'هذا الحساب غير موجود، يرجى التسجيل أولاً' : 'This account does not exist. Please register first.');
            setLoading(false);
            return;
          }
          onSubmit(email);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            setError(isRtl ? 'هذا الحساب غير موجود، يرجى التسجيل أولاً' : 'This account does not exist. Please register first.');
          } else if (err.code === 'auth/unauthorized-domain') {
            setError(isRtl ? 'نطاق غير مصرح به. يرجى إضافة هذا النطاق في إعدادات Firebase.' : 'Unauthorized domain. Please add this domain in Firebase settings.');
          } else {
            setError(err.message);
          }
        }
      } else {
        // Register
        if (password.length < 8 || !/[^A-Za-z0-9]/.test(password)) {
          setError(t.auth_pass_req || 'Password must be at least 8 characters and include a special character.');
          setLoading(false);
          return;
        }
        
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          name: name,
          email: email,
          role: (email === 'abdallahahmedpilot2426@gmail.com' || email === 'marwaneltaweel0@gmail.com') ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        });
        onSubmit(email);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError(isRtl ? 'يرجى تفعيل تسجيل الدخول بالبريد الإلكتروني في لوحة تحكم Firebase.' : 'Please enable Email/Password authentication in the Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(isRtl ? 'نطاق غير مصرح به. يرجى إضافة هذا النطاق في إعدادات Firebase.' : 'Unauthorized domain. Please add this domain in Firebase settings.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4 py-12 animate-fade-in relative">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 text-brand-600 mb-4">
            <User size={24} />
          </div>
          <h2 className="text-2xl font-heading font-bold text-slate-900">
            {isLogin ? t.auth_welcome : t.auth_create}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isLogin ? t.auth_login_desc : t.auth_reg_desc}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
           {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.auth_name}</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-black" 
                  placeholder="John Doe" 
                />
              </div>
           )}
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.auth_email}</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-black" 
                placeholder="you@example.com" 
              />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.auth_pass}</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-black" 
                placeholder="••••••••" 
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${strength >= level ? strengthColors[strength] : 'bg-slate-100'}`}></div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-medium ${strengthColors[strength].replace('bg-', 'text-')}`}>{strengthLabels[strength]}</span>
                    <span className="text-slate-400">{t.auth_pass_req}</span>
                  </div>
                </div>
              )}
           </div>

           {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

           <Button type="submit" disabled={loading} className="w-full mt-6">
             {loading ? <Loader2 className="animate-spin" /> : (isLogin ? t.auth_signin_btn : t.auth_signup_btn)}
           </Button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">{t.auth_or_continue || 'Or continue with'}</span>
            </div>
          </div>

          <div className="mt-6">
            <button 
              type="button" 
              onClick={handleGoogleSignIn} 
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t.auth_google || 'Google'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">
            {isLogin ? t.auth_no_account : t.auth_has_account}
          </span>
          <button onClick={onSwitch} className="font-bold text-brand-600 hover:text-brand-700 cursor-pointer ml-1">
            {isLogin ? t.nav_register : t.nav_login_short}
          </button>
        </div>
      </div>
    </div>
  )
};

const ComingSoon3D = ({ t, isRtl }: { t: any, isRtl: boolean }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 animate-fade-in">
       {/* Text Section */}
       <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
             <Clock size={14} /> {t.tour_3d_badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-slate-900 mb-6 leading-tight">
             {t.tour_3d_title}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
             {t.tour_3d_desc}
          </p>
       </div>

       {/* Viewer Placeholder */}
       <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group cursor-not-allowed">
           {/* Background Grid/Image Effect */}
           <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
           
           {/* Central content */}
           <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="relative">
                 <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 animate-pulse"></div>
                 <Box className="w-24 h-24 text-slate-700 relative z-10" strokeWidth={1} />
                 {/* Rotating ring */}
                 <div className="absolute inset-[-20px] border-2 border-slate-700/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
                 <div className="absolute inset-[-40px] border border-slate-800/50 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
              </div>
              <p className="mt-8 font-mono text-brand-500 text-sm tracking-widest uppercase animate-pulse">
                {t.tour_3d_loading}
              </p>
           </div>

           {/* Tooltip on Hover */}
           {/* Removed tooltip as requested */}
       </div>

       {/* Features Grid Teaser */}
       <div className="grid md:grid-cols-3 gap-8 mt-16">
          {[
            { icon: <Box />, title: t.tour_3d_feat_1, desc: t.tour_3d_feat_1_desc },
            { icon: <Maximize />, title: t.tour_3d_feat_2, desc: t.tour_3d_feat_2_desc },
            { icon: <LayoutTemplate />, title: t.tour_3d_feat_3, desc: t.tour_3d_feat_3_desc }
          ].map((item, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center opacity-70">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-4">{item.icon}</div>
                <h3 className="font-bold text-slate-700">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
             </div>
          ))}
       </div>
    </div>
  )
}

const Hero = ({ onCta, t }: { onCta: () => void, t: any }) => (
  <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-900">
    <div className="absolute inset-0 opacity-40">
      <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000" alt="Modern Architecture" className="w-full h-full object-cover" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
    <div className="relative z-10 max-w-7xl mx-auto px-4 text-center animate-fade-in">
      <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-6 animate-slide-up">
        <Sparkles className="text-accent-400 w-4 h-4" />
        <span className="text-accent-100 text-xs font-bold tracking-wider uppercase">{t.hero_verified_badge}</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight">
        {t.hero_title} <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">{t.hero_span}</span>
      </h1>
      <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light">
        {t.hero_desc}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onCta} variant="accent" className="text-lg px-8">{t.hero_cta}</Button>
      </div>
    </div>
  </div>
);

const Features = ({ t }: { t: any }) => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-heading font-bold text-brand-900 mb-4">{t.feat_title}</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">{t.feat_desc}</p>
      </div>
      <div className="grid md:grid-cols-4 gap-8">
        {[
          { icon: <ShieldCheck className="w-8 h-8" />, title: t.feat_1_title, desc: t.feat_1_desc },
          { icon: <FileCheck className="w-8 h-8" />, title: t.feat_2_title, desc: t.feat_2_desc },
          { icon: <Box className="w-8 h-8" />, title: t.feat_3_title, desc: t.feat_3_desc },
          { icon: <Users className="w-8 h-8" />, title: t.feat_4_title, desc: t.feat_4_desc },
        ].map((f, i) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 mb-4">{f.icon}</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const AIChat = ({ t, isRtl, properties, userName }: { t: any, isRtl: boolean, properties: Property[], userName?: string | null }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: t.ai_welcome, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  // Initialize Chat
  useEffect(() => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        chatRef.current = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: `You are HETTETY AI, the official real estate assistant for HETTETY, Egypt's premier property platform. 
            Your goal is to help users find properties, explain legal procedures in Egypt (like registration, taxes, and contracts), and provide market insights.
            ${userName ? `The user's name is ${userName}. Address them by name if appropriate.` : ''}
            You have access to the following properties on our platform:
            ${JSON.stringify(properties.map(p => ({ id: p.id, title: p.title, price: p.price, location: p.location, type: p.status })), null, 2)}
            
            Guidelines:
            1. Be professional, polite, and helpful.
            2. If a user asks for a property, recommend relevant ones from the list above.
            3. Answer in the language the user uses (${isRtl ? 'Arabic' : 'English'}).
            4. If you don't know something, be honest but try to guide them to our contact page.
            5. Encourage users to book a 3D tour if they are interested in a property.`,
          }
        });
      }
    } catch (e) {
      console.error("Failed to initialize AI chat", e);
    }
  }, [properties, isRtl, userName]);

  // Re-sync welcome message when language changes
  useEffect(() => {
    setMessages(prev => {
        if (prev.length === 1 && prev[0].role === 'model') {
            return [{ role: 'model', text: t.ai_welcome, timestamp: new Date() }];
        }
        return prev;
    });
  }, [t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (chatRef.current) {
        let response;
        try {
          response = await chatRef.current.sendMessage({ message: userMsg.text });
        } catch (apiError) {
          console.error("API Error:", apiError);
          throw new Error("API call failed");
        }
        
        if (response && response.text) {
          setMessages(prev => [...prev, { role: 'model', text: response.text, timestamp: new Date() }]);
        } else {
          throw new Error("Empty response");
        }
      } else {
        // Fallback to mock API if no API key
        const response = await api.chat(userMsg.text);
        if (response.success && response.data) {
          setMessages(prev => [...prev, { role: 'model', text: response.data, timestamp: new Date() }]);
        } else {
          throw new Error("Mock API failed");
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: isRtl ? "عذراً، أواجه مشكلة في الاتصال حالياً. يرجى التأكد من إعداد مفتاح API الخاص بك بشكل صحيح." : "I'm having trouble connecting right now. Please ensure your API key is set up correctly.", timestamp: new Date() }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
        <div className="bg-slate-900 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-bold">{t.ai_title}</h2>
              <p className="text-brand-200 text-xs">{t.ai_subtitle}</p>
            </div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${m.role === 'user' ? (isRtl ? 'bg-brand-500 text-white rounded-tl-none' : 'bg-brand-500 text-white rounded-tr-none') : (isRtl ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm')}`}>
                <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{m.text}</p>
                <p className={`text-[10px] mt-2 ${m.role === 'user' ? 'text-brand-100' : 'text-slate-400'}`}>{m.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-2 ${isRtl ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                 <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                 <span className="text-xs text-slate-500">{t.ai_thinking}</span>
               </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-white border-t border-slate-100">
           <div className="flex gap-2 relative">
             <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t.ai_placeholder} className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none text-black" />
             <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-brand-500 text-white p-3 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 cursor-pointer"><Send size={20} className={isRtl ? "rotate-180" : ""} /></button>
           </div>
           <div className="flex gap-3 mt-3 overflow-x-auto pb-1 no-scrollbar">
             {[t.ai_quick_1, t.ai_quick_2, t.ai_quick_3].map((s, i) => (
               <button key={i} onClick={() => setInput(s)} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors cursor-pointer">{s}</button>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const LegalCenter = ({ t, isRtl }: { t: any, isRtl: boolean }) => {
  const [docs, setDocs] = useState<UserDocument[]>([
    { id: '1', fileId: 'DOC-8492', name: 'Purchase_Contract_Draft.pdf', type: 'Contract', status: 'Action Required', uploadDate: '2023-10-24', accessStatus: 'Granted', size: 2450000 },
    { id: '2', fileId: 'DOC-1022', name: 'National_ID_Front.jpg', type: 'Identification', status: 'Verified', uploadDate: '2023-10-22', accessStatus: 'Granted', size: 1200000 },
    { id: '3', fileId: 'DOC-5519', name: 'Property_Deed_Scan.pdf', type: 'Deed', status: 'Verified', uploadDate: '2023-10-15', accessStatus: 'Locked', size: 4500000 }
  ]);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<UserDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: Maximum file size (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(isRtl ? 'حجم الملف يتجاوز الحد الأقصى (5 ميجابايت).' : 'File size exceeds the maximum limit (5MB).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validation: Allowed file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError(isRtl ? 'نوع الملف غير مدعوم. يرجى رفع ملفات PDF أو صور أو مستندات.' : 'Unsupported file type. Please upload PDF, images, or documents.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAnalyzing(true);
    const newDocName = file.name;
    
    // Call Mock API
    const response = await api.uploadDocument(newDocName, 'Document');
    
    const newDoc: UserDocument = {
        id: Math.random().toString(),
        fileId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newDocName,
        type: file.type.includes('image') ? 'Image' : file.type.includes('pdf') ? 'PDF' : 'Document',
        status: response.success && response.data?.isValid ? 'Verified' : 'Action Required',
        uploadDate: new Date().toISOString().split('T')[0],
        accessStatus: 'Granted',
        size: file.size
    };

    setDocs(prev => [newDoc, ...prev]);
    setAnalyzing(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRequestAccess = (id: string) => {
    setDocs(prev => prev.map(doc => doc.id === id ? { ...doc, accessStatus: 'Requested' } : doc));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.fileId && doc.fileId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold text-slate-900">{t.legal_title}</h2>
          <p className="text-slate-500 mt-1">{isRtl ? 'إدارة المستندات القانونية الخاصة بك بأمان.' : 'Securely manage your personal legal documents.'}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input 
              type="text" 
              placeholder={isRtl ? "البحث بالاسم أو المعرف..." : "Search by name or ID..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 focus:ring-2 focus:ring-brand-500 outline-none text-sm text-slate-700 ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <Button onClick={handleUploadClick} disabled={analyzing} className="w-full sm:w-auto whitespace-nowrap">
            {analyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {analyzing ? t.legal_analyzing : t.legal_upload}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
           {filteredDocs.length > 0 ? filteredDocs.map(doc => (
             <div key={doc.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:shadow-md transition-shadow gap-4">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${doc.status === 'Verified' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><FileText size={24} /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{doc.fileId}</span>
                      <h4 className="font-bold text-slate-800 truncate">{doc.name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{doc.type} • {doc.uploadDate} {doc.size ? `• ${formatSize(doc.size)}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:ml-4 shrink-0 justify-between sm:justify-end">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${doc.status === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{doc.status === 'Verified' ? t.prop_verified : doc.status}</div>
                  
                  {doc.accessStatus === 'Locked' && (
                    <button onClick={() => handleRequestAccess(doc.id)} className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                      {isRtl ? 'طلب وصول' : 'Request Access'}
                    </button>
                  )}
                  {doc.accessStatus === 'Requested' && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      {isRtl ? 'قيد المراجعة' : 'Pending Approval'}
                    </span>
                  )}
                  {doc.accessStatus === 'Granted' && (
                    <button onClick={() => setViewingDoc(doc)} className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-100 transition-colors cursor-pointer">
                      {isRtl ? 'عرض' : 'View'}
                    </button>
                  )}
                </div>
             </div>
           )) : (
             <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
               {isRtl ? "لم يتم العثور على ملفات." : "No files found."}
             </div>
           )}
        </div>
        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-6 rounded-2xl">
             <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck className="text-brand-400" /> {t.legal_status}</h3>
             <div className="space-y-4">
               {[t.legal_stat_1, t.legal_stat_2, t.legal_stat_3].map((label: string, i) => (
                 <div key={i} className="flex justify-between text-sm"><span className="text-slate-400">{label}</span><CheckCircle className="text-green-400 w-4 h-4" /></div>
               ))}
             </div>
           </div>
           <div className="bg-brand-50 border border-brand-100 p-6 rounded-2xl">
             <h3 className="font-bold text-brand-900 mb-2 text-sm">{isRtl ? 'مساحة العمل الخاصة بك' : 'Your Private Workspace'}</h3>
             <p className="text-xs text-brand-700 leading-relaxed">
               {isRtl 
                 ? 'هذه الملفات مشفرة ومخصصة لحسابك فقط. لا يمكن لأي مستخدم آخر رؤية مستنداتك. بعض الملفات الإدارية تتطلب طلب وصول من الإدارة.' 
                 : 'These files are encrypted and scoped to your account. No other users can see your documents. Some administrative files require an access request.'}
             </p>
           </div>
        </div>
      </div>

      {viewingDoc && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 text-brand-600 p-2 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{viewingDoc.name}</h3>
                  <p className="text-xs text-slate-500">{viewingDoc.fileId} • {viewingDoc.type}</p>
                </div>
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-8 flex items-center justify-center overflow-y-auto">
              {viewingDoc.type === 'Image' || viewingDoc.name.match(/\.(jpg|jpeg|png)$/i) ? (
                <div className="max-w-full max-h-full flex flex-col items-center justify-center">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${viewingDoc.id}/800/600`} 
                      alt={viewingDoc.name} 
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-sm font-medium mt-4 text-slate-600">{viewingDoc.name}</p>
                </div>
              ) : (
                <div className="bg-white w-full max-w-2xl min-h-[600px] shadow-sm border border-slate-200 rounded-xl p-12">
                  <div className="border-b border-slate-200 pb-6 mb-6">
                    <div className="flex justify-between items-start mb-8">
                      <Logo color="brand" className="h-8" />
                      <div className="text-right">
                        <h1 className="text-2xl font-serif font-bold text-slate-900">{viewingDoc.type}</h1>
                        <p className="text-sm text-slate-500 mt-1">{viewingDoc.fileId}</p>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{viewingDoc.name.replace(/\.[^/.]+$/, "")}</h2>
                    <p className="text-sm text-slate-500">{isRtl ? 'تاريخ الرفع:' : 'Upload Date:'} {viewingDoc.uploadDate}</p>
                  </div>
                  <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
                    <p className="font-semibold mb-4">{isRtl ? 'محتوى المستند:' : 'Document Content:'}</p>
                    <p>
                      {isRtl 
                        ? 'هذا المستند هو نسخة إلكترونية موثقة. يحتوي على تفاصيل الاتفاقية أو الهوية أو الملكية الخاصة بك.' 
                        : 'This document is a verified electronic copy. It contains the details of your agreement, identification, or property deed.'}
                    </p>
                    <p>
                      {isRtl 
                        ? 'تم التحقق من صحة هذا المستند وتشفيره بأمان على خوادمنا. لا يمكن لأي شخص آخر الوصول إليه بدون إذنك الصريح.' 
                        : 'This document has been validated and securely encrypted on our servers. No one else can access it without your explicit permission.'}
                    </p>
                    <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                      <p className="text-xs text-slate-500 font-mono">
                        ID: {viewingDoc.fileId}<br/>
                        Name: {viewingDoc.name}<br/>
                        Type: {viewingDoc.type}<br/>
                        Size: {viewingDoc.size ? (viewingDoc.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                      {isRtl ? 'وثيقة موثقة ومحمية' : 'Verified & Protected Document'}
                    </div>
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <ShieldCheck size={16} />
                      {isRtl ? 'تم التحقق' : 'Verified'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Viewer3D = ({ propertyId, onClose, t, isRtl }: { propertyId: string, onClose: () => void, t: any, isRtl: boolean }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
       {/* Toolbar */}
       <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="text-white">
            <h3 className="font-bold text-lg">{t.nav_3d_exp || 'Virtual Tour'}</h3>
            <p className="text-sm text-white/70">Property #{propertyId}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur cursor-pointer"><X /></button>
       </div>
       
       {/* Main Viewport */}
       <div className="flex-1 relative flex items-center justify-center bg-slate-900">
          <div className="text-center animate-slide-up">
             <Box className="w-16 h-16 text-brand-500 mx-auto mb-4 opacity-50" />
             <h2 className="text-3xl font-bold text-white mb-2">{isRtl ? 'قريباً' : 'Coming Soon'}</h2>
             <p className="text-slate-400 max-w-md mx-auto mb-8">
               {isRtl ? 'ميزة العرض ثلاثي الأبعاد قيد التطوير حالياً وسيتم إطلاقها قريباً.' : 'The 3D virtual tour feature is currently under development and will be available soon.'}
             </p>
             <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full backdrop-blur border border-white/20 transition-colors cursor-pointer">
               {isRtl ? 'العودة للعقارات' : 'Back to Listings'}
             </button>
          </div>
       </div>
    </div>
  );
};

const PropertyModal = ({ property, onClose, onPurchase, t, isRtl }: { property: Property, onClose: () => void, onPurchase: (id: string) => void, t: any, isRtl: boolean }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative h-72">
          <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover" />
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition cursor-pointer"><X size={20}/></button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{property.title}</h2>
              <p className="text-slate-500 flex items-center gap-1"><MapPin size={16}/> {property.location}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-600">{property.price.toLocaleString()} EGP</div>
              <div className="text-sm text-slate-500">{property.status}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-100 my-6">
            <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
              <BedDouble className="text-brand-500 mb-2"/>
              <span className="font-bold text-slate-900">{property.bedrooms}</span>
              <span className="text-xs text-slate-500">{t.prop_beds}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
              <Bath className="text-brand-500 mb-2"/>
              <span className="font-bold text-slate-900">{property.bathrooms}</span>
              <span className="text-xs text-slate-500">{t.prop_baths}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
              <Maximize className="text-brand-500 mb-2"/>
              <span className="font-bold text-slate-900">{property.area} m²</span>
              <span className="text-xs text-slate-500">{isRtl ? 'المساحة' : 'Area'}</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-3">{isRtl ? 'طرق الدفع المتاحة' : 'Available Payment Methods'}</h3>
            <div className="flex flex-wrap gap-2">
              {property.paymentMethods?.map(m => (
                <span key={m} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium border border-brand-100">{m}</span>
              ))}
              {(!property.paymentMethods || property.paymentMethods.length === 0) && (
                <span className="text-slate-500 text-sm">{isRtl ? 'غير محدد' : 'Not specified'}</span>
              )}
            </div>
          </div>

          <Button onClick={() => onPurchase(property.id)} className="w-full py-4 text-lg">
            {isRtl ? 'المتابعة للدفع' : 'Proceed to Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = ({ t, isRtl, onBrowse, onLogout, userEmail }: { t: any, isRtl: boolean, onBrowse: () => void, onLogout: () => void, userEmail: string | null }) => {
  const [profile, setProfile] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
          setEditForm(userDoc.data());
        }
        
        // Fetch purchases (mocked for now but could be real)
        const res = await api.getProfile(userEmail);
        if (res.success && res.data) {
          setPurchases(res.data.purchases);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [userEmail]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), editForm);
      setProfile(editForm);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand-500 w-8 h-8"/></div>;
  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{isRtl ? 'الملف الشخصي' : 'Personal Profile'}</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
              <Edit2 size={16} /> {isRtl ? 'تعديل البيانات' : 'Edit Profile'}
            </Button>
          ) : (
            <>
              <Button onClick={() => { setIsEditing(false); setEditForm(profile); }} variant="outline">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isRtl ? 'حفظ' : 'Save'}
              </Button>
            </>
          )}
          <Button onClick={onLogout} variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
            <LogOut size={16} /> {isRtl ? 'تسجيل الخروج' : 'Sign Out'}
          </Button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4 relative">
              {profile.name.charAt(0)}
              {userEmail === 'abdallahahmedpilot2426@gmail.com' && (
                <div className="absolute -bottom-1 -right-1 bg-brand-600 text-white p-1 rounded-full border-2 border-white" title="Admin">
                  <Shield size={14} />
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'الاسم' : 'Name'}</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input 
                    type="email" 
                    value={editForm.email} 
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'رقم الهاتف' : 'Phone'}</label>
                  <input 
                    type="tel" 
                    value={editForm.phone} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                <p className="text-slate-500 text-sm mb-4">{profile.email}</p>
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-600"><Phone size={16}/> {profile.phone}</div>
                </div>
              </>
            )}
          </div>

          <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100">
            <h3 className="font-bold text-brand-900 flex items-center gap-2 mb-3"><Target size={18}/> {isRtl ? 'تفضيلاتك' : 'Your Preferences'}</h3>
            {isEditing ? (
              <textarea 
                value={editForm.preferences} 
                onChange={e => setEditForm({...editForm, preferences: e.target.value})}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none min-h-[100px] text-sm"
              />
            ) : (
              <p className="text-sm text-brand-700 leading-relaxed">{profile.preferences}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-bold text-slate-900 mb-6">{isRtl ? 'سجل المشتريات' : 'Purchase History'}</h2>
          <div className="space-y-4">
            {purchases.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-center">
                <img src={p.property?.imageUrl} className="w-24 h-24 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900">{p.property?.title}</h4>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">{p.status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{p.property?.location}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-brand-600">{p.property?.price.toLocaleString()} EGP</span>
                    <span className="text-slate-400">{isRtl ? 'تاريخ:' : 'Date:'} {p.purchaseDate}</span>
                  </div>
                </div>
              </div>
            ))}
            {purchases.length === 0 && (
              <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-500 border border-slate-200">
                <p className="mb-4">{isRtl ? 'لا توجد مشتريات حتى الآن.' : 'No purchases yet.'}</p>
                <Button onClick={onBrowse}>{isRtl ? 'تصفح العقارات' : 'Browse Properties'}</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentPage = ({ property, onConfirm, onCancel, t, isRtl }: { property: Property, onConfirm: () => void, onCancel: () => void, t: any, isRtl: boolean }) => {
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onConfirm();
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{isRtl ? 'الدفع' : 'Payment'}</h1>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
          <img src={property.imageUrl} className="w-24 h-24 rounded-lg object-cover" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">{property.title}</h2>
            <p className="text-slate-500">{property.location}</p>
            <div className="text-xl font-bold text-brand-600 mt-2">{property.price.toLocaleString()} EGP</div>
          </div>
        </div>
        
        <div className="space-y-6">
          <h3 className="font-bold text-slate-900">{isRtl ? 'تفاصيل البطاقة' : 'Card Details'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'رقم البطاقة' : 'Card Number'}</label>
              <div className="relative">
                <CreditCard className={`absolute top-3 text-slate-400 w-5 h-5 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input type="text" placeholder="0000 0000 0000 0000" className={`w-full py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                <input type="text" placeholder="MM/YY" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CVC</label>
                <input type="text" placeholder="123" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button onClick={handlePay} disabled={processing} className="flex-1 py-3 text-lg">
              {processing ? <Loader2 className="animate-spin mx-auto"/> : (isRtl ? 'تأكيد الدفع' : 'Confirm Payment')}
            </Button>
            <button onClick={onCancel} className="px-6 py-3 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddListingPage = ({ onAdd, t, isRtl }: { onAdd: (prop: Omit<Property, 'id'>) => void, t: any, isRtl: boolean }) => {
  const [formData, setFormData] = useState({
    title: '', price: '', location: '', bedrooms: '1', bathrooms: '1', area: '', imageUrl: '', status: 'For Sale'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onAdd({
      title: formData.title,
      price: Number(formData.price),
      location: formData.location,
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
      area: Number(formData.area),
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800',
      status: formData.status as 'For Sale' | 'For Rent',
      isVerified: false,
      paymentMethods: ['Cash']
    });
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{isRtl ? 'إضافة عقار جديد' : 'Add New Listing'}</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'عنوان العقار' : 'Property Title'}</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'السعر' : 'Price'}</label>
            <div className="relative">
              <input 
                required 
                type="text" 
                inputMode="numeric"
                value={formData.price} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({...formData, price: val});
                }} 
                className={`w-full py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none ${isRtl ? 'pr-4 pl-16' : 'pl-4 pr-16'}`}
                placeholder="0"
              />
              <div className={`absolute top-1/2 -translate-y-1/2 text-slate-500 font-medium ${isRtl ? 'left-4' : 'right-4'}`}>
                EGP
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'الموقع' : 'Location'}</label>
            <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'الحالة' : 'Status'}</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none">
              <option value="For Sale">{isRtl ? 'للبيع' : 'For Sale'}</option>
              <option value="For Rent">{isRtl ? 'للإيجار' : 'For Rent'}</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'غرف النوم' : 'Bedrooms'}</label>
              <input required type="number" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'الحمامات' : 'Bathrooms'}</label>
              <input required type="number" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'المساحة (م²)' : 'Area (m²)'}</label>
              <input required type="number" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">{isRtl ? 'رابط الصورة' : 'Image URL'}</label>
            <div className="relative">
              <input 
                type="text"
                value={formData.imageUrl} 
                onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                onPaste={e => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText) {
                    setFormData({...formData, imageUrl: pastedText});
                  }
                }}
                placeholder="https://images.unsplash.com/..." 
                className={`w-full py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none ${isRtl ? 'pr-4 pl-12' : 'pl-4 pr-12'}`} 
              />
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setFormData({...formData, imageUrl: text});
                  } catch (err) {
                    console.error('Failed to read clipboard contents: ', err);
                  }
                }}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer ${isRtl ? 'left-3' : 'right-3'}`}
                title={isRtl ? 'لصق الرابط' : 'Paste URL'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">{isRtl ? 'يمكنك لصق رابط الصورة مباشرة هنا' : 'You can paste the image URL directly here'}</p>
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full py-3 text-lg">
          {submitting ? <Loader2 className="animate-spin mx-auto"/> : (isRtl ? 'إضافة العقار' : 'Add Listing')}
        </Button>
      </form>
    </div>
  );
};

// Manage Users Page for Super Admin
const ManageUsersPage = ({ isRtl }: { isRtl: boolean }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    setUpdating(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Check permissions.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="text-brand-600" size={32} />
        <h1 className="text-3xl font-bold text-slate-900">
          {isRtl ? 'إدارة المستخدمين' : 'Manage Users'}
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">{isRtl ? 'المستخدم' : 'User'}</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">{isRtl ? 'البريد الإلكتروني' : 'Email'}</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">{isRtl ? 'الدور' : 'Role'}</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">{isRtl ? 'الإجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{user.name || 'Anonymous'}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.email !== 'marwaneltaweel0@gmail.com' && user.email !== 'abdallahahmedpilot2426@gmail.com' ? (
                    <Button 
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={updating === user.id}
                      variant="outline"
                      className="text-xs py-1 px-3"
                    >
                      {updating === user.id ? '...' : (user.role === 'admin' ? (isRtl ? 'إزالة أدمن' : 'Remove Admin') : (isRtl ? 'جعل أدمن' : 'Make Admin'))}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">{isRtl ? 'سوبر أدمن' : 'Super Admin'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [listingSearchQuery, setListingSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'>('default');
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [paymentProperty, setPaymentProperty] = useState<Property | null>(null);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        const superAdminEmails = ["marwaneltaweel0@gmail.com", "abdallahahmedpilot2426@gmail.com"];
        const isSuper = superAdminEmails.includes(user.email || "");
        setIsSuperAdmin(isSuper);

        // Fetch user data from Firestore to get role and name
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsAdmin(userData.role === 'admin' || isSuper);
            setUserName(userData.name || user.displayName);
          } else {
            setIsAdmin(isSuper);
            setUserName(user.displayName);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setIsAdmin(isSuper);
          setUserName(user.displayName);
        }
      } else {
        setUserEmail(null);
        setUserName(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleNav('home');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAiSearch = async () => {
    if (!listingSearchQuery.trim()) {
      setAiFilteredIds(null);
      return;
    }
    
    setIsAiSearching(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        You are an AI real estate assistant. Return ONLY a JSON array of property IDs that match the user's search query.
        User Query: "${listingSearchQuery}"
        Available Properties:
        ${JSON.stringify(properties.map(p => ({ id: p.id, title: p.title, location: p.location, price: p.price, type: p.status })), null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of property IDs matching the search query"
          }
        }
      });

      const ids = JSON.parse(response.text || "[]");
      setAiFilteredIds(ids);
    } catch (err) {
      console.error("AI Search Error:", err);
      // Fallback to null if error
      setAiFilteredIds(null);
    } finally {
      setIsAiSearching(false);
    }
  };

  let filteredProperties = properties.filter(p => {
    const matchesPrice = (minPrice === '' || p.price >= Number(minPrice)) &&
                         (maxPrice === '' || p.price <= Number(maxPrice));
    
    if (aiFilteredIds !== null) {
      return aiFilteredIds.includes(p.id) && matchesPrice;
    }
    return (p.title.toLowerCase().includes(listingSearchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(listingSearchQuery.toLowerCase())) && matchesPrice;
  });

  if (sortBy === 'price-asc') {
    filteredProperties.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    filteredProperties.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'name-asc') {
    filteredProperties.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'name-desc') {
    filteredProperties.sort((a, b) => b.title.localeCompare(a.title));
  }

  // Initial Fetch from Firestore
  useEffect(() => {
    const fetchProps = async () => {
      setLoadingProps(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'properties'));
        const propsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];
        
        // If no properties in Firestore yet, use mock data as fallback or initial seed
        if (propsData.length === 0) {
          const res = await api.getProperties();
          if (res.success && res.data) setProperties(res.data);
        } else {
          setProperties(propsData);
        }
      } catch (err) {
        console.error("Error fetching properties from Firestore:", err);
        // Fallback to mock API if Firestore fails
        const res = await api.getProperties();
        if (res.success && res.data) setProperties(res.data);
      } finally {
        setLoadingProps(false);
      }
    };
    fetchProps();
  }, []);

  // SEO Schema
  useEffect(() => {
    if (document.getElementById('schema-json-ld')) return;
    const script = document.createElement('script');
    script.id = 'schema-json-ld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      "name": "HETTETY",
      "image": "https://www.hettety.com/logo.png",
      "description": INITIAL_ENTITY_DATA.shortDescription,
      "address": { "@type": "PostalAddress", "addressCountry": "EG" }
    });
    document.head.appendChild(script);
  }, []);

  const handleNav = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  const open3D = (id: string) => {
    setSelectedPropertyId(id);
    handleNav('3d');
  };

  const NavLink = ({ page, label }: { page: Page, label: string }) => (
    <button onClick={() => handleNav(page)} className={`font-medium transition-colors cursor-pointer ${currentPage === page ? 'text-accent-600' : 'text-brand-900 hover:text-brand-600'}`}>{label}</button>
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 text-brand-900 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="cursor-pointer" onClick={() => handleNav('home')}><Logo color="#1e3a8a" className="h-10 w-auto" /></div>
            <div className="hidden md:flex items-center gap-6">
              <NavLink page="home" label={t.nav_home} /><NavLink page="listings" label={t.nav_listings} />
              <button onClick={() => handleNav('3d-experience')} className={`font-medium transition-colors flex items-center gap-1 cursor-pointer ${currentPage === '3d-experience' ? 'text-accent-600' : 'text-brand-900 hover:text-brand-600'}`}><Box size={16} />{t.nav_3d_exp}</button>
              <NavLink page="legal" label={t.nav_trust} /><NavLink page="ai-chat" label={t.nav_ai} /><NavLink page="about" label={t.footer_about} />
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="p-2 rounded-full hover:bg-slate-100 text-brand-900 transition-colors flex items-center gap-1 cursor-pointer">
              <Globe size={20} /> <span className="text-sm font-bold uppercase">{lang === 'en' ? 'عربي' : 'EN'}</span>
            </button>
            {isAdmin && (
              <button onClick={() => handleNav('add-listing')} className="p-2 rounded-full hover:bg-slate-100 text-brand-900 transition-colors cursor-pointer" aria-label="Add Listing"><PlusCircle size={24} /></button>
            )}
            {isSuperAdmin && (
              <button onClick={() => handleNav('manage-users')} className="p-2 rounded-full hover:bg-slate-100 text-brand-900 transition-colors cursor-pointer" title={isRtl ? 'إدارة المستخدمين' : 'Manage Users'}><Shield size={24} /></button>
            )}
            <button onClick={() => handleNav('profile')} className="p-2 rounded-full hover:bg-slate-100 text-brand-900 transition-colors cursor-pointer" aria-label="Profile"><User size={24} /></button>
          </div>
          <button className="md:hidden cursor-pointer text-brand-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 p-4 space-y-4 shadow-xl absolute w-full top-20 left-0 z-40 animate-fade-in text-brand-900">
            <div className="flex flex-col gap-4">
              <NavLink page="home" label={t.nav_home} /><NavLink page="listings" label={t.nav_listings} />
              <button onClick={() => handleNav('3d-experience')} className={`font-medium transition-colors flex items-center gap-2 cursor-pointer ${currentPage === '3d-experience' ? 'text-accent-600' : 'text-brand-900 hover:text-brand-600'}`}><Box size={16} />{t.nav_3d_exp}</button>
              <NavLink page="legal" label={t.nav_trust} /><NavLink page="ai-chat" label={t.nav_ai} /><NavLink page="about" label={t.footer_about} />
              <div className="flex justify-between items-center py-2 border-t border-slate-200">
                <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="flex items-center gap-2 font-medium text-brand-900 cursor-pointer">
                    <Globe size={20} /> {lang === 'en' ? 'العربية' : 'English'}
                </button>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => { handleNav('add-listing'); setMobileMenuOpen(false); }} 
                  className="flex items-center gap-2 font-medium text-brand-900 hover:text-brand-600 cursor-pointer"
                >
                  <PlusCircle size={20} /> {isRtl ? 'إضافة عقار' : 'Add Listing'}
                </button>
              )}
              {isSuperAdmin && (
                <button 
                  onClick={() => { handleNav('manage-users'); setMobileMenuOpen(false); }} 
                  className="flex items-center gap-2 font-medium text-brand-900 hover:text-brand-600 cursor-pointer"
                >
                  <Shield size={20} /> {isRtl ? 'إدارة المستخدمين' : 'Manage Users'}
                </button>
              )}
              <button 
                onClick={() => { handleNav('profile'); setMobileMenuOpen(false); }} 
                className="flex items-center gap-2 font-medium text-brand-900 hover:text-brand-600 cursor-pointer"
              >
                <User size={20} /> {isRtl ? 'الملف الشخصي' : 'Profile'}
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 bg-slate-50">
        {currentPage === 'home' && (
          <>
            <PremiumHero 
              onPrimaryCta={() => handleNav('register')} 
              onSecondaryCta={() => handleNav('listings')} 
              t={t}
              isRtl={isRtl}
            />
            <Features t={t} />
            <div className="py-20 max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-end mb-10">
                <div><h2 className="text-3xl font-heading font-bold text-brand-900 mb-2">{t.prop_featured}</h2><p className="text-slate-600">{t.prop_subtitle}</p></div>
                <button onClick={() => handleNav('listings')} className="text-accent-600 font-bold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">{t.prop_view_all} {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}</button>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {loadingProps 
                  ? [1,2,3].map(i => <div key={i} className="h-96 bg-slate-200 rounded-2xl animate-pulse"></div>)
                  : properties.slice(0, 3).map(p => <PropertyCard key={p.id} property={p} onView3D={() => open3D(p.id)} onClick={() => setViewingProperty(p)} t={t} isRtl={isRtl} />)
                }
              </div>
            </div>
          </>
        )}

        {currentPage === 'listings' && (
          <div className="py-12 max-w-7xl mx-auto px-4">
            <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
               <h1 className="text-3xl font-heading font-bold text-slate-900">{t.prop_avail}</h1>
               <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64 flex gap-2">
                   <div className="relative flex-1">
                     <Search className={`absolute top-3 text-slate-400 w-4 h-4 ${isRtl ? 'right-3' : 'left-3'}`} />
                     <input 
                       placeholder={t.prop_search} 
                       value={listingSearchQuery}
                       onChange={(e) => {
                         setListingSearchQuery(e.target.value);
                         setAiFilteredIds(null);
                       }}
                       onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                       className={`w-full py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-black ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} 
                     />
                   </div>
                   <button 
                     onClick={handleAiSearch}
                     disabled={isAiSearching || !listingSearchQuery.trim()}
                     className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     title={isRtl ? 'بحث بالذكاء الاصطناعي' : 'AI Search'}
                   >
                     {isAiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                   </button>
                 </div>
                 <div className="relative flex-1 md:w-32">
                   <DollarSign className={`absolute top-3 text-slate-400 w-4 h-4 ${isRtl ? 'right-3' : 'left-3'}`} />
                   <input 
                     type="number"
                     min="0"
                     placeholder={isRtl ? 'الحد الأدنى' : 'Min Price'} 
                     value={minPrice}
                     onChange={(e) => {
                       const val = e.target.value;
                       if (val === '') setMinPrice('');
                       else if (Number(val) >= 0) setMinPrice(Number(val));
                     }}
                     className={`w-full py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-black ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} 
                   />
                 </div>
                 <div className="relative flex-1 md:w-32">
                   <DollarSign className={`absolute top-3 text-slate-400 w-4 h-4 ${isRtl ? 'right-3' : 'left-3'}`} />
                   <input 
                     type="number"
                     min="0"
                     placeholder={isRtl ? 'الحد الأقصى' : 'Max Price'} 
                     value={maxPrice}
                     onChange={(e) => {
                       const val = e.target.value;
                       if (val === '') setMaxPrice('');
                       else if (Number(val) >= 0) setMaxPrice(Number(val));
                     }}
                     className={`w-full py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-black ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} 
                   />
                 </div>
                 <select 
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value as any)}
                   className="py-2.5 px-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none text-black bg-white"
                 >
                   <option value="default">{isRtl ? 'الترتيب الافتراضي' : 'Default Sort'}</option>
                   <option value="price-asc">{isRtl ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                   <option value="price-desc">{isRtl ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                   <option value="name-asc">{isRtl ? 'الاسم: أ إلى ي' : 'Name: A to Z'}</option>
                   <option value="name-desc">{isRtl ? 'الاسم: ي إلى أ' : 'Name: Z to A'}</option>
                 </select>
               </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
               {loadingProps 
                  ? [1,2,3,4,5,6].map(i => <div key={i} className="h-96 bg-slate-200 rounded-2xl animate-pulse"></div>)
                  : filteredProperties.map(p => <PropertyCard key={p.id} property={p} onView3D={() => open3D(p.id)} onClick={() => setViewingProperty(p)} t={t} isRtl={isRtl} />)
               }
            </div>
          </div>
        )}

        {currentPage === 'manage-users' && isSuperAdmin && <ManageUsersPage isRtl={isRtl} />}
        {currentPage === 'ai-chat' && <div className="bg-slate-100 h-full py-8"><AIChat t={t} isRtl={isRtl} properties={properties} userName={userName} /></div>}
        {currentPage === 'legal' && <LegalCenter t={t} isRtl={isRtl} />}
        {currentPage === 'about' && <AboutPage onCta={() => handleNav('register')} t={t} isRtl={isRtl} />}
        {currentPage === 'terms' && <TermsPage t={t} isRtl={isRtl} />}
        {currentPage === 'privacy' && <PrivacyPage t={t} isRtl={isRtl} />}
        {currentPage === 'cookie-policy' && <CookiePolicyPage t={t} isRtl={isRtl} />}
        {currentPage === 'buy' && <BuyPropertyPage onCta={() => handleNav('listings')} t={t} isRtl={isRtl} />}
        {currentPage === 'verification' && <VerificationPage onCta={() => handleNav('legal')} t={t} isRtl={isRtl} />}
        {currentPage === 'tours' && <Tours3DPage onCta={() => handleNav('3d-experience')} t={t} isRtl={isRtl} />}
        {currentPage === '3d' && selectedPropertyId && <Viewer3D propertyId={selectedPropertyId} onClose={() => { setSelectedPropertyId(null); handleNav('listings'); }} t={t} isRtl={isRtl} />}
        {currentPage === '3d-experience' && <ComingSoon3D t={t} isRtl={isRtl} />}
        {currentPage === 'profile' && <ProfilePage t={t} isRtl={isRtl} onBrowse={() => handleNav('listings')} onLogout={() => { setIsAdmin(false); handleNav('login'); }} userEmail={userEmail} />}
        {currentPage === 'payment' && paymentProperty && (
          <PaymentPage 
            property={paymentProperty} 
            onConfirm={async () => {
              await api.purchaseProperty(paymentProperty.id);
              handleNav('profile');
              setPaymentProperty(null);
            }} 
            onCancel={() => {
              setPaymentProperty(null);
              handleNav('listings');
            }} 
            t={t} 
            isRtl={isRtl} 
          />
        )}
        {currentPage === 'add-listing' && (
          <AddListingPage 
            onAdd={async (prop) => {
              try {
                await addDoc(collection(db, 'properties'), {
                  ...prop,
                  authorUid: auth.currentUser?.uid || 'anonymous'
                });
                // Refresh properties
                const querySnapshot = await getDocs(collection(db, 'properties'));
                const propsData = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as Property[];
                setProperties(propsData);
                handleNav('listings');
              } catch (err) {
                console.error("Error adding property to Firestore:", err);
                // Fallback to mock API if Firestore fails
                const res = await api.addProperty(prop);
                if (res.success) {
                  const res2 = await api.getProperties();
                  if (res2.success && res2.data) setProperties(res2.data);
                  handleNav('listings');
                }
              }
            }} 
            t={t} 
            isRtl={isRtl} 
          />
        )}
        
        {currentPage === 'login' && <AuthForm type="login" onSwitch={() => handleNav('register')} onSubmit={(email) => { setUserEmail(email); handleNav('home'); }} t={t} isRtl={isRtl} />}
        {currentPage === 'register' && <AuthForm type="register" onSwitch={() => handleNav('login')} onSubmit={(email) => { setUserEmail(email); handleNav('home'); }} t={t} isRtl={isRtl} />}

        {currentPage === 'contact' && (
           <div className="max-w-4xl mx-auto px-4 py-16">
             <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
               <div className="bg-slate-900 p-10 text-white md:w-2/5 flex flex-col justify-between">
                  <div><h2 className="text-2xl font-heading font-bold mb-6">{t.contact_title}</h2><p className="text-slate-400 mb-8">{t.contact_desc}</p></div>
                  <div className="pt-10"><Logo color="white" className="h-10" /></div>
               </div>
               <div className="p-10 md:w-3/5">
                 <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                   <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.auth_email}</label><input type="email" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none text-black" placeholder="you@example.com" /></div>
                   <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.contact_msg}</label><textarea rows={4} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none text-black" placeholder="I'm interested in..." /></div>
                   <Button className="w-full">{t.contact_btn}</Button>
                 </form>
               </div>
             </div>
           </div>
        )}
      </main>

      {/* Cookie Consent Modal */}
      <CookieConsent t={t} isRtl={isRtl} onNavigateToLegal={handleNav} />

      {viewingProperty && (
        <PropertyModal
          property={viewingProperty}
          onClose={() => setViewingProperty(null)}
          onPurchase={(id) => {
            setViewingProperty(null);
            setPaymentProperty(viewingProperty);
            handleNav('payment');
          }}
          t={t}
          isRtl={isRtl}
        />
      )}

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div><div className="flex items-center gap-2 mb-4 text-white"><Logo color="white" className="h-8" /></div><p className="text-sm">{t.footer_desc}</p></div>
          <div>
            <h4 className="text-white font-bold mb-4">{t.footer_services}</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => handleNav('buy')} className="hover:text-white transition-colors">{t.footer_buy}</button></li>
              <li><button onClick={() => handleNav('verification')} className="hover:text-white transition-colors">{t.footer_verify}</button></li>
              <li><button onClick={() => handleNav('tours')} className="hover:text-white transition-colors">{t.footer_3d}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">{t.footer_company}</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => handleNav('about')} className="hover:text-white transition-colors">{t.footer_about}</button></li>
              <li><button onClick={() => handleNav('terms')} className="hover:text-white transition-colors">{t.footer_terms}</button></li>
              <li><button onClick={() => handleNav('privacy')} className="hover:text-white transition-colors">{t.nav_privacy}</button></li>
              <li><button onClick={() => handleNav('cookie-policy')} className="hover:text-white transition-colors">{t.nav_cookie}</button></li>
            </ul>
          </div>
          <div><h4 className="text-white font-bold mb-4">{t.footer_connect}</h4><div className="flex gap-4"><div className="w-8 h-8 bg-slate-800 rounded-full hover:bg-brand-500 cursor-pointer flex items-center justify-center text-white text-xs">F</div><div className="w-8 h-8 bg-slate-800 rounded-full hover:bg-brand-500 cursor-pointer flex items-center justify-center text-white text-xs">I</div></div></div>
        </div>
      </footer>
    </div>
  );
}
