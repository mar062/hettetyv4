import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, DollarSign, TrendingUp,
  CheckCircle2, AlertTriangle, XCircle,
  Building2, MapPin,
  Sliders, RefreshCw, Send, User, Layers,
  Check, Percent, Landmark, PieChart, MessageSquare, Box, Download
} from 'lucide-react';
import { Property, ChatMessage, ChatSession, AdvisorFinancialProfile, AdvisorPropertyFit, InvestmentPurpose } from '../types';
import { createChat, extract3DMarker, extractAdvisorState, withRetry, isOverloadedError, aiErrorMessage } from '../ai';
import { auth, db, doc, updateDoc, addDoc, collection, query, where, onSnapshot } from '../firebase';
import { api } from '../mockApi';

interface RealEstateAdvisorProps {
  t: any;
  isRtl: boolean;
  properties: Property[];
  userName?: string | null;
  onShow3D?: (propertyId: string) => void;
  onOpenProperty?: (propertyId: string) => void;
}

// Default benchmark financial yields by Egyptian district & property classification
export const DISTRICT_BENCHMARKS: Record<string, { rentalYield: number; capitalGrowth: number }> = {
  'New Cairo': { rentalYield: 8.5, capitalGrowth: 20 },
  'التجمع': { rentalYield: 8.5, capitalGrowth: 20 },
  'التجمع الخامس': { rentalYield: 8.5, capitalGrowth: 20 },
  'القاهرة الجديدة': { rentalYield: 8.5, capitalGrowth: 20 },
  'Sheikh Zayed': { rentalYield: 8.0, capitalGrowth: 19 },
  'الشيخ زايد': { rentalYield: 8.0, capitalGrowth: 19 },
  '6th of October': { rentalYield: 7.5, capitalGrowth: 18 },
  'أكتوبر': { rentalYield: 7.5, capitalGrowth: 18 },
  'North Coast': { rentalYield: 14.0, capitalGrowth: 24 },
  'الساحل': { rentalYield: 14.0, capitalGrowth: 24 },
  'الساحل الشمالي': { rentalYield: 14.0, capitalGrowth: 24 },
  'New Capital': { rentalYield: 11.5, capitalGrowth: 22 },
  'العاصمة الإدارية': { rentalYield: 11.5, capitalGrowth: 22 },
  'Maadi': { rentalYield: 7.5, capitalGrowth: 16 },
  'المعادي': { rentalYield: 7.5, capitalGrowth: 16 },
  'Shorouk': { rentalYield: 8.0, capitalGrowth: 18 },
  'الشروق': { rentalYield: 8.0, capitalGrowth: 18 },
  'Default': { rentalYield: 8.0, capitalGrowth: 19 },
};

export const getDistrictBenchmark = (location: string, propertyType?: string) => {
  const normLoc = (location || '').toLowerCase();
  let found = DISTRICT_BENCHMARKS['Default'];

  for (const [key, val] of Object.entries(DISTRICT_BENCHMARKS)) {
    if (key !== 'Default' && normLoc.includes(key.toLowerCase())) {
      found = val;
      break;
    }
  }

  // Commercial & Administrative units enjoy 2.5% - 4% higher rental yields in Egypt
  const normType = (propertyType || '').toLowerCase();
  if (normType.includes('office') || normType.includes('مكتب') || normType.includes('retail') || normType.includes('محل') || normType.includes('تجاري')) {
    return {
      rentalYield: found.rentalYield + 3.5,
      capitalGrowth: found.capitalGrowth + 1.5,
    };
  }

  // Coastal chalets have high seasonal yields
  if (normType.includes('chalet') || normType.includes('شاليه')) {
    return {
      rentalYield: Math.max(found.rentalYield, 13.0),
      capitalGrowth: Math.max(found.capitalGrowth, 22.0),
    };
  }

  return found;
};

