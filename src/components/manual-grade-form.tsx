
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Test, Mistake } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";


type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated' | 'empty';

export type ManualGradeData = {
    correct: number;
    incorrect: number;
    empty: number;
    evaluations: { [key: string]: EvaluationStatus };
}

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
  onCancel: () => void;
};

const formSchema = z.object({
    evaluations: z.record(z.enum(['correct', 'incorrect', 'unevaluated', 'empty']))
});

export function ManualGradeForm({ test, onSave, onCancel }: ManualGradeFormProps) {
    const [isSaving, setIsSaving] = React.useState(false);
    const isTextGrading = test.gradingType === 'manual-text' || test.sourceType === 'mistake';
    const [questions, setQuestions] = React.useState<(Partial<Mistake> & { qNum: string, id: string })[]>([]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            evaluations: {}
        },
    });

    React.useEffect(() => {
        const fetchQuestionsAndAnswers = async () => {
            let fetchedQuestions: (Partial<Mistake> & { qNum: string, id: string })[] = [];
            if (test.sourceType === 'mistake' && test.mistakeIds) {
                const mistakeDocs = await Promise.all(test.mistakeIds.map(id => getDoc(doc(db, 'mistakes', id))));
                fetchedQuestions = mistakeDocs.map((d, i) => ({ id: d.id, ...d.data(), studentAnswer: test.studentTextAnswers?.[d.id], qNum: (i+1).toString() } as Mistake & { qNum: string }));
            } else if (test.gradingType === 'manual-text' && (test.sourceType === 'bank' || test.sourceType === 'quick')) {
                 const studentAnswers = test.studentTextAnswers || {};
                 for (let i = 1; i <= test.questionCount; i++) {
                     const qId = i.toString();
                     fetchedQuestions.push({
                        id: qId,
                        studentAnswer: studentAnswers[qId] || "",
                        qNum: qId,
                     });
                 }
            }
            setQuestions(fetchedQuestions);
            
            const initialEvals: { [key: string]: EvaluationStatus } = {};
             fetchedQuestions.forEach(q => {
                const studentAnswer = q.studentAnswer;
                if (!studentAnswer || studentAnswer.trim() === "") {
                    initialEvals[q.id] = 'empty';
                } else {
                    initialEvals[q.id] = test.studentTextAnswersEvaluation?.[q.id] || 'unevaluated';
                }
            });
             form.reset({ evaluations: initialEvals });
        };
        fetchQuestionsAndAnswers();
    }, [test, form]);


    function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        let correct = 0;
        let incorrect = 0;
        let empty = 0;

        for (const qId in values.evaluations) {
            const status = values.evaluations[qId];
             if (status === 'correct') {
                correct++;
            } else if (status === 'incorrect') {
                incorrect++;
            } else { 
                empty++;
            }
        }

        onSave({
            correct,
            incorrect,
            empty,
            evaluations: values.evaluations,
        });
        setIsSaving(false);
    }

    if (!isTextGrading) {
        return <p>Bu test türü için manuel değerlendirme desteklenmiyor.</p>
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CardHeader>
                    <CardTitle className="text-base">Öğrenci Cevapları</CardTitle>
                    <CardDescription>Her bir cevabı doğru veya yanlış olarak işaretleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-4">
                            {questions.map((q) => (
                               <Card key={q.id} className="p-4">
                                    <p className="font-bold text-primary mb-2">{q.qNum}. Soru</p>
                                    {q.imageUrl && <Image src={q.imageUrl} alt={`Soru ${q.qNum}`} width={400} height={300} className="my-2 rounded-md border" data-ai-hint="question paper" />}
                                    <p className="text-sm my-2">
                                        <span className="font-semibold">Öğrenci Cevabı:</span>
                                        <span className="text-muted-foreground ml-2">{q.studentAnswer || "(Boş bırakılmış)"}</span>
                                    </p>
                                     <FormField
                                        control={form.control}
                                        name={`evaluations.${q.id}`}
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Button type="button" size="sm" variant={field.value === 'correct' ? 'default' : 'outline'} className="text-green-600 border-green-500/50 hover:bg-green-500/10" onClick={() => field.onChange('correct')}>Doğru</Button>
                                                <Button type="button" size="sm" variant={field.value === 'incorrect' ? 'destructive' : 'outline'} className="text-red-600 border-red-500/50 hover:bg-red-500/10" onClick={() => field.onChange('incorrect')}>Yanlış</Button>
                                            </div>
                                        )}
                                    />
                                </Card>
                            ))}
                             {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Değerlendirilecek soru bulunmuyor.</p>}
                        </div>
                    </ScrollArea>
                </CardContent>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>İptal</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Değerlendirmeyi Tamamla
                    </Button>
                </div>
            </form>
        </Form>
    );
}

    