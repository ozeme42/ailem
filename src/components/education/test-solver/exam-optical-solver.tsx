"use client";

import * as React from "react";
import { Test, PracticeExam, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { onSinglePracticeExamUpdate } from "@/lib/dataService";
import { CheckCircle2, BarChart3, Check, X, MinusCircle, Trophy, Target, ChevronRight } from "lucide-react";
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

    React.useEffect(() => {
        if (test.sourceId) {
            return onSinglePracticeExamUpdate(test.sourceId, setExamDetails);
        }
    }, [test.sourceId]);

    if (!examDetails) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-slate-500 font-bold">Deneme şablonu yükleniyor...</p>
        </div>
    );

    const getSubjectStats = (subject: any, offset: number) => {
        let correct = 0, incorrect = 0, empty = 0;
        for (let i = 0; i < subject.questionCount; i++) {
            const qNum = (offset + i + 1).toString();
            const sAns = studentAnswers[qNum];
            const cAns = test.answerKey?.[qNum];

            if (!sAns) empty++;
            else if (sAns === cAns) correct++;
            else incorrect++;
        }
        return { 
            correct, 
            incorrect, 
            empty, 
            total: subject.questionCount,
            rate: subject.questionCount > 0 ? Math.round((correct / subject.questionCount) * 100) : 0
        };
    };

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto w-full">
            {/* Header Panel */}
            <div className={cn(
                "rounded-[2.5rem] p-6 border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6",
                isReviewMode ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            )}>
                 <div className="flex items-center gap-5">
                    <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg", isReviewMode ? "bg-white/20" : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600")}>
                        {isReviewMode ? <Trophy className="w-8 h-8" /> : <BarChart3 className="w-8 h-8" />}
                    </div>
                    <div>
                        <h2 className={cn("text-2xl font-black tracking-tight", isReviewMode ? "text-white" : "text-slate-800 dark:text-slate-100")}>{examDetails.name}</h2>
                        <p className={cn("text-sm font-bold opacity-70 uppercase tracking-widest", isReviewMode ? "text-indigo-100" : "text-slate-500")}>
                            {isReviewMode ? "SINAV SONUÇ ANALİZİ" : `${examDetails.subjects?.length} Ders Alanı • ${test.questionCount} Soru`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    {isReviewMode ? (
                        <div className="flex gap-6 text-center bg-black/20 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
                             <div>
                                <p className="text-2xl font-black text-emerald-400">{test.correctAnswers || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Doğru</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-2xl font-black text-rose-400">{test.incorrectAnswers || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Yanlış</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <p className="text-2xl font-black text-indigo-200">%{test.score?.toFixed(0) || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">Başarı</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center bg-indigo-50 dark:bg-indigo-950/30 px-6 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{Object.keys(studentAnswers).length}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">İşaretlenen</p>
                            </div>
                            <Button type="button" size="lg" className="h-14 rounded-2xl px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20" onClick={onFinish}>
                                Sınavı Bitir
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Lesson Based Results List */}
            <Accordion type="single" collapsible className="space-y-4" value={openSubject || undefined} onValueChange={setOpenSubject}>
                {examDetails.subjects.map((subject, sIdx) => {
                    let offset = 0;
                    for (let i = 0; i < sIdx; i++) {
                        offset += examDetails.subjects[i].questionCount;
                    }
                    
                    const stats = getSubjectStats(subject, offset);
                    const isAllAnswered = (stats.correct + stats.incorrect) === subject.questionCount;

                    return (
                        <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800">
                            <AccordionTrigger className="px-6 py-5 hover:no-underline bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-500">
                                            {sIdx + 1}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{subject.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subject.questionCount} Soru</p>
                                        </div>
                                    </div>
                                    
                                    {/* DERS BAZLI SONUÇLAR BURADA GÖRÜNECEK (İSTEDİĞİNİZ YER) */}
                                    <div className="flex items-center gap-4">
                                        {isReviewMode ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 mr-2">
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[10px]">D: {stats.correct}</Badge>
                                                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-black text-[10px]">Y: {stats.incorrect}</Badge>
                                                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-black text-[10px]">B: {stats.empty}</Badge>
                                                </div>
                                                <Badge className={cn("px-3 h-7 rounded-full font-bold", stats.rate >= 70 ? "bg-emerald-500" : "bg-rose-500")}>
                                                    %{stats.rate} Başarı
                                                </Badge>
                                            </div>
                                        ) : (
                                            <Badge variant="secondary" className={cn("px-4 h-7 rounded-full font-bold", isAllAnswered ? "bg-emerald-500 text-white" : "bg-indigo-600/10 text-indigo-600")}>
                                                {stats.correct + stats.incorrect} / {subject.questionCount} İşaretlendi
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Array.from({ length: subject.questionCount }).map((_, i) => {
                                        const qNum = (offset + i + 1).toString();
                                        const sAns = studentAnswers[qNum] || "";
                                        const cAns = test.answerKey?.[qNum];
                                        const isWrong = sAns && sAns !== cAns;
                                        const isCorrect = sAns && sAns === cAns;

                                        return (
                                            <div key={qNum} className={cn(
                                                "flex flex-col gap-3 p-4 rounded-2xl border transition-all",
                                                isReviewMode ? (
                                                    isCorrect ? "bg-emerald-50/30 border-emerald-200 shadow-sm" :
                                                    isWrong ? "bg-rose-50/30 border-rose-200 shadow-sm" :
                                                    "bg-slate-50 border-slate-100"
                                                ) : "bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-slate-800"
                                            )}>
                                                <div className="flex justify-between items-center px-1">
                                                    <span className={cn("text-xs font-black", isReviewMode && isCorrect ? "text-emerald-600" : isReviewMode && isWrong ? "text-rose-600" : "text-slate-400")}>SORU {qNum}</span>
                                                    {isReviewMode && isCorrect && <Check className="w-4 h-4 text-emerald-500" strokeWidth={4} />}
                                                    {isReviewMode && isWrong && <X className="w-4 h-4 text-rose-500" strokeWidth={4} />}
                                                </div>

                                                <RadioGroup value={sAns} onValueChange={(v) => !isReviewMode && onAnswer(qNum, v)} className="flex justify-between items-center gap-1.5">
                                                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                        const isCorrectOpt = isReviewMode && opt === cAns;
                                                        const isStudentWrongOpt = isReviewMode && opt === sAns && opt !== cAns;

                                                        return (
                                                            <div key={opt} className="flex-1">
                                                                <RadioGroupItem value={opt} id={`q${qNum}-opt-${opt}`} className="sr-only peer" disabled={isReviewMode} />
                                                                <Label 
                                                                    htmlFor={`q${qNum}-opt-${opt}`}
                                                                    className={cn(
                                                                        "flex items-center justify-center h-10 w-full rounded-xl border transition-all text-xs font-black cursor-pointer",
                                                                        !isReviewMode ? (
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
