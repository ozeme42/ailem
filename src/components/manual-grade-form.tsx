

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
};

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
};

const formSchema = z.object({
    evaluations: z.record(z.enum(['correct', 'incorrect', 'unevaluated', 'empty'])),
});

type QuestionForGrading = { 
    id: string; // The ID of the question number
    qNum: string; // The display number/text for the question
    studentAnswer: string;
    imageUrl?: string | null;
};


export const ManualGradeForm = React.forwardRef<
    { submit: () => void },
    ManualGradeFormProps
>(({ test, onSave }, ref) => {
    const [isSaving, setIsSaving] = React.useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            evaluations: {},
        },
    });
    
    const { setValue, watch, handleSubmit } = form;
    
    React.useImperativeHandle(ref, () => ({
        submit: () => {
            handleSubmit(onSubmit)();
        },
    }));

    async function onSubmit(values: z.infer<typeof formSchema>) {
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
            } else if (status === 'empty') {
                empty++;
            }
        }

        onSave({
            correct,
            incorrect,
            empty,
        });
        setIsSaving(false);
    }
    
    return (
        <p>Manuel not girişi artık desteklenmemektedir.</p>
    );
});

ManualGradeForm.displayName = 'ManualGradeForm';
