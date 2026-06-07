
"use client";

import * as React from "react";
import { Test, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Maximize2, Minimize2, CheckCircle2, LayoutGrid, X, ChevronRight, Check, AlertCircle, SplitSquareVertical, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HTMLDocumentSolverProps {
    test: Test;
    studentAnswers: AnswerKey;
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
    isReviewMode?: boolean;
}

export function HTMLDocumentSolver({ test, studentAnswers, onAnswer, onFinish, isReviewMode = false }: HTMLDocumentSolverProps) {
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [isOpticalOpenMobile, setIsOpticalOpenMobile] = React.useState(false);
    const [isSplitScreenMobile, setIsSplitScreenMobile] = React.useState(false);
    
    // Yüksekliği yüzde olarak tutacağız (Varsayılan %50)
    const [splitHeightPercent, setSplitHeightPercent] = React.useState(50);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        document.body.style.userSelect = 'none'; // Sürüklerken metin seçimini engelle
    };

    const handleDragMove = React.useCallback((clientY: number) => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const offsetY = clientY - containerRect.top;
        let newPercent = (offsetY / containerRect.height) * 100;
        
        // Sınırlandırma (%20 ile %80 arası)
        if (newPercent < 20) newPercent = 20;
        if (newPercent > 80) newPercent = 80;
        
        setSplitHeightPercent(newPercent);
    }, []);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        handleDragMove(e.clientY);
    }, [handleDragMove]);

    const handleTouchMove = React.useCallback((e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        handleDragMove(e.touches[0].clientY);
    }, [handleDragMove]);

    const handleDragEnd = React.useCallback(() => {
        setIsDragging(false);
        document.body.style.userSelect = '';
    }, []);

    React.useEffect(() => {
        if (!isDragging) return;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

    // Ekranı kapladığında (full screen) sayfanın altının kaymasını engelle
    React.useEffect(() => {
        if (isFullScreen || isOpticalOpenMobile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullScreen, isOpticalOpenMobile]);


    const getIframeDocument = (htmlContent: string) => {
        const isOnlyIframe = htmlContent.trim().toLowerCase().startsWith('<iframe') && htmlContent.trim().toLowerCase().endsWith('</iframe>');
        const paddingStyle = isOnlyIframe ? 'padding: 0; margin: 0; overflow: hidden;' : 'padding: 1rem; md:padding: 2rem; max-width: 800px; margin: 0 auto; overflow-x: hidden;';

        return `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { font-family: ui-sans-serif, system-ui, sans-serif; color: #334155; line-height: 1.6; ${paddingStyle} }
                h1, h2, h3 { color: #0f172a; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
                img { border-radius: 1rem; max-width: 100%; height: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin: 1.5rem 0; }
                .question-box { background: #f8fafc; padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
                
                /* Responsive iframes (Google Drive vb.) */
                iframe { 
                    max-width: 100% !important; 
                    width: 100% !important; 
                    ${isOnlyIframe ? 'height: 100dvh !important;' : 'min-height: 70vh !important;'} 
                    border: none !important; 
                    display: block;
                }
            </style>
        </head>
        <body>${htmlContent}</body>
        </html>
        `;
    };

    const renderOpticalForm = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 w-full overflow-hidden">
             <div className={cn("p-4 border-b flex justify-between items-center shrink-0", isReviewMode ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-slate-950")}>
                <h3 className="font-black text-sm uppercase">OPTİK {isReviewMode ? "SONUÇ" : "FORM"}</h3>
                <Badge className={isReviewMode ? "bg-white/20" : "bg-indigo-600"}>
                    {isReviewMode ? `%${test.score?.toFixed(0)}` : `${Object.keys(studentAnswers).length} / ${test.questionCount}`}
                </Badge>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {Array.from({ length: test.questionCount }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        const currentAns = studentAnswers[qNum] || "";
                        const correctAns = test.answerKey?.[qNum];
                        const isAnswered = !!currentAns;
                        const isCorrect = isAnswered && currentAns === correctAns;
                        const isWrong = isAnswered && currentAns !== correctAns;
                        const isEmpty = !isAnswered;

                        return (
                            <div key={qNum} className={cn(
                                "flex items-center gap-3 p-1 rounded-lg transition-colors",
                                isReviewMode && isCorrect && "bg-emerald-500/10",
                                isReviewMode && isWrong && "bg-rose-500/10",
                                isReviewMode && isEmpty && "bg-slate-100/50"
                            )}>
                                <span className={cn(
                                    "w-6 text-xs font-black",
                                    isReviewMode ? (isCorrect ? "text-emerald-600" : isWrong ? "text-rose-600" : "text-slate-400") : "text-slate-400"
                                )}>
                                    {qNum}.
                                </span>
                                <div className="flex items-center gap-1.5 flex-1">
                                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                        const isSelected = currentAns === opt;
                                        const isCorrectOpt = isReviewMode && opt === correctAns;
                                        const isWrongSelection = isReviewMode && isSelected && opt !== correctAns;

                                        return (
                                            <div key={opt} className="flex-1">
                                                <button
                                                    type="button"
                                                    disabled={isReviewMode}
                                                    onClick={() => onAnswer(qNum, isSelected ? "" : opt)}
                                                    className={cn(
                                                        "flex items-center justify-center h-8 w-full rounded-lg border text-[10px] font-black transition-all",
                                                        !isReviewMode ? (
                                                            isSelected 
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md" 
                                                                : "bg-white dark:bg-slate-800 border-slate-200 text-slate-400 hover:border-indigo-400"
                                                        ) : (
                                                            isCorrectOpt 
                                                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-105" 
                                                                : isWrongSelection 
                                                                    ? "bg-rose-600 border-rose-600 text-white" 
                                                                    : "bg-white dark:bg-slate-800 border-slate-200 text-slate-300 opacity-40"
                                                        )
                                                    )}
                                                >
                                                    {opt}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
            {!isReviewMode && (
                <div className="p-4 border-t bg-slate-50 dark:bg-slate-950 shrink-0">
                    <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-12 rounded-xl text-white shadow-lg shadow-emerald-600/20" onClick={onFinish}>Sınavı Bitir</Button>
                </div>
            )}
        </div>
    );

    return (
        <div className={cn(
            "fixed inset-0 z-50 bg-background flex flex-col transition-all",
            isFullScreen ? "z-[60]" : "relative h-[calc(100vh-180px)] rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 bg-white dark:bg-slate-900 border-b shrink-0">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", isReviewMode ? "bg-indigo-600" : "bg-emerald-500")}>
                        {isReviewMode ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    <div>
                        <p className="font-black text-sm leading-none text-slate-800 dark:text-slate-100">{test.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{isReviewMode ? "SINAV ANALİZİ" : "SINAV MODU"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant={isSplitScreenMobile ? "default" : "ghost"} size="icon" onClick={() => setIsSplitScreenMobile(!isSplitScreenMobile)} className={cn("lg:hidden rounded-full", isSplitScreenMobile ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400" : "hover:bg-slate-100")}>
                        <SplitSquareVertical className="h-5 w-5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="rounded-full hover:bg-slate-100">
                        {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                    {isFullScreen && <Button type="button" variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="rounded-full hover:bg-rose-50 text-rose-500"><X className="h-5 w-5"/></Button>}
                </div>
            </div>

            <div ref={containerRef} className={cn("flex-1 flex overflow-hidden relative", isSplitScreenMobile ? "flex-col lg:flex-row" : "flex-row")}>
                
                {/* Document Area */}
                <div 
                    className="relative bg-slate-50 dark:bg-black/20 flex flex-col min-h-0" 
                    style={isSplitScreenMobile ? { height: `${splitHeightPercent}%` } : { flex: 1 }}
                >
                    <div className="flex-1 relative min-h-0">
                        {/* We add a transparent overlay during drag to prevent iframe from eating mouse events */}
                        {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
                        
                        <iframe 
                            srcDoc={getIframeDocument(test.htmlContent || "")}
                            className="w-full h-full border-none"
                            title="Test Content"
                        />
                         {/* Mobile Optic FAB */}
                        {(!isSplitScreenMobile && !isReviewMode) && (
                            <Button 
                                type="button"
                                onClick={() => setIsOpticalOpenMobile(true)}
                                className="lg:hidden absolute bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl z-40 border-4 border-white dark:border-slate-800"
                            >
                                <LayoutGrid className="w-6 h-6" />
                            </Button>
                        )}
                        {/* Mobile Optic FAB for Review Mode */}
                        {(!isSplitScreenMobile && isReviewMode) && (
                            <Button 
                                type="button"
                                onClick={() => setIsOpticalOpenMobile(true)}
                                className="lg:hidden absolute bottom-6 right-6 h-14 w-14 rounded-full bg-slate-800 text-white shadow-2xl z-40 border-4 border-white dark:border-slate-800"
                            >
                                <AlertCircle className="w-6 h-6" />
                            </Button>
                        )}
                    </div>

                    {/* Mobile Sınavı Bitir Bar - Only show if not split screen */}
                    {(!isReviewMode && !isSplitScreenMobile) && (
                        <div className="lg:hidden p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-6 sm:pb-4">
                            <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-12 rounded-xl text-white shadow-lg shadow-emerald-600/20" onClick={onFinish}>
                                Sınavı Bitir
                            </Button>
                        </div>
                    )}
                </div>

                {/* Resizer Handle for Split Screen */}
                {isSplitScreenMobile && (
                    <div 
                        className="lg:hidden flex items-center justify-center h-4 bg-slate-200 dark:bg-slate-800 shrink-0 cursor-row-resize active:bg-indigo-200 dark:active:bg-indigo-900/50 touch-none z-50"
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    >
                        <GripHorizontal className="w-5 h-5 text-slate-500" />
                    </div>
                )}

                {/* Optical Form Area - Desktop or Split Screen */}
                <div 
                    className={cn("bg-white dark:bg-slate-900 flex flex-col min-h-0", isSplitScreenMobile ? "lg:border-l lg:border-slate-200 lg:w-80" : "hidden lg:flex lg:border-l lg:border-slate-200 lg:w-80")}
                    style={isSplitScreenMobile ? { height: `calc(${100 - splitHeightPercent}% - 16px)` } : {}}
                >
                    {renderOpticalForm()}
                </div>
            </div>

            {/* Mobile Optical Sheet Overlay */}
            {(isOpticalOpenMobile && !isSplitScreenMobile) && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden flex items-end">
                    <div className="bg-white dark:bg-slate-900 w-full h-[85vh] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="h-1.5 w-12 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-2" onClick={() => setIsOpticalOpenMobile(false)} />
                        <div className="flex-1 overflow-hidden">
                            {renderOpticalForm()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
