"use client";

import * as React from "react";
import { Test, AnswerKey, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Check, X, HelpCircle, Save, BookOpen, 
    Trophy, MinusCircle, CheckCircle2, XCircle, 
    MessageSquareText 
} from "lucide-react";
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
        <div className="max-w-4xl mx-auto w-full space-y-6 pb-24 animate-in fade-in duration-500">
            
            {/* --- ANALİZ PANELİ (İnceleme Modunda) --- */}
            {isReviewMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-5 text-center shadow-lg">
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{test.correctAnswers || 0}</p>
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mt-1">Doğru (D)</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-[2rem] p-5 text-center shadow-lg">
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{test.incorrectAnswers || 0}</p>
                        <p className="text-[10px] font-bold text-rose-700 dark:text-rose-500 uppercase tracking-widest mt-1">Yanlış (Y)</p>
                    </div>
                    <div className="bg-slate-500/10 border border-slate-500/20 rounded-[2rem] p-5 text-center shadow-lg">
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
                            {isMCQ ? "OPTİK TEST" : "AÇIK UÇLU TEST"} • {test.questionCount} SORU
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
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6">
                <div className={cn(
                    isMCQ ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-4"
                )}>
                    {Array.from({ length: test.questionCount }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        const sAns = studentAnswers[qNum] || "";
                        const sText = studentTextAnswers[qNum] || "";
                        const cAns = test.answerKey?.[qNum];
                        const evalStatus: EvaluationStatus = test.studentTextAnswersEvaluation?.[qNum] || 'unevaluated';
                        
                        let isCorrect = false;
                        let isWrong = false;
                        let isEmpty = false;

                        if (isReviewMode) {
                            if (isMCQ) {
                                isCorrect = sAns === cAns;
                                isWrong = sAns !== "" && sAns !== cAns;
                                isEmpty = sAns === "";
                            } else {
                                isCorrect = evalStatus === 'correct';
                                isWrong = evalStatus === 'incorrect';
                                isEmpty = evalStatus === 'empty' || evalStatus === 'unevaluated';
                            }
                        }

                        return (
                            <div key={qNum} className={cn(
                                "flex flex-col rounded-2xl transition-all border",
                                isMCQ ? "p-3" : "p-5 gap-4",
                                isCorrect ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50" : 
                                isWrong ? "bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50" : 
                                "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800"
                            )}>
                                <div className={cn("flex", isMCQ ? "items-center justify-between gap-3" : "flex-col gap-4 w-full")}>
                                    {/* Soru No ve Durum İkonu */}
                                    <div className="flex items-center gap-2 shrink-0 w-12">
                                        <span className={cn(
                                            "font-black",
                                            isMCQ ? "text-base" : "text-lg",
                                            isReviewMode ? (isCorrect ? "text-emerald-600" : isWrong ? "text-rose-600" : "text-slate-400") : "text-slate-500"
                                        )}>{qNum}.</span>
                                        {isReviewMode && !isMCQ && (
                                            isCorrect ? (
                                                <div className="bg-emerald-500 text-white p-1 rounded-full"><CheckCircle2 className="w-4 h-4" /></div>
                                            ) : isWrong ? (
                                                <div className="bg-rose-500 text-white p-1 rounded-full"><XCircle className="w-4 h-4" /></div>
                                            ) : (
                                                <div className="bg-slate-300 text-white p-1 rounded-full"><MinusCircle className="w-4 h-4" /></div>
                                            )
                                        )}
                                    </div>

                                    {/* Cevap Alanı */}
                                    <div className="flex-1 w-full">
                                        {isMCQ ? (
                                            <div className="flex items-center justify-end gap-1.5 w-full">
                                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                    const isActive = sAns === opt;
                                                    const isCorrectOpt = isReviewMode && opt === cAns;
                                                    const isStudentWrongOpt = isReviewMode && opt === sAns && opt !== cAns;

                                                    return (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            disabled={isReviewMode}
                                                            onClick={() => {
                                                                if (isReviewMode) return;
                                                                const newValue = isActive ? "" : opt;
                                                                onAnswer(qNum, newValue);
                                                            }}
                                                            className={cn(
                                                                "w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all",
                                                                !isReviewMode ? (
                                                                    isActive 
                                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-110 z-10" 
                                                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-400"
                                                                ) : (
                                                                    isCorrectOpt ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-110 z-10" :
                                                                    isStudentWrongOpt ? "bg-rose-600 border-rose-600 text-white shadow-sm" :
                                                                    "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 opacity-30"
                                                                )
                                                            )}
                                                        >
                                                            {opt}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <div className="space-y-1">
                                                     <Input
                                                        disabled={isReviewMode}
                                                        value={sText}
                                                        onChange={(e) => onAnswer(qNum, e.target.value, true)}
                                                        placeholder="Cevabı buraya yazın..."
                                                        className={cn(
                                                            "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-12 rounded-xl focus:ring-indigo-500 font-medium transition-all shadow-sm",
                                                            isReviewMode && (
                                                                isCorrect ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 text-emerald-900 dark:text-emerald-100 font-bold" :
                                                                isWrong ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 text-rose-900 dark:text-rose-100 font-bold" :
                                                                "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-500"
                                                            )
                                                        )}
                                                    />
                                                </div>
                                                
                                                {isReviewMode && test.studentTextAnswersFeedback?.[qNum] && (
                                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-start gap-2 shadow-sm">
                                                        <MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                        <p>"{test.studentTextAnswersFeedback[qNum]}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}