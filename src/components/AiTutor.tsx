import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Sparkles, BookOpen, Lightbulb, HelpCircle,
  FileText, CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { askSvtAssistant } from '../services/geminiService';
import { GradeLevel } from '../types/svt';
import { SimpleMarkdown } from './SimpleMarkdown';

interface AiTutorProps {
  gradeLevel: GradeLevel;
  language: 'fr' | 'ar';
}

export const AiTutor: React.FC<AiTutorProps> = ({ gradeLevel, language }) => {
  const isAr = language === 'ar';
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'explain' | 'quiz' | 'fiche' | 'general'>('explain');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: isAr
        ? `مرحباً بك! أنا رفيقك البيداغوجي الذكي في مادة علوم الحياة والأرض للسلك الإعدادي المغربي (${gradeLevel}).\n\nأنا هنا لأشرح لك أي مفهوم صعب بأسلوب مبسط، أو أساعدك على تلخيص الدروس وصياغة تمارين تدريبية مع التصحيح. كيف يمكنني مساعدتك اليوم؟`
        : `Bonjour ! Je suis votre tuteur pédagogique officiel pour les SVT au collège marocain (${gradeLevel}).\n\nJe peux vous expliquer n'importe quelle notion difficile avec des analogies simples, générer des exercices d'entraînement ou vous préparer une fiche de révision pour le brevet. Que souhaitez-vous approfondir ?`
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Keep the latest message visible
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickPrompts = [
    { labelFr: '🌿 La photosynthèse', labelAr: '🌿 التركيب الضوئي', query: 'Explique-moi la photosynthèse et le test à l\'eau iodée simplement' },
    { labelFr: '🍎 Digestion de l\'amidon', labelAr: '🍎 هضم النشا باللعاب', query: 'Comment l\'amylase salivaire transforme l\'amidon en maltose ?' },
    { labelFr: '🌋 Séismes & Ondes P/S', labelAr: '🌋 الزلازل وموجات P وS', query: 'Quelle est la différence entre les ondes P et S lors d\'un séisme ?' },
    { labelFr: '⚡ Arc réflexe médullaire', labelAr: '⚡ القوس الانعكاسي الشوكي', query: 'Quels sont les organes intervenant dans le réflexe médullaire ?' }
  ];

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || prompt).trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    try {
      const result = await askSvtAssistant({
        prompt: text,
        gradeLevel,
        language,
        mode
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: isAr
            ? 'عذراً، حدث خطأ مؤقت في الاتصال بالمساعد. يمكنك مراجعة الدرس مباشرة من تبويب المقررات.'
            : 'Une erreur temporaire est survenue. Vous pouvez continuer à consulter les cours et le laboratoire virtuel.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              {isAr ? 'المساعد البيداغوجي الذكي (مجاني 100%)' : 'Assistant Pédagogique Intelligent (100% Gratuit)'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? 'رفيقك الشخصي للتفوق في علوم الحياة والأرض' : 'Tuteur SVT Personnalisé • Collège Maroc'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {isAr
                ? 'اطرح أسئلتك بحرية بالفرنسية أو العربية واحصل على شروحات علمية دقيقة مطابقة للمقرر المغربي.'
                : 'Posez vos questions en français ou arabe : explications simples, schémas logiques et fiches synthétiques.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setMode('explain')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === 'explain' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'شرح المفهوم' : 'Expliquer'}
            </button>
            <button
              onClick={() => setMode('fiche')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === 'fiche' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'بطاقة مراجعة' : 'Fiche'}
            </button>
            <button
              onClick={() => setMode('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === 'quiz' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'توليد تمرين' : 'Exercice'}
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 shrink-0">
          {isAr ? 'مواضيع مقترحة:' : 'Suggestions :'}
        </span>
        {quickPrompts.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.query)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white shrink-0 transition-colors"
          >
            {isAr ? chip.labelAr : chip.labelFr}
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div ref={chatRef} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl min-h-[400px] max-h-[550px] overflow-y-auto flex flex-col">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shrink-0 mt-1 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-700/80 text-slate-200 rounded-tl-none shadow-md'
              }`}
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {msg.role === 'assistant'
                ? <SimpleMarkdown text={msg.content} />
                : msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-700 px-4 py-3 rounded-2xl text-xs text-slate-400">
              {isAr ? 'جاري إعداد الإجابة العلمية الدقيقة...' : 'L\'assistant formule l\'explication pédagogique...'}
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 p-2 rounded-2xl shadow-xl">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            isAr
              ? 'اطرح سؤالك في علوم الحياة والأرض (مثال: ما هو دور أنزيم النشاوز اللعابي؟)...'
              : 'Posez votre question (ex : Pourquoi les stomates se ferment-ils pendant la nuit ?)...'
          }
          className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
        />

        <button
          onClick={() => handleSend()}
          disabled={!prompt.trim() || isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-40 transition-transform active:scale-95 inline-flex items-center gap-1.5"
        >
          <span>{isAr ? 'إرسال' : 'Envoyer'}</span>
          <Send className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