export const calculatePropertyFit = (
  property: Property,
  profile: AdvisorFinancialProfile,
  isRtl: boolean
): AdvisorPropertyFit => {
  const price = property.price || property.projectPriceFrom || 0;
  const currency = property.currency || 'EGP';

  // 1. Calculate down payment and installment structure
  let downPercent = 15;
  let installmentYears = 6;

  if (property.paymentPlans && property.paymentPlans.length > 0) {
    const bestPlan = property.paymentPlans[0];
    if (bestPlan.downPayment && bestPlan.downPayment > 0) {
      downPercent = bestPlan.downPayment;
    }
    if (bestPlan.years && bestPlan.years > 0) {
      installmentYears = bestPlan.years;
    }
  }

  const downPaymentRequired = Math.round(price * (downPercent / 100));
  const remainingPrincipal = Math.max(0, price - downPaymentRequired);
  const monthlyInstallment = installmentYears > 0 ? Math.round(remainingPrincipal / (installmentYears * 12)) : 0;

  // 2. Yield & ROI metrics
  const benchmark = getDistrictBenchmark(property.location, property.propertyType);
  const rentalYieldPercent = benchmark.rentalYield;
  const capitalAppreciationPercent = benchmark.capitalGrowth;
  const estimatedAnnualRent = Math.round(price * (rentalYieldPercent / 100));
  const totalAnnualReturnPercent = Math.round((rentalYieldPercent + capitalAppreciationPercent) * 10) / 10;
  const totalAnnualGain = estimatedAnnualRent + Math.round(price * (capitalAppreciationPercent / 100));
  const paybackYears = totalAnnualGain > 0 ? Math.round((price / totalAnnualGain) * 10) / 10 : 10;

  // 3. Score & Suitability
  const reasons: string[] = [];
  let score = 100;

  // Budget comparison
  if (profile.budget > 0 && price > 0) {
    if (price <= profile.budget) {
      reasons.push(isRtl ? `السعر ضمن ميزانيتك المقدرة (${price.toLocaleString()} ${currency})` : `Price within your target budget (${price.toLocaleString()} ${currency})`);
    } else {
      const diff = price - profile.budget;
      const ratio = diff / profile.budget;
      if (ratio <= 0.15) {
        score -= 15;
        reasons.push(isRtl ? `أعلى من الميزانية بنسبة طفيفة (${Math.round(ratio * 100)}%) — يمكن تعويضها بالقسط المريح` : `Slightly above budget (${Math.round(ratio * 100)}%) — manageable with installments`);
      } else {
        score -= 35;
        reasons.push(isRtl ? `يتجاوز الميزانية بـ ${diff.toLocaleString()} ${currency}` : `Exceeds total budget by ${diff.toLocaleString()} ${currency}`);
      }
    }
  }

  // Down payment comparison
  if (profile.downPayment > 0 && downPaymentRequired > 0) {
    if (downPaymentRequired <= profile.downPayment) {
      reasons.push(isRtl ? `المقدم المطلوب (${downPaymentRequired.toLocaleString()} ${currency} - ${downPercent}%) متاح بالكامل في كاشك` : `Required down payment (${downPaymentRequired.toLocaleString()} ${currency} - ${downPercent}%) fully covered`);
    } else {
      const downDiff = downPaymentRequired - profile.downPayment;
      if (downDiff <= profile.downPayment * 0.2) {
        score -= 10;
        reasons.push(isRtl ? `المقدم المطلوب يحتاج زيادة بسيطة (${downDiff.toLocaleString()} ${currency})` : `Down payment requires extra ${downDiff.toLocaleString()} ${currency}`);
      } else {
        score -= 30;
        reasons.push(isRtl ? `المقدم المطلوب يتجاوز الكاش المتاح لديك بفارق ${downDiff.toLocaleString()} ${currency}` : `Required down payment exceeds available cash by ${downDiff.toLocaleString()} ${currency}`);
      }
    }
  }

  // Monthly installment comparison
  if (profile.monthlyCapacity > 0 && monthlyInstallment > 0) {
    if (monthlyInstallment <= profile.monthlyCapacity) {
      reasons.push(isRtl ? `القسط الشهري (${monthlyInstallment.toLocaleString()} ${currency}/شهر) مناسب لقدرتك المحددة` : `Monthly payment (${monthlyInstallment.toLocaleString()} ${currency}/mo) fits your capacity`);
    } else {
      const instDiff = monthlyInstallment - profile.monthlyCapacity;
      if (instDiff <= profile.monthlyCapacity * 0.15) {
        score -= 15;
        reasons.push(isRtl ? `القسط أعلى قليلاً من قدرتك الشهرية بفارق ${instDiff.toLocaleString()} ${currency}` : `Monthly payment slightly exceeds limit by ${instDiff.toLocaleString()} ${currency}`);
      } else {
        score -= 35;
        reasons.push(isRtl ? `القسط الشهري (${monthlyInstallment.toLocaleString()} ${currency}) يتخطى قدرتك المريحة` : `Monthly payment (${monthlyInstallment.toLocaleString()} ${currency}) exceeds comfortable limit`);
      }
    }
  }

  // Location filter check
  if (profile.preferredLocation && profile.preferredLocation !== 'all' && profile.preferredLocation !== 'All') {
    const locMatch = property.location.toLowerCase().includes(profile.preferredLocation.toLowerCase());
    if (locMatch) {
      score += 5;
      reasons.push(isRtl ? `الموقع يطابق المنطقة المستهدفة (${property.location})` : `Location matches preferred area (${property.location})`);
    } else {
      score -= 15;
    }
  }

  // Purpose check
  if (profile.purpose === 'coastal' && (property.yallaSahel || property.propertyType === 'Chalet')) {
    score += 10;
    reasons.push(isRtl ? 'وحدة ساحلية ممتازة للإيجار الصيفي والعطلات' : 'Prime coastal unit for vacation rental');
  } else if (profile.purpose === 'investment') {
    if (rentalYieldPercent >= 9.0) {
      score += 10;
      reasons.push(isRtl ? `عائد إيجاري جذاب (${rentalYieldPercent}%) يتفوق على متوسط السوق` : `Attractive rental yield (${rentalYieldPercent}%) beating market average`);
    }
  }

  // Clamp score
  const finalScore = Math.max(10, Math.min(100, score));
  let category: 'perfect' | 'stretch' | 'mismatch' = 'perfect';

  const exceedsBudget = profile.budget > 0 && price > profile.budget;
  const exceedsDown = profile.downPayment > 0 && downPaymentRequired > profile.downPayment;
  const exceedsMonthly = profile.monthlyCapacity > 0 && monthlyInstallment > profile.monthlyCapacity;

  if (finalScore >= 80) {
    // If any ceiling is exceeded, downgrade to stretch
    category = (exceedsBudget || exceedsDown || exceedsMonthly) ? 'stretch' : 'perfect';
  } else if (finalScore >= 55) {
    category = 'stretch';
  } else {
    category = 'mismatch';
  }

  return {
    property,
    matchScore: finalScore,
    category,
    reasons,
    downPaymentRequired,
    monthlyInstallment,
    yearsOfInstallments: installmentYears,
    estimatedAnnualRent,
    rentalYieldPercent,
    capitalAppreciationPercent,
    totalAnnualReturnPercent,
    paybackYears,
  };
};

