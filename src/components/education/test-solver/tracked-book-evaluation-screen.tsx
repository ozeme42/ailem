
"use client";

import * as React from "react";
import { Test, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
    CheckCircle2, XCircle, MinusCircle, Save, 
    GraduationCap, MessageSquareText, FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrackedBookEvaluationScreenProps {
    test: Test;
    questions: any[]; 
    evaluations: { [key: string]: EvaluationStatus };
    feedbacks: { [key: string]: string };
    onEvaluate: (qNum: string, status: EvaluationStatus) => void;
    onFeedback: (qNum: string, feedback: string) => void;
    onFinish: () => void;
}

export function TrackedBookEvaluationScreen({ 
    test, 
    questions, 
    evaluations, 
    feedbacks, 
    onEvaluate, 
    onFeedback, 
    onFinish 
}: TrackedBookEvaluationScreenProps) {
    const totalQ = questions.length || test.questionCount;

    return (
        <div className="space-y-6 max-w-5xl mx-auto w-full pb-24 animate-in fade-in duration-500">
            {/* Üst Bilgi Kartı */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shadow-inner text-indigo-600">
                        <GraduationCap className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{test.title}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            AÇIK UÇLU KİTAP TAKİBİ • {totalQ} SORU LİSTESİ
                        </p>
                    </div>
                </div>

                <Button 
                    onClick={onFinish} 
                    className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/20"
                >
                    <Save className="mr-2 w-5 h-5" /> Değerlendirmeyi Tamamla
                </Button>
            </div>

            {/* Soru Listesi (Satır Satır) */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>SORU NO & CEVAP</span>
                    <span>DEĞERLENDİRME VE GERİ BİLDİRİM</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: totalQ }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        const sAns = test.studentTextAnswers?.[qNum] || "Cevap verilmemiş.";
                        const currentEval = evaluations[qNum] || 'unevaluated';
                        const currentFeedback = feedbacks[qNum] || "";

                        return (
                            <div key={qNum} className={cn(
                                "flex flex-col lg:flex-row gap-6 px-8 py-8 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
                                currentEval === 'correct' ? "bg-emerald-500/[0.02]" : 
                                currentEval === 'incorrect' ? "bg-rose-500/[0.02]" : ""
                            )}>
                                {/* Sol: Soru No ve Cevap */}
                                <div className="flex-1 space-y-3 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs text-slate-500 shrink-0">
                                            {qNum}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Öğrenci Cevabı</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50">
                                        <p className="text-base font-bold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                            {sAns}
                                        </p>
                                    </div>
                                </div>

                                {/* Sağ: Puanlama ve Not */}
                                <div className="lg:w-[400px] flex flex-col gap-4 shrink-0">
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className={cn(
                                                "h-10 rounded-xl font-bold border-2 transition-all",
                                                currentEval === 'correct' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-100 dark:border-slate-800"
                                            )}
                                            onClick={() => onEvaluate(qNum, 'correct')}
                                        >
                                            <CheckCircle2 className="mr-1.5 w-4 h-4"/> Doğru
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className={cn(
                                                "h-10 rounded-xl font-bold border-2 transition-all",
                                                currentEval === 'incorrect' ? "bg-rose-50 border-rose-500 text-rose-700" : "border-slate-100 dark:border-slate-800"
                                            )}
                                            onClick={() => onEvaluate(qNum, 'incorrect')}
                                        >
                                            <XCircle className="mr-1.5 w-4 h-4"/> Yanlış
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className={cn(
                                                "h-10 rounded-xl font-bold border-2 transition-all",
                                                currentEval === 'empty' ? "bg-slate-100 border-slate-400 text-slate-600" : "border-slate-100 dark:border-slate-800"
                                            )}
                                            onClick={() => onEvaluate(qNum, 'empty')}
                                        >
                                            <MinusCircle className="mr-1.5 w-4 h-4"/> Boş
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <MessageSquareText className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                                        <Textarea 
                                            placeholder="Düzeltme veya not bırak..."
                                            className="min-h-[80px] rounded-xl pl-9 bg-slate-50/50 border-slate-200 dark:bg-slate-950 text-xs"
                                            value={currentFeedback}
                                            onChange={(e) => onFeedback(qNum, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <Button 
                    size="lg" 
                    className="h-14 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xl"
                    onClick={onFinish}
                >
                    <CheckCircle2 className="mr-2 w-6 h-6" /> Değerlendirmeyi Kaydet ve Bitir
                </Button>
            </div>
        </div>
    );
}
