
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Key, PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PracticeExam, GradingType } from "@/lib/data";
import { AnswerKeyForm } from "./answer-key-form";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const subjectSchema = z.object({
  id: z.number(),
  name: z.string({ required_error: "Lütfen bir ders seçin." }),
  questionCount: z.coerce.number().min(1, "En az 1 soru olmalı."),
});

type AnswerKey = { [key: number]: string };

const formSchema = z.object({
  name: z.string().min(5, { message: "Deneme adı en az 5 karakter olmalıdır." }),
  subjects: z.array(subjectSchema).min(1, "En az bir ders eklemelisiniz."),
  gradingType: z.enum(["auto", "manual-text", "manual"]).default("manual"),
  answerKey: z.record(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

type NewPracticeExamFormProps = {
    onSubmit: (data: Omit<PracticeExam, 'id'>, id?: string) => void;
    initialData?: PracticeExam | null;
}

export function NewPracticeExamForm({ onSubmit, initialData }: NewPracticeExamFormProps) {
  const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = React.useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subjects: [{ id: 1, name: "Matematik", questionCount: 20 }],
      gradingType: "manual",
      answerKey: {},
    },
  });

  React.useEffect(() => {
      if (initialData) {
          form.reset({
              name: initialData.name,
              subjects: initialData.subjects,
              gradingType: initialData.gradingType || 'manual',
              answerKey: initialData.answerKey || {}
          });
      } else {
          form.reset({
              name: "",
              subjects: [{ id: 1, name: "Matematik", questionCount: 20 }],
              gradingType: "manual",
              answerKey: {},
          });
      }
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subjects",
  });
  
  const subjectsValue = form.watch('subjects');
  const gradingType = form.watch('gradingType');
  const totalQuestions = subjectsValue.reduce((acc, s) => acc + (s.questionCount || 0), 0);

  function handleFormSubmit(values: FormData) {
     if (values.gradingType !== 'auto') {
        values.answerKey = {};
    }
    onSubmit(values, initialData?.id);
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
                <Input placeholder="Örn: LGS Genel Deneme - 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <FormLabel>Dersler ve Soru Sayıları</FormLabel>
          <div className="space-y-4 mt-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`subjects.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-grow">
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
                <FormField
                  control={form.control}
                  name={`subjects.${index}.questionCount`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input type="number" placeholder="Soru" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => append({ id: Date.now(), name: "Türkçe", questionCount: 20 })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Ders Ekle
          </Button>
        </div>
        
         <FormField
            control={form.control}
            name="gradingType"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Değerlendirme Tipi</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="auto" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Otomatik Kontrol (Çoktan Seçmeli)
                        </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="manual-text" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Manuel Kontrol (Açık Uçlu)
                        </FormLabel>
                    </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="manual" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Cevap Gerekmiyor (Manuel Kontrol)
                        </FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        {gradingType === 'auto' && (
          <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="secondary" disabled={totalQuestions === 0}>
                  <Key className="mr-2 h-4 w-4"/>
                  Cevap Anahtarını Düzenle ({Object.keys(form.getValues('answerKey') || {}).length} / {totalQuestions})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>Cevap Anahtarı</DialogTitle>
                      <DialogDescription>
                          {form.getValues('name')} için cevapları girin. Toplam {totalQuestions} soru.
                      </DialogDescription>
                  </DialogHeader>
                  <AnswerKeyForm
                      totalQuestions={totalQuestions}
                      answerKey={form.getValues('answerKey') || {}}
                      onSave={(newKey) => {
                          form.setValue('answerKey', newKey);
                          setIsAnswerKeyDialogOpen(false);
                      }}
                  />
            </DialogContent>
          </Dialog>
        )}


        <Button type="submit">{initialData ? "Değişiklikleri Kaydet" : "Deneme Sınavını Kaydet"}</Button>
      </form>
    </Form>
  );
}

    

    