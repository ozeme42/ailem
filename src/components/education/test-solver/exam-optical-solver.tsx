
"use client";

import * as React from "react";
import { Test, PracticeExam, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { onSinglePracticeExamUpdate, updateTest } from "@/lib/dataService";
import { Check, X, Trophy, ListChecks, ChevronRight, AlertCircle, HelpCircle, BarChart3, Eye, EyeOff, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

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

    const handleConfirmReveal = async (subjectId: string) => {
        const revealedIds = test.revealedSubjectIds || [];
        if (!revealedIds.includes(subjectId)) {
            const updatedRevealedIds = [...revealedIds, subjectId];
            await updateTest(test.id, { revealedSubjectIds: updatedRevealedIds });
        }
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
                        <p className={cn("text-sm font-bold opacity-70 uppercase tracking-widest", isReviewMode ? "text-indigo-100" : "text-slate-50")}>
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
                            <div>
                                <p className="text-2xl font-black text-slate-300">{test.emptyAnswers || 0}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase">B</p>
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
                    
                    const answeredInSubject = Object.keys(studentAnswers).filter(k => {
                        const n = parseInt(k);
                        return n > offset && n <= offset + subject.questionCount && studentAnswers[k];
                    }).length;

                    const threshold = Math.ceil(subject.questionCount * 0.9);
                    const isThresholdReached = answeredInSubject >= threshold;
                    const isRevealed = isReviewMode || (test.revealedSubjectIds || []).includes(subject.id);

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
                                        (isReviewMode || isThresholdReached) && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 shadow-sm relative z-10 animate-in zoom-in-95"
                                                    >
                                                        <BarChart3 className="w-4 h-4 mr-2" /> Ders Sonuçlarını Gör
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white">Sonuçları Gör?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                                                            Bu dersin sonuçlarını açtığınızda cevaplarınız kilitlenecek ve <strong>artık geri dönüşü olmayacaktır.</strong> Devam etmek istiyor musunuz?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-4 gap-2">
                                                        <AlertDialogCancel className="rounded-xl h-11 bg-slate-100 dark:bg-slate-800 border-none hover:bg-slate-200 dark:hover:bg-slate-700 font-bold m-0">Vazgeç</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => handleConfirmReveal(subject.id)}
                                                            className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold m-0 shadow-lg shadow-indigo-500/20"
                                                        >
                                                            Onayla ve Gör
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )
                                    ) : (
                                        <div className="flex items-center gap-1.5 md:gap-4 bg-white/80 dark:bg-black/40 p-1.5 px-3 md:p-2 md:px-4 rounded-2xl border-2 border-indigo-500/30 animate-in zoom-in-95 shadow-lg relative z-10 shrink-0">
                                            <div className="flex items-center gap-1.5 md:gap-3">
                                                <div className="flex flex-col items-center min-w-[1.2rem]">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] md:text-sm">{stats.correct}</span>
                                                    <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">D</span>
                                                </div>
                                                <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-700" />
                                                <div className="flex flex-col items-center min-w-[1.2rem]">
                                                    <span className="text-rose-600 dark:text-rose-400 font-black text-[10px] md:text-sm">{stats.incorrect}</span>
                                                    <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">Y</span>
                                                </div>
                                                <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-700" />
                                                <div className="flex flex-col items-center min-w-[1.2rem]">
                                                    <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] md:text-sm">{stats.empty}</span>
                                                    <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">B</span>
                                                </div>
                                            </div>
                                            
                                            <div className="h-6 md:h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 md:mx-2" />
                                            
                                            <div className="text-right">
                                                <p className={cn("font-black text-sm md:text-lg leading-none", stats.rate >= 70 ? "text-emerald-600" : stats.rate >= 40 ? "text-amber-500" : "text-rose-600")}>
                                                    %{stats.rate}
                                                </p>
                                                <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">Başarı</p>
                                            </div>
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

                                                <div className="flex justify-between items-center gap-1.5">
                                                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                        const isSelected = sAns === opt;
                                                        const isCorrectOpt = showResult && opt === cAns;
                                                        const isStudentWrongOpt = showResult && opt === sAns && opt !== cAns;

                                                        return (
                                                            <button 
                                                                key={opt}
                                                                type="button"
                                                                disabled={isReviewMode || showResult}
                                                                onClick={() => {
                                                                    if (isReviewMode || showResult) return;
                                                                    // Eğer zaten seçiliyse temizle (Toggle logic)
                                                                    const newValue = isSelected ? "" : opt;
                                                                    onAnswer(qNum, newValue);
                                                                }}
                                                                className={cn(
                                                                    "flex items-center justify-center h-10 flex-1 rounded-xl border transition-all text-xs font-black cursor-pointer",
                                                                    !showResult ? (
                                                                        isSelected 
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
                                                            </button>
                                                        );
                                                    })}
                                                </div>
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
