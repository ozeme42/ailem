
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Test } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";

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
    
    // State for question-by-question evaluation in text grading
    const [evaluations, setEvaluations] = React.useState<Evaluations>(test.studentTextAnswersEvaluation || {});
    
    // Calculate summary based on evaluations state
    const summary = React.useMemo(() => {
        if (!isTextGrading) return { correct: 0, incorrect: 0, empty: test.questionCount };
        
        let correct = 0;
        let incorrect = 0;
        const totalAnswers = Object.keys(test.studentTextAnswers || {}).length;

        Object.values(evaluations).forEach(status => {
            if (status === 'correct') correct++;
            else if (status === 'incorrect') incorrect++;
        });

        const evaluatedCount = correct + incorrect;
        const empty = test.questionCount - totalAnswers + (totalAnswers - evaluatedCount);

        return { correct, incorrect, empty };
    }, [evaluations, test.questionCount, isTextGrading, test.studentTextAnswers]);


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
        form.reset({
             correct: summary.correct,
             incorrect: summary.incorrect,
             empty: summary.empty
        });
    }, [summary, form]);

    const handleEvaluationChange = (questionNumber: string, status: EvaluationStatus) => {
        setEvaluations(prev => ({ ...prev, [questionNumber]: status }));
    };

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (isTextGrading) {
            onSave({ ...summary, evaluations });
        } else {
            onSave({ ...values, evaluations: {} });
        }
    }
  
  if (isTextGrading) {
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
                        {Object.entries(test.studentTextAnswers!).map(([qNum, ans]) => (
                            <div key={qNum} className="p-3 border rounded-lg">
                                <p className="text-sm">
                                    <span className="font-semibold text-primary">{qNum}. Soru:</span>
                                    <span className="text-muted-foreground ml-2">{ans || "(Boş bırakılmış)"}</span>
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Button type="button" size="sm" variant={evaluations[qNum] === 'correct' ? 'default' : 'outline'} className="text-green-600 border-green-500/50 hover:bg-green-500/10" onClick={() => handleEvaluationChange(qNum, 'correct')}>Doğru</Button>
                                    <Button type="button" size="sm" variant={evaluations[qNum] === 'incorrect' ? 'destructive' : 'outline'} className="text-red-600 border-red-500/50 hover:bg-red-500/10" onClick={() => handleEvaluationChange(qNum, 'incorrect')}>Yanlış</Button>
                                </div>
                            </div>
                        ))}
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
  );
}