export const RealEstateAdvisor: React.FC<RealEstateAdvisorProps> = ({
  t,
  isRtl,
  properties,
  userName,
  onShow3D,
  onOpenProperty,
}) => {
  // Navigation tabs within the Advisor
  const [activeView, setActiveView] = useState<'split' | 'dashboard' | 'chat'>('split');
  const [fitCategoryFilter, setFitCategoryFilter] = useState<'all' | 'perfect' | 'stretch' | 'mismatch'>('all');

  // User financial profile state
  const [profile, setProfile] = useState<AdvisorFinancialProfile>({
    budget: 5000000,
    downPayment: 1000000,
    monthlyCapacity: 45000,
    currency: 'EGP',
    purpose: 'investment',
    preferredLocation: 'all',
    propertyType: 'All',
    deliveryTimeline: 'all',
  });

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const chatConfigRef = useRef<{ systemInstruction: string } | null>(null);

  // Evaluated properties
  const evaluatedProperties: AdvisorPropertyFit[] = useMemo(() => {
    return properties
      .map(p => calculatePropertyFit(p, profile, isRtl))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [properties, profile, isRtl]);

  const filteredProperties = useMemo(() => {
    if (fitCategoryFilter === 'all') return evaluatedProperties;
    return evaluatedProperties.filter(item => item.category === fitCategoryFilter);
  }, [evaluatedProperties, fitCategoryFilter]);

  const stats = useMemo(() => {
    const perfectCount = evaluatedProperties.filter(p => p.category === 'perfect').length;
    const stretchCount = evaluatedProperties.filter(p => p.category === 'stretch').length;
    const mismatchCount = evaluatedProperties.filter(p => p.category === 'mismatch').length;
    const avgYield = evaluatedProperties.length
      ? (evaluatedProperties.reduce((acc, curr) => acc + curr.rentalYieldPercent, 0) / evaluatedProperties.length).toFixed(1)
      : '8.5';
    const maxYield = evaluatedProperties.length
      ? Math.max(...evaluatedProperties.map(p => p.rentalYieldPercent)).toFixed(1)
      : '14.0';

    return {
      perfectCount,
      stretchCount,
      mismatchCount,
      avgYield,
      maxYield,
      totalCount: evaluatedProperties.length,
    };
  }, [evaluatedProperties]);

  // Firestore Chat Sessions Listener
  useEffect(() => {
    if (!auth.currentUser) {
      setSessions([]);
      return;
    }
    const q = query(
      collection(db, 'chat_sessions'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          ...d,
          id: docSnap.id,
          messages: (d.messages || []).map((m: any) => ({
            ...m,
            timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp)
          }))
        } as ChatSession;
      });
      setSessions(data.sort((a, b) => {
        const timeA = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
        const timeB = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
        return timeB - timeA;
      }));
    });
    return () => unsubscribe();
  }, []);

  // Update messages when switching sessions
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        setMessages(session.messages);
      }
    } else {
      setMessages([]);
    }
  }, [currentSessionId, sessions]);

  // Scroll to bottom on message update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize Real Estate Advisor System Instruction
  useEffect(() => {
    const systemInstruction = `You are HETTETY Real Estate & Investment Advisor (المستشار العقاري والمالي الرسمي لمنصة حتتي).
You are a senior real estate financial consultant specialized in the Egyptian market.

## Key Capabilities:
1. Deep Financial Intelligence:
   - Calculate cashflow, down payments, installments, and annual rental yields (العائد الإيجاري السنوي).
   - Understand Egyptian district trends: New Cairo (التجمع الخامس), Sheikh Zayed (الشيخ زايد), North Coast (الساحل الشمالي), New Capital (العاصمة الإدارية), etc.
   - Advise on residential vs. commercial/administrative yields (commercial usually yields 10-14% vs 7-9% residential).
2. Two-Way Dashboard Synchronization:
   - Whenever the user mentions or implies their budget, down payment, monthly payment capability, target district, or investment goal, you MUST extract it.
   - At the VERY END of your response, ALWAYS append the exact token:
     [ADVISOR_STATE:{"budget":<number>,"downPayment":<number>,"monthlyCapacity":<number>,"currency":"EGP"|"USD","purpose":"residential"|"investment"|"resale"|"coastal","preferredLocation":"<string>"}]
     Only include keys you can determine or update.
3. 3D Tour Launcher:
   - When the user asks to see or tour a property, append [SHOW_3D:<propertyId>] at the end.
4. Professional, Encouraging & Trustworthy Tone:
   - Never say "I cannot provide investment advice." Instead, provide rigorous mathematical analysis based on market data.
   - Remind users that legal documentation should be verified at the Real Estate Publicity Department (الشهر العقاري).

${userName ? `The user's name is ${userName}. Address them warmly by name.` : ''}

Current User Profile State:
${JSON.stringify(profile)}

Available Platform Inventory:
${JSON.stringify(properties.map(p => ({
  id: p.id,
  title: p.title,
  price: p.price,
  location: p.location,
  type: p.propertyType,
  status: p.status,
  downPaymentEstimate: Math.round(p.price * 0.15),
  monthlyInstallmentEstimate: Math.round((p.price * 0.85) / 72),
  has3D: !!(p.panoramas?.length || p.digitalTwinUrl || (p.images && p.images.length > 1))
})), null, 2)}
`;

    chatConfigRef.current = { systemInstruction };
    chatRef.current = createChat({ task: 'chat', config: { systemInstruction } });
  }, [properties, userName, profile]);

  // Handle User Message Sending
  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      let aiText = "";
      if (chatRef.current) {
        try {
          const response: any = await withRetry(() => chatRef.current.sendMessage({ message: userMsg.text }));
          aiText = response.text;
        } catch (apiError: any) {
          if (isOverloadedError(apiError) && chatConfigRef.current) {
            try {
              const history = messages.map(m => ({ role: (m.role === 'model' ? 'model' : 'user') as 'model' | 'user', parts: [{ text: m.text }] }));
              chatRef.current = createChat({
                task: 'chat',
                history,
                config: { systemInstruction: chatConfigRef.current.systemInstruction },
              });
              const response: any = await withRetry(() => chatRef.current.sendMessage({ message: userMsg.text }), 2);
              aiText = response.text;
            } catch (fallbackErr: any) {
              aiText = aiErrorMessage(fallbackErr, isRtl);
            }
          } else {
            aiText = aiErrorMessage(apiError, isRtl);
          }
        }
      } else {
        const response = await api.chat(userMsg.text);
        aiText = response.success ? response.data : "Mock API failed";
      }

      // Check for 3D marker
      const { cleanText: textAfter3D, show3D, propertyId } = extract3DMarker(aiText || '');
      if (show3D && propertyId && onShow3D) {
        onShow3D(propertyId);
      }

      // Check for Advisor State Sync
      const { cleanText: finalText, statePatch } = extractAdvisorState(textAfter3D);
      if (statePatch) {
        setProfile(prev => ({ ...prev, ...statePatch }));
      }

      const modelMsg: ChatMessage = { role: 'model', text: finalText, timestamp: new Date() };
      const finalMessages = [...newMessages, modelMsg];
      setMessages(finalMessages);

      // Persist to Firestore
      if (auth.currentUser) {
        const isFirstMessage = newMessages.length === 1;
        const sessionData = {
          userId: auth.currentUser.uid,
          title: isFirstMessage ? (textToSend.length > 32 ? textToSend.substring(0, 32) + '...' : textToSend) : (sessions.find(s => s.id === currentSessionId)?.title || textToSend),
          messages: finalMessages.map(m => ({
            role: m.role,
            text: m.text,
            timestamp: m.timestamp.toISOString()
          })),
          lastUpdatedAt: new Date().toISOString()
        };

        if (currentSessionId) {
          await updateDoc(doc(db, 'chat_sessions', currentSessionId), sessionData);
        } else {
          const docRef = await addDoc(collection(db, 'chat_sessions'), sessionData);
          setCurrentSessionId(docRef.id);
        }
      }
    } catch (error: any) {
      console.error("Advisor chat error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: isRtl ? 'حدث خطأ أثناء معالجة استشارتك. يرجى المحاولة مرة أخرى.' : 'An error occurred while processing your consultation. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAboutUnit = (propFit: AdvisorPropertyFit) => {
    const prompt = isRtl
      ? `أريد تحليلك الاستشاري لهذه الوحدة: "${propFit.property.title}" في ${propFit.property.location} بسعر ${propFit.property.price.toLocaleString()} ج.م. ما هو تقييمك لعائدها الاستثماري ومدى ملاءمتها لميزانيتي؟`
      : `I need your advisory evaluation for this unit: "${propFit.property.title}" in ${propFit.property.location} priced at ${propFit.property.price.toLocaleString()} EGP. What is your assessment of its ROI and fit with my budget?`;
    
    if (activeView === 'dashboard') {
      setActiveView(window.innerWidth >= 1024 ? 'split' : 'chat');
    }
    handleSend(prompt);
  };

  const handleExportReport = () => {
    const reportDate = new Date().toLocaleDateString();
    const content = `HETTETY AI Real Estate & Financial Advisory Report
=====================================================
Client: ${userName || 'Valued Investor'}
Date: ${reportDate}
Currency: ${profile.currency}

FINANCIAL PROFILE & PARAMETERS
-----------------------------------------------------
- Total Target Budget: ${profile.budget.toLocaleString()} ${profile.currency}
- Available Cash (Down Payment): ${profile.downPayment.toLocaleString()} ${profile.currency}
- Max Monthly Installment Capacity: ${profile.monthlyCapacity.toLocaleString()} ${profile.currency}/month
- Investment Objective: ${profile.purpose}
- Target District: ${profile.preferredLocation}
- Delivery Timeline: ${profile.deliveryTimeline}

MACRO YIELD & ROI PROJECTIONS
-----------------------------------------------------
- Average Annual Rental Yield: ${stats.avgYield}%
- Projected Capital Growth: ~20%
- Estimated 5-Year Rental Return: ${Math.round(profile.budget * (Number(stats.avgYield) / 100) * 5).toLocaleString()} ${profile.currency}
- Estimated 5-Year Asset Value: ~${Math.round(profile.budget * 1.75).toLocaleString()} ${profile.currency}

SUITABILITY MATCHING SUMMARY
-----------------------------------------------------
Total Evaluated Properties: ${evaluatedProperties.length}
* Perfect Matches (مناسب تماماً): ${stats.perfectCount}
* Stretch Matches (فرص واعدة / تعديل بسيط): ${stats.stretchCount}
* Mismatched / Out of Scope (غير متوافق حالياً): ${stats.mismatchCount}

TOP RECOMMENDED PROPERTIES:
${evaluatedProperties.slice(0, 8).map((p, idx) => `
${idx + 1}. [${p.category.toUpperCase()}] ${p.property.title}
   - Price: ${p.property.price.toLocaleString()} ${p.property.currency || 'EGP'}
   - Location: ${p.property.location}
   - Required Down Payment: ${p.downPaymentRequired.toLocaleString()}
   - Monthly Installment: ${p.monthlyInstallment.toLocaleString()}
   - Est. Rental Yield: ${p.rentalYieldPercent}%
   - Suitability Score: ${p.matchScore}%
   - Key Factors: ${p.reasons.join(' | ')}
`).join('')}

-----------------------------------------------------
Disclaimer: Generated by HETTETY AI Advisor for financial planning purposes based on Egyptian market benchmarks. Legal documentation and ownership must be verified with official departments.
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hettety-advisory-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-[calc(100dvh-75px)] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden ${isRtl ? 'font-cairo' : ''}`}>
      {/* Top Advisory Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shrink-0 shadow-sm z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-base sm:text-lg tracking-tight">
                  {t.advisor_title || 'المستشار العقاري والمالي'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">
                  AI Advisor Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                {t.advisor_subtitle || 'تخطيط ذكي للميزانية، حساب العائد السنوي والنمو الرأسمالي، وفحص دقيق لملاءمة العقارات.'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
            <div className="bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2 shrink-0">
              <DollarSign size={14} className="text-brand-500" />
              <div>
                <span className="text-slate-400 block text-[9px] font-bold">{isRtl ? 'الميزانية' : 'Budget'}</span>
                <span className="font-black text-brand-600 dark:text-brand-400">{(profile.budget).toLocaleString()} {profile.currency}</span>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2 shrink-0">
              <TrendingUp size={14} className="text-emerald-500" />
              <div>
                <span className="text-slate-400 block text-[9px] font-bold">{isRtl ? 'متوسط العائد' : 'Avg Yield'}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">~{stats.avgYield}% {isRtl ? 'سنوياً' : '/yr'}</span>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-2 shrink-0">
              <CheckCircle2 size={14} className="text-green-500" />
              <div>
                <span className="text-slate-400 block text-[9px] font-bold">{isRtl ? 'عقارات مناسبة' : 'Matches'}</span>
                <span className="font-black text-green-600 dark:text-green-400">{stats.perfectCount} {isRtl ? 'عقار' : 'units'}</span>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shrink-0 ms-auto md:ms-0">
              <button
                type="button"
                onClick={() => setActiveView('split')}
                className={`hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === 'split' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
              >
                <Layers size={13} /> {t.advisor_tab_split || 'عرض منقسم'}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === 'dashboard' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
              >
                <PieChart size={13} /> {t.advisor_tab_dashboard || 'الداش بورد'}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('chat')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeView === 'chat' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
              >
                <MessageSquare size={13} /> {t.advisor_tab_chat || 'الشات'}
              </button>
            </div>

            {/* Export Plan Report Button */}
            <button
              type="button"
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shrink-0"
              title={isRtl ? 'تحميل تقرير الاستشارة المالي' : 'Export Financial Advisory Report'}
            >
              <Download size={13} />
              <span className="hidden sm:inline">{isRtl ? 'تصدير التقرير' : 'Export Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT / MAIN: Financial & Fit Dashboard */}
        <div className={`flex-1 flex-col overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-8 ${activeView === 'chat' ? 'hidden' : 'flex'} ${activeView === 'split' ? 'lg:w-[55%] xl:w-[60%]' : 'w-full'}`}>
          {/* Section 1: Financial Profile Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                  <Sliders size={18} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                    {isRtl ? 'محددات ملفك المالي والاستثماري' : 'Your Financial & Investment Parameters'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isRtl ? 'عدّل القيم بالسلايدر وسيتم تحديث الحسابات والعقارات المتوافقة لحظياً' : 'Adjust sliders below to live recalculate yields and matching properties'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProfile({
                  budget: 5000000,
                  downPayment: 1000000,
                  monthlyCapacity: 45000,
                  currency: 'EGP',
                  purpose: 'investment',
                  preferredLocation: 'all',
                  propertyType: 'All',
                  deliveryTimeline: 'all',
                })}
                className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 cursor-pointer transition-colors"
                title={isRtl ? 'إعادة ضبط' : 'Reset'}
              >
                <RefreshCw size={13} /> {isRtl ? 'إعادة ضبط' : 'Reset'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Budget */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">{t.advisor_budget_label || 'الميزانية المستهدفة'}</span>
                  <span className="text-brand-600 dark:text-brand-400 font-black text-sm">
                    {profile.budget.toLocaleString()} {profile.currency}
                  </span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={100000000}
                  step={250000}
                  value={profile.budget}
                  onChange={(e) => setProfile(prev => ({ ...prev, budget: Number(e.target.value) }))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>500k</span>
                  <span>25M</span>
                  <span>50M</span>
                  <span>100M+</span>
                </div>
              </div>

              {/* Available Down Payment */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">{t.advisor_down_payment_label || 'الكاش المتاح (المقدم)'}</span>
                  <span className="text-brand-600 dark:text-brand-400 font-black text-sm">
                    {profile.downPayment.toLocaleString()} {profile.currency}
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={Math.min(profile.budget, 50000000)}
                  step={100000}
                  value={profile.downPayment}
                  onChange={(e) => setProfile(prev => ({ ...prev, downPayment: Number(e.target.value) }))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>100k</span>
                  <span>{Math.round((profile.downPayment / (profile.budget || 1)) * 100)}% {isRtl ? 'من الميزانية' : 'of budget'}</span>
                  <span>50M</span>
                </div>
              </div>

              {/* Monthly Installment Capacity */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">{t.advisor_monthly_capacity_label || 'أقصى قسط شهري'}</span>
                  <span className="text-brand-600 dark:text-brand-400 font-black text-sm">
                    {profile.monthlyCapacity.toLocaleString()} {profile.currency}
                  </span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={1000000}
                  step={10000}
                  value={profile.monthlyCapacity}
                  onChange={(e) => setProfile(prev => ({ ...prev, monthlyCapacity: Number(e.target.value) }))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>10k/mo</span>
                  <span>250k/mo</span>
                  <span>1M/mo</span>
                </div>
              </div>
            </div>

            {/* 5-Year Wealth Accumulation & Financial Projection Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white p-5 rounded-2xl border border-brand-800/40 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-500/20 text-brand-300">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white">
                      {isRtl ? 'العائد التراكمي المتوقع خلال 5 سنوات' : 'Projected 5-Year Wealth Accumulation'}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      {isRtl ? `بناءً على ميزانية ${profile.budget.toLocaleString()} ${profile.currency} ومؤشرات السوق المصرية الحالية` : `Based on your ${profile.budget.toLocaleString()} ${profile.currency} budget and Egyptian market benchmarks`}
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <span className="text-[10px] text-slate-400 block font-bold">{isRtl ? 'القيمة المستقبلية التقديرية للأصل' : 'Est. Future Asset Value'}</span>
                  <span className="text-lg font-black text-emerald-400">
                    ~{Math.round(profile.budget * 1.75).toLocaleString()} {profile.currency}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'إجمالي الأقساط الموزعة' : 'Installments Financed'}</span>
                  <span className="font-black text-white text-sm">
                    {Math.max(0, profile.budget - profile.downPayment).toLocaleString()} {profile.currency}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isRtl ? `على مدار 6-8 سنوات مريحة` : `over 6-8 flexible years`}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'صافي إيجار متوقع (5 سنوات)' : 'Est. Rental Income (5 Yrs)'}</span>
                  <span className="font-black text-emerald-400 text-sm">
                    +{Math.round(profile.budget * (Number(stats.avgYield) / 100) * 5).toLocaleString()} {profile.currency}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isRtl ? `بمتوسط ${stats.avgYield}% سنوياً` : `at ~${stats.avgYield}% annual yield`}
                  </span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'مكاسب إعادة البيع والنمو' : 'Projected Capital Gain'}</span>
                  <span className="font-black text-cyan-400 text-sm">
                    +{Math.round(profile.budget * 0.75).toLocaleString()} {profile.currency}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isRtl ? `حماية كاملة من انخفاض الجنيه` : `currency inflation hedge`}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Criteria Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.advisor_purpose_label || 'الهدف الاستثماري'}
                </label>
                <select
                  value={profile.purpose}
                  onChange={(e) => setProfile(prev => ({ ...prev, purpose: e.target.value as InvestmentPurpose }))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">{t.advisor_purpose_all || 'كافة الأهداف'}</option>
                  <option value="residential">{t.advisor_purpose_residential || 'سكن عائلي واستقرار'}</option>
                  <option value="investment">{t.advisor_purpose_investment || 'استثمار وتأجير سنوي'}</option>
                  <option value="resale">{t.advisor_purpose_resale || 'إعادة بيع ونمو رأسمالي'}</option>
                  <option value="coastal">{t.advisor_purpose_coastal || 'مصيف وتأجير سياحي'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  {isRtl ? 'المنطقة المفضلة' : 'Target District'}
                </label>
                <select
                  value={profile.preferredLocation}
                  onChange={(e) => setProfile(prev => ({ ...prev, preferredLocation: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">{isRtl ? 'كافة المناطق' : 'All Districts'}</option>
                  <option value="New Cairo">{isRtl ? 'التجمع الخامس والقاهرة الجديدة' : 'New Cairo'}</option>
                  <option value="Sheikh Zayed">{isRtl ? 'الشيخ زايد و6 أكتوبر' : 'Sheikh Zayed & 6th Oct'}</option>
                  <option value="North Coast">{isRtl ? 'الساحل الشمالي' : 'North Coast (Sahel)'}</option>
                  <option value="New Capital">{isRtl ? 'العاصمة الإدارية الجديدة' : 'New Administrative Capital'}</option>
                  <option value="Maadi">{isRtl ? 'المعادي' : 'Maadi'}</option>
                  <option value="Shorouk">{isRtl ? 'الشروق ومدينتي' : 'Shorouk & Madinaty'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.advisor_timeline_label || 'موعد الاستلام'}
                </label>
                <select
                  value={profile.deliveryTimeline}
                  onChange={(e) => setProfile(prev => ({ ...prev, deliveryTimeline: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">{t.advisor_timeline_all || 'أي موعد'}</option>
                  <option value="ready">{t.advisor_timeline_ready || 'استلام فوري جاهز'}</option>
                  <option value="1-2years">{t.advisor_timeline_1_2 || 'خلال 1 - 2 سنة'}</option>
                  <option value="3+years">{t.advisor_timeline_3_plus || 'تحت الإنشاء (3 سنين فأكثر)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Macro Yield & Financial Return Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Percent size={14} /> {t.advisor_metric_yield || 'العائد الإيجاري المتوقع'}
              </span>
              <div className="mt-2">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {stats.avgYield}%
                </div>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                  {isRtl ? `يصل إلى ${stats.maxYield}% بالتجاري/الساحلي` : `Up to ${stats.maxYield}% in commercial/sahel`}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border border-blue-200/80 dark:border-blue-800/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <TrendingUp size={14} /> {t.advisor_metric_growth || 'النمو الرأسمالي السنوي'}
              </span>
              <div className="mt-2">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  ~20%
                </div>
                <span className="text-[10px] text-blue-700/80 dark:text-blue-400/80 font-medium">
                  {isRtl ? 'حماية ممتازة من التضخم' : 'Strong inflation hedge'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-950/40 dark:to-brand-900/20 border border-brand-200/80 dark:border-brand-800/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-brand-800 dark:text-brand-300 flex items-center gap-1.5">
                <Landmark size={14} /> {t.advisor_metric_total_return || 'إجمالي العائد السنوي'}
              </span>
              <div className="mt-2">
                <div className="text-2xl font-black text-brand-600 dark:text-brand-400">
                  ~{(Number(stats.avgYield) + 20).toFixed(1)}%
                </div>
                <span className="text-[10px] text-brand-700/80 dark:text-brand-400/80 font-medium">
                  {isRtl ? 'إيجار + زيادة سعر الأصل' : 'Rental yield + capital appreciation'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 border border-purple-200/80 dark:border-purple-800/60 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <TrendingUp size={14} /> {t.advisor_metric_payback || 'فترة استرداد رأس المال'}
              </span>
              <div className="mt-2">
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  3.5 - 4.5
                </div>
                <span className="text-[10px] text-purple-700/80 dark:text-purple-400/80 font-medium">
                  {isRtl ? 'سنوات (بالعائد المركّب)' : 'Years (compounded)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Property Matching & Fit Evaluation */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="text-brand-500" size={20} />
                  {isRtl ? 'العقارات المفحوصة والمطابقة لميزانيتك' : 'Properties Evaluated for Your Profile'}
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                    {filteredProperties.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRtl ? 'تحليل ذكي ومباشر لكل عقار: الأقساط، المقدم، والعائد التقديري' : 'Live feasibility analysis for each unit based on your financial constraints'}
                </p>
              </div>

              {/* Match Category Filters */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setFitCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${fitCategoryFilter === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                >
                  {isRtl ? 'الكل' : 'All'} ({stats.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFitCategoryFilter('perfect')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${fitCategoryFilter === 'perfect' ? 'bg-green-600 text-white shadow-sm' : 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40'}`}
                >
                  <CheckCircle2 size={13} /> {isRtl ? 'مناسب معاك' : 'Perfect'} ({stats.perfectCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFitCategoryFilter('stretch')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${fitCategoryFilter === 'stretch' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'}`}
                >
                  <AlertTriangle size={13} /> {isRtl ? 'فرص قريبة' : 'Stretch'} ({stats.stretchCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFitCategoryFilter('mismatch')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${fitCategoryFilter === 'mismatch' ? 'bg-red-600 text-white shadow-sm' : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'}`}
                >
                  <XCircle size={13} /> {isRtl ? 'مش مناسب معاك' : 'Mismatch'} ({stats.mismatchCount})
                </button>
              </div>
            </div>

            {/* Property Cards Grid */}
            {filteredProperties.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                <Building2 size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'لا توجد عقارات تطابق هذا الفلتر حالياً' : 'No properties match this filter currently'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isRtl ? 'يمكنك زيادة نطاق الميزانية أو تجربة اختيار مناطق إضافية في محددات الملف المالي بالأعلى.' : 'Try expanding your budget parameters or choosing additional districts above.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProperties.map(fit => {
                  const { property, matchScore, category, reasons, downPaymentRequired, monthlyInstallment, rentalYieldPercent, estimatedAnnualRent } = fit;

                  return (
                    <div
                      key={property.id}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all hover:shadow-lg flex flex-col justify-between space-y-4 ${
                        category === 'perfect'
                          ? 'border-green-300 dark:border-green-800/60 shadow-green-500/5'
                          : category === 'stretch'
                          ? 'border-amber-300 dark:border-amber-800/60 shadow-amber-500/5'
                          : 'border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      {/* Header with image & badge */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {category === 'perfect' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                                  <CheckCircle2 size={12} /> {isRtl ? 'مناسب معاك تماماً' : 'Perfect Match'} ({matchScore}%)
                                </span>
                              )}
                              {category === 'stretch' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle size={12} /> {isRtl ? 'فرصة واعدة (تعديل بسيط)' : 'Stretch Match'} ({matchScore}%)
                                </span>
                              )}
                              {category === 'mismatch' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                  <XCircle size={12} /> {isRtl ? 'مش مناسب معاك' : 'Mismatched'} ({matchScore}%)
                                </span>
                              )}

                              {property.yallaSahel && (
                                <span className="text-[10px] font-bold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded">
                                  🌊 {isRtl ? 'ساحل حتتي' : 'Sahel'}
                                </span>
                              )}
                            </div>

                            <h3 
                              onClick={() => onOpenProperty && onOpenProperty(property.id)}
                              className="font-heading font-bold text-base text-slate-900 dark:text-white line-clamp-1 hover:text-brand-600 transition-colors cursor-pointer"
                            >
                              {property.title}
                            </h3>
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1 mt-0.5">
                              <MapPin size={12} />
                              <span className="truncate">{property.location}</span>
                            </div>
                          </div>

                          <div className="text-end shrink-0">
                            <div className="text-base font-black text-brand-600 dark:text-brand-400">
                              {property.price ? `${property.price.toLocaleString()} ${property.currency || 'EGP'}` : (isRtl ? 'عند الطلب' : 'On Request')}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              ★ {rentalYieldPercent}% {isRtl ? 'عائد سنوي' : 'Yield'}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Metrics Table */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800 my-3">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold">{isRtl ? 'المقدم المطلوب' : 'Req. Down'}</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {downPaymentRequired.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold">{isRtl ? 'القسط الشهري' : 'Monthly'}</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {monthlyInstallment.toLocaleString()}/m
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold">{isRtl ? 'الإيجار السنوي المتوقع' : 'Est. Rent/yr'}</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              +{estimatedAnnualRent.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 font-semibold mb-2">
                          <span>
                            {isRtl ? 'التدفق الشهري المتوقع:' : 'Est. Monthly Rent:'}{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400">+{Math.round(estimatedAnnualRent / 12).toLocaleString()} {property.currency || 'EGP'}</strong>
                          </span>
                          <span>
                            {isRtl ? 'استرداد الاستثمار:' : 'Payback:'}{' '}
                            <strong className="text-purple-600 dark:text-purple-400">~{fit.paybackYears} {isRtl ? 'سنوات' : 'yrs'}</strong>
                          </span>
                        </div>

                        {/* Evaluation Reasons Checklist */}
                        <div className="space-y-1 my-2">
                          {reasons.slice(0, 3).map((r, rIdx) => (
                            <div key={rIdx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              {category === 'mismatch' ? (
                                <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                              ) : category === 'stretch' ? (
                                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                              ) : (
                                <Check size={13} className="text-green-500 shrink-0 mt-0.5" />
                              )}
                              <span className="leading-tight">{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleAskAboutUnit(fit)}
                          className="flex-1 py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles size={14} />
                          {isRtl ? 'استشر الذكاء الاصطناعي' : 'Ask Advisor'}
                        </button>

                        {onShow3D && (property.panoramas?.length || property.digitalTwinUrl || (property.images && property.images.length > 1)) && (
                          <button
                            type="button"
                            onClick={() => onShow3D(property.id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                            title={isRtl ? 'معاينة 3D' : '3D Tour'}
                          >
                            <Box size={16} />
                          </button>
                        )}

                        {onOpenProperty && (
                          <button
                            type="button"
                            onClick={() => onOpenProperty(property.id)}
                            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shrink-0 cursor-pointer"
                          >
                            {isRtl ? 'التفاصيل' : 'Details'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT / CHAT: Conversational Real Estate Advisor */}
        <div className={`flex-col h-full bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 z-20 ${activeView === 'dashboard' ? 'hidden' : 'flex'} ${activeView === 'split' ? 'lg:w-[45%] xl:w-[40%]' : 'w-full'}`}>
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  {isRtl ? 'محادثة المستشار الاستثماري' : 'Advisor Consultation Chat'}
                </h3>
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isRtl ? 'متصل وجاهز للتحليل المالي' : 'Online & Analyzing'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setCurrentSessionId(null);
              }}
              className="text-xs text-slate-400 hover:text-brand-600 font-bold cursor-pointer transition-colors"
            >
              {isRtl ? 'محادثة جديدة' : 'New Session'}
            </button>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                    {isRtl ? 'مستشارك العقاري الذكي في خدمتك' : 'Your AI Real Estate Advisor'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                    {isRtl
                      ? 'شاركني ميزانيتك، قدرتك الشهرية، والمنطقة التي تفضلها وسأحسب لك العائد الإيجاري المتوقع وأصنف لك أنسب العقارات.'
                      : 'Tell me your budget, monthly cashflow, or desired location, and I will compute expected yields and match ideal properties.'}
                  </p>
                </div>

                {/* Quick Consultation Chips */}
                <div className="w-full space-y-2 pt-2">
                  {[
                    isRtl ? 'معايا مليون مقدم وبقدر أدفع 40 ألف شهرياً، إيه أنسب شقق في التجمع؟' : 'I have 1M down payment and 40k monthly, what units fit best in New Cairo?',
                    isRtl ? 'عايز استثمار تجاري أو إداري بعائد سنوي أعلى من 12%.' : 'I want a commercial/admin unit with an annual yield above 12%.',
                    isRtl ? 'قارن لي بين العائد الإيجاري في التجمع والشيخ زايد والساحل.' : 'Compare rental yields between New Cairo, Sheikh Zayed and Sahel.',
                    isRtl ? 'إيه أفضل خطط تقسيط متاحة بدون فوائد للاستثمار الفوري؟' : 'What are the best interest-free installment plans for instant investment?',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(chip)}
                      className={`w-full text-start p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 hover:text-brand-600 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shadow-2xs cursor-pointer ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-brand-600 dark:text-brand-400'}`}>
                  {m.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                </div>
                <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'}`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-slate-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 space-y-2 w-2/3">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-full"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5"></div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className={`flex items-end gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-brand-500 transition-all ${isRtl ? 'flex-row-reverse' : ''}`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t.advisor_chat_placeholder || (isRtl ? 'اسأل المستشار المالي (مثال: ميزانيتي 4 مليون وعايز أعلى عائد استثماري)...' : 'Ask advisor (e.g. I have 4M budget, recommend highest yield)...')}
                rows={2}
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white resize-none p-1"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all cursor-pointer shrink-0 shadow-sm"
                aria-label={isRtl ? 'إرسال' : 'Send'}
              >
                <Send size={15} className={isRtl ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealEstateAdvisor;
