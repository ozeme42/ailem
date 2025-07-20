
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { AnswerKeyForm } from "./answer-key-form";
import type { QuestionBank } from "@/lib/data";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";

type AnswerKey = { [key: number]: string };

const topicSchema = z.object({
  id: z.number(),
  name: z.string().min(3, "Konu adı en az 3 karakter olmalı."),
  questionCount: z.coerce.number().min(1, "En az 1 soru olmalı.").default(1),
  hasAnswerKey: z.boolean().default(false),
  answerKey: z.record(z.string()).optional(),
});

const subjectSchema = z.object({
  id: z.number(),
  name: z.string({ required_error: "Lütfen bir ders seçin." }),
  topics: z.array(topicSchema).min(1, "En az bir konu eklemelisiniz."),
});

const formSchema = z.object({
  name: z.string().min(5, { message: "Banka adı en az 5 karakter olmalıdır." }),
  subjects: z.array(subjectSchema).min(1, "En az bir ders eklemelisiniz."),
});

type FormData = z.infer<typeof formSchema>;

type NewQuestionBankFormProps = {
    onSubmit: (data: Omit<QuestionBank, 'id'>, id?: number) => void;
    initialData?: QuestionBank | null;
}

export function NewQuestionBankForm({ onSubmit, initialData }: NewQuestionBankFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subjects: [],
    },
  });

  React.useEffect(() => {
    if (initialData) {
        // Ensure topics have the `hasAnswerKey` field when loading initial data
        const subjectsWithKeyFlag = initialData.subjects.map(subject => ({
            ...subject,
            topics: subject.topics.map(topic => ({
                ...topic,
                questionCount: topic.questionCount || 1, // Default value
                hasAnswerKey: !!topic.answerKey && Object.keys(topic.answerKey).length > 0
            }))
        }));
        form.reset({
            name: initialData.name,
            subjects: subjectsWithKeyFlag
        });
    } else {
        form.reset({
            name: "",
            subjects: [],
        });
    }
}, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subjects",
  });

  function handleFormSubmit(values: FormData) {
     // Clean up answer keys if hasAnswerKey is false
    const cleanedSubjects = values.subjects.map(subject => ({
        ...subject,
        topics: subject.topics.map(topic => {
            const { hasAnswerKey, ...restOfTopic } = topic;
            if (!hasAnswerKey) {
                restOfTopic.answerKey = {};
            }
            return restOfTopic;
        })
    }));

    onSubmit({ ...values, subjects: cleanedSubjects }, initialData?.id);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soru Bankası Adı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: 5. Sınıf Matematik Yaprak Testler" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
          <FormLabel>Dersler ve Konular</FormLabel>
          {fields.map((subjectField, subjectIndex) => (
            <Card key={subjectField.id} className="p-4 relative">
              <div className="flex items-start gap-2">
                 <FormField
                    control={form.control}
                    name={`subjects.${subjectIndex}.name`}
                    render={({ field }) => (
                        <FormItem className="flex-grow">
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
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1"
                    onClick={() => remove(subjectIndex)}
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <SubjectTopics control={form.control} subjectIndex={subjectIndex} form={form} />
            </Card>
          ))}
           <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => append({ id: Date.now(), name: "Matematik", topics: [] })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Ders Ekle
          </Button>
        </div>

        <Button type="submit">{initialData ? "Değişiklikleri Kaydet" : "Soru Bankasını Kaydet"}</Button>
      </form>
    </Form>
  );
}


function SubjectTopics({ control, subjectIndex, form }: { control: any, subjectIndex: number, form: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `subjects.${subjectIndex}.topics`,
  });

  return (
    <div className="mt-4 pl-2 border-l-2">
      <FormLabel className="text-sm">Konular</FormLabel>
       <div className="space-y-2 mt-2">
            {fields.map((topicField, topicIndex) => {
              const hasAnswerKeyPath = `subjects.${subjectIndex}.topics.${topicIndex}.hasAnswerKey`;
              const hasAnswerKey = form.watch(hasAnswerKeyPath);

              return (
              <div key={topicField.id} className="flex items-center gap-2 p-3 border rounded-md">
                 <div className="flex-grow space-y-3">
                    <FormField
                    control={control}
                    name={`subjects.${subjectIndex}.topics.${topicIndex}.name`}
                    render={({ field }) => (
                        <FormItem>
                         <FormLabel className="text-xs">Konu Adı</FormLabel>
                        <FormControl>
                            <Input placeholder="Konu adı" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name={`subjects.${subjectIndex}.topics.${topicIndex}.questionCount`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs">Soru Sayısı</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Soru" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={control}
                        name={hasAnswerKeyPath}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                                <FormLabel className="text-xs">Cevap Anahtarı</FormLabel>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                 </div>
                <div className="flex flex-col gap-2 self-start">
                     <Controller
                        control={control}
                        name={`subjects.${subjectIndex}.topics.${topicIndex}`}
                        render={({ field }) => (
                            <AnswerKeyDialog
                                topic={field.value}
                                onSave={(newKey) => field.onChange({ ...field.value, answerKey: newKey })}
                                isVisible={hasAnswerKey}
                            />
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(topicIndex)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              </div>
            )})}
       </div>
       <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => append({ id: Date.now(), name: "", questionCount: 20, hasAnswerKey: false, answerKey: {} })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Konu Ekle
        </Button>
    </div>
  );
}


function AnswerKeyDialog({ topic, onSave, isVisible }: { topic: any, onSave: (key: AnswerKey) => void, isVisible: boolean }) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" className={cn(!isVisible && "invisible")}>
                    <Key className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Cevap Anahtarı: {topic.name}</DialogTitle>
                    <DialogDescription>
                        Bu konu için cevapları girin. Toplam {topic.questionCount || 0} soru.
                    </DialogDescription>
                </DialogHeader>
                <AnswerKeyForm
                    totalQuestions={topic.questionCount || 0}
                    answerKey={topic.answerKey || {}}
                    onSave={(newKey) => {
                        onSave(newKey);
                        setIsOpen(false);
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}

    