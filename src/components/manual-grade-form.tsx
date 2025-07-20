
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Test } from "@/lib/data";

export type ManualGradeData = {
    correct: number;
    incorrect: number;
    empty: number;
}

type ManualGradeFormProps = {
  test: Test;
  onSave: (data: ManualGradeData) => void;
  onCancel: () => void;
};

export function ManualGradeForm({ test, onSave, onCancel }: ManualGradeFormProps) {
  
  const formSchema = z.object({
    correct: z.coerce.number().min(0, "Değer 0'dan küçük olamaz.").default(0),
    incorrect: z.coerce.number().min(0, "Değer 0'dan küçük olamaz.").default(0),
    empty: z.coerce.number().min(0, "Değer 0'dan küçük olamaz.").default(0),
  }).refine(data => data.correct + data.incorrect + data.empty === test.questionCount, {
    message: `Toplam sayı, soru sayısına (${test.questionCount}) eşit olmalıdır.`,
    path: ["correct"], 
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      correct: 0,
      incorrect: 0,
      empty: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
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


    