
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PracticeExam } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(3, { message: "Deneme adı en az 3 karakter olmalıdır." }),
});

type FormData = z.infer<typeof formSchema>;

type NewPracticeExamFormProps = {
    onSubmit: (data: Pick<PracticeExam, 'name'>) => void;
}

export function NewPracticeExamForm({ onSubmit }: NewPracticeExamFormProps) {
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  function handleFormSubmit(values: FormData) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deneme Sınavı Adı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: Matematik Tekrar Testi - 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Deneme Sınavını Oluştur</Button>
      </form>
    </Form>
  );
}
