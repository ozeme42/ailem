"use client";

import * as React from "react";
import { Test, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Maximize2, Minimize2, CheckCircle2, LayoutGrid, X, ChevronRight, Check, AlertCircle, SplitSquareVertical, GripHorizontal, Pen, Eraser, Trash2, Hand, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

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
    
    // Onay penceresi için state
    const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
    
    // Yüksekliği yüzde olarak tutacağız (Varsayılan %50)
    const [splitHeightPercent, setSplitHeightPercent] = React.useState(50);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    
    // Scratchpad States
    const [isDrawingMode, setIsDrawingMode] = React.useState(false);
    const [drawingTool, setDrawingTool] = React.useState<'pen' | 'eraser'>('pen');
    const [strokeWidth, setStrokeWidth] = React.useState(3);
    const [isPenOnlyMode, setIsPenOnlyMode] = React.useState(false);

    const toggleDrawingMode = (forceEnabled?: boolean) => {
        const newMode = forceEnabled !== undefined ? forceEnabled : !isDrawingMode;
        setIsDrawingMode(newMode);
        iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_DRAWING', enabled: newMode }, '*');
        iframeRef.current?.contentWindow?.postMessage({ type: 'SET_TOOL', tool: drawingTool }, '*');
        
        if (!newMode) {
            iframeRef.current?.contentWindow?.postMessage({ type: 'CLEAR' }, '*');
        }
    };

    const setTool = (t: 'pen' | 'eraser') => {
        setDrawingTool(t);
        iframeRef.current?.contentWindow?.postMessage({ type: 'SET_TOOL', tool: t }, '*');
    };

    const setCanvasWidth = (w: number) => {
        setStrokeWidth(w);
        iframeRef.current?.contentWindow?.postMessage({ type: 'SET_WIDTH', width: w }, '*');
    };

    const clearCanvas = () => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'CLEAR' }, '*');
    };

    const togglePenOnlyMode = () => {
        const newMode = !isPenOnlyMode;
        setIsPenOnlyMode(newMode);
        iframeRef.current?.contentWindow?.postMessage({ type: 'SET_PEN_ONLY', enabled: newMode }, '*');
    };

    const scrollIframe = (direction: 'up' | 'down') => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'SCROLL', direction }, '*');
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

    React.useEffect(() => {
        if (isFullScreen || isOpticalOpenMobile || showConfirmDialog) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullScreen, isOpticalOpenMobile, showConfirmDialog]);


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
                body { font-family: ui-sans-serif, system-ui, sans-serif; color: #334155; line-height: 1.6; ${paddingStyle} scroll-behavior: smooth; }
                h1, h2, h3 { color: #0f172a; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
                img { border-radius: 1rem; max-width: 100%; height: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin: 1.5rem 0; }
                .question-box { background: #f8fafc; padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
                
                iframe { 
                    max-width: 100% !important; 
                    width: 100% !important; 
                    ${isOnlyIframe ? 'height: 100dvh !important;' : 'min-height: 70vh !important;'} 
                    border: none !important; 
                    display: block;
                }
            </style>
            <script>
                const initApp = () => {
                    if (window.__appInit) return;
                    window.__appInit = true;

                    const canvas = document.createElement('canvas');
                    canvas.id = 'drawing-canvas';
                    canvas.style.position = 'absolute';
                    canvas.style.top = '0';
                    canvas.style.left = '0';
                    canvas.style.zIndex = '9999';
                    canvas.style.pointerEvents = 'none';
                    canvas.style.touchAction = 'none'; 
                    document.body.appendChild(canvas);

                    const ctx = canvas.getContext('2d', { desynchronized: true }); // Düşük gecikme için özel izin
                    let isDrawing = false;
                    let tool = 'pen';
                    let currentWidth = 3;
                    let penOnly = false; 
                    
                    // YÜKSEK PERFORMANS İÇİN EKLENEN DEĞİŞKENLER
                    let points = []; // Koordinatları hafızada tutacağımız dizi
                    let raf = null;  // requestAnimationFrame kimliği
                    
                    const resize = () => {
                        canvas.style.display = 'none';
                        const w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
                        const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
                        canvas.style.display = 'block';

                        const expectedWidth = Math.floor(w * window.devicePixelRatio);
                        const expectedHeight = Math.floor(h * window.devicePixelRatio);
                        
                        if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
                            let offCanvas = null;
                            if (canvas.width > 0 && canvas.height > 0) {
                                offCanvas = document.createElement('canvas');
                                offCanvas.width = canvas.width;
                                offCanvas.height = canvas.height;
                                offCanvas.getContext('2d').drawImage(canvas, 0, 0);
                            }

                            canvas.width = expectedWidth;
                            canvas.height = expectedHeight;
                            canvas.style.width = w + 'px';
                            canvas.style.height = h + 'px';
                            
                            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            
                            if (tool === 'eraser') {
                                ctx.globalCompositeOperation = 'destination-out';
                                ctx.lineWidth = currentWidth * 5;
                            } else {
                                ctx.globalCompositeOperation = 'source-over';
                                ctx.strokeStyle = '#ef4444';
                                ctx.lineWidth = currentWidth;
                            }
                            
                            if (offCanvas) {
                                ctx.drawImage(offCanvas, 0, 0, offCanvas.width / window.devicePixelRatio, offCanvas.height / window.devicePixelRatio);
                            }
                        }
                    };
                    
                    let resizeTimeout;
                    const debouncedResize = () => {
                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(resize, 150);
                    };

                    window.addEventListener('resize', debouncedResize);
                    
                    const observer = new MutationObserver((mutations) => {
                        const hasRealMutation = mutations.some(m => m.target !== canvas);
                        if (hasRealMutation) debouncedResize();
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    setTimeout(resize, 100);

                    // EĞRİ YUMUŞATMA VE ÇİZİM MOTORU (OPTIMIZED RENDER LOOP)
                    const renderPath = () => {
                        if (points.length < 2) return;

                        ctx.beginPath();
                        ctx.moveTo(points[0].x, points[0].y);

                        // Noktaları dümdüz değil, matematiksel esnek eğrilerle birleştir
                        for (let i = 1; i < points.length - 1; i++) {
                            const xc = (points[i].x + points[i + 1].x) / 2;
                            const yc = (points[i].y + points[i + 1].y) / 2;
                            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                        }

                        // Eğriyi son noktaya bağla ve ekrana dök
                        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
                        ctx.stroke();

                        // Sadece en son kalınan noktayı hafızada tut (Bir sonraki çizim buradan devam etsin diye)
                        points = [points[points.length - 1]];
                        raf = null;
                    };

                    const start = (e) => {
                        if(canvas.style.pointerEvents === 'none') return;
                        if (penOnly && e.pointerType === 'touch') return; 

                        isDrawing = true;
                        // Çizime başlandığında ilk noktayı diziye ekle
                        points = [{ x: e.pageX, y: e.pageY }];
                        canvas.setPointerCapture(e.pointerId);
                        e.preventDefault();
                    };
                    
                    const draw = (e) => {
                        if (!isDrawing) return;
                        if (penOnly && e.pointerType === 'touch') return;
                        
                        // Her harekette noktayı diziye kaydet
                        points.push({ x: e.pageX, y: e.pageY });
                        
                        // Eğer donanım müsaitse (bekleyen bir işlem yoksa) çizim karesini tetikle
                        if (!raf) {
                            raf = requestAnimationFrame(renderPath);
                        }
                        
                        e.preventDefault();
                    };
                    
                    const stop = (e) => {
                        if (!isDrawing) return;
                        isDrawing = false;
                        
                        // Bekleyen kare varsa iptal et
                        if (raf) {
                            cancelAnimationFrame(raf);
                            raf = null;
                        }
                        
                        // Kalan son parçaları çiz ve hafızayı temizle
                        renderPath();
                        points = [];
                        
                        canvas.releasePointerCapture(e.pointerId);
                        e.preventDefault();
                    };
                    
                    canvas.addEventListener('pointerdown', start);
                    canvas.addEventListener('pointermove', draw);
                    canvas.addEventListener('pointerup', stop);
                    canvas.addEventListener('pointercancel', stop);

                    window.addEventListener('message', (e) => {
                        const msg = e.data;
                        if (msg.type === 'TOGGLE_DRAWING') {
                            canvas.style.pointerEvents = msg.enabled ? 'auto' : 'none';
                            canvas.style.cursor = msg.enabled ? 'crosshair' : 'default';
                        } else if (msg.type === 'SET_TOOL') {
                            tool = msg.tool;
                            if (tool === 'eraser') {
                                ctx.globalCompositeOperation = 'destination-out';
                                ctx.lineWidth = currentWidth * 5;
                            } else {
                                ctx.globalCompositeOperation = 'source-over';
                                ctx.strokeStyle = '#ef4444';
                                ctx.lineWidth = currentWidth;
                            }
                        } else if (msg.type === 'SET_WIDTH') {
                            currentWidth = msg.width;
                            ctx.lineWidth = tool === 'eraser' ? currentWidth * 5 : currentWidth;
                        } else if (msg.type === 'CLEAR') {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                        } else if (msg.type === 'SET_PEN_ONLY') {
                            penOnly = msg.enabled;
                        } else if (msg.type === 'SCROLL') {
                            const offset = (msg.direction === 'up' ? -1 : 1) * (window.innerHeight * 0.5);
                            window.scrollBy({ top: offset, behavior: 'smooth' });
                            if (document.documentElement) document.documentElement.scrollTop += offset;
                            if (document.body) document.body.scrollTop += offset;
                            const innerIframe = document.querySelector('iframe');
                            if (innerIframe) {
                                try {
                                    innerIframe.contentWindow.scrollBy({ top: offset, behavior: 'smooth' });
                                } catch (err) { }
                            }
                        }
                    });
                };

                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    initApp();
                } else {
                    document.addEventListener('DOMContentLoaded', initApp);
                }
            </script>
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
        <>
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
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Çizim Araçları */}
                        <div className="flex items-center gap-1 mr-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className={cn("rounded-full h-8 w-8 transition-all", isDrawingMode && drawingTool === 'pen' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "hover:bg-slate-200 dark:hover:bg-slate-700")}
                                onClick={() => { if(!isDrawingMode) toggleDrawingMode(true); setTool('pen'); }}
                                title="Kalem"
                            >
                                <Pen className="h-4 w-4" />
                            </Button>
                            
                            {isDrawingMode && (
                                <>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("rounded-full h-8 w-8 transition-all relative", isPenOnlyMode ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40" : "hover:bg-slate-200 dark:hover:bg-slate-700")}
                                        onClick={togglePenOnlyMode}
                                        title={isPenOnlyMode ? "Avuç İçi Reddi Açık" : "Avuç İçi Reddini Aç"}
                                    >
                                        <Hand className={cn("h-4 w-4", isPenOnlyMode ? "opacity-40" : "")} />
                                        {isPenOnlyMode && <X className="h-3 w-3 absolute bottom-1.5 right-1.5 text-indigo-600 dark:text-indigo-400" strokeWidth={3} />}
                                    </Button>

                                    <div className="hidden sm:flex items-center px-2 w-24">
                                        <Slider 
                                            defaultValue={[3]} 
                                            max={10} 
                                            min={1} 
                                            step={1} 
                                            onValueChange={(v) => setCanvasWidth(v[0])} 
                                        />
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("rounded-full h-8 w-8 transition-all", drawingTool === 'eraser' ? "bg-rose-500 text-white hover:bg-rose-600" : "hover:bg-slate-200 dark:hover:bg-slate-700")}
                                        onClick={() => setTool('eraser')}
                                        title="Silgi"
                                    >
                                        <Eraser className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-full h-8 w-8 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30"
                                        onClick={clearCanvas}
                                        title="Tümünü Temizle"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className={cn("rounded-full h-8 w-8", isDrawingMode ? "bg-indigo-100 text-indigo-600" : "")}
                                onClick={() => toggleDrawingMode()}
                                title={isDrawingMode ? "Çizim Modunu Kapat" : "Çizim Modunu Aç"}
                            >
                                <X className={cn("h-4 w-4 transition-transform", !isDrawingMode && "rotate-45")} />
                            </Button>
                        </div>

                        <Button type="button" variant={isSplitScreenMobile ? "default" : "ghost"} size="icon" onClick={() => setIsSplitScreenMobile(!isSplitScreenMobile)} className={cn("lg:hidden rounded-full h-8 w-8 sm:h-10 sm:w-10", isSplitScreenMobile ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400" : "hover:bg-slate-100")}>
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
                            {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
                            
                            <iframe 
                                ref={iframeRef}
                                srcDoc={getIframeDocument(test.htmlContent || "")}
                                className="w-full h-full border-none"
                                title="Test Content"
                            />

                            {isDrawingMode && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
                                    <Button 
                                        type="button" 
                                        onClick={() => scrollIframe('up')} 
                                        className="h-12 w-12 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm"
                                    >
                                        <ChevronUp className="h-6 w-6" />
                                    </Button>
                                    <Button 
                                        type="button" 
                                        onClick={() => scrollIframe('down')} 
                                        className="h-12 w-12 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 backdrop-blur-sm"
                                    >
                                        <ChevronDown className="h-6 w-6" />
                                    </Button>
                                </div>
                            )}

                            {(!isSplitScreenMobile && !isReviewMode) && (
                                <Button 
                                    type="button"
                                    onClick={() => setIsOpticalOpenMobile(true)}
                                    className="lg:hidden absolute bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl z-40 border-4 border-white dark:border-slate-800"
                                >
                                    <LayoutGrid className="w-6 h-6" />
                                </Button>
                            )}
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

                        {(!isReviewMode && !isSplitScreenMobile) && (
                            <div className="lg:hidden p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-6 sm:pb-4">
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

                    {isSplitScreenMobile && (
                        <div 
                            className="lg:hidden flex items-center justify-center h-4 bg-slate-200 dark:bg-slate-800 shrink-0 cursor-row-resize active:bg-indigo-200 dark:active:bg-indigo-900/50 touch-none z-50"
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                        >
                            <GripHorizontal className="w-5 h-5 text-slate-500" />
                        </div>
                    )}

                    <div 
                        className={cn("bg-white dark:bg-slate-900 flex flex-col min-h-0", isSplitScreenMobile ? "lg:border-l lg:border-slate-200 lg:w-80" : "hidden lg:flex lg:border-l lg:border-slate-200 lg:w-80")}
                        style={isSplitScreenMobile ? { height: `calc(${100 - splitHeightPercent}% - 16px)` } : {}}
                    >
                        {renderOpticalForm()}
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
            </div>

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
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20"
                                onClick={() => {
                                    setShowConfirmDialog(false);
                                    onFinish();
                                }}
                            >
                                Evet, Bitir
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
