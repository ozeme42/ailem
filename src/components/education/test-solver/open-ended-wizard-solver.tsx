"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, CheckCircle2, ImageIcon, LayoutGrid, Pen, Eraser, Trash2 } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { DrawingOverlay, DrawingOverlayRef } from "./drawing-overlay";

interface OpenEndedWizardSolverProps {
    test: Test;
    questions: QuickTestQuestion[];
    studentTextAnswers: { [key: string]: string };
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
}

export function OpenEndedWizardSolver({ test, questions, studentTextAnswers, onAnswer, onFinish }: OpenEndedWizardSolverProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
    
    // Scratchpad states
    const [isDrawingMode, setIsDrawingMode] = React.useState(false);
    const [drawingTool, setDrawingTool] = React.useState<'pen' | 'eraser'>('pen');
    const [strokeWidth, setStrokeWidth] = React.useState(3);
    const [drawings, setDrawings] = React.useState<{ [key: number]: string }>({});
    const drawingRef = React.useRef<DrawingOverlayRef>(null);

    // Save drawing when navigating away or drawing changes
    const saveDrawing = () => {
        if (drawingRef.current) {
            setDrawings(prev => ({ ...prev, [currentIndex]: drawingRef.current!.getDataURL() }));
        }
    };

    // Load drawing when entering a question
    React.useEffect(() => {
        if (drawingRef.current) {
            drawingRef.current.loadDataURL(drawings[currentIndex] || "");
        }
    }, [currentIndex]);

    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    const currentAnswer = studentTextAnswers[qNumStr] || "";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center font-bold shrink-0">
                        <span className="uppercase text-xs tracking-widest">Soru {currentIndex + 1} / {questions.length}</span>
                        {currentAnswer.length > 0 && <Badge className="bg-emerald-500 text-white border-none">CEVAPLANDI</Badge>}
                    </div>
                    <div className="p-6 md:p-8 space-y-8">
                        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 flex flex-col items-center justify-center group">
                            {currentQuestion?.imageUrl ? (
                                <Image src={currentQuestion.imageUrl} alt="Soru" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                            ) : <ImageIcon className="w-16 h-16 text-slate-200" />}
                            
                            {/* Çizim Katmanı */}
                            <DrawingOverlay 
                                ref={drawingRef} 
                                disabled={!isDrawingMode} 
                                tool={drawingTool} 
                                strokeWidth={strokeWidth}
                                onChange={saveDrawing} 
                            />
                            
                            {/* Çizim Kontrolleri */}
                            <div className="absolute top-4 right-4 z-50 flex gap-2">
                                {!isDrawingMode ? (
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        size="icon" 
                                        className="rounded-full shadow-md bg-white text-slate-600 transition-all hover:bg-slate-100"
                                        onClick={() => { setIsDrawingMode(true); setDrawingTool('pen'); }}
                                        title="Çizim Modunu Aç"
                                    >
                                        <Pen className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-lg">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn("rounded-full h-8 w-8 transition-all", drawingTool === 'pen' ? "bg-indigo-600 text-white" : "hover:bg-slate-200 text-slate-600")}
                                            onClick={() => setDrawingTool('pen')}
                                            title="Kalem"
                                        >
                                            <Pen className="w-4 h-4" />
                                        </Button>
                                        <div className="hidden sm:flex items-center px-2 w-24">
                                            <Slider 
                                                defaultValue={[3]} 
                                                max={10} 
                                                min={1} 
                                                step={1} 
                                                onValueChange={(v) => setStrokeWidth(v[0])} 
                                            />
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn("rounded-full h-8 w-8 transition-all", drawingTool === 'eraser' ? "bg-rose-500 text-white" : "hover:bg-slate-200 text-slate-600")}
                                            onClick={() => setDrawingTool('eraser')}
                                            title="Silgi"
                                        >
                                            <Eraser className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full h-8 w-8 hover:bg-rose-100 text-slate-600 hover:text-rose-600"
                                            onClick={() => { drawingRef.current?.clear(); saveDrawing(); }}
                                            title="Tümünü Temizle"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full h-8 w-8 bg-indigo-100 text-indigo-600"
                                            onClick={() => {
                                                setIsDrawingMode(false);
                                                // Kullanıcı kapatınca çizimlerin silinmesini istedi
                                                drawingRef.current?.clear();
                                                saveDrawing();
                                            }}
                                            title="Çizim Modunu Kapat"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Senin Cevabın</label>
                            <Textarea 
                                placeholder="Cevabını buraya yazabilirsin..."
                                className="min-h-[180px] text-lg p-5 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:bg-white transition-all leading-relaxed shadow-inner"
                                value={currentAnswer}
                                onChange={(e) => onAnswer(qNumStr, e.target.value)}
                            />
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
                            <CheckCircle2 className="mr-2 h-6 w-6"/> Ödevi Gönder
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
                            isAnswered={(idx) => !!studentTextAnswers[(idx + 1).toString()]} 
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
                                isAnswered={(idx) => !!studentTextAnswers[(idx + 1).toString()]} 
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