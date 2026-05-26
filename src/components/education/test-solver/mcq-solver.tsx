
"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, CheckCircle2, ImageIcon } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MCQSolverProps {
    test: Test;
    questions: QuickTestQuestion[];
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
    studentAnswers: { [key: string]: string | null };
}

export function MCQSolver({ test, questions, onAnswer, onFinish, studentAnswers }: MCQSolverProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    const currentAnswer = studentAnswers[qNumStr] || "";

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
                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                    <ImageIcon className="w-16 h-16" />
                                    <p className="font-bold">Görsel Yüklenemedi</p>
                                </div>
                            )}
                        </div>

                        <div className="max-w-md mx-auto">
                            <RadioGroup 
                                value={currentAnswer} 
                                onValueChange={(v) => onAnswer(qNumStr, v)}
                                className="grid grid-cols-5 gap-3"
                            >
                                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                    <div key={opt} className="flex flex-col items-center gap-2">
                                        <RadioGroupItem value={opt} id={`q-opt-${opt}`} className="sr-only peer" />
                                        <Label 
                                            htmlFor={`q-opt-${opt}`}
                                            className={cn(
                                                "w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-black cursor-pointer transition-all",
                                                currentAnswer === opt 
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110" 
                                                    : "bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600"
                                            )}
                                        >
                                            {opt}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                {/* NAVİGASYON BUTONLARI */}
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
                            <CheckCircle2 className="mr-2 h-6 w-6"/> Testi Bitir
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
                            isAnswered={(idx) => !!studentAnswers[(idx + 1).toString()]} 
                        />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
