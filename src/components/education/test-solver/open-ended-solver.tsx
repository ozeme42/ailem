
"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, CheckCircle2, ImageIcon, Save } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface OpenEndedSolverProps {
    test: Test;
    questions: QuickTestQuestion[];
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
    studentTextAnswers: { [key: string]: string };
}

export function OpenEndedSolver({ test, questions, onAnswer, onFinish, studentTextAnswers }: OpenEndedSolverProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    const currentAnswer = studentTextAnswers[qNumStr] || "";

    const handleNext = () => {
        if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20">
            {/* SOL: SORU ALANI */}
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                        <span className="font-black text-sm uppercase tracking-widest">Soru {currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="p-6 md:p-10 space-y-8">
                        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                            {currentQuestion?.imageUrl ? (
                                <Image src={currentQuestion.imageUrl} alt="Soru" fill className="object-contain p-4" />
                            ) : (
                                <ImageIcon className="w-16 h-16 text-slate-200" />
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Senin Cevabın</label>
                            <Textarea 
                                placeholder="Cevabını buraya yazabilirsin..."
                                className="min-h-[200px] text-lg p-5 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:bg-white transition-all leading-relaxed shadow-inner"
                                value={currentAnswer}
                                onChange={(e) => onAnswer(qNumStr, e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between gap-4">
                    <Button variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={handlePrev} disabled={currentIndex === 0}>
                        <ChevronLeft className="mr-2 h-6 w-6"/> Önceki
                    </Button>
                    {currentIndex < questions.length - 1 ? (
                        <Button size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-indigo-600" onClick={handleNext}>
                            Sonraki <ChevronRight className="ml-2 h-6 w-6"/>
                        </Button>
                    ) : (
                        <Button size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-emerald-600" onClick={onFinish}>
                            <CheckCircle2 className="mr-2 h-6 w-6"/> Ödevi Gönder
                        </Button>
                    )}
                </div>
            </div>

            {/* SAĞ: PALET */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800">Soru Gezgini</div>
                    <ScrollArea className="max-h-[60vh]">
                        <QuestionPalette 
                            total={questions.length} 
                            currentIndex={currentIndex} 
                            onNavigate={setCurrentIndex} 
                            isAnswered={(idx) => !!studentTextAnswers[(idx + 1).toString()]} 
                        />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
