"use client";

import * as React from "react";
import { Test, PracticeExam, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { onSinglePracticeExamUpdate } from "@/lib/dataService";
import { Check, X, Trophy, ListChecks, ChevronRight, AlertCircle, HelpCircle, BarChart3, Eye, EyeOff, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamOpticalSolverProps {
    test: Test;
    studentAnswers: AnswerKey;
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
    isReviewMode?: boolean;
}

export function ExamOpticalSolver({ test, studentAnswers, onAnswer, onFinish, isReviewMode = false }: ExamOpticalSolverProps) {
    const [examDetails, setExamDetails] = React.useState<PracticeExam | null>(null);
    const [openSubject, setOpenSubject] = React.useState<string | null>(null);
    const [revealedSubjects, setRevealedSubjects] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (test.sourceId) {
            return onSinglePracticeExamUpdate(test.sourceId, setExamDetails);
        }
    }, [test.sourceId]);

    const toggleReveal = (e: React.MouseEvent, subjectId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setRevealedSubjects(prev => {
            const next = new Set(prev);
            if (next.has(subjectId)) next.delete(subjectId);
            else next.add(subjectId);
            return next;
        });
    };

    if (!examDetails) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-slate-500 font-bold">Deneme şablonu yükleniyor...</p>
        </div>
    );

    const getSubjectStats = (subject: any, offset: number) => {
        let correct = 0, incorrect = 0, empty = 0;
        const total = subject.questionCount;

        for (let i = 0; i < total; i++) {
            const qNum = (offset + i + 1).toString();
            const sAns = studentAnswers[qNum];
            const cAns = test.answerKey?.[qNum];

            if (!sAns) {
                empty++;
            } else if (sAns === cAns) {
                correct++;
            } else {
                incorrect++;
            }
        }

        return { 
            correct, 
            incorrect, 
            empty, 
            total,
            rate: total > 0 ? Math.round((correct / total) * 100) : 0
        };
    };

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
            {/* Üst Bilgi Paneli */}
            <div className={cn(
                "rounded-[2.5rem] p-6 border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all",
                isReviewMode ? "bg-indigo-600 text-white border-none" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            )}>
                 <div className="flex items-center gap-5">
                    <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg", isReviewMode ? "bg-white/20" : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600")}>
                        {isReviewMode ? <Trophy className="w-8 h-8" /> : <ListChecks className="w-8 h-8" />}
                    </div>
                    <div>
                        <h2 className={cn("text-2xl font-black tracking-tight", isReviewMode ? "text-white" : "text-slate-800 dark:text-slate-100")}>{examDetails.name}</h2>
                        <p className={cn("text-sm font-bold opacity-70 uppercase tracking-widest", isReviewMode ? "text-indigo-100" : "text-slate-500")}>
                            {isReviewMode ? "SINAV ANALİZİ" : `${examDetails.subjects?.length} Ders • ${test.questionCount} Soru`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    {!isReviewMode && (
                        <Button type="button" size="lg" className="h-14 rounded-2xl px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/20" onClick={onFinish}>
                            Sınavı Bitir
                        </Button>
                    )}
                    {isReviewMode && (
                         <div className="flex gap-4 sm:gap-6 text-center bg-black/20 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
                             <div>
                                <p className="text-2xl font-black text-emerald-400">{test.correctAnswers || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">D</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-2xl font-black text-rose-400">{test.incorrectAnswers || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Y</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <p className="text-2xl font-black text-indigo-200">%{test.score?.toFixed(0) || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">SKOR</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Ders Bazlı Optik Listesi */}
            <Accordion type="single" collapsible className="space-y-4" value={openSubject || undefined} onValueChange={setOpenSubject}>
                {examDetails.subjects.map((subject, sIdx) => {
                    let offset = 0;
                    for (let i = 0; i < sIdx; i++) {
                        offset += examDetails.subjects[i].questionCount;
                    }
                    
                    const stats = getSubjectStats(subject, offset);
                    
                    // İşaretlenen soru sayısı
                    const answeredInSubject = Object.keys(studentAnswers).filter(k => {
                        const n = parseInt(k);
                        return n > offset && n <= offset + subject.questionCount && studentAnswers[k];
                    }).length;

                    // %90 barajı kontrolü
                    const threshold = Math.ceil(subject.questionCount * 0.9);
                    const isThresholdReached = answeredInSubject >= threshold;

                    // Sonuçlar açık mı? (İnceleme modundaysa her zaman açık, değilse butona basılmış olmalı)
                    const isRevealed = isReviewMode || revealedSubjects.has(subject.id);

                    return (
                        <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between pr-4 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 transition-colors border-b border-slate-100 dark:border-slate-800">
                                <AccordionTrigger className="flex-1 px-6 py-5 hover:no-underline">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-500 shrink-0">
                                            {sIdx + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{subject.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subject.questionCount} Soru • {answeredInSubject} / {subject.questionCount} İşaretlendi</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                
                                <div className="flex items-center gap-3 shrink-0 mr-4">
                                    {!isRevealed ? (
                                        // Buton sadece %90 işaretlenince ortaya çıkar
                                        (isReviewMode || isThresholdReached) && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={(e) => toggleReveal(e, subject.id)}
                                                className="h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 shadow-sm relative z-10 animate-in zoom-in-95"
                                            >
                                                <BarChart3 className="w-4 h-4 mr-2" /> Ders Sonuçlarını Gör
                                            </Button>
                                        )
                                    ) : (
                                        <div className="flex items-center gap-2 md:gap-4 bg-white/80 dark:bg-black/40 p-2 px-4 rounded-2xl border-2 border-indigo-500/30 animate-in zoom-in-95 shadow-lg relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{stats.correct}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">D</span>
                                                </div>
                                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-rose-600 dark:text-rose-400 font-black text-sm">{stats.incorrect}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Y</span>
                                                </div>
                                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-slate-500 dark:text-slate-400 font-black text-sm">{stats.empty}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">B</span>
                                                </div>
                                            </div>
                                            
                                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                                            
                                            <div className="text-right">
                                                <p className={cn("font-black text-lg leading-none", stats.rate >= 70 ? "text-emerald-600" : stats.rate >= 40 ? "text-amber-500" : "text-rose-600")}>
                                                    %{stats.rate}
                                                </p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Başarı</p>
                                            </div>

                                            {!isReviewMode && (
                                                <button 
                                                    onClick={(e) => toggleReveal(e, subject.id)}
                                                    className="ml-2 text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <AccordionContent className="p-6 bg-white dark:bg-slate-900">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                    {Array.from({ length: subject.questionCount }).map((_, i) => {
                                        const qNum = (offset + i + 1).toString();
                                        const sAns = studentAnswers[qNum] || "";
                                        const cAns = test.answerKey?.[qNum];
                                        const isWrong = sAns && sAns !== cAns;
                                        const isCorrect = sAns && sAns === cAns;

                                        // Sonuçlar butona basıldığında veya inceleme modunda görünür
                                        const showResult = isRevealed;

                                        return (
                                            <div key={qNum} className={cn(
                                                "flex flex-col gap-3 p-4 rounded-2xl border transition-all",
                                                (showResult && sAns) ? (
                                                    isCorrect ? "bg-emerald-50/30 border-emerald-200 shadow-sm" :
                                                    isWrong ? "bg-rose-50/30 border-rose-200 shadow-sm" :
                                                    "bg-slate-50 border-slate-100"
                                                ) : (sAns ? "bg-indigo-50/20 border-indigo-100" : "bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-slate-800")
                                            )}>
                                                <div className="flex justify-between items-center px-1">
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", (showResult && sAns) && isCorrect ? "text-emerald-600" : (showResult && sAns) && isWrong ? "text-rose-600" : "text-slate-400")}>Soru {qNum}</span>
                                                    {showResult && sAns && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={4} />}
                                                    {showResult && sAns && isWrong && <X className="w-3.5 h-3.5 text-rose-500" strokeWidth={4} />}
                                                </div>

                                                <RadioGroup value={sAns} onValueChange={(v) => !isReviewMode && onAnswer(qNum, v)} className="flex justify-between items-center gap-1.5">
                                                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                        const isCorrectOpt = showResult && opt === cAns;
                                                        const isStudentWrongOpt = showResult && opt === sAns && opt !== cAns;

                                                        return (
                                                            <div key={opt} className="flex-1">
                                                                <RadioGroupItem value={opt} id={`q${qNum}-opt-${opt}`} className="sr-only peer" disabled={isReviewMode} />
                                                                <Label 
                                                                    htmlFor={`q${qNum}-opt-${opt}`}
                                                                    className={cn(
                                                                        "flex items-center justify-center h-10 w-full rounded-xl border transition-all text-xs font-black cursor-pointer",
                                                                        !showResult ? (
                                                                            sAns === opt 
                                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-105"
                                                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400"
                                                                        ) : (
                                                                            isCorrectOpt ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-110 z-10 ring-2 ring-emerald-300 ring-offset-2" :
                                                                            isStudentWrongOpt ? "bg-rose-600 border-rose-600 text-white shadow-md" :
                                                                            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 opacity-50"
                                                                        )
                                                                    )}
                                                                >
                                                                    {opt}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </RadioGroup>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}
