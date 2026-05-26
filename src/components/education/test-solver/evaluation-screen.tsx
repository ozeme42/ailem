
"use client";

import * as React from "react";
import Image from "next/image";
import { Test, QuickTestQuestion, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight, Save, ImageIcon, MessageSquareText } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EvaluationScreenProps {
    test: Test;
    questions: QuickTestQuestion[];
    evaluations: { [key: string]: EvaluationStatus };
    feedbacks: { [key: string]: string };
    onEvaluate: (qNum: string, status: EvaluationStatus) => void;
    onFeedback: (qNum: string, feedback: string) => void;
    onFinish: () => void;
}

export function EvaluationScreen({ test, questions, evaluations, feedbacks, onEvaluate, onFeedback, onFinish }: EvaluationScreenProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const currentQuestion = questions[currentIndex];
    const qNumStr = (currentIndex + 1).toString();
    
    const currentEval = evaluations[qNumStr] || 'unevaluated';
    const currentFeedback = feedbacks[qNumStr] || "";
    const studentAnswer = test.studentTextAnswers?.[qNumStr] || "Cevap verilmemiş.";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20">
            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center font-bold">
                        <span>DEĞERLENDİRME: Soru {currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                            {currentQuestion?.imageUrl ? (
                                <Image src={currentQuestion.imageUrl} alt="Soru" fill className="object-contain p-4" />
                            ) : <ImageIcon className="w-12 h-12 text-slate-200" />}
                        </div>

                        <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Öğrenci Cevabı</label>
                            <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{studentAnswer}</p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-black uppercase text-indigo-600 tracking-widest">Notun ve Değerlendirmen</label>
                            <div className="grid grid-cols-3 gap-3">
                                <Button 
                                    variant="outline" 
                                    className={cn("h-14 rounded-2xl font-bold border-2 transition-all", currentEval === 'correct' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-100")}
                                    onClick={() => onEvaluate(qNumStr, 'correct')}
                                >
                                    <CheckCircle2 className="mr-2 w-5 h-5"/> Doğru
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className={cn("h-14 rounded-2xl font-bold border-2 transition-all", currentEval === 'incorrect' ? "bg-rose-50 border-rose-500 text-rose-700" : "border-slate-100")}
                                    onClick={() => onEvaluate(qNumStr, 'incorrect')}
                                >
                                    <XCircle className="mr-2 w-5 h-5"/> Yanlış
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className={cn("h-14 rounded-2xl font-bold border-2 transition-all", currentEval === 'empty' ? "bg-slate-100 border-slate-400 text-slate-600" : "border-slate-100")}
                                    onClick={() => onEvaluate(qNumStr, 'empty')}
                                >
                                    <MinusCircle className="mr-2 w-5 h-5"/> Boş
                                </Button>
                            </div>
                            <div className="relative">
                                <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Textarea 
                                    placeholder="Geri bildirim veya çözüm notu ekle..."
                                    className="min-h-[100px] rounded-2xl pl-10 bg-slate-50/50 border-slate-200"
                                    value={currentFeedback}
                                    onChange={(e) => onFeedback(qNumStr, e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between gap-4">
                    <Button variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                        <ChevronLeft className="mr-2 h-6 w-6"/> Önceki
                    </Button>
                    {currentIndex < questions.length - 1 ? (
                        <Button size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-indigo-600" onClick={() => setCurrentIndex(currentIndex + 1)}>
                            Sonraki <ChevronRight className="ml-2 h-6 w-6"/>
                        </Button>
                    ) : (
                        <Button size="lg" className="flex-1 h-14 rounded-2xl font-bold bg-emerald-600" onClick={onFinish}>
                            <Save className="mr-2 h-6 w-6"/> Değerlendirmeyi Bitir
                        </Button>
                    )}
                </div>
            </div>

            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800">Soru Gezgini</div>
                    <ScrollArea className="max-h-[60vh]">
                        <QuestionPalette 
                            total={questions.length} 
                            currentIndex={currentIndex} 
                            onNavigate={setCurrentIndex} 
                            isAnswered={(idx) => evaluations[(idx + 1).toString()] !== 'unevaluated'} 
                            evaluationMap={evaluations}
                        />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
