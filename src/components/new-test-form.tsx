
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/lib/data";

const formSchema = z.object({
  title: z.string().min(5, { message: "Başlık en az 5 karakter olmalıdır." }),
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  subject: z.string({ required_error: "Lütfen bir ders seçin." }),
  questionCount: z.coerce.number().min(1, { message: "Soru sayısı en az 1 olmalıdır." }).max(100, { message: "Soru sayısı en fazla 100 olabilir." }),
});

type NewTestFormProps = {
  students: Student[];
};

export function NewTestForm({ students }: NewTestFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      questionCount: 20,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "✅ Test Başarıyla Atandı!",
      description: `"${values.title}" ödevi başarıyla oluşturuldu.`,
    });
    // Here you would typically call an API to save the test
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Başlığı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: 2. Dönem Genel Tekrar Testi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Öğrenci</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Öğrenci seçin" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                            {student.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Ders</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Ders seçin" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Matematik">Matematik</SelectItem>
                        <SelectItem value="Türkçe">Türkçe</SelectItem>
                        <SelectItem value="Fen Bilimleri">Fen Bilimleri</SelectItem>
                        <SelectItem value="Sosyal Bilgiler">Sosyal Bilgiler</SelectItem>
                        <SelectItem value="İngilizce">İngilizce</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="questionCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soru Sayısı</FormLabel>
              <FormControl>
                <Input type="number" placeholder="20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Ödevi Ata</Button>
      </form>
    </Form>
  );
}
