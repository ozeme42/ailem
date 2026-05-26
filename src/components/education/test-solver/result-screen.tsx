
"use client";

import * as React from "react";
import Image from "next/image";
import { Test, EvaluationStatus, PracticeExam } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MinusCircle, ChevronRight, LayoutGrid, ImageIcon, MessageSquareText, Target, AlertCircle, Check, X, BookOpen, BarChart3, ChevronDown } from "lucide-react";
import { QuestionPalette } from "./shared-components";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { onSinglePracticeExamUpdate } from "@/lib/dataService";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ResultScreenProps {
    test: Test;
    questions: any[]; 
}

export function ResultScreen({ test, questions }: ResultScreenProps) {
    const [selectedIdx, setSelectedIdx] = React.useState(0);
    const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
    const [examDetails, setExamDetails] = React.useState<PracticeExam | null>(null);
    
    // Deneme sınavı ise şablonu çek
    React.useEffect(() => {
        if (test.sourceType === 'exam' && test.sourceId) {
            const unsub = onSinglePracticeExamUpdate(test.sourceId, setExamDetails);
            return () => unsub();
        }
    }, [test]);

    // --- DEĞERLENDİRME HARİTASI ---
    const evaluationMap = React.useMemo(() => {
        const map: { [key: string]: EvaluationStatus } = {};
        const totalQ = questions.length || test.questionCount;

        for (let i = 1; i <= totalQ; i++) {
            const qNum = i.toString();
            
            if (test.openEnded && test.studentTextAnswersEvaluation?.[qNum]) {
                map[qNum] = test.studentTextAnswersEvaluation[qNum];
            } 
            else {
                const sAns = test.studentAnswers?.[qNum];
                let cAns = test.answerKey?.[qNum];
                
                // JSON Testleri için metin cevabı harfe çevir
                if (test.sourceType === 'json' && questions[i-1]) {
                    const q = questions[i-1];
                    const foundIdx = q.options.findIndex((opt: string) => opt.trim() === q.answer?.trim());
                    if (foundIdx !== -1) cAns = String.fromCharCode(65 + foundIdx);
                }

                if (!sAns) map[qNum] = 'empty';
                else if (sAns === cAns) map[qNum] = 'correct';
                else map[qNum] = 'incorrect';
            }
        }
        return map;
    }, [test, questions]);

    const qNum = (selectedIdx + 1).toString();
    const status = evaluationMap[qNum];
    const studentAnswer = test.openEnded ? (test.studentTextAnswers?.[qNum] || null) : (test.studentAnswers?.[qNum] || null);
    const feedback = test.studentTextAnswersFeedback?.[qNum];

    const getCorrectAnswerLabel = React.useCallback(() => {
        if (test.sourceType === 'json' && questions[selectedIdx]) {
            const foundIdx = questions[selectedIdx].options.findIndex((opt: string) => opt.trim() === questions[selectedIdx].answer?.trim());
            return foundIdx !== -1 ? String.fromCharCode(65 + foundIdx) : null;
        }
        return test.answerKey?.[qNum] || null;
    }, [test, questions, selectedIdx, qNum]);

    const cAnsLabel = getCorrectAnswerLabel();

    // --- DERS BAZLI GRUPLAMA (SADECE DENEMELER İÇİN) ---
    const subjectAnalysis = React.useMemo(() => {
        if (!examDetails) return null;
        
        let currentOffset = 0;
        return examDetails.subjects.map(subject => {
            const subjectQuestions = Array.from({ length: subject.questionCount }, (_, i) => {
                const qNumber = (currentOffset + i + 1).toString();
                return {
                    number: qNumber,
                    status: evaluationMap[qNumber] || 'empty'
                };
            });

            const stats = {
                correct: subjectQuestions.filter(q => q.status === 'correct').length,
                incorrect: subjectQuestions.filter(q => q.status === 'incorrect').length,
                empty: subjectQuestions.filter(q => q.status === 'empty').length,
            };

            const result = {
                id: subject.id,
                name: subject.name,
                stats,
                questions: subjectQuestions,
                startIndex: currentOffset
            };
            
            currentOffset += subject.questionCount;
            return result;
        });
    }, [examDetails, evaluationMap]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-20">
            <div className="lg:col-span-8 space-y-6">
                {/* GENEL SKOR KARTI */}
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Target className="w-32 h-32" /></div>
                    <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="text-center md:text-left space-y-2">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">%{test.score?.toFixed(0) || 0}</h2>
                            <p className="text-indigo-100 font-bold uppercase tracking-widest text-[10px]">Genel Başarı Oranın</p>
                        </div>
                        <div className="flex gap-4 md:gap-8 text-center">
                            <div className="space-y-1">
                                <p className="text-xl md:text-3xl font-black text-emerald-400">{test.correctAnswers || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-200">Doğru</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl md:text-3xl font-black text-rose-400">{test.incorrectAnswers || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-200">Yanlış</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl md:text-3xl font-black text-slate-300">{test.emptyAnswers || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-200">Boş</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* DERS BAZLI ANALİZ (SADECE DENEME İÇİN) */}
                {test.sourceType === 'exam' && subjectAnalysis && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">Ders Bazlı Sonuçlar</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {subjectAnalysis.map((subj) => (
                                <div key={subj.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-black">
                                            {subj.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{subj.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{subj.questions.length} Soru</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 items-center">
                                        <div className="text-center">
                                            <p className="text-emerald-600 font-black text-sm">{subj.stats.correct}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">D</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-rose-600 font-black text-sm">{subj.stats.incorrect}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Y</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-slate-500 font-black text-sm">{subj.stats.empty}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">B</p>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2" />
                                        <div className="text-right">
                                            <p className="text-indigo-600 dark:text-indigo-400 font-black text-lg">%{Math.round((subj.stats.correct / subj.questions.length) * 100)}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Başarı</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SORU ANALİZ DETAYI */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className={cn("p-4 text-white flex justify-between items-center font-bold transition-colors", 
                        status === 'correct' ? "bg-emerald-600" : status === 'incorrect' ? "bg-rose-600" : "bg-slate-600"
                    )}>
                        <span className="uppercase text-xs tracking-widest">Soru {selectedIdx + 1} Analizi</span>
                        <Badge className="bg-white/20 text-white border-none uppercase font-black px-3 py-1">
                            {status === 'correct' ? 'DOĞRU' : status === 'incorrect' ? 'YANLIŞ' : 'BOŞ'}
                        </Badge>
                    </div>
                    
                    <div className="p-6 md:p-8 space-y-6">
                        {test.sourceType === 'json' && questions[selectedIdx] ? (
                             <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center italic text-xl font-bold">
                                "{questions[selectedIdx].text}"
                            </div>
                        ) : (
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                                {questions[selectedIdx]?.imageUrl ? (
                                    <Image src={questions[selectedIdx].imageUrl} alt="Soru" fill className="object-contain p-4" />
                                ) : <ImageIcon className="w-12 h-12 text-slate-200" />}
                            </div>
                        )}

                        {test.openEnded ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Senin Cevabın</label>
                                    <p className={cn("text-lg font-black", status === 'correct' ? "text-emerald-600" : status === 'incorrect' ? "text-rose-600" : "text-slate-400")}>{studentAnswer || "Boş"}</p>
                                </div>
                                <div className="space-y-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Doğru Cevap Anahtarı</label>
                                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{test.answerKey?.[qNum] || "—"}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Seçenek Analizi</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(test.sourceType === 'json' && questions[selectedIdx] ? questions[selectedIdx].options : ['A', 'B', 'C', 'D', 'E']).map((opt: string, i: number) => {
                                        const label = test.sourceType === 'json' ? String.fromCharCode(65 + i) : opt;
                                        const text = test.sourceType === 'json' ? opt : '';
                                        
                                        const isCorrect = label === cAnsLabel;
                                        const isStudentChoice = label === studentAnswer;
                                        const isWrongChoice = isStudentChoice && !isCorrect;

                                        return (
                                            <div 
                                                key={label}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                                    isCorrect ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-950/30 shadow-md" :
                                                    isWrongChoice ? "bg-rose-50 border-rose-500 dark:bg-rose-950/30 shadow-md" :
                                                    "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0",
                                                    isCorrect ? "bg-emerald-500 text-white" :
                                                    isWrongChoice ? "bg-rose-500 text-white" :
                                                    "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                )}>
                                                    {label}
                                                </div>
                                                <div className="flex-1 flex items-center justify-between">
                                                    <span className={cn("font-bold text-sm", isCorrect ? "text-emerald-700 dark:text-emerald-300" : isWrongChoice ? "text-rose-700 dark:text-rose-300" : "text-slate-500")}>
                                                        {text || "Seçenek " + label}
                                                    </span>
                                                    {isCorrect && <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />}
                                                    {isWrongChoice && <X className="w-5 h-5 text-rose-600" strokeWidth={3} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {feedback && (
                            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5"/> Öğretmen Notu</p>
                                <p className="text-sm text-indigo-900 dark:text-indigo-200 italic font-bold">"{feedback}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SAĞ PANEL: SORU GEZGİNİ */}
            <div className="lg:col-span-4 hidden lg:block sticky top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center font-bold text-slate-800 text-xs uppercase tracking-widest">Soru Detayları</div>
                    <ScrollArea className="max-h-[70vh]">
                        {test.sourceType === 'exam' && subjectAnalysis ? (
                            <div className="p-4 space-y-6">
                                {subjectAnalysis.map(subj => (
                                    <div key={subj.id} className="space-y-3">
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1">{subj.name}</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {subj.questions.map((q, idx) => (
                                                <Button
                                                    key={q.number}
                                                    variant="outline"
                                                    className={cn(
                                                        "h-10 w-10 p-0 font-bold rounded-xl transition-all relative",
                                                        selectedIdx === (subj.startIndex + idx) && "ring-2 ring-indigo-500 ring-offset-2 scale-105",
                                                        q.status === 'correct' && "border-emerald-500 bg-emerald-50 text-emerald-700",
                                                        q.status === 'incorrect' && "border-rose-500 bg-rose-50 text-rose-700",
                                                        q.status === 'empty' && "border-slate-200 bg-slate-50 text-slate-400"
                                                    )}
                                                    onClick={() => setSelectedIdx(subj.startIndex + idx)}
                                                >
                                                    {q.number}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <QuestionPalette 
                                total={questions.length || test.questionCount} 
                                currentIndex={selectedIdx} 
                                onNavigate={setSelectedIdx} 
                                isAnswered={() => true} 
                                evaluationMap={evaluationMap}
                            />
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* MOBİL FAB: SORU GEZGİNİ */}
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
                            {test.sourceType === 'exam' && subjectAnalysis ? (
                                <div className="space-y-6">
                                    {subjectAnalysis.map(subj => (
                                        <div key={subj.id} className="space-y-3">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-1">{subj.name}</p>
                                            <div className="grid grid-cols-5 gap-2">
                                                {subj.questions.map((q, idx) => (
                                                    <Button
                                                        key={q.number}
                                                        className={cn(
                                                            "h-10 w-10 p-0 font-bold rounded-xl transition-all",
                                                            selectedIdx === (subj.startIndex + idx) && "ring-2 ring-indigo-500",
                                                            q.status === 'correct' && "border-emerald-500 bg-emerald-50 text-emerald-700",
                                                            q.status === 'incorrect' && "border-rose-500 bg-rose-50 text-rose-700",
                                                            q.status === 'empty' && "border-slate-200 bg-slate-50 text-slate-400"
                                                        )}
                                                        onClick={() => { setSelectedIdx(subj.startIndex + idx); setIsPaletteOpen(false); }}
                                                    >
                                                        {q.number}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <QuestionPalette 
                                    total={questions.length || test.questionCount} 
                                    currentIndex={selectedIdx} 
                                    onNavigate={(idx) => { setSelectedIdx(idx); setIsPaletteOpen(false); }} 
                                    isAnswered={() => true} 
                                    evaluationMap={evaluationMap}
                                />
                            )}
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

