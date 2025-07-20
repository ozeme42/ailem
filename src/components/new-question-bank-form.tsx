
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const topicSchema = z.object({
  name: z.string().min(3, "Konu adı en az 3 karakter olmalı."),
  questionCount: z.coerce.number().min(1, "En az 1 soru olmalı."),
});

const subjectSchema = z.object({
  name: z.string({ required_error: "Lütfen bir ders seçin." }),
  topics: z.array(topicSchema).min(1, "En az bir konu eklemelisiniz."),
});

const formSchema = z.object({
  name: z.string().min(5, { message: "Banka adı en az 5 karakter olmalıdır." }),
  subjects: z.array(subjectSchema).min(1, "En az bir ders eklemelisiniz."),
});

export function NewQuestionBankForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subjects: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subjects",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "✅ Soru Bankası Oluşturuldu!",
      description: `"${values.name}" soru bankası başarıyla kaydedildi.`,
    });
    // API call to save the question bank
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-2">
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
              <SubjectTopics control={form.control} subjectIndex={subjectIndex} />
            </Card>
          ))}
           <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => append({ name: "Matematik", topics: [] })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Ders Ekle
          </Button>
        </div>

        <Button type="submit">Soru Bankasını Kaydet</Button>
      </form>
    </Form>
  );
}


function SubjectTopics({ control, subjectIndex }: { control: any, subjectIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `subjects.${subjectIndex}.topics`,
  });

  return (
    <div className="mt-4 pl-2 border-l-2">
      <FormLabel className="text-sm">Konular</FormLabel>
       <div className="space-y-2 mt-2">
            {fields.map((topicField, topicIndex) => (
              <div key={topicField.id} className="flex items-end gap-2">
                <FormField
                  control={control}
                  name={`subjects.${subjectIndex}.topics.${topicIndex}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-grow">
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
                    <FormItem className="w-24">
                      <FormControl>
                        <Input type="number" placeholder="Soru" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(topicIndex)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
       </div>
       <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => append({ name: "", questionCount: 20 })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Konu Ekle
        </Button>
    </div>
  );
}
