
"use client";

import * as React from "react";
import { Test, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Maximize2, Minimize2, CheckCircle2, LayoutGrid, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HTMLDocumentSolverProps {
    test: Test;
    studentAnswers: AnswerKey;
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
}

export function HTMLDocumentSolver({ test, studentAnswers, onAnswer, onFinish }: HTMLDocumentSolverProps) {
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [isOpticalOpenMobile, setIsOpticalOpenMobile] = React.useState(false);

    const getIframeDocument = (htmlContent: string) => `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; color: #334155; line-height: 1.6; }
                h1, h2, h3 { color: #0f172a; font-weight: 800; margin-top: 2em; margin-bottom: 1em; }
                img { border-radius: 1.5rem; max-width: 100%; height: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin: 2rem 0; }
                .question-box { background: #f8fafc; padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
            </style>
        </head>
        <body>${htmlContent}</body>
        </html>
    `;

    const OpticalForm = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
             <div className="p-4 border-b bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">OPTİK FORM</h3>
                <Badge className="bg-indigo-600">{Object.keys(studentAnswers).length} / {test.questionCount}</Badge>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {Array.from({ length: test.questionCount }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        const currentAns = studentAnswers[qNum] || "";
                        return (
                            <div key={qNum} className="flex items-center gap-3">
                                <span className="w-6 text-xs font-black text-slate-400">{qNum}.</span>
                                <RadioGroup value={currentAns} onValueChange={(v) => onAnswer(qNum, v)} className="flex items-center gap-1.5 flex-1">
                                    {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                        <div key={opt} className="flex-1">
                                            <RadioGroupItem value={opt} id={`q${qNum}-opt-${opt}`} className="sr-only peer" />
                                            <Label 
                                                htmlFor={`q${qNum}-opt-${opt}`}
                                                className={cn(
                                                    "flex items-center justify-center h-8 rounded-lg border text-[10px] font-black cursor-pointer transition-all",
                                                    currentAns === opt ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-800 border-slate-200 text-slate-400"
                                                )}
                                            >
                                                {opt}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-slate-50 dark:bg-slate-950">
                <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-12 rounded-xl" onClick={onFinish}>Sınavı Bitir</Button>
            </div>
        </div>
    );

    return (
        <div className={cn("fixed inset-0 z-50 bg-background flex flex-col", isFullScreen ? "z-[60]" : "relative h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl")}>
            <div className="flex items-center justify-between px-6 h-14 bg-white dark:bg-slate-900 border-b shrink-0">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="font-bold text-sm">{test.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="rounded-full">
                        {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                    {isFullScreen && <Button type="button" variant="ghost" size="icon" onClick={() => setIsFullScreen(false)} className="rounded-full"><X className="h-5 w-5"/></Button>}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Document Area */}
                <div className="flex-1 relative bg-slate-100 dark:bg-black/20 h-full">
                    <iframe 
                        srcDoc={getIframeDocument(test.htmlContent || "")}
                        className="w-full h-full border-none"
                        title="Test Content"
                    />
                     {/* Mobile Optic FAB */}
                    <Button 
                        type="button"
                        onClick={() => setIsOpticalOpenMobile(true)}
                        className="lg:hidden absolute bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl z-40"
                    >
                        <LayoutGrid className="w-6 h-6" />
                    </Button>
                </div>

                {/* Optical Form Area - Desktop */}
                <div className="hidden lg:block w-80 border-l bg-white dark:bg-slate-900 h-full">
                    <OpticalForm />
                </div>
            </div>

            {/* Mobile Optical Sheet Overlay */}
            {isOpticalOpenMobile && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden flex items-end">
                    <div className="bg-white dark:bg-slate-900 w-full h-[85vh] rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="h-2 w-12 bg-slate-300 rounded-full mx-auto mt-3 mb-1" onClick={() => setIsOpticalOpenMobile(false)} />
                        <div className="flex-1 overflow-hidden">
                            <OpticalForm />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
