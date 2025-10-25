
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import type { StudyPlan, StudyTopic } from "@/lib/data";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

const topicSchema = z.object({
  name: z.string().min(2, "Konu adı en az 2 karakter olmalıdır."),
  subject: z.string().min(2, "Ders adı en az 2 karakter olmalıdır."),
  sources: z.array(z.string().url("Geçerli bir link girin.")).optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Plan adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  topics: z.array(topicSchema).min(1, "En az bir konu eklemelisiniz."),
});

type NewStudyPlanFormProps = {
  onSubmit: (data: Omit<StudyPlan, 'id' | 'familyId'>) => void;
  initialData?: StudyPlan | null;
};

export function NewStudyPlanForm({ onSubmit, initialData }: NewStudyPlanFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      topics: [{ name: "", subject: "", sources: [""] }],
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description || "",
        topics: initialData.topics.map(t => ({...t, sources: t.sources || [""]})),
      });
    }
  }, [initialData, form]);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "topics",
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    const cleanedData = {
        ...values,
        topics: values.topics.map(t => ({...t, sources: (t.sources || []).filter(s => s.trim() !== '')}))
    }
    onSubmit(cleanedData);
    form.reset();
  };

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Planı Düzenle" : "Yeni Konu Anlatımı Planı Oluştur"}</DialogTitle>
        <DialogDescription>
          Bir ders veya ünite için konu anlatım yol haritası oluşturun.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Plan Başlığı</FormLabel>
                    <FormControl><Input placeholder="Örn: 8. Sınıf Matematik 1. Dönem" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                    <FormControl><Textarea placeholder="Bu planın amacı nedir?" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div>
                    <FormLabel>Konular</FormLabel>
                    <div className="space-y-4 mt-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-3 relative">
                                 <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                                 <FormField
                                    control={form.control}
                                    name={`topics.${index}.subject`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Ders</FormLabel>
                                        <FormControl><Input placeholder="Matematik" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`topics.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Konu</FormLabel>
                                        <FormControl><Input placeholder="Üslü Sayılar" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`topics.${index}.sources`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Kaynak Linkleri</FormLabel>
                                            <div className="space-y-2">
                                            {(field.value || []).map((source, sourceIndex) => (
                                                <div key={sourceIndex} className="flex items-center gap-2">
                                                <Input 
                                                    value={source}
                                                    onChange={(e) => {
                                                        const newSources = [...(field.value || [])];
                                                        newSources[sourceIndex] = e.target.value;
                                                        field.onChange(newSources);
                                                    }}
                                                    placeholder="https://www.youtube.com/..."
                                                />
                                                 <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => field.onChange(field.value?.filter((_, i) => i !== sourceIndex))}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            ))}
                                            <Button type="button" size="sm" variant="outline" onClick={() => field.onChange([...(field.value || []), ""])}>Kaynak Ekle</Button>
                                            </div>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ))}
                         <Button type="button" variant="secondary" className="w-full" onClick={() => append({ name: "", subject: "", sources: [""] })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Konu Ekle
                        </Button>
                    </div>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
            <Button type="submit">{initialData ? 'Değişiklikleri Kaydet' : 'Planı Oluştur'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
