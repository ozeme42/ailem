
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PracticeExam } from "@/lib/data";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";

const formSchema = z.object({
  name: z.string().min(3, { message: "Deneme adı en az 3 karakter olmalıdır." }),
});

type FormData = z.infer<typeof formSchema>;

type NewPracticeExamFormProps = {
    onSubmit: (data: Pick<PracticeExam, 'name'>) => void;
    initialData?: PracticeExam | null;
}

export function NewPracticeExamForm({ onSubmit, initialData }: NewPracticeExamFormProps) {
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({ name: initialData.name });
    }
  }, [initialData, form]);

  function handleFormSubmit(values: FormData) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Deneme Sınavını Düzenle" : "Yeni Deneme Sınavı Oluştur"}</DialogTitle>
        <DialogDescription>
            {initialData ? "Deneme sınavının adını güncelleyin." : "Yeni bir deneme sınavı oluşturun. Daha sonra dersler ve sorular ekleyebilirsiniz."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deneme Sınavı Adı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: TYT Genel Deneme - 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
            <Button type="submit">{initialData ? "Değişiklikleri Kaydet" : "Deneme Sınavını Oluştur"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
