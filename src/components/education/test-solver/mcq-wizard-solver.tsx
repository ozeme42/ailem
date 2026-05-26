
"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, CheckCircle2, ImageIcon, LayoutGrid } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MCQWizardSolverProps {
    test: Test;
    questions: QuickTestQuestion[];
    studentAnswers: { [key: string]: string | null };
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
}

export function MCQWizardSolver({ test, questions, studentAnswers, onAnswer, onFinish }: MCQWizardSolverProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
    
    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    const currentAnswer = studentAnswers[qNumStr] || "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center font-bold">
                        <span className="uppercase text-xs tracking-widest">Soru {currentIndex + 1} / {questions.length}</span>
                        {currentAnswer && <Badge className="bg-emerald-500">İŞARETLENDİ</Badge>}
                    </div>
                    <div className="p-6 md:p-8 space-y-8">
                        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center group">
                            {currentQuestion?.imageUrl ? (
                                <Image src={currentQuestion.imageUrl} alt="Soru" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                            ) : <ImageIcon className="w-16 h-16 text-slate-200" />}
                        </div>

                        <div className="max-w-md mx-auto">
                            <div className="flex justify-between items-center gap-2">
                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                    const isActive = currentAnswer === opt;
                                    return (
                                        <button 
                                            key={opt}
                                            type="button"
                                            onClick={() => onAnswer(qNumStr, isActive ? "" : opt)}
                                            className={cn(
                                                "w-12 h-12 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center text-lg md:text-xl font-black transition-all active:scale-90",
                                                isActive 
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110 z-10" 
                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-400"
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between gap-4">
                    <Button variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
                        <ChevronLeft className="mr-2 h-6 w-6"/> Önceki
                    </Button>
                    {currentIndex < questions.length - 1 ? (
                        <Button size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg" onClick={() => setCurrentIndex(prev => prev + 1)}>
                            Sonraki <ChevronRight className="ml-2 h-6 w-6"/>
                        </Button>
                    ) : (
                        <Button size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-emerald-600 text-white shadow-lg" onClick={onFinish}>
                            <CheckCircle2 className="mr-2 h-6 w-6"/> Testi Bitir
                        </Button>
                    )}
                </div>
            </div>

            {/* Soru Gezgini - Desktop */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800 text-xs uppercase tracking-widest">Soru Navigasyonu</div>
                    <ScrollArea className="max-h-[60vh]">
                        <QuestionPalette total={questions.length} currentIndex={currentIndex} onNavigate={setCurrentIndex} isAnswered={(idx) => !!studentAnswers[(idx + 1).toString()]} />
                    </ScrollArea>
                </div>
            </div>

            {/* Soru Gezgini - Mobile FAB */}
            <div className="lg:hidden">
                 <Button 
                    type="button"
                    onClick={() => setIsPaletteOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-slate-900 text-white shadow-2xl z-40 border border-white/10"
                >
                    <LayoutGrid className="w-6 h-6" />
                </Button>

                <Dialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle>Soru Gezgini</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] p-4">
                            <QuestionPalette 
                                total={questions.length} 
                                currentIndex={currentIndex} 
                                onNavigate={(idx) => { setCurrentIndex(idx); setIsPaletteOpen(false); }} 
                                isAnswered={(idx) => !!studentAnswers[(idx + 1).toString()]} 
                            />
                        </ScrollArea>
                        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/50">
                            <Button type="button" className="w-full h-12 rounded-xl" onClick={() => setIsPaletteOpen(false)}>Kapat</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
