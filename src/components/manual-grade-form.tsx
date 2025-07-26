
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Test } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated';
type Evaluations = { [key: string]: EvaluationStatus };

export type ManualGradeData = {
    correct: number;
    incorrect: number;
    empty: number;
    evaluations: Evaluations;
}

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
  onCancel: () => void;
};


export function ManualGradeForm({ test, onSave, onCancel }: ManualGradeFormProps) {

    const isTextGrading = test.gradingType === 'manual-text' && test.studentTextAnswers && Object.keys(test.studentTextAnswers).length > 0;
    const isMistakePoolGrading = test.sourceType === 'mistake' && test.mistakeIds;
    const isSimpleManualGrading = test.gradingType === 'manual';
    
    const [mistakeQuestions, setMistakeQuestions] = React.useState<any[]>([]);
    
    // State for question-by-question evaluation
    const [evaluations, setEvaluations] = React.useState<Evaluations>(test.studentTextAnswersEvaluation || {});

    React.useEffect(() => {
        const fetchMistakeQuestions = async () => {
            if (isMistakePoolGrading && test.mistakeIds) {
                const mistakeDocs = await Promise.all(test.mistakeIds.map(id => getDoc(doc(db, 'mistakes', id))));
                setMistakeQuestions(mistakeDocs.map(d => ({ id: d.id, ...d.data() })));
            }
        };
        fetchMistakeQuestions();
    }, [isMistakePoolGrading, test.mistakeIds]);
    
    // Calculate summary based on evaluations state
    const summary = React.useMemo(() => {
        let correct = 0;
        let incorrect = 0;
        let empty = 0;

        if (isTextGrading || isMistakePoolGrading) {
            const studentAnswers = test.studentTextAnswers || {};
            const totalAnswers = Object.keys(studentAnswers).filter(k => studentAnswers[k].trim() !== "").length;
            
            Object.values(evaluations).forEach(status => {
                if (status === 'correct') correct++;
                else if (status === 'incorrect') incorrect++;
            });
    
            const evaluatedCount = correct + incorrect;
            empty = test.questionCount - totalAnswers + (totalAnswers - evaluatedCount);
        }

        return { correct, incorrect, empty };
    }, [evaluations, test.questionCount, isTextGrading, isMistakePoolGrading, test.studentTextAnswers]);


    const formSchema = z.object({
        correct: z.coerce.number().min(0, "Değer 0'dan küçük olamaz.").default(summary.correct),
        incorrect: z.coerce.number().min(0, "Değer 0'dan küçük olamaz.").default(summary.incorrect),
        empty: z.coerce.number().min(0, "Değer 0'dan küçük olamaz.").default(summary.empty),
    }).refine(data => data.correct + data.incorrect + data.empty === test.questionCount, {
        message: `Toplam sayı, soru sayısına (${test.questionCount}) eşit olmalıdır.`,
        path: ["correct"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            correct: summary.correct,
            incorrect: summary.incorrect,
            empty: summary.empty,
        },
    });

    React.useEffect(() => {
        if (isTextGrading || isMistakePoolGrading) {
            form.reset({
                correct: summary.correct,
                incorrect: summary.incorrect,
                empty: summary.empty
            });
        }
    }, [summary, form, isTextGrading, isMistakePoolGrading]);

    const handleEvaluationChange = (questionIdentifier: string, status: EvaluationStatus) => {
        setEvaluations(prev => ({ ...prev, [questionIdentifier]: status }));
    };

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (isTextGrading || isMistakePoolGrading) {
            onSave({ ...summary, evaluations });
        } else {
            onSave({ ...values, evaluations: {} });
        }
    }
  
  if (isTextGrading || isMistakePoolGrading) {
    const questions = isMistakePoolGrading ? mistakeQuestions : Object.entries(test.studentTextAnswers!);

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Öğrenci Cevapları</CardTitle>
                    <CardDescription>Her bir cevabı doğru veya yanlış olarak işaretleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ScrollArea className="h-64 pr-4">
                        <div className="space-y-3">
                        {questions.map((q, index) => {
                            const qNum = isMistakePoolGrading ? (index + 1).toString() : q[0];
                            const qIdentifier = isMistakePoolGrading ? q.id : q[0];
                            const studentAns = test.studentTextAnswers?.[qIdentifier] || "(Boş bırakılmış)";
                            const imageUrl = isMistakePoolGrading ? q.imageUrl : null;
                            
                            return (
                                <div key={qIdentifier} className="p-3 border rounded-lg">
                                    <p className="text-sm font-semibold text-primary">{qNum}. Soru</p>
                                    {imageUrl && <Image src={imageUrl} alt={`Soru ${qNum}`} width={400} height={300} className="my-2 rounded-md border" data-ai-hint="question paper"/>}
                                    <p className="text-sm my-2">
                                        <span className="font-semibold">Öğrenci Cevabı:</span>
                                        <span className="text-muted-foreground ml-2">{studentAns}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button type="button" size="sm" variant={evaluations[qIdentifier] === 'correct' ? 'default' : 'outline'} className="text-green-600 border-green-500/50 hover:bg-green-500/10" onClick={() => handleEvaluationChange(qIdentifier, 'correct')}>Doğru</Button>
                                        <Button type="button" size="sm" variant={evaluations[qIdentifier] === 'incorrect' ? 'destructive' : 'outline'} className="text-red-600 border-red-500/50 hover:bg-red-500/10" onClick={() => handleEvaluationChange(qIdentifier, 'incorrect')}>Yanlış</Button>
                                    </div>
                                </div>
                            )
                        })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Değerlendirme Özeti</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-3 gap-4">
                    <div className="text-center p-2 rounded-lg bg-green-500/10">
                        <p className="font-bold text-lg text-green-600">{summary.correct}</p>
                        <p className="text-xs font-medium">Doğru</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-500/10">
                        <p className="font-bold text-lg text-red-600">{summary.incorrect}</p>
                        <p className="text-xs font-medium">Yanlış</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-500/10">
                        <p className="font-bold text-lg text-gray-600">{summary.empty}</p>
                        <p className="text-xs font-medium">Boş</p>
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>İptal</Button>
                <Button type="submit">Değerlendirmeyi Tamamla</Button>
            </div>
        </form>
    )
  }
  
  if (isSimpleManualGrading) {
      return (
         <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="correct"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Doğru</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="incorrect"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Yanlış</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="empty"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Boş</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    </FormItem>
                )}
                />
            </div>
            <FormMessage>
              {form.formState.errors.correct?.message}
            </FormMessage>
            <div className="flex justify-end gap-4">
                <Button type="button" variant="ghost" onClick={onCancel}>İptal</Button>
                <Button type="submit">Sonuçları Kaydet</Button>
            </div>
          </form>
        </Form>
      )
  }

  // Fallback for any unexpected case
  return (
      <div className="p-4 text-center">
        <p>Bu test türü için bir değerlendirme formu bulunamadı.</p>
        <Button type="button" variant="ghost" onClick={onCancel} className="mt-4">Kapat</Button>
      </div>
  );
}

