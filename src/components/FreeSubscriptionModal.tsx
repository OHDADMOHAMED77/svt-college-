import React, { useState } from 'react';
import {
  ShieldCheck, Check, Sparkles, X, Gift, Key, CheckCircle,
  HelpCircle, Heart
} from 'lucide-react';

interface FreeSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateCode: (code: string) => boolean;
  currentPlan: string;
  language: 'fr' | 'ar';
}

export const FreeSubscriptionModal: React.FC<FreeSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onActivateCode,
  currentPlan,
  language
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';
  const [code, setCode] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);

  const handleApply = () => {
    setErrorMsg(false);
    if (!code.trim()) return;
    const ok = onActivateCode(code.trim().toUpperCase());
    if (ok) {
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 1500);
    } else {
      setErrorMsg(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Gift className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {isAr ? 'ولوج مجاني كامل وبدون أي بطاقة بنكية' : 'Accès 100% Gratuit Sans Carte Bancaire'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            {isAr
              ? 'مبادرة تربوية لدعم تلاميذ وأساتذة السلك الإعدادي المغربي. جميع الدروس والمختبر والتقويمات متاحة مجاناً.'
              : 'Initiative pédagogique publique dédiée au collège marocain. Aucune facturation, aucune carte bancaire requise.'}
          </p>
        </div>

        {/* Free Features Checklist */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
            <span>{isAr ? 'وصول شامل لجميع دروس 1AC و 2AC و 3AC' : 'Accès illimité à tous les cours 1AC, 2AC et 3AC'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
            <span>{isAr ? 'المختبر الافتراضي التفاعلي بجميع تجاربه السبع' : 'Laboratoire virtuel interactif avec les 7 expériences'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
            <span>{isAr ? 'المساعد البيداغوجي الذكي Gemini مجاناً' : 'Tuteur pédagogique Gemini sans quota payant'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
            <span>{isAr ? 'الامتحانات الجهوية والتقويمات المصححة مع السلم الرسمي' : 'Examens blancs régionaux conformes au cadre marocain'}</span>
          </div>
        </div>

        {/* Code Activation form */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-300">
            {isAr ? 'تفعيل كود المؤسسة أو كود الأستاذ (اختياري) :' : 'Code d\'établissement ou de classe (Facultatif) :'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex : MAROC-SVT-2025"
              className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 uppercase tracking-wider font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
            >
              {isAr ? 'تفعيل الكود' : 'Valider'}
            </button>
          </div>

          {successMsg && (
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              {isAr ? 'تم تفعيل الحساب المجاني المميز بنجاح!' : 'Votre pass pédagogique a été activé avec succès !'}
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium">
              {isAr ? 'كود غير صحيح. يمكنك استخدام "MAROC-SVT-2025"' : 'Code non reconnu. Essayez : "MAROC-SVT-2025"'}
            </p>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            {isAr ? 'كود التفعيل التجريبي السريع: ' : 'Code de démonstration rapide : '}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold">MAROC-SVT-2025</code>
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            {isAr ? 'إغلاق ومتابعة الدراسة' : 'Fermer et continuer'}
          </button>
        </div>
      </div>
    </div>
  );
};
