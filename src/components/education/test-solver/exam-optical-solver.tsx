
"use client";

import * as React from "react";
import { Test, PracticeExam, AnswerKey } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { onSinglePracticeExamUpdate } from "@/lib/dataService";
import { CheckCircle2, ChevronRight, LayoutGrid, Info, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamOpticalSolverProps {
    test: Test;
    studentAnswers: AnswerKey;
    onAnswer: (qNum: string, answer: string) => void;
    onFinish: () => void;
}

export function ExamOpticalSolver({ test, studentAnswers, onAnswer, onFinish }: ExamOpticalSolverProps) {
    const [examDetails, setExamDetails] = React.useState<PracticeExam | null>(null);
    const [openSubject, setOpenSubject] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (test.sourceId) {
            return onSinglePracticeExamUpdate(test.sourceId, setExamDetails);
        }
    }, [test.sourceId]);

    if (!examDetails) return null;

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{examDetails.name}</h2>
                    <p className="text-slate-500 font-medium">{examDetails.subjects?.length} Ders Alanı • {test.questionCount} Soru</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-center bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{Object.keys(studentAnswers).length}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">İşaretlenen</p>
                    </div>
                    <Button type="button" size="lg" className="h-14 rounded-2xl px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20" onClick={onFinish}>
                        Sınavı Bitir
                    </Button>
                </div>
            </div>

            <Accordion type="single" collapsible className="space-y-4" value={openSubject || undefined} onValueChange={setOpenSubject}>
                {examDetails.subjects.map((subject, sIdx) => {
                    // Question offset logic
                    let offset = 0;
                    for (let i = 0; i < sIdx; i++) {
                        offset += examDetails.subjects[i].questionCount;
                    }
                    
                    const answeredInSubject = Array.from({ length: subject.questionCount }).filter((_, i) => !!studentAnswers[(offset + i + 1).toString()]).length;

                    return (
                        <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                            <AccordionTrigger className="px-6 py-5 hover:no-underline bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-500">
                                            {sIdx + 1}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-black text-slate-800 dark:text-slate-100">{subject.name}</h3>
                                            <p className="text-xs font-medium text-slate-400">{subject.questionCount} Soru</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className={cn("px-3 rounded-full font-bold", answeredInSubject === subject.questionCount ? "bg-emerald-500/10 text-emerald-600" : "bg-indigo-500/10 text-indigo-600")}>
                                        {answeredInSubject} / {subject.questionCount} İşaretlendi
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Array.from({ length: subject.questionCount }).map((_, i) => {
                                        const qNum = (offset + i + 1).toString();
                                        const currentAns = studentAnswers[qNum] || "";
                                        return (
                                            <div key={qNum} className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-xs font-black text-slate-400">SORU {qNum}</span>
                                                    {currentAns && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                                </div>
                                                <RadioGroup value={currentAns} onValueChange={(v) => onAnswer(qNum, v)} className="flex justify-between items-center gap-1">
                                                    {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                        <div key={opt} className="flex-1">
                                                            <RadioGroupItem value={opt} id={`q${qNum}-opt-${opt}`} className="sr-only peer" />
                                                            <Label 
                                                                htmlFor={`q${qNum}-opt-${opt}`}
                                                                className={cn(
                                                                    "flex items-center justify-center h-10 w-full rounded-xl border transition-all text-xs font-black cursor-pointer",
                                                                    currentAns === opt 
                                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-105" 
                                                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400"
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
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}
