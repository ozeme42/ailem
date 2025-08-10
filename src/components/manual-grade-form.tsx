
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
import { Textarea } from "./ui/textarea";
import { UploadCloud } from "lucide-react";
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { useAuth } from './auth-provider';


type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated' | 'empty';
type Evaluation = {
    status: EvaluationStatus;
    correctAnswer?: string;
    correctImageUrl?: string;
    newImageDataUri?: string; // For client-side preview
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
                     // Include all questions, regardless of whether they have an answer
                     fetchedQuestions.push({
                        id: qId,
                        studentAnswer: studentAnswers[qId] || "",
                        qNum: qId,
                     });
                 }
            }
            setQuestions(fetchedQuestions);
            
            const initialEvals: Evaluations = {};
            const questionIdentifiers = test.sourceType === 'mistake' 
                ? test.mistakeIds || []
                : Array.from({ length: test.questionCount }, (_, i) => (i + 1).toString());

            questionIdentifiers.forEach(qId => {
                const feedback = test.teacherFeedback?.[qId];
                initialEvals[qId] = {
                    status: test.studentTextAnswersEvaluation?.[qId] || 'unevaluated',
                    correctAnswer: feedback?.correctAnswer || '',
                    correctImageUrl: feedback?.correctImageUrl || '',
                    newImageDataUri: ''
                };
            });
             form.reset({ evaluations: initialEvals });
        };
        fetchQuestionsAndAnswers();
    }, [test, form]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        let correct = 0;
        let incorrect = 0;
        let empty = 0;
        
        const finalEvaluations: { [key: string]: EvaluationStatus } = {};
        const finalTeacherFeedback: NonNullable<Test['teacherFeedback']> = {};
        
        const questionIdentifiers = test.sourceType === 'mistake' 
                ? test.mistakeIds || [] 
                : Array.from({ length: test.questionCount }, (_, i) => (i + 1).toString());

        for (const qId of questionIdentifiers) {
            const evalData = values.evaluations[qId];
            const studentAnswer = test.studentTextAnswers?.[qId];

            if (!studentAnswer || studentAnswer.trim() === "") {
                empty++;
                finalEvaluations[qId] = 'empty';
            } else if (evalData.status === 'correct') {
                correct++;
                finalEvaluations[qId] = 'correct';
            } else if (evalData.status === 'incorrect') {
                incorrect++;
                finalEvaluations[qId] = 'incorrect';
            } else { // 'unevaluated'
                empty++; // Unevaluated are counted as empty
                finalEvaluations[qId] = 'unevaluated';
            }
            
            let finalImageUrl = evalData.correctImageUrl;
            if (evalData.newImageDataUri) {
                 const destinationPath = `solutions/${test.id}/${qId}.jpg`;
                 const migrationResult = await migrateImage({ imageDataUri: evalData.newImageDataUri, destinationPath });
                 if (migrationResult.success && migrationResult.newUrl) {
                    finalImageUrl = migrationResult.newUrl;
                 }
            }

            if(evalData.correctAnswer || finalImageUrl) {
                finalTeacherFeedback[qId] = {
                    correctAnswer: evalData.correctAnswer,
                    correctImageUrl: finalImageUrl,
                };
            }
        };

        onSave({
            correct,
            incorrect,
            empty,
            evaluations: finalEvaluations,
            teacherFeedback: finalTeacherFeedback,
        });
    }

    if (!isTextGrading) {
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
                                <QuestionGradeCard key={q.id} question={q} control={form.control} formMethods={form} />
                            ))}
                             {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Değerlendirilecek soru bulunmuyor.</p>}
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

function QuestionGradeCard({ question, control, formMethods }: { question: any, control: any, formMethods: any }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { setValue, watch } = formMethods;
    const currentEval = watch(`evaluations.${question.id}`);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue(`evaluations.${question.id}.newImageDataUri`, reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const imageToDisplay = currentEval?.newImageDataUri || currentEval?.correctImageUrl;

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
                     <FormItem>
                        <FormLabel className="text-xs">Çözüm Görseli (Opsiyonel)</FormLabel>
                        <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <Card 
                            className="aspect-video w-full border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imageToDisplay ? (
                                <Image src={imageToDisplay} alt="Çözüm Önizleme" layout="fill" objectFit="contain" className="p-2" data-ai-hint="solution paper"/>
                            ) : (
                                <>
                                    <UploadCloud className="h-8 w-8"/>
                                    <p className="mt-2 text-xs">Görsel Yükle</p>
                                </>
                            )}
                        </Card>
                    </FormItem>
                </div>
            )}
        </Card>
    )
}
