
"use client";

import * as React from "react";
import { Test, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, HelpCircle, Save, BookOpen, AlertCircle, Trophy, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackedBookSolverProps {
    test: Test;
    studentAnswers: AnswerKey;
    studentTextAnswers: { [key: string]: string };
    onAnswer: (qNum: string, answer: string, isText?: boolean) => void;
    onFinish: () => void;
    isReviewMode?: boolean;
}

export function TrackedBookSolver({ test, studentAnswers, studentTextAnswers, onAnswer, onFinish, isReviewMode = false }: TrackedBookSolverProps) {
    const isMCQ = !test.openEnded;

    return (
        <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
            
            {/* --- ANALİZ PANELİ (SADECE İNCELEME MODUNDA) --- */}
            {isReviewMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in-95 duration-500">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-5 text-center shadow-lg shadow-emerald-500/5">
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{test.correctAnswers || 0}</p>
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mt-1">Doğru (D)</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-[2rem] p-5 text-center shadow-lg shadow-rose-500/5">
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{test.incorrectAnswers || 0}</p>
                        <p className="text-[10px] font-bold text-rose-700 dark:text-rose-500 uppercase tracking-widest mt-1">Yanlış (Y)</p>
                    </div>
                    <div className="bg-slate-500/10 border border-slate-500/20 rounded-[2rem] p-5 text-center shadow-lg shadow-slate-500/5">
                        <p className="text-3xl font-black text-slate-600 dark:text-slate-400">{test.emptyAnswers || 0}</p>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-500 uppercase tracking-widest mt-1">Boş (B)</p>
                    </div>
                    <div className="bg-indigo-600 border border-indigo-500/50 rounded-[2rem] p-5 text-center shadow-xl shadow-indigo-500/20">
                        <p className="text-3xl font-black text-white">%{test.score?.toFixed(0) || 0}</p>
                        <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">Başarı Skoru</p>
                    </div>
                </div>
            )}

            {/* Üst Bilgi Kartı */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                        isReviewMode ? "bg-indigo-600 text-white" : "bg-amber-50 dark:bg-amber-950 text-amber-600"
                    )}>
                        {isReviewMode ? <Trophy className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{test.title}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {isMCQ ? "ÇOKTAN SEÇMELİ" : "AÇIK UÇLU"} • {test.questionCount} SORU
                        </p>
                    </div>
                </div>

                {!isReviewMode && (
                    <Button onClick={onFinish} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/20">
                        <Save className="mr-2 w-5 h-5" /> Testi Bitir
                    </Button>
                )}
            </div>

            {/* Soru Listesi */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>SORU NO</span>
                    <span>{isMCQ ? "OPTİK İŞARETLEME" : "SENİN CEVABIN"}</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: test.questionCount }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        const sAns = studentAnswers[qNum] || "";
                        const sText = studentTextAnswers[qNum] || "";
                        const cAns = test.answerKey?.[qNum];
                        
                        const isCorrect = isReviewMode && isMCQ && sAns === cAns;
                        const isWrong = isReviewMode && isMCQ && sAns && sAns !== cAns;
                        const isEmpty = isReviewMode && isMCQ && !sAns;

                        return (
                            <div key={qNum} className={cn(
                                "flex flex-col sm:flex-row items-center gap-6 px-8 py-5 transition-colors",
                                isCorrect ? "bg-emerald-50/30" : isWrong ? "bg-rose-50/30" : isEmpty ? "bg-slate-50/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                            )}>
                                <div className="flex items-center gap-4 w-24 shrink-0">
                                    <span className="text-sm font-black text-slate-400">{qNum}.</span>
                                    {isReviewMode && isMCQ && (
                                        isCorrect ? <Check className="w-5 h-5 text-emerald-500" strokeWidth={4} /> : 
                                        isWrong ? <X className="w-5 h-5 text-rose-500" strokeWidth={4} /> :
                                        <HelpCircle className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>

                                <div className="flex-1 w-full">
                                    {isMCQ ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                    const isActive = sAns === opt;
                                                    const isCorrectOpt = isReviewMode && opt === cAns;
                                                    const isStudentWrongOpt = isReviewMode && opt === sAns && opt !== cAns;

                                                    return (
                                                        <button
                                                            key={opt}
                                                            disabled={isReviewMode}
                                                            onClick={() => onAnswer(qNum, isActive ? "" : opt)}
                                                            className={cn(
                                                                "w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 flex items-center justify-center font-black text-sm transition-all",
                                                                !isReviewMode ? (
                                                                    isActive 
                                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-105" 
                                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-400"
                                                                ) : (
                                                                    isCorrectOpt ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-110 z-10 ring-2 ring-emerald-300" :
                                                                    isStudentWrongOpt ? "bg-rose-600 border-rose-600 text-white shadow-inner" :
                                                                    "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 opacity-50"
                                                                )
                                                            )}
                                                        >
                                                            {opt}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {isWrong && (
                                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-500/20 animate-in slide-in-from-left-2">
                                                    <Check className="w-3.5 h-3.5" /> Doğru Cevap: {cAns}
                                                </div>
                                            )}
                                            {isEmpty && (
                                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black border border-indigo-500/20">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Cevap: {cAns}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                disabled={isReviewMode}
                                                value={sText}
                                                onChange={(e) => onAnswer(qNum, e.target.value, true)}
                                                placeholder="Cevabı buraya yazın..."
                                                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-12 rounded-xl focus:ring-indigo-500 font-medium"
                                            />
                                            {isReviewMode && test.answerKey?.[qNum] && (
                                                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    Doğru Cevap Şablonu: {test.answerKey[qNum]}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
