

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Test } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";


type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated' | 'empty';

export type ManualGradeData = {
    correct: number;
    incorrect: number;
    empty: number;
};

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
};

const formSchema = z.object({
    correct: z.coerce.number().min(0, "Değer negatif olamaz.").default(0),
    incorrect: z.coerce.number().min(0, "Değer negatif olamaz.").default(0),
    empty: z.coerce.number().min(0, "Değer negatif olamaz.").default(0),
}).refine(data => (data.correct + data.incorrect + data.empty) <= 100, { // Assuming 100 is a reasonable max
    message: "Toplam soru sayısı testin soru sayısını aşamaz.", // This message is generic
    path: ['correct'],
});


export const ManualGradeForm = React.forwardRef<
    { submit: () => void },
    ManualGradeFormProps
>(({ test, onSave }, ref) => {
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            correct: test.correctAnswers || 0,
            incorrect: test.incorrectAnswers || 0,
            empty: test.emptyAnswers || 0,
        },
    });
    
    React.useImperativeHandle(ref, () => ({
        submit: () => {
            form.handleSubmit(onSubmit)();
        },
    }));

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if((values.correct + values.incorrect + values.empty) > test.questionCount) {
            toast({
                title: "Hata",
                description: `Toplam sayı (${values.correct + values.incorrect + values.empty}), toplam soru sayısını (${test.questionCount}) geçemez.`,
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        onSave({
            correct: values.correct,
            incorrect: values.incorrect,
            empty: values.empty,
        });
        setIsSaving(false);
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="correct" render={({ field }) => (
                        <FormItem><FormLabel>Doğru</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="incorrect" render={({ field }) => (
                        <FormItem><FormLabel>Yanlış</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="empty" render={({ field }) => (
                        <FormItem><FormLabel>Boş</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sonuçları Kaydet
                </Button>
            </form>
        </Form>
    );
});

ManualGradeForm.displayName = 'ManualGradeForm';

