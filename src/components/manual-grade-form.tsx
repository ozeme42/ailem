

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Test, Mistake } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, UploadCloud } from "lucide-react";
import { Input } from "./ui/input";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";


type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated' | 'empty';

export type ManualGradeData = {
    correct: number;
    incorrect: number;
    empty: number;
    evaluations: { [key: string]: EvaluationStatus };
    imageUrls: { [key: string]: string | undefined };
}

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
};

const formSchema = z.object({
    evaluations: z.record(z.enum(['correct', 'incorrect', 'unevaluated', 'empty'])),
    imageUrls: z.record(z.string().optional()),
    imageDataUris: z.record(z.string().optional()), // For new uploads
});

type QuestionForGrading = Partial<Mistake> & { 
    id: string; // The ID of the mistake or question number
    qNum: string; // The display number/text for the question
    studentAnswer: string;
    imageUrl?: string | null;
};


export const ManualGradeForm = React.forwardRef<
    { submit: () => void },
    ManualGradeFormProps
>(({ test, onSave }, ref) => {
    const [isSaving, setIsSaving] = React.useState(false);
    const [questions, setQuestions] = React.useState<QuestionForGrading[]>([]);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            evaluations: {},
            imageUrls: {},
            imageDataUris: {},
        },
    });
    
    const { setValue, watch, handleSubmit } = form;
    const evaluations = watch('evaluations');
    const imageDataUris = watch('imageDataUris');
    
    React.useImperativeHandle(ref, () => ({
        submit: () => {
            handleSubmit(onSubmit)();
        },
    }));


    React.useEffect(() => {
        const fetchQuestionsAndAnswers = async () => {
            let fetchedQuestions: QuestionForGrading[] = [];
            const initialEvals: { [key: string]: EvaluationStatus } = {};

            if (test.sourceType === 'mistake' && test.mistakeIds) {
                const mistakeDocs = await Promise.all(test.mistakeIds.map(id => getDoc(doc(db, 'mistakes', id))));
                fetchedQuestions = mistakeDocs.map((d) => {
                    if (!d.exists()) return null;
                    const mistakeData = d.data() as Mistake;
                    const studentAnswer = (test.studentTextAnswers as any)?.[d.id] || "";
                    const questionNumberText = mistakeData.originalQuestionId ? `Soru ${mistakeData.originalQuestionId}` : "Manuel Eklenen Soru";
                    return { 
                        id: d.id, 
                        ...mistakeData, 
                        studentAnswer: studentAnswer,
                        qNum: questionNumberText,
                    };
                }).filter((q): q is QuestionForGrading => q !== null);
                 fetchedQuestions.forEach(q => {
                    const studentAnswer = q.studentAnswer;
                    if (!studentAnswer || studentAnswer.trim() === "") {
                        initialEvals[q.id] = 'empty';
                    } else {
                        initialEvals[q.id] = test.studentTextAnswersEvaluation?.[q.id] || 'unevaluated';
                    }
                });
            } else { // Handle quick and bank tests
                 const studentAnswers = test.studentTextAnswers || {};
                 for (let i = 1; i <= test.questionCount; i++) {
                     const qId = i.toString();
                     const studentAnswer = studentAnswers[qId];
                     const isAnswerEmpty = !studentAnswer || studentAnswer.trim() === "";

                     fetchedQuestions.push({
                        id: qId,
                        studentAnswer: studentAnswer || "",
                        qNum: `${i}. Soru`,
                        imageUrl: test.questions?.find(q => q.questionNumber === i)?.imageUrl
                     });
                     
                      if (isAnswerEmpty) {
                        initialEvals[qId] = 'empty';
                      } else {
                        initialEvals[qId] = test.studentTextAnswersEvaluation?.[qId] || 'unevaluated';
                      }
                 }
            }
            
            setQuestions(fetchedQuestions);
            form.reset({ evaluations: initialEvals, imageUrls: {}, imageDataUris: {} });
        };
        
        if (test.questionCount > 0) {
            fetchQuestionsAndAnswers();
        }
    }, [test, form]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        let correct = 0;
        let incorrect = 0;
        let empty = 0;
        const uploadedImageUrls: { [key: string]: string | undefined } = {};

        for(const qId in values.imageDataUris) {
            const dataUri = values.imageDataUris[qId];
            if (dataUri) {
                try {
                    const destinationPath = `mistake-pool/${test.studentId}-${test.id}-${qId}-${Date.now()}.jpg`;
                    const result = await migrateImage({ imageDataUri: dataUri, destinationPath });
                    if (result.success && result.newUrl) {
                        uploadedImageUrls[qId] = result.newUrl;
                    } else {
                        toast({ title: `Görsel Yükleme Hatası (Soru ${qId})`, description: result.error, variant: 'destructive'});
                    }
                } catch (e: any) {
                     toast({ title: `Görsel Yükleme Hatası (Soru ${qId})`, description: e.message, variant: 'destructive'});
                }
            }
        }

        for (const qId in values.evaluations) {
            const status = values.evaluations[qId];
             if (status === 'correct') {
                correct++;
            } else if (status === 'incorrect') {
                incorrect++;
            } else if (status === 'empty') {
                empty++;
            }
        }

        onSave({
            correct,
            incorrect,
            empty,
            evaluations: values.evaluations,
            imageUrls: uploadedImageUrls,
        });
        setIsSaving(false);
    }
    
    const handleStatusChange = (qId: string, status: EvaluationStatus) => {
        setValue(`evaluations.${qId}`, status, { shouldDirty: true });
    };
    
     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, qId: string) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue(`imageDataUris.${qId}`, reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const getStatusBadge = (status: EvaluationStatus) => {
        switch (status) {
            case 'correct':
                return <Badge variant="default" className="bg-green-600">Doğru</Badge>;
            case 'incorrect':
                return <Badge variant="destructive">Yanlış</Badge>;
            case 'empty':
                return <Badge variant="secondary">Boş</Badge>;
            default:
                return <Badge variant="outline">Değerlendirilmedi</Badge>;
        }
    }


    if (test.gradingType !== 'manual-text' && test.sourceType !== 'mistake') {
        return <p>Bu test türü için manuel değerlendirme desteklenmiyor.</p>
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CardHeader>
                    <CardTitle className="text-base">Öğrenci Cevapları</CardTitle>
                    <CardDescription>Her bir cevabı doğru veya yanlış olarak işaretleyin. Yanlış veya boş sorulara görsel ekleyebilirsiniz.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-4">
                            {questions.map((q) => {
                                const status = evaluations[q.id] || 'unevaluated';
                                const imageDataUri = imageDataUris[q.id];
                                const isAnswerEmpty = !q.studentAnswer || q.studentAnswer.trim() === "";
                                return (
                                   <Card key={q.id} className={cn("p-4 transition-colors", 
                                        status === 'correct' && 'bg-green-500/10 border-green-500/20',
                                        status === 'incorrect' && 'bg-red-500/10 border-red-500/20',
                                        status === 'empty' && 'bg-gray-500/10 border-gray-500/20',
                                   )}>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-bold text-primary">{q.qNum}</p>
                                            {getStatusBadge(status)}
                                        </div>
                                        {q.imageUrl && <Image src={q.imageUrl} alt={`Soru ${q.qNum}`} width={400} height={300} className="my-2 rounded-md border" data-ai-hint="question paper" />}
                                        <p className="text-sm my-2">
                                            <span className="font-semibold">Öğrenci Cevabı:</span>
                                             <span className={cn("ml-2", isAnswerEmpty ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                                {isAnswerEmpty ? "(Boş bırakılmış)" : q.studentAnswer}
                                            </span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Button type="button" size="sm" variant={status === 'correct' ? 'default' : 'outline'} className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200" onClick={() => handleStatusChange(q.id, 'correct')}>Doğru</Button>
                                            <Button type="button" size="sm" variant={status === 'incorrect' ? 'destructive' : 'outline'} className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200" onClick={() => handleStatusChange(q.id, 'incorrect')}>Yanlış</Button>
                                        </div>
                                        {(status === 'incorrect' || status === 'empty') && (
                                            <div className="mt-4">
                                                <FormLabel className="text-xs text-muted-foreground">Soru Görseli Ekle (Opsiyonel)</FormLabel>
                                                 <Input id={`file-${q.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, q.id)} />
                                                <label htmlFor={`file-${q.id}`} className="w-full mt-1 aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer">
                                                    {imageDataUri ? (
                                                        <Image src={imageDataUri} alt="Önizleme" width={200} height={150} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="question paper"/>
                                                    ) : (
                                                        <div className="text-center">
                                                            <UploadCloud className="mx-auto h-6 w-6" />
                                                            <p className="mt-1 text-xs">Görsel Yükle</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        )}
                                    </Card>
                                )
                            })}
                             {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Değerlendirilecek soru bulunmuyor.</p>}
                        </div>
                    </ScrollArea>
                </CardContent>
            </form>
        </Form>
    );
});

ManualGradeForm.displayName = 'ManualGradeForm';


