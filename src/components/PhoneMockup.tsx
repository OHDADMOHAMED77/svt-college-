import React from 'react';
import { Wifi, BatteryMedium, Signal, Sparkles, Smartphone } from 'lucide-react';

interface PhoneMockupProps {
  children: React.ReactNode;
  enabled: boolean;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ children, enabled }) => {
  if (!enabled) {
    return <>{children}</>;
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="py-6 px-3 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-950/90">
      <div className="relative w-full max-w-[420px] h-[860px] bg-slate-900 border-[8px] border-slate-800 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_0_2px_rgba(255,255,255,0.06)] flex flex-col overflow-hidden">
        {/* Smartphone Speaker & Camera Punch Hole */}
        <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 z-30 flex items-center justify-between px-6 text-[11px] font-semibold text-slate-300">
          <span>{timeString}</span>
          {/* Camera Dot */}
          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Smartphone Screen Viewport */}
        <div className="flex-1 overflow-y-auto pt-6 pb-4 bg-slate-900 text-slate-100">
          {children}
        </div>

        {/* Android Navigation Gesture Bar */}
        <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
