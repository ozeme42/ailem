
"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion, EvaluationStatus } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MinusCircle, ChevronRight, ChevronLeft, LayoutGrid, ImageIcon, MessageSquareText, Target } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ResultScreenProps {
    test: Test;
    questions: QuickTestQuestion[];
}

export function ResultScreen({ test, questions }: ResultScreenProps) {
    const [selectedIdx, setSelectedIdx] = React.useState(0);
    
    const evaluationMap = React.useMemo(() => {
        const map: { [key: string]: EvaluationStatus } = {};
        if (test.openEnded) {
            return test.studentTextAnswersEvaluation || {};
        } else {
            // MCQ Evaluation
            for (let i = 1; i <= questions.length; i++) {
                const qNum = i.toString();
                const sAns = test.studentAnswers?.[qNum];
                const cAns = test.answerKey?.[qNum];
                if (!sAns) map[qNum] = 'empty';
                else if (sAns === cAns) map[qNum] = 'correct';
                else map[qNum] = 'incorrect';
            }
        }
        return map;
    }, [test, questions]);

    const currentQuestion = questions[selectedIdx];
    const qNum = (selectedIdx + 1).toString();
    const status = evaluationMap[qNum];
    const studentAnswer = test.openEnded ? (test.studentTextAnswers?.[qNum] || "Cevap verilmedi") : (test.studentAnswers?.[qNum] || "Boş");
    const correctAnswer = test.openEnded ? (test.answerKey?.[qNum] || "Bilinmiyor") : (test.answerKey?.[qNum] || "-");
    const feedback = test.studentTextAnswersFeedback?.[qNum];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20">
            {/* SOL: ÖZET VE DETAY */}
            <div className="lg:col-span-8 space-y-6">
                {/* SKOR KARTI */}
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Target className="w-32 h-32" /></div>
                    <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="text-center md:text-left space-y-2">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">%{test.score?.toFixed(0) || 0}</h2>
                            <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">Genel Başarı Oranı</p>
                        </div>
                        <div className="flex gap-4 md:gap-8 text-center">
                            <div className="space-y-1">
                                <p className="text-xl md:text-3xl font-black text-emerald-400">{test.correctAnswers || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-200">Doğru</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl md:text-3xl font-black text-rose-400">{test.incorrectAnswers || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-200">Yanlış</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl md:text-3xl font-black text-slate-300">{test.emptyAnswers || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-200">Boş</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SORU DETAYI */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className={cn("p-4 text-white flex justify-between items-center font-bold", 
                        status === 'correct' ? "bg-emerald-600" : status === 'incorrect' ? "bg-rose-600" : "bg-slate-600"
                    )}>
                        <span className="uppercase text-xs tracking-widest">Soru {selectedIdx + 1} İncelemesi</span>
                        <Badge className="bg-white/20 text-white border-none uppercase font-black">
                            {status === 'correct' ? 'DOĞRU' : status === 'incorrect' ? 'YANLIŞ' : 'BOŞ'}
                        </Badge>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                            {currentQuestion?.imageUrl ? (
                                <Image src={currentQuestion.imageUrl} alt="Soru" fill className="object-contain p-4" />
                            ) : <ImageIcon className="w-12 h-12 text-slate-200" />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Senin Cevabın</label>
                                <p className={cn("text-lg font-black", status === 'correct' ? "text-emerald-600" : status === 'incorrect' ? "text-rose-600" : "text-slate-400")}>{studentAnswer}</p>
                            </div>
                            <div className="space-y-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                                <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Doğru Cevap</label>
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{correctAnswer}</p>
                            </div>
                        </div>

                        {feedback && (
                            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5"/> Öğretmen Notu</p>
                                <p className="text-sm text-indigo-900 dark:text-indigo-200 italic">"{feedback}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SAĞ: PALET */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800">Soru Analizi</div>
                    <ScrollArea className="max-h-[60vh]">
                        <QuestionPalette 
                            total={questions.length} 
                            currentIndex={selectedIdx} 
                            onNavigate={setSelectedIdx} 
                            isAnswered={(idx) => !!(test.openEnded ? test.studentTextAnswers?.[idx+1] : test.studentAnswers?.[idx+1])} 
                            evaluationMap={evaluationMap}
                        />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
