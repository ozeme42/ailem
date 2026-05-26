"use client";

import * as React from "react";
import { Test, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Check, X, HelpCircle, Save, BookOpen, 
    AlertCircle, Trophy, MinusCircle, User, 
    CheckCircle2, XCircle 
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
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>SORU NO</span>
                    <span>{isMCQ ? "İŞARETLEME & ANALİZ" : "SENİN CEVABIN"}</span>
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
                                "flex flex-col gap-4 px-8 py-6 transition-all",
                                isCorrect ? "bg-emerald-500/5 dark:bg-emerald-500/[0.03]" : isWrong ? "bg-rose-500/5 dark:bg-rose-500/[0.03]" : isEmpty ? "bg-slate-50 dark:bg-white/[0.02]" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                            )}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                                    {/* Soru No ve Durum İkonu */}
                                    <div className="flex items-center gap-4 w-24 shrink-0">
                                        <span className="text-sm font-black text-slate-400">{qNum}.</span>
                                        {isReviewMode && isMCQ && (
                                            isCorrect ? (
                                                <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/40"><Check className="w-3 h-3 stroke-[4]" /></div>
                                            ) : isWrong ? (
                                                <div className="bg-rose-500 text-white p-1 rounded-full shadow-lg shadow-rose-500/40"><X className="w-3 h-3 stroke-[4]" /></div>
                                            ) : (
                                                <div className="bg-slate-400 text-white p-1 rounded-full shadow-md"><HelpCircle className="w-3 h-3" /></div>
                                            )
                                        )}
                                    </div>

                                    {/* Cevap Alanı */}
                                    <div className="flex-1 w-full">
                                        {isMCQ ? (
                                            <div className="flex flex-col gap-4">
                                                {/* Harf Butonları */}
                                                <div className="flex gap-2.5">
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
                                                                    "w-11 h-11 md:w-12 md:h-12 rounded-xl border-2 flex items-center justify-center font-black text-base transition-all",
                                                                    !isReviewMode ? (
                                                                        isActive 
                                                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 z-10" 
                                                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-400"
                                                                    ) : (
                                                                        isCorrectOpt ? "bg-emerald-600 border-emerald-600 text-white shadow-lg scale-110 z-10 ring-2 ring-emerald-300 dark:ring-emerald-700" :
                                                                        isStudentWrongOpt ? "bg-rose-600 border-rose-600 text-white shadow-md scale-100 opacity-100" :
                                                                        "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 opacity-30"
                                                                    )
                                                                )}
                                                            >
                                                                {opt}
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                                {/* ANALİZ ETİKETLERİ (KABAK GİBİ GÖRÜNÜR) */}
                                                {isReviewMode && (
                                                    <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-left-2 mt-2">
                                                        {/* Senin Cevabın */}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senin Cevabın</span>
                                                            <div className={cn(
                                                                "flex items-center gap-2 px-3 py-2 rounded-2xl border-2 font-bold shadow-sm",
                                                                isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : 
                                                                isWrong ? "bg-rose-500/10 border-rose-500/30 text-rose-700" : 
                                                                "bg-slate-100 border-slate-200 text-slate-500"
                                                            )}>
                                                                {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : isWrong ? <XCircle className="w-4 h-4 text-rose-500" /> : <MinusCircle className="w-4 h-4 text-slate-400" />}
                                                                <span className="text-sm">{sAns || "Cevap Verilmedi"}</span>
                                                            </div>
                                                        </div>

                                                        {/* Doğru Cevap (Yanlış veya Boş ise göster) */}
                                                        {(isWrong || isEmpty) && (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Doğru Cevap</span>
                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/20 text-emerald-800 text-sm font-black shadow-sm">
                                                                    <Check className="w-4 h-4" strokeWidth={4} />
                                                                    <span className="text-base font-black">{cAns || "Tanımlanmamış"}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <div className="space-y-1">
                                                     {isReviewMode && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Öğrenci Cevabı</label>}
                                                     <Input
                                                        disabled={isReviewMode}
                                                        value={sText}
                                                        onChange={(e) => onAnswer(qNum, e.target.value, true)}
                                                        placeholder="Cevabı buraya yazın..."
                                                        className={cn(
                                                            "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-12 rounded-xl focus:ring-indigo-500 font-medium transition-all",
                                                            isReviewMode && "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 font-bold"
                                                        )}
                                                    />
                                                </div>
                                                
                                                {isReviewMode && test.answerKey?.[qNum] && (
                                                    <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border-2 border-emerald-500/20 text-sm font-bold text-emerald-700 dark:text-emerald-400 shadow-inner">
                                                        <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                                            <Check className="w-4 h-4" strokeWidth={3} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Doğru Cevap Şablonu</span>
                                                        </div>
                                                        {test.answerKey[qNum]}
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
