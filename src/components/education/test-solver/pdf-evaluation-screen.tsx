"use client";

import * as React from "react";
import { Test, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Maximize2, Minimize2, CheckCircle2, LayoutGrid, XCircle, MinusCircle, Check, AlertCircle, SplitSquareVertical, GripHorizontal, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfEvaluationScreenProps {
    test: Test;
    evaluations: { [key: string]: EvaluationStatus };
    feedbacks: { [key: string]: string };
    onEvaluate: (qNum: string, status: EvaluationStatus) => void;
    onFeedback: (qNum: string, feedback: string) => void;
    onFinish: () => void;
}

function LazyPdfPage({ index, containerWidth, pdfScale }: { 
    index: number; 
    containerWidth: number;
    pdfScale: number; 
}) {
    const [hasIntersected, setHasIntersected] = React.useState(index < 2);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (hasIntersected || !ref.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setHasIntersected(true);
                observer.disconnect();
            }
        }, { rootMargin: '2000px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [hasIntersected]);

    return (
        <div ref={ref} className="relative mb-6 shadow-xl rounded-md bg-white border border-slate-200 dark:border-slate-800 min-h-[800px] flex items-center justify-center flex-col" style={{ width: containerWidth ? (containerWidth - 32) * pdfScale : 'auto' }}>
            {hasIntersected ? (
                <Page 
                    pageNumber={index + 1} 
                    width={containerWidth ? (containerWidth - 32) * pdfScale : undefined} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="w-full"
                />
            ) : (
                <div className="flex flex-col items-center justify-center space-y-3 text-slate-400 py-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <span className="text-sm font-semibold">Sayfa {index + 1} Yükleniyor...</span>
                </div>
            )}
        </div>
    );
}

export function PdfEvaluationScreen({ test, evaluations, feedbacks, onEvaluate, onFeedback, onFinish }: PdfEvaluationScreenProps) {
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [isOpticalOpenMobile, setIsOpticalOpenMobile] = React.useState(false);
    const [isSplitScreenMobile, setIsSplitScreenMobile] = React.useState(false);
    const [splitHeightPercent, setSplitHeightPercent] = React.useState(50);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
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
        setTimeout(updateWidth, 100);
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
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

    const qCount = test.questionCount || 10;
    const studentTextAnswers = test.studentTextAnswers || {};

    const renderEvaluationForm = () => (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 w-full overflow-hidden">
             <div className="p-4 border-b flex justify-between items-center shrink-0 bg-indigo-600 text-white">
                <h3 className="font-black text-sm uppercase">DEĞERLENDİRME PANELİ</h3>
                <Badge className="bg-white/20">
                    {Object.values(evaluations).filter(v => v !== 'unevaluated').length} / {qCount}
                </Badge>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {Array.from({ length: qCount }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        const currentAns = studentTextAnswers[qNum] || "Cevap verilmemiş.";
                        const currentEval = evaluations[qNum] || 'unevaluated';
                        const currentFeedback = feedbacks[qNum] || "";

                        return (
                            <div key={qNum} className="flex flex-col gap-3 p-4 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">Soru {qNum}</span>
                                    {currentEval !== 'unevaluated' && (
                                        <Badge variant="outline" className={cn(
                                            "text-[10px]",
                                            currentEval === 'correct' ? "text-emerald-600 border-emerald-600 bg-emerald-50" :
                                            currentEval === 'incorrect' ? "text-rose-600 border-rose-600 bg-rose-50" :
                                            "text-slate-600 border-slate-400 bg-slate-50"
                                        )}>
                                            {currentEval === 'correct' ? "Doğru" : currentEval === 'incorrect' ? "Yanlış" : "Boş"}
                                        </Badge>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{currentAns}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className={cn("h-10 text-xs font-bold transition-all", currentEval === 'correct' ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" : "border-slate-200 dark:border-slate-800")}
                                        onClick={() => onEvaluate(qNum, 'correct')}
                                    >
                                        <CheckCircle2 className="mr-1.5 w-4 h-4"/> Doğru
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className={cn("h-10 text-xs font-bold transition-all", currentEval === 'incorrect' ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm" : "border-slate-200 dark:border-slate-800")}
                                        onClick={() => onEvaluate(qNum, 'incorrect')}
                                    >
                                        <XCircle className="mr-1.5 w-4 h-4"/> Yanlış
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className={cn("h-10 text-xs font-bold transition-all", currentEval === 'empty' ? "bg-slate-100 border-slate-400 text-slate-600 shadow-sm" : "border-slate-200 dark:border-slate-800")}
                                        onClick={() => onEvaluate(qNum, 'empty')}
                                    >
                                        <MinusCircle className="mr-1.5 w-4 h-4"/> Boş
                                    </Button>
                                </div>
                                <Textarea 
                                    placeholder="Geri bildirim ekle (opsiyonel)..."
                                    className="min-h-[60px] text-xs resize-none bg-slate-50 border-slate-200 dark:bg-slate-900"
                                    value={currentFeedback}
                                    onChange={(e) => onFeedback(qNum, e.target.value)}
                                />
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-white dark:bg-slate-950 shrink-0">
                <Button 
                    type="button" 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-12 rounded-xl text-white shadow-lg shadow-emerald-600/20" 
                    onClick={onFinish}
                >
                    <Save className="mr-2 h-5 w-5" /> Puanlamayı Bitir
                </Button>
            </div>
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
                      className="flex flex-col bg-slate-100 dark:bg-slate-900 md:border-r border-slate-200 dark:border-slate-800 transition-all relative min-h-0"
                      style={isSplitScreenMobile ? { height: `${splitHeightPercent}%` } : { flex: 1 }}
                    >
                    {/* Toolbar */}
                    <div className="h-14 md:h-16 px-3 md:px-6 shrink-0 flex flex-wrap items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                        <div className="flex items-center gap-3 w-full md:w-auto">
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
                                        />
                                    ))}
                                </Document>
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

                {/* Sağ Panel: Değerlendirme Formu */}
                <div 
                    className={cn(
                        "bg-slate-50 dark:bg-slate-900 flex flex-col min-h-0 lg:max-w-md", 
                        isSplitScreenMobile ? "lg:border-l lg:border-slate-200 lg:w-96 border-t" : "hidden lg:flex lg:border-l lg:border-slate-200 lg:w-96"
                    )}
                    style={isSplitScreenMobile ? { height: `calc(${100 - splitHeightPercent}% - 16px)` } : {}}
                >
                    {renderEvaluationForm()}
                </div>
                </div>
            </div>

            {(isOpticalOpenMobile && !isSplitScreenMobile) && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden flex items-end">
                    <div className="bg-white dark:bg-slate-900 w-full h-[85vh] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="h-1.5 w-12 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-2" onClick={() => setIsOpticalOpenMobile(false)} />
                        <div className="flex-1 overflow-hidden">
                            {renderEvaluationForm()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
