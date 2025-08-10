

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "./ui/textarea";
import { UploadCloud } from "lucide-react";

type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated' | 'empty';
type Evaluation = {
    status: EvaluationStatus;
    correctAnswer?: string;
    correctImageUrl?: string;
    newImageDataUri?: string;
};

type Evaluations = { [key: string]: Evaluation };

export type ManualGradeData = {
    correct: number;
    incorrect: number;
    empty: number;
    evaluations: { [key: string]: EvaluationStatus };
    teacherFeedback: Test['teacherFeedback'];
}

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
  onCancel: () => void;
};

const formSchema = z.object({
    evaluations: z.record(z.object({
        status: z.enum(['correct', 'incorrect', 'unevaluated', 'empty']),
        correctAnswer: z.string().optional(),
        correctImageUrl: z.string().optional(),
        newImageDataUri: z.string().optional(),
    }))
});

export function ManualGradeForm({ test, onSave, onCancel }: ManualGradeFormProps) {

    const isTextGrading = test.gradingType === 'manual-text' || test.sourceType === 'mistake';
    const [questions, setQuestions] = React.useState<(Mistake & { qNum: string })[]>([]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            evaluations: {}
        },
    });

    React.useEffect(() => {
        const fetchQuestionsAndAnswers = async () => {
            let fetchedQuestions: (Mistake & { qNum: string })[] = [];
            if (test.sourceType === 'mistake' && test.mistakeIds) {
                const mistakeDocs = await Promise.all(test.mistakeIds.map(id => getDoc(doc(db, 'mistakes', id))));
                fetchedQuestions = mistakeDocs.map((d, i) => ({ id: d.id, ...d.data(), qNum: (i+1).toString() } as Mistake & { qNum: string }));
            } else if (test.sourceType === 'bank' || test.sourceType === 'quick') {
                 // For bank/quick tests, we don't have stored question images, so we create placeholder question objects
                 const studentAnswers = test.studentTextAnswers || {};
                 for (let i = 1; i <= test.questionCount; i++) {
                     const qId = i.toString();
                     if (studentAnswers[qId]) {
                        fetchedQuestions.push({
                            id: qId,
                            studentAnswer: studentAnswers[qId],
                            qNum: qId,
                        } as any);
                     }
                 }
            }
            setQuestions(fetchedQuestions);
            
            const initialEvals: Evaluations = {};
            fetchedQuestions.forEach(q => {
                const feedback = test.teacherFeedback?.[q.id];
                initialEvals[q.id] = {
                    status: test.studentTextAnswersEvaluation?.[q.id] || 'unevaluated',
                    correctAnswer: feedback?.correctAnswer || '',
                    correctImageUrl: feedback?.correctImageUrl || '',
                    newImageDataUri: ''
                };
            });
             form.reset({ evaluations: initialEvals });
        };
        fetchQuestionsAndAnswers();
    }, [test, form]);


    function onSubmit(values: z.infer<typeof formSchema>) {
        let correct = 0;
        let incorrect = 0;
        
        const finalEvaluations: { [key: string]: EvaluationStatus } = {};
        const finalTeacherFeedback: NonNullable<Test['teacherFeedback']> = {};

        Object.entries(values.evaluations).forEach(([qId, evalData]) => {
            finalEvaluations[qId] = evalData.status;
            if(evalData.status === 'correct') correct++;
            if(evalData.status === 'incorrect') incorrect++;

            if(evalData.correctAnswer || evalData.correctImageUrl || evalData.newImageDataUri) {
                finalTeacherFeedback[qId] = {
                    correctAnswer: evalData.correctAnswer,
                    correctImageUrl: evalData.correctImageUrl || evalData.newImageDataUri, // Use new URI if present
                };
            }
        });
        
        const answeredCount = Object.keys(test.studentTextAnswers || {}).filter(k => test.studentTextAnswers?.[k].trim()).length;
        const empty = test.questionCount - answeredCount;

        onSave({
            correct,
            incorrect,
            empty: empty + (answeredCount - (correct + incorrect)), // un-evaluated are also empty for scoring
            evaluations: finalEvaluations,
            teacherFeedback: finalTeacherFeedback,
        });
    }

    if (!isTextGrading) {
        // Fallback for non-text grading types if needed, or just show an error.
        return <p>Bu test türü için manuel değerlendirme desteklenmiyor.</p>
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CardHeader>
                    <CardTitle className="text-base">Öğrenci Cevapları</CardTitle>
                    <CardDescription>Her bir cevabı doğru veya yanlış olarak işaretleyin ve isteğe bağlı olarak doğru cevabı/çözümü ekleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-4">
                            {questions.map((q) => (
                                <QuestionGradeCard key={q.id} question={q} control={form.control} />
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>İptal</Button>
                    <Button type="submit">Değerlendirmeyi Tamamla</Button>
                </div>
            </form>
        </Form>
    );
}

function QuestionGradeCard({ question, control }: { question: any, control: any }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { setValue, watch } = useForm({
         defaultValues: {
            correctImageUrl: '',
            newImageDataUri: '',
        }
    });

    const currentEval = watch(`evaluations.${question.id}`);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue(`evaluations.${question.id}.newImageDataUri`, reader.result as string, { shouldValidate: true });
                setValue(`evaluations.${question.id}.correctImageUrl`, reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Card className="p-4">
            <p className="font-bold text-primary mb-2">{question.qNum}. Soru</p>
            {question.imageUrl && <Image src={question.imageUrl} alt={`Soru ${question.qNum}`} width={400} height={300} className="my-2 rounded-md border" data-ai-hint="question paper" />}
            <p className="text-sm my-2">
                <span className="font-semibold">Öğrenci Cevabı:</span>
                <span className="text-muted-foreground ml-2">{question.studentAnswer || "(Boş bırakılmış)"}</span>
            </p>
             <FormField
                control={control}
                name={`evaluations.${question.id}.status`}
                render={({ field }) => (
                    <div className="flex items-center gap-2 mt-2">
                        <Button type="button" size="sm" variant={field.value === 'correct' ? 'default' : 'outline'} className="text-green-600 border-green-500/50 hover:bg-green-500/10" onClick={() => field.onChange('correct')}>Doğru</Button>
                        <Button type="button" size="sm" variant={field.value === 'incorrect' ? 'destructive' : 'outline'} className="text-red-600 border-red-500/50 hover:bg-red-500/10" onClick={() => field.onChange('incorrect')}>Yanlış</Button>
                    </div>
                )}
            />
            {currentEval?.status === 'incorrect' && (
                <div className="mt-4 space-y-3 p-3 bg-muted/50 rounded-lg">
                    <FormField
                        control={control}
                        name={`evaluations.${question.id}.correctAnswer`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Doğru Cevap (Opsiyonel)</FormLabel>
                                <FormControl><Textarea placeholder="Doğru cevabı veya açıklamayı yazın" {...field} /></FormControl>
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name={`evaluations.${question.id}.correctImageUrl`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Çözüm Görseli (Opsiyonel)</FormLabel>
                                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                <Card 
                                    className="aspect-video w-full border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {field.value ? (
                                        <Image src={field.value} alt="Çözüm Önizleme" layout="fill" objectFit="contain" className="p-2" />
                                    ) : (
                                        <>
                                            <UploadCloud className="h-8 w-8"/>
                                            <p className="mt-2 text-xs">Görsel Yükle</p>
                                        </>
                                    )}
                                </Card>
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </Card>
    )
}
