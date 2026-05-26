"use client";

import * as React from "react";
import { Test, JsonTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, CheckCircle2, LayoutGrid } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface JSONWizardSolverProps {
    test: Test;
    questions: JsonTestQuestion[];
    studentAnswers: { [key: string]: string | null };
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
}

export function JSONWizardSolver({ test, questions, studentAnswers, onAnswer, onFinish }: JSONWizardSolverProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);

    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    const currentAnswer = studentAnswers[qNumStr] || "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center font-bold">
                        <span>YAZILI SORU {currentIndex + 1} / {questions.length}</span>
                        {currentAnswer && <Badge className="bg-emerald-500 text-white border-none">CEVAPLANDI</Badge>}
                    </div>
                    <div className="p-6 md:p-10 space-y-8">
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner">
                            <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed text-center">
                                {currentQuestion?.text || "Soru yüklenemedi."}
                            </p>
                        </div>

                        <div className="space-y-3 max-w-2xl mx-auto">
                            <RadioGroup value={currentAnswer} onValueChange={(v) => onAnswer(qNumStr, v)} className="grid grid-cols-1 gap-3">
                                {currentQuestion?.options.map((opt, idx) => {
                                    const label = String.fromCharCode(65 + idx);
                                    const isActive = currentAnswer === label;
                                    return (
                                        <div key={label}>
                                            <RadioGroupItem value={label} id={`q-opt-${label}`} className="sr-only peer" />
                                            <Label 
                                                htmlFor={`q-opt-${label}`}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                                                    isActive 
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" 
                                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
                                                )}
                                            >
                                                <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black", isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800")}>{label}</span>
                                                <span className="font-bold text-sm md:text-base">{opt}</span>
                                            </Label>
                                        </div>
                                    );
                                })}
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between gap-4">
                    <Button type="button" variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
                        <ChevronLeft className="mr-2 h-6 w-6"/> Önceki
                    </Button>
                    {currentIndex < questions.length - 1 ? (
                        <Button type="button" size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-indigo-600 text-white" onClick={() => setCurrentIndex(prev => prev + 1)}>
                            Sonraki <ChevronRight className="ml-2 h-6 w-6"/>
                        </Button>
                    ) : (
                        <Button type="button" size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-emerald-600 text-white" onClick={onFinish}>
                            <CheckCircle2 className="mr-2 h-6 w-6"/> Sınavı Bitir
                        </Button>
                    )}
                </div>
            </div>

            {/* Soru Gezgini - Desktop */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800">Soru Gezgini</div>
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