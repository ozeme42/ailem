"use client";

import * as React from "react";
import { Test, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Maximize2, Minimize2, CheckCircle2, LayoutGrid, X, ChevronRight, Check, AlertCircle, SplitSquareVertical, GripHorizontal, Pen, Eraser, Trash2, Hand, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { DrawingOverlay, DrawingOverlayRef } from "./drawing-overlay";
import { DrawingToolbar } from "./shared-components";

// react-pdf imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker to unpkg CDN for Next.js compatibility without complex config
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfDocumentSolverProps {
    test: Test;
    studentAnswers: AnswerKey;
    studentTextAnswers?: { [key: string]: string };
    onAnswer: (qNum: string, answer: string) => void;
    onTextAnswer?: (qNum: string, answer: string) => void;
    onFinish: () => void;
    isReviewMode?: boolean;
}

function LazyPdfPage({ index, containerWidth, pdfScale, isDrawingMode, drawingTool, strokeWidth, stylusOnly, overlayRef }: { 
    index: number; 
    containerWidth: number;
    pdfScale: number; 
    isDrawingMode: boolean; 
    drawingTool: 'pen' | 'eraser'; 
    strokeWidth: number; 
    stylusOnly: boolean; 
    overlayRef: (el: DrawingOverlayRef | null) => void;
}) {
    const [hasIntersected, setHasIntersected] = React.useState(index < 2); // İlk 2 sayfayı anında yükle
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (hasIntersected || !ref.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setHasIntersected(true);
                observer.disconnect();
            }
        }, { rootMargin: '2000px' }); // 2000px önceden yüklemeye başla
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [hasIntersected]);

    return (
        <div ref={ref} className="relative mb-6 shadow-xl rounded-md bg-white border border-slate-200 dark:border-slate-800 min-h-[800px] flex items-center justify-center flex-col" style={{ width: containerWidth ? (containerWidth - 32) * pdfScale : 'auto' }}>
            {hasIntersected ? (
                <>
                    <Page 
                        pageNumber={index + 1} 
                        width={containerWidth ? (containerWidth - 32) * pdfScale : undefined} 
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="w-full"
                    />
                    <DrawingOverlay 
                        className="absolute inset-0 z-10 rounded-md"
                        ref={overlayRef}
                        disabled={!isDrawingMode}
                        tool={drawingTool}
                        strokeWidth={strokeWidth}
                        onChange={() => {}}
                        stylusOnly={stylusOnly}
                    />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-3 text-slate-400 py-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <span className="text-sm font-semibold">Sayfa {index + 1} Yükleniyor...</span>
                </div>
            )}
        </div>
    );
}

export function PdfDocumentSolver({ test, studentAnswers, studentTextAnswers = {}, onAnswer, onTextAnswer, onFinish, isReviewMode = false }: PdfDocumentSolverProps) {
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [isOpticalOpenMobile, setIsOpticalOpenMobile] = React.useState(false);
    const [isSplitScreenMobile, setIsSplitScreenMobile] = React.useState(false);
    
    // Split screen layout
    const [splitHeightPercent, setSplitHeightPercent] = React.useState(50);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    // Scratchpad States
    const [startOffset, setStartOffset] = React.useState<number>(test.startingQuestionNumber || 1);
    const [isDrawingMode, setIsDrawingMode] = React.useState(false);
    const [drawingTool, setDrawingTool] = React.useState<'pen' | 'eraser'>('pen');
    const [strokeWidth, setStrokeWidth] = React.useState(3);
    const [stylusOnly, setStylusOnly] = React.useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
    const overlayRefs = React.useRef<(DrawingOverlayRef | null)[]>([]);

    // PDF States
    const [numPages, setNumPages] = React.useState<number>(0);
    const [pdfScale, setPdfScale] = React.useState<number>(1);
    const [containerWidth, setContainerWidth] = React.useState<number>(0);

    const pdfContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateWidth = () => {
            if (pdfContainerRef.current) {
                setContainerWidth(pdfContainerRef.current.clientWidth);
            }
        };
        // Biraz gecikmeli çağırarak container'ın render edilmesini bekleyelim
        setTimeout(updateWidth, 100);
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        overlayRefs.current = Array(numPages).fill(null);
    };

    const clearCanvas = () => {
        overlayRefs.current.forEach(ref => ref?.clear());
    };

    const scrollPdf = (direction: 'up' | 'down') => {
        if (!pdfContainerRef.current) return;
        const amount = direction === 'up' ? -200 : 200;
        pdfContainerRef.current.scrollBy({ top: amount, behavior: 'smooth' });
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        document.body.style.userSelect = 'none'; 
    };

    const handleDragMove = React.useCallback((clientY: number) => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const offsetY = clientY - containerRect.top;
        let newPercent = (offsetY / containerRect.height) * 100;
        
        if (newPercent < 20) newPercent = 20;
        if (newPercent > 80) newPercent = 80;
        
        setSplitHeightPercent(newPercent);
    }, []);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        handleDragMove(e.clientY);
    }, [handleDragMove]);

    const handleTouchMove = React.useCallback((e: TouchEvent) => {
        handleDragMove(e.touches[0].clientY);
    }, [handleDragMove]);

    const handleDragEnd = React.useCallback(() => {
        setIsDragging(false);
        document.body.style.userSelect = '';
    }, []);

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

    // -- STATS --
    const qCount = test.questionCount || 10;
    const answeredCount = Object.keys(studentAnswers).length;
    const answeredArr = Array.from({ length: qCount }, (_, i) => studentAnswers[(i + 1).toString()] || null);

    
    const renderQuestionRow = (qNum: string, displayNumber: number) => {
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
                    {displayNumber}.
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
    };
    
    const renderOpticalForm = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 w-full overflow-hidden">
            <div className={cn("p-3 sm:p-4 border-b flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center shrink-0", isReviewMode ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-slate-950")}>
                <div className="flex items-center justify-between sm:justify-start gap-4">
                    <h3 className="font-black text-sm uppercase">{test.openEnded ? "AÇIK UÇLU CEVAPLAR" : (isReviewMode ? "OPTİK SONUÇ" : "OPTİK FORM")}</h3>
                    <Badge className={isReviewMode ? "bg-white/20" : "bg-indigo-600"}>
                        {isReviewMode ? (test.openEnded ? "Sonuçlar" : `%${test.score?.toFixed(0)}`) : `${test.openEnded ? Object.keys(studentTextAnswers).length : Object.keys(studentAnswers).length} / ${test.questionCount}`}
                    </Badge>
                </div>
                {!isReviewMode && (
                    <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-slate-500">
                        <label htmlFor="startOffset">Başlangıç No:</label>
                        <input 
                            type="number" 
                            id="startOffset"
                            min="1" 
                            value={startOffset}
                            onChange={(e) => setStartOffset(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center"
                        />
                    </div>
                )}
            </div>
            {isReviewMode && test.openEnded && (
                <div className="bg-indigo-700 text-white px-4 py-3 flex gap-2 text-xs font-bold border-b border-indigo-500/50 shadow-inner shrink-0">
                    <div className="flex flex-col flex-1 bg-white/10 rounded-lg p-2 items-center justify-center">
                        <span className="text-white/60 text-[10px] uppercase mb-0.5 tracking-wider">Başarı</span>
                        <span className="text-xl leading-none mt-1">%{((Object.values(test.studentTextAnswersEvaluation || {}).filter(e => e === 'correct').length / (test.questionCount || 1)) * 100).toFixed(0)}</span>
                    </div>
                    <div className="flex flex-col flex-1 bg-emerald-500/20 rounded-lg p-2 items-center justify-center border border-emerald-500/20">
                        <span className="text-emerald-200 text-[10px] uppercase mb-0.5 tracking-wider">Doğru</span>
                        <span className="text-emerald-50 text-xl leading-none mt-1">{Object.values(test.studentTextAnswersEvaluation || {}).filter(e => e === 'correct').length}</span>
                    </div>
                    <div className="flex flex-col flex-1 bg-rose-500/20 rounded-lg p-2 items-center justify-center border border-rose-500/20">
                        <span className="text-rose-200 text-[10px] uppercase mb-0.5 tracking-wider">Yanlış</span>
                        <span className="text-rose-50 text-xl leading-none mt-1">{Object.values(test.studentTextAnswersEvaluation || {}).filter(e => e === 'incorrect').length}</span>
                    </div>
                    <div className="flex flex-col flex-1 bg-slate-500/30 rounded-lg p-2 items-center justify-center border border-slate-400/20">
                        <span className="text-slate-300 text-[10px] uppercase mb-0.5 tracking-wider">Boş</span>
                        <span className="text-slate-50 text-xl leading-none mt-1">{Object.values(test.studentTextAnswersEvaluation || {}).filter(e => e === 'empty').length}</span>
                    </div>
                </div>
            )}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {Array.from({ length: qCount }).map((_, i) => {
                        const qNum = (i + startOffset).toString();
                        
                        if (test.openEnded) {
                            const textAns = studentTextAnswers[qNum] || "";
                            const isEvalCorrect = test.studentTextAnswersEvaluation?.[qNum] === 'correct';
                            const isEvalWrong = test.studentTextAnswersEvaluation?.[qNum] === 'incorrect';
                            const isEvalEmpty = test.studentTextAnswersEvaluation?.[qNum] === 'empty';

                            return (
                                <div key={qNum} className={cn(
                                    "flex flex-col gap-2 p-3 rounded-lg border transition-colors",
                                    isReviewMode ? (
                                        isEvalCorrect ? "bg-emerald-500/10 border-emerald-500/20" :
                                        isEvalWrong ? "bg-rose-500/10 border-rose-500/20" :
                                        "bg-slate-100/50 border-slate-200"
                                    ) : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-500">Soru {qNum}</span>
                                        {isReviewMode && test.studentTextAnswersEvaluation?.[qNum] && (
                                            <Badge variant="outline" className={cn(
                                                "text-[10px]",
                                                isEvalCorrect ? "text-emerald-600 border-emerald-600" :
                                                isEvalWrong ? "text-rose-600 border-rose-600" :
                                                "text-slate-500 border-slate-300"
                                            )}>
                                                {isEvalCorrect ? "Doğru" : isEvalWrong ? "Yanlış" : "Boş"}
                                            </Badge>
                                        )}
                                    </div>
                                    <Textarea 
                                        value={textAns}
                                        onChange={(e) => onTextAnswer && onTextAnswer(qNum, e.target.value)}
                                        disabled={isReviewMode}
                                        placeholder="Cevabınızı buraya yazın..."
                                        className="min-h-[80px] text-sm resize-none bg-transparent"
                                    />
                                    {isReviewMode && test.studentTextAnswersFeedback?.[qNum] && (
                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-md mt-1">
                                            <strong>Geri Bildirim:</strong> {test.studentTextAnswersFeedback[qNum]}
                                        </div>
                                    )}
                                </div>
                            );
                        }

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
                    <Button 
                        type="button" 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-12 rounded-xl text-white shadow-lg shadow-emerald-600/20" 
                        onClick={() => setShowConfirmDialog(true)}
                    >
                        Sınavı Bitir
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="relative">
            {isFullScreen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300" />
            )}

            <div className={cn(
                "transition-all duration-500 bg-white dark:bg-slate-950 flex flex-col",
                isFullScreen 
                    ? "fixed inset-0 z-[60]" 
                    : "relative w-full rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[75vh] md:h-[80vh] min-h-[600px]"
            )} ref={containerRef}>
                
                <div className={cn("flex-1 flex overflow-hidden relative", isSplitScreenMobile ? "flex-col" : "flex-col md:flex-row")}>
                    {/* Sol Panel: PDF Görüntüleyici */}
                    <div 
                      className="flex flex-col bg-white dark:bg-slate-900 md:border-r border-slate-200 dark:border-slate-800 transition-all relative min-h-0"
                      style={isSplitScreenMobile ? { height: `${splitHeightPercent}%` } : { flex: 1 }}
                    >
                    {/* Toolbar */}
                    <div className="h-14 md:h-16 px-3 md:px-6 shrink-0 flex flex-wrap items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {!isReviewMode && (
                                <DrawingToolbar 
                                    isDrawingMode={isDrawingMode} setIsDrawingMode={setIsDrawingMode}
                                    drawingTool={drawingTool} setDrawingTool={setDrawingTool}
                                    strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                                    onClear={clearCanvas}
                                    stylusOnly={stylusOnly} setStylusOnly={setStylusOnly}
                                />
                            )}
                            <div className="ml-auto md:ml-0 flex items-center gap-2">
                                <Button type="button" variant={isSplitScreenMobile ? "default" : "ghost"} size="icon" onClick={() => setIsSplitScreenMobile(!isSplitScreenMobile)} className={cn("md:hidden rounded-xl h-10 w-10", isSplitScreenMobile ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500")}>
                                    <SplitSquareVertical className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setIsOpticalOpenMobile(true)}>
                                    <LayoutGrid className="w-5 h-5 text-indigo-500" />
                                </Button>
                                
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex" onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))}>
                                    <ZoomOut className="w-5 h-5 text-slate-500" />
                                </Button>
                                <div className="text-xs font-bold text-slate-500 w-8 text-center">{Math.round(pdfScale * 100)}%</div>
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex" onClick={() => setPdfScale(s => Math.min(3, s + 0.2))}>
                                    <ZoomIn className="w-5 h-5 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex" onClick={() => setIsFullScreen(!isFullScreen)}>
                                    {isFullScreen ? <Minimize2 className="w-5 h-5 text-slate-500" /> : <Maximize2 className="w-5 h-5 text-slate-500" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div 
                        className="flex-1 overflow-auto relative custom-scrollbar" 
                        ref={pdfContainerRef}
                    >
                        {test.fileUrl ? (
                            <div className="min-w-full w-max flex flex-col items-center py-6 px-2 bg-slate-100 dark:bg-slate-950 min-h-full">
                                <Document
                                    file={`/api/pdf-proxy?url=${encodeURIComponent(test.fileUrl)}`}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={
                                        <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                            <p className="text-slate-500 font-bold">PDF yükleniyor...</p>
                                        </div>
                                    }
                                >
                                    {Array.from(new Array(numPages), (el, index) => (
                                        <LazyPdfPage
                                            key={`page_${index + 1}`}
                                            index={index}
                                            containerWidth={containerWidth}
                                            pdfScale={pdfScale}
                                            isDrawingMode={isDrawingMode}
                                            drawingTool={drawingTool}
                                            strokeWidth={strokeWidth}
                                            stylusOnly={stylusOnly}
                                            overlayRef={(el) => {
                                                if (overlayRefs.current) {
                                                    overlayRefs.current[index] = el;
                                                }
                                            }}
                                        />
                                    ))}
                                </Document>
                                {isDrawingMode && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40 fixed">
                                        <Button 
                                            type="button" 
                                            onClick={() => scrollPdf('up')} 
                                            className="h-12 w-12 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm"
                                        >
                                            <ChevronUp className="h-6 w-6" />
                                        </Button>
                                        <Button 
                                            type="button" 
                                            onClick={() => scrollPdf('down')} 
                                            className="h-12 w-12 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm"
                                        >
                                            <ChevronDown className="h-6 w-6" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">PDF dosyası bulunamadı.</div>
                        )}
                    </div>
                </div>

                {/* Sürükleme Çubuğu (Sadece Mobil Split Mod) */}
                {isSplitScreenMobile && (
                    <div 
                        className="h-6 w-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center cursor-ns-resize touch-none md:hidden shrink-0 group relative"
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    >
                         <div className="absolute inset-0 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" />
                        <GripHorizontal className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 relative z-10" />
                    </div>
                )}

                {/* Sağ Panel: Optik Form */}
                <div 
                    className={cn(
                        "bg-white dark:bg-slate-900 flex flex-col min-h-0", 
                        isSplitScreenMobile ? "lg:border-l lg:border-slate-200 lg:w-80 border-t" : "hidden lg:flex lg:border-l lg:border-slate-200 lg:w-80"
                    )}
                    style={isSplitScreenMobile ? { height: `calc(${100 - splitHeightPercent}% - 16px)` } : {}}
                >
                    {renderOpticalForm()}
                </div>
                </div>
            </div>

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
            {/* Sınavı Bitir Onay Penceresi */}
            {showConfirmDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Sınavı Bitir</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Testi bitirmek istediğinize emin misiniz? Sonuçlarınız kaydedilecek ve sınav analiz ekranına geçilecektir.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 font-bold rounded-xl"
                                onClick={() => setShowConfirmDialog(false)}
                            >
                                İptal
                            </Button>
                            <Button
                                type="button"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl"
                                onClick={() => {
                                    setShowConfirmDialog(false);
                                    onFinish();
                                }}
                            >
                                Bitir
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
