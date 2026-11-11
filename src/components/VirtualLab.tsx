import React, { useState } from 'react';
import {
  FlaskConical, Play, RotateCcw, CheckCircle, Sparkles, Microscope,
  Flame, Wind, Eye, Info, ChevronRight, Sliders, Check
} from 'lucide-react';
import { SVT_EXPERIMENTS } from '../data/virtualLabExperiments';
import { VirtualExperiment, GradeLevel } from '../types/svt';

interface VirtualLabProps {
  initialExperimentId?: string;
  gradeLevel: GradeLevel;
  onExperimentCompleted: (expId: string) => void;
  language: 'fr' | 'ar';
}

export const VirtualLab: React.FC<VirtualLabProps> = ({
  initialExperimentId,
  gradeLevel,
  onExperimentCompleted,
  language
}) => {
  const isAr = language === 'ar';

  const [activeExpId, setActiveExpId] = useState<string>(
    initialExperimentId || SVT_EXPERIMENTS[0].id
  );

  const activeExp = SVT_EXPERIMENTS.find(e => e.id === activeExpId) || SVT_EXPERIMENTS[0];

  // Simulation parameter states
  const [controlsState, setControlsState] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    activeExp.controls.forEach(c => {
      initial[c.id] = c.defaultValue;
    });
    return initial;
  });

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Switch experiment
  const handleSelectExp = (exp: VirtualExperiment) => {
    setActiveExpId(exp.id);
    const initial: Record<string, any> = {};
    exp.controls.forEach(c => {
      initial[c.id] = c.defaultValue;
    });
    setControlsState(initial);
    setCompletedSteps([]);
    setIsSimulating(false);
  };

  const updateControl = (id: string, value: any) => {
    setControlsState(prev => ({ ...prev, [id]: value }));
  };

  const handleToggleStep = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) {
      setCompletedSteps(completedSteps.filter(s => s !== stepNumber));
    } else {
      const updated = [...completedSteps, stepNumber];
      setCompletedSteps(updated);
      if (updated.length === activeExp.protocolSteps.length) {
        onExperimentCompleted(activeExp.id);
      }
    }
  };

  const handleReset = () => {
    const initial: Record<string, any> = {};
    activeExp.controls.forEach(c => {
      initial[c.id] = c.defaultValue;
    });
    setControlsState(initial);
    setCompletedSteps([]);
    setIsSimulating(false);
  };

  return (
    <div className="space-y-6">
      {/* Lab Header */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border border-teal-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-2">
              <Microscope className="w-3.5 h-3.5 text-teal-400" />
              {isAr ? 'المختبر الافتراضي التفاعلي SVT' : 'Laboratoire Scientifique Virtuel SVT'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? 'التجارب المخبرية بالنهج العلمي التجريبي' : 'Simulations Expérimentales Interactives'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {isAr
                ? 'تحكم في المتغيرات (الحرارة، الإضاءة، الأنزيمات، الغازات) ولاحظ التفاعلات في بيئة علمية دقيقة.'
                : 'Manipulez les paramètres biochimiques et géologiques en direct avec observation des réactions.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isAr ? 'إعادة ضبط التجربة' : 'Réinitialiser'}
            </button>
          </div>
        </div>
      </div>

      {/* Experiment Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SVT_EXPERIMENTS.map(exp => {
          const isActive = exp.id === activeExp.id;
          return (
            <button
              key={exp.id}
              onClick={() => handleSelectExp(exp)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-2 border ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${isActive ? 'bg-slate-950 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                {exp.gradeLevel}
              </span>
              <span>{isAr ? exp.titleAr : exp.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Experiment Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center 2 Cols: Interactive Canvas & Real-time Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
            {/* Top Concept Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  {isAr ? activeExp.subtitleAr : activeExp.subtitle}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {isAr ? activeExp.titleAr : activeExp.title}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                {activeExp.gradeLevel}
              </span>
            </div>

            {/* Visual Simulator Display Area */}
            <div className="py-8 flex items-center justify-center relative">
              {/* 1. PHOTOSYNTHESIS SIMULATION */}
              {activeExp.simulationType === 'photosynthesis' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">
                      {isAr ? 'الورقة مع الغطاء الحاجب للضوء' : 'Feuillete avec cache opaque'}
                    </p>
                    <div className="w-36 h-48 bg-emerald-600 rounded-full border-4 border-emerald-400 relative overflow-hidden shadow-inner flex items-center justify-center">
                      {/* Opaque Mask */}
                      {controlsState.hasMask && (
                        <div className="absolute inset-x-0 top-1/3 h-1/3 bg-slate-900/90 border-y border-slate-700 flex items-center justify-center">
                          <span className="text-[10px] text-slate-400 font-bold">Cache Opaque</span>
                        </div>
                      )}
                      <div className="w-1 h-full bg-emerald-700/60" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">
                      {isAr ? 'النتيجة بعد إضافة الماء اليودي' : 'Révélation à l\'Eau Iodée'}
                    </p>
                    <div
                      className={`w-36 h-48 rounded-full border-4 relative overflow-hidden shadow-inner flex items-center justify-center transition-colors duration-500 ${
                        controlsState.iodineTest
                          ? 'bg-amber-100 border-amber-300'
                          : 'bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {/* Starch blue-black coloration on unmasked illuminated parts */}
                      {controlsState.iodineTest ? (
                        <div className="w-full h-full flex flex-col">
                          <div className="h-1/3 bg-indigo-950 flex items-center justify-center text-[10px] text-indigo-300 font-bold">
                            Amidon +
                          </div>
                          <div className={`h-1/3 flex items-center justify-center text-[10px] font-bold ${controlsState.hasMask ? 'bg-amber-200 text-amber-800' : 'bg-indigo-950 text-indigo-300'}`}>
                            {controlsState.hasMask ? 'Pas d\'amidon' : 'Amidon +'}
                          </div>
                          <div className="h-1/3 bg-indigo-950 flex items-center justify-center text-[10px] text-indigo-300 font-bold">
                            Amidon +
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">
                          {isAr ? 'انقر لإضافة الماء اليودي' : 'Ajouter l\'eau iodée'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. RESPIRATION SIMULATION */}
              {activeExp.simulationType === 'respiration' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                  {/* Closed chamber */}
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-slate-400">{isAr ? 'وعاء التجربة المحكم' : 'Enceinte hermétique'}</p>
                    <div className="w-32 h-40 bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center p-3 relative">
                      <span className="text-3xl mb-1">
                        {controlsState.organism === 'seeds' ? '🌱' : controlsState.organism === 'insect' ? '🦗' : '🫙'}
                      </span>
                      <span className="text-[11px] text-slate-300 font-bold">
                        {controlsState.organism === 'seeds' ? 'Graines en germination' : controlsState.organism === 'insect' ? 'Criquet vivant' : 'Témoin vide'}
                      </span>
                      <span className="text-[10px] text-emerald-400 mt-2 font-mono">
                        O2 : {controlsState.organism === 'control' ? '21.0%' : `${Math.max(12, 21 - (controlsState.timeElapsed / 5)).toFixed(1)}%`}
                      </span>
                    </div>
                  </div>

                  {/* Limewater Tube */}
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-slate-400">{isAr ? 'أنبوب ماء الجير (كاشف CO2)' : 'Eau de Chaux'}</p>
                    <div className="w-20 h-40 bg-slate-900 border-2 border-slate-700 rounded-b-3xl relative overflow-hidden flex flex-col justify-end p-1">
                      <div
                        className={`w-full rounded-b-2xl transition-all duration-700 ${
                          controlsState.organism !== 'control' && controlsState.timeElapsed > 10
                            ? 'h-3/4 bg-slate-200/90 shadow-inner' // cloudy
                            : 'h-3/4 bg-cyan-500/20' // clear
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">
                      {controlsState.organism !== 'control' && controlsState.timeElapsed > 10
                        ? (isAr ? 'ماء الجير متعكر (+CO2)' : 'Trouble (Présence de CO2)')
                        : (isAr ? 'ماء الجير صافٍ' : 'Limpide')}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. STOMATA MICROSCOPE SIMULATION */}
              {activeExp.simulationType === 'stomata' && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-48 h-48 rounded-full bg-slate-900 border-4 border-slate-700 shadow-2xl relative overflow-hidden flex items-center justify-center p-4">
                    {/* Reticle / Lens crosshair */}
                    <div className="absolute inset-0 border border-slate-800 rounded-full pointer-events-none" />
                    <div className="absolute w-full h-[1px] bg-slate-800" />
                    <div className="absolute h-full w-[1px] bg-slate-800" />

                    {/* Stoma Guard Cells */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`w-12 h-28 bg-emerald-500 border-2 border-emerald-300 rounded-l-full transition-all duration-500 ${
                          controlsState.hydrationState === 'normal' ? 'mr-3' : 'mr-0.5'
                        }`}
                      />
                      {/* Ostiole Hole */}
                      <div
                        className={`bg-slate-950 transition-all duration-500 rounded-full ${
                          controlsState.hydrationState === 'normal'
                            ? 'w-6 h-16'
                            : 'w-1 h-12'
                        }`}
                      />
                      <div
                        className={`w-12 h-28 bg-emerald-500 border-2 border-emerald-300 rounded-r-full transition-all duration-500 ${
                          controlsState.hydrationState === 'normal' ? 'ml-3' : 'ml-0.5'
                        }`}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {controlsState.hydrationState === 'normal'
                      ? (isAr ? 'ثغر مفتوح (خلايا ممتلئة بالماء)' : 'Stomate OUVERT (Cellules turgescentes)')
                      : (isAr ? 'ثغر منغلق (نقص الماء / ليل)' : 'Stomate FERMÉ (Déficit hydrique / Nuit)')}
                  </span>
                </div>
              )}

              {/* 4. DIGESTION SIMULATION */}
              {activeExp.simulationType === 'digestion' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">{isAr ? 'حمام مريم بدرجة حرارة' : 'Bain-marie 37°C'}</p>
                    <div className="w-32 h-40 bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center p-2 relative">
                      <Flame className="w-6 h-6 text-amber-500 animate-pulse mb-1" />
                      <span className="text-xs font-mono font-bold text-white">
                        {controlsState.temperature}°C
                      </span>
                      <span className="text-[11px] text-slate-400 mt-2">
                        {controlsState.hasSaliva ? 'Amidon + Amylase' : 'Amidon seul'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">{isAr ? 'محلول فهلينغ مع التسخين' : 'Liqueur de Fehling à chaud'}</p>
                    <div className="w-20 h-40 bg-slate-900 border-2 border-slate-700 rounded-b-3xl relative overflow-hidden flex flex-col justify-end p-1">
                      <div
                        className={`w-full rounded-b-2xl transition-all duration-700 ${
                          controlsState.hasSaliva && controlsState.temperature >= 30 && controlsState.temperature <= 42 && controlsState.duration >= 10
                            ? 'h-3/4 bg-red-700 shadow-inner' // Brick-red precipitate
                            : 'h-3/4 bg-blue-600' // Blue Fehling
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">
                      {controlsState.hasSaliva && controlsState.temperature >= 30 && controlsState.temperature <= 42 && controlsState.duration >= 10
                        ? (isAr ? 'راسب أحمر آجوري (وجود مالتوز)' : 'Précipité Rouge Brique (Maltose +)')
                        : (isAr ? 'لون أزرق (لا يوجد سكر مختزل)' : 'Reste bleu (Pas de maltose)')}
                    </span>
                  </div>
                </div>
              )}

              {/* 5. TRANSPIRATION POTOMETER */}
              {activeExp.simulationType === 'transpiration' && (
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="w-full max-w-md h-32 bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between relative">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{isAr ? 'غصن مورق في أنبوب البوتومتر' : 'Capillaire gradué (mm)'}</span>
                      <span className="text-cyan-400 font-mono font-bold">
                        Vitesse : {((controlsState.temperature / 10) * (controlsState.hasWind ? 2.5 : 1)).toFixed(1)} mm/min
                      </span>
                    </div>

                    {/* Potometer Capillary with Moving Bubble */}
                    <div className="w-full h-4 bg-cyan-950 border border-cyan-800 rounded-full relative overflow-hidden flex items-center">
                      <div className="w-6 h-3 bg-red-400 rounded-full animate-pulse ml-12" />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0 mm</span>
                      <span>25 mm</span>
                      <span>50 mm</span>
                      <span>75 mm</span>
                      <span>100 mm</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. REFLEX ARC */}
              {activeExp.simulationType === 'reflex_arc' && (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <span className="text-5xl">🐸</span>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl max-w-sm text-xs text-slate-300">
                    {controlsState.condition === 'normal'
                      ? (isAr ? 'انعكاس سليم: ثني قوي للرجل إثر الإهاجة بالحمض (رد فعل شوكي).' : 'Flexion vive et immédiate de la patte stimulée.')
                      : controlsState.condition === 'anesthetized_skin'
                      ? (isAr ? 'غياب الاستجابة: الجلد المخدر لا يلتقط الإهاجة.' : 'Aucune réponse : Récepteur cutané anesthésié.')
                      : controlsState.condition === 'cut_nerve'
                      ? (isAr ? 'غياب الاستجابة: انقطاع التوصيل العصبي عبر العصب الوركي.' : 'Aucune réponse : Nerf sciatique sectionné.')
                      : (isAr ? 'غياب الاستجابة: النخاع الشوكي المخرب لا يعالج السيالة.' : 'Aucune réponse : Centre réflexe médullaire détruit.')}
                  </div>
                </div>
              )}

              {/* 7. VOLCANO */}
              {activeExp.simulationType === 'volcano' && (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className="relative w-64 h-40 flex items-end justify-center">
                    {/* Volcanic cone */}
                    <div className="w-56 h-28 bg-gradient-to-t from-slate-900 to-amber-950 clip-volcano border-b-4 border-slate-700 relative flex items-center justify-center">
                      {controlsState.viscosity === 'fluid' ? (
                        <div className="w-4 h-16 bg-gradient-to-b from-orange-500 to-red-600 rounded-full blur-xs animate-bounce" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-700 rounded-full border-2 border-amber-600 -mt-20" />
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-400">
                    {controlsState.viscosity === 'fluid'
                      ? (isAr ? 'بركان انسكابي (لابة سائلة بازلتية، قذف هادئ)' : 'Éruption Effusive (Lave fluide, coulées de basalte)')
                      : (isAr ? 'بركان انفجاري (لابة لزجة، قبة صخرية وسحب حارقة)' : 'Éruption Explosive (Lave andésitique visqueuse, dôme & nuées ardentes)')}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Scientific Explanation */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300">
              <span className="font-bold text-teal-300">{isAr ? '💡 الاستنتاج العلمي: ' : '💡 Conclusion Scientifique : '}</span>
              {isAr ? activeExp.scientificConceptAr : activeExp.scientificConcept}
            </div>
          </div>
        </div>

        {/* Right Col: Interactive Controls & Experimental Protocol Checklist */}
        <div className="space-y-4">
          {/* Controls Panel */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              {isAr ? 'لوحة التحكم في المتغيرات' : 'Paramètres de l\'Expérience'}
            </h3>

            <div className="space-y-4">
              {activeExp.controls.map(ctrl => (
                <div key={ctrl.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      {isAr ? ctrl.labelAr : ctrl.label}
                    </span>
                    {ctrl.type === 'slider' && (
                      <span className="text-emerald-400 font-mono font-bold">
                        {controlsState[ctrl.id]}
                      </span>
                    )}
                  </div>

                  {ctrl.type === 'slider' && (
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step || 1}
                      value={controlsState[ctrl.id]}
                      onChange={(e) => updateControl(ctrl.id, Number(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-900"
                    />
                  )}

                  {ctrl.type === 'toggle' && (
                    <button
                      type="button"
                      onClick={() => updateControl(ctrl.id, !controlsState[ctrl.id])}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        controlsState[ctrl.id]
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {controlsState[ctrl.id] ? (isAr ? '✓ مفعل' : '✓ Activé') : (isAr ? '✗ معطل' : '✗ Désactivé')}
                    </button>
                  )}

                  {ctrl.type === 'select' && (
                    <select
                      value={controlsState[ctrl.id]}
                      onChange={(e) => updateControl(ctrl.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {ctrl.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {isAr ? opt.labelAr : opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Protocol Checklist */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
              <CheckCircle className="w-4 h-4 text-teal-400" />
              {isAr ? 'بروتوكول الخطوات التجريبية' : 'Protocole Expérimental'}
            </h3>

            <div className="space-y-2">
              {activeExp.protocolSteps.map(step => {
                const isChecked = completedSteps.includes(step.step);
                return (
                  <div
                    key={step.step}
                    onClick={() => handleToggleStep(step.step)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`}>
                      {isChecked && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </div>
                    <span className="leading-relaxed">
                      {isAr ? step.instructionAr : step.instruction}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
