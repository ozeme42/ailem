"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, CheckCircle2, ImageIcon, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DrawingOverlay, DrawingOverlayRef } from "./drawing-overlay";
import { DrawingToolbar } from "./shared-components";

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
    
    // Çizim Araçları State
    const [isDrawingMode, setIsDrawingMode] = React.useState(false);
    const [drawingTool, setDrawingTool] = React.useState<'pen' | 'eraser'>('pen');
    const [strokeWidth, setStrokeWidth] = React.useState(3);
    const overlayRef = React.useRef<DrawingOverlayRef>(null);

    const [isFullScreen, setIsFullScreen] = React.useState(false);

    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    const currentAnswer = studentAnswers[qNumStr] || "";

    // Soru değiştiğinde çizimi temizle
    React.useEffect(() => {
        overlayRef.current?.clear();
    }, [currentIndex]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-3 md:p-4 text-white flex justify-between items-center font-bold shrink-0">
                        <span className="uppercase text-xs tracking-widest hidden sm:inline">Soru {currentIndex + 1} / {questions.length}</span>
                        <span className="uppercase text-xs tracking-widest sm:hidden">{currentIndex + 1}/{questions.length}</span>
                        <div className="flex items-center gap-2">
                            <DrawingToolbar 
                                isDrawingMode={isDrawingMode} setIsDrawingMode={setIsDrawingMode}
                                drawingTool={drawingTool} setDrawingTool={setDrawingTool}
                                strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                                onClear={() => overlayRef.current?.clear()}
                            />
                            {currentAnswer && <Badge className="bg-emerald-500 text-white border-none hidden sm:inline-flex">İŞARETLENDİ</Badge>}
                        </div>
                    </div>
                    <div className="p-6 md:p-8 space-y-8 relative">
                        <div className={cn(
                            "transition-all duration-300",
                            isFullScreen ? "fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center" : "relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center group"
                        )}>
                            {currentQuestion?.imageUrl ? (
                                <>
                                    <Image src={currentQuestion.imageUrl} alt="Soru" fill className="object-contain p-4 transition-transform duration-500" />
                                    {!isFullScreen && (
                                        <Button 
                                            type="button"
                                            variant="outline" 
                                            size="icon" 
                                            className="absolute top-4 right-4 z-50 shadow-xl transition-all bg-slate-900/70 hover:bg-slate-900 text-white border-white/20 backdrop-blur-md"
                                            onClick={() => setIsFullScreen(true)}
                                            title="Büyüt"
                                        >
                                            <Maximize2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </>
                            ) : <ImageIcon className="w-16 h-16 text-slate-200" />}
                            <DrawingOverlay 
                                ref={overlayRef}
                                disabled={!isDrawingMode}
                                tool={drawingTool}
                                strokeWidth={strokeWidth}
                            />
                            {isFullScreen && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
                                    <DrawingToolbar 
                                        isDrawingMode={isDrawingMode} setIsDrawingMode={setIsDrawingMode}
                                        drawingTool={drawingTool} setDrawingTool={setDrawingTool}
                                        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                                        onClear={() => overlayRef.current?.clear()}
                                    />
                                    <div className="w-px h-8 bg-white/20 mx-1" />
                                    <Button 
                                        type="button"
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-full h-10 w-10 text-white hover:bg-white/20"
                                        onClick={() => setIsFullScreen(false)}
                                        title="Küçült"
                                    >
                                        <Minimize2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
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

            {/* Soru Gezgini - Desktop: Fixed and Scrollable */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-180px)] max-h-[700px]">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest shrink-0">
                        Soru Listesi
                        <Badge variant="outline" className="bg-white dark:bg-slate-800">{questions.length} Soru</Badge>
                    </div>
                    <ScrollArea className="flex-1 w-full">
                        <QuestionPalette 
                            total={questions.length} 
                            currentIndex={currentIndex} 
                            onNavigate={setCurrentIndex} 
                            isAnswered={(idx) => !!studentAnswers[(idx + 1).toString()]} 
                        />
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