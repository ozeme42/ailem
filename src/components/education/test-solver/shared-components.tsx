
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, X, Clock, Play, Pause } from "lucide-react";
import { EvaluationStatus } from "@/lib/data";

// --- SORU GEZGİNİ (PALETTE) ---
export const QuestionPalette = ({ 
    total, 
    currentIndex, 
    onNavigate, 
    isAnswered,
    evaluationMap
}: { 
    total: number; 
    currentIndex: number; 
    onNavigate: (index: number) => void;
    isAnswered: (index: number) => boolean;
    evaluationMap?: { [key: string]: EvaluationStatus };
}) => {
    return (
        <div className="grid grid-cols-5 gap-2 p-4">
            {Array.from({ length: total }).map((_, i) => {
                const qNum = (i + 1).toString();
                const answered = isAnswered(i);
                const active = currentIndex === i;
                const status = evaluationMap?.[qNum];
                
                return (
                    <Button
                        key={i}
                        type="button"
                        variant={active ? "default" : answered ? "secondary" : "outline"}
                        className={cn(
                            "h-10 w-10 p-0 font-bold rounded-xl transition-all relative",
                            active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-2 scale-105",
                            answered && !active && "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
                            status === 'correct' && "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                            status === 'incorrect' && "border-rose-500 bg-rose-50 text-rose-700 hover:bg-rose-100",
                            status === 'empty' && "border-slate-300 bg-slate-100 text-slate-400",
                        )}
                        onClick={() => onNavigate(i)}
                    >
                        {i + 1}
                        {status === 'correct' && <Check className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white" />}
                        {status === 'incorrect' && <X className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full p-0.5 border-2 border-white" />}
                    </Button>
                );
            })}
        </div>
    );
};

// --- SAYAÇ (TIMER) ---
function formatTime(seconds: number) {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const remainingSeconds = absSeconds % 60;
  return `${isNegative ? '-' : ''}${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function TestTimer({ durationMinutes }: { durationMinutes: number }) {
  const [timeLeft, setTimeLeft] = React.useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = React.useState(true);

  React.useEffect(() => {
    if (!isRunning) return;
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [isRunning]);

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className={cn("flex items-center gap-2 font-mono text-xl font-black", timeLeft < 0 ? "text-rose-500 animate-pulse" : timeLeft < 300 ? "text-orange-500 animate-pulse" : "text-indigo-600")}>
            <Clock className="h-5 w-5" />
            <span>{formatTime(timeLeft)}</span>
        </div>
        <button type="button" onClick={() => setIsRunning(!isRunning)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            {isRunning ? <Pause className="h-4 w-4 text-slate-400" /> : <Play className="h-4 w-4 text-emerald-500" />}
        </button>
    </div>
  );
}
