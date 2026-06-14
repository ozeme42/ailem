
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

// --- ÇİZİM ARAÇ ÇUBUĞU (DRAWING TOOLBAR) ---
import { Pen, Eraser, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export function DrawingToolbar({
    isDrawingMode,
    setIsDrawingMode,
    drawingTool,
    setDrawingTool,
    strokeWidth,
    setStrokeWidth,
    onClear,
    stylusOnly = false,
    setStylusOnly
}: {
    isDrawingMode: boolean;
    setIsDrawingMode: (v: boolean) => void;
    drawingTool: 'pen' | 'eraser';
    setDrawingTool: (v: 'pen' | 'eraser') => void;
    strokeWidth: number;
    setStrokeWidth: (v: number) => void;
    onClear: () => void;
    stylusOnly?: boolean;
    setStylusOnly?: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
            <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className={cn("rounded-full h-8 w-8 transition-all", isDrawingMode && drawingTool === 'pen' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                onClick={() => { if(!isDrawingMode) setIsDrawingMode(true); setDrawingTool('pen'); }}
                title="Kalem"
            >
                <Pen className="h-4 w-4" />
            </Button>
            {isDrawingMode && (
                <>
                    <div className="hidden sm:flex items-center px-2 w-24">
                        <Slider 
                            defaultValue={[strokeWidth]} 
                            max={10} 
                            min={1} 
                            step={1} 
                            onValueChange={(v) => setStrokeWidth(v[0])} 
                        />
                    </div>
                    {setStylusOnly && (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className={cn("rounded-full h-8 w-8 transition-all", stylusOnly ? "bg-blue-500 text-white hover:bg-blue-600" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                            onClick={() => setStylusOnly(!stylusOnly)}
                            title={stylusOnly ? "Sadece Kalem Modu (Açık)" : "Sadece Kalem Modu (Kapalı)"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                    )}
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className={cn("rounded-full h-8 w-8 transition-all", drawingTool === 'eraser' ? "bg-rose-500 text-white hover:bg-rose-600" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                        onClick={() => setDrawingTool('eraser')}
                        title="Silgi"
                    >
                        <Eraser className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-8 w-8 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30"
                        onClick={onClear}
                        title="Tümünü Temizle"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            )}
            <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className={cn("rounded-full h-8 w-8", isDrawingMode ? "bg-indigo-100 text-indigo-600" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                title={isDrawingMode ? "Çizim Modunu Kapat" : "Çizim Modunu Aç"}
            >
                <X className={cn("h-4 w-4 transition-transform", !isDrawingMode && "rotate-45")} />
            </Button>
        </div>
    );
}
