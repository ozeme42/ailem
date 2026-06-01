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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center font-bold shrink-0">
                        <span className="uppercase text-xs tracking-widest">YAZILI SORU {currentIndex + 1} / {questions.length}</span>
                        {currentAnswer && <Badge className="bg-emerald-500 text-white border-none">CEVAPLANDI</Badge>}
                    </div>
                    <div className="p-6 md:p-10 space-y-8">
                        <div className="relative p-8 md:p-14 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-950 border border-indigo-100/50 dark:border-indigo-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden mb-10">
                            {/* Decorative background blurs */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                            
                            <p className="relative z-10 text-xl md:text-3xl font-black text-slate-800 dark:text-slate-100 leading-relaxed md:leading-[1.5] text-center tracking-tight">
                                {currentQuestion?.text || "Soru yüklenemedi."}
                            </p>
                        </div>

                        <div className="space-y-4 max-w-3xl mx-auto">
                            <RadioGroup value={currentAnswer} onValueChange={(v) => onAnswer(qNumStr, v)} className="grid grid-cols-1 gap-4">
                                {currentQuestion?.options.map((opt, idx) => {
                                    const label = String.fromCharCode(65 + idx);
                                    const isActive = currentAnswer === label;
                                    return (
                                        <div key={label}>
                                            <RadioGroupItem value={label} id={`q-opt-${label}`} className="sr-only peer" />
                                            <Label 
                                                htmlFor={`q-opt-${label}`}
                                                className={cn(
                                                    "flex items-center gap-5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 active:scale-[0.98] group",
                                                    isActive 
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] dark:shadow-[0_10px_30px_rgba(79,70,229,0.2)]" 
                                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
                                                )}
                                            >
                                                <span className={cn(
                                                    "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-lg md:text-xl transition-colors duration-300", 
                                                    isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                                )}>{label}</span>
                                                <span className="font-bold text-base md:text-lg">{opt}</span>
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

            {/* Soru Gezgini - Desktop: Fixed and Scrollable */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-180px)] max-h-[700px]">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest shrink-0">
                        Soru Gezgini
                        <Badge variant="outline" className="bg-white dark:bg-slate-800">{questions.length} Soru</Badge>
                    </div>
                    <ScrollArea className="flex-1 w-full">
                        <QuestionPalette total={questions.length} currentIndex={currentIndex} onNavigate={setCurrentIndex} isAnswered={(idx) => !!studentAnswers[(idx + 1).toString()]} />
                    </ScrollArea>
                </div>
            </div>

             {/* Soru Gezgini - Mobile FAB */}
             <div className="lg:hidden">
                 <Button 
                    type="button"
                    onClick={() => setIsPaletteOpen(true)}
                    className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-slate-900 text-white shadow-2xl z-40 border border-white/10"
                >
                    <LayoutGrid className="w-6 h-6" />
                </Button>

                <Dialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
                        <DialogHeader className="p-6 pb-2 shrink-0">
                            <DialogTitle>Soru Gezgini</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="flex-1 p-4">
                            <QuestionPalette 
                                total={questions.length} 
                                currentIndex={currentIndex} 
                                onNavigate={(idx) => { setCurrentIndex(idx); setIsPaletteOpen(false); }} 
                                isAnswered={(idx) => !!studentAnswers[(idx + 1).toString()]} 
                            />
                        </ScrollArea>
                        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                            <Button type="button" className="w-full h-12 rounded-xl" onClick={() => setIsPaletteOpen(false)}>Kapat</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}