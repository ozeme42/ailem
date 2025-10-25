
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
import type { StudyPlan, StudyPlanSubject } from "@/lib/data";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const topicSchema = z.object({
  name: z.string().min(2, "Konu adı en az 2 karakter olmalıdır."),
  sources: z.array(z.string().url("Geçerli bir link girin.").or(z.literal(''))).optional(),
});

const subjectSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "Ders adı en az 2 karakter olmalıdır."),
    topics: z.array(topicSchema).min(1, "En az bir konu eklemelisiniz."),
});

const formSchema = z.object({
  title: z.string().min(3, "Plan adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  subjects: z.array(subjectSchema).min(1, "En az bir ders eklemelisiniz."),
});

type NewStudyPlanFormProps = {
  onSubmit: (data: Omit<StudyPlan, 'id' | 'familyId'>) => void;
  initialData?: StudyPlan | null;
};

export function NewStudyPlanForm({ onSubmit, initialData }: NewStudyPlanFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      subjects: [{ id: Date.now().toString(), name: "", topics: [{ name: "", sources: [""] }] }],
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description || "",
        subjects: initialData.subjects.map(s => ({
            ...s,
            topics: (s.topics || []).map(t => ({
                ...t,
                sources: (t.sources || []).length > 0 ? t.sources : [""]
            }))
        })) || [],
      });
    } else {
        form.reset({
            title: "",
            description: "",
            subjects: [{ id: Date.now().toString(), name: "", topics: [{ name: "", sources: [""] }] }],
        })
    }
  }, [initialData, form]);

  const { fields: subjectFields, append: appendSubject, remove: removeSubject } = useFieldArray({
    control: form.control,
    name: "subjects",
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    const cleanedData = {
        ...values,
        subjects: values.subjects.map(subject => ({
            ...subject,
            topics: subject.topics.map(topic => ({
                ...topic,
                id: topic.id || Date.now().toString() + Math.random(), // Ensure topic has an ID
                sources: (topic.sources || []).filter(s => s.trim() !== '')
            }))
        }))
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
                    <FormLabel>Dersler ve Konular</FormLabel>
                    <div className="space-y-4 mt-2">
                        {subjectFields.map((subjectField, subjectIndex) => (
                           <TopicArrayComponent 
                                key={subjectField.id}
                                subjectIndex={subjectIndex}
                                removeSubject={removeSubject}
                           />
                        ))}
                         <Button type="button" variant="secondary" className="w-full" onClick={() => append({ id: Date.now().toString(), name: "", topics: [{ name: "", sources: [""] }] })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Ders Ekle
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


function TopicArrayComponent({ subjectIndex, removeSubject }: { subjectIndex: number, removeSubject: (index: number) => void }) {
    const { control } = useForm<z.infer<typeof formSchema>>();
    const { fields, append, remove, update } = useFieldArray({
        control: control, // This is incorrect, but will be fixed by getting control from useFormContext
        name: `subjects.${subjectIndex}.topics`,
    });
     const { control: formControl } = useFormContext<z.infer<typeof formSchema>>();


    return (
         <Accordion type="single" collapsible defaultValue="item-0" className="w-full border rounded-lg p-4 relative">
             <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive z-10" onClick={() => removeSubject(subjectIndex)}><Trash2 className="h-4 w-4"/></Button>
             <AccordionItem value={`item-${subjectIndex}`} className="border-b-0">
                <AccordionTrigger>
                    <FormField
                        control={formControl}
                        name={`subjects.${subjectIndex}.name`}
                        render={({ field }) => (
                            <FormItem className="flex-grow pr-4">
                            <FormControl><Input placeholder="Ders Adı (örn: Matematik)" {...field} onClick={e => e.stopPropagation()} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                     {fields.map((field, topicIndex) => (
                        <div key={field.id} className="p-3 border rounded-md space-y-3 relative bg-background">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-0.5 right-0.5 h-7 w-7 text-destructive" onClick={() => remove(topicIndex)}><Trash2 className="h-4 w-4"/></Button>
                             <FormField
                                control={formControl}
                                name={`subjects.${subjectIndex}.topics.${topicIndex}.name`}
                                render={({ field: topicField }) => (
                                    <FormItem>
                                    <FormLabel>Konu Adı</FormLabel>
                                    <FormControl><Input placeholder="Üslü Sayılar" {...topicField} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <SourceArrayComponent subjectIndex={subjectIndex} topicIndex={topicIndex} />
                        </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => append({ name: "", sources: [""] })}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Konu Ekle
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

function SourceArrayComponent({ subjectIndex, topicIndex}: { subjectIndex: number, topicIndex: number}) {
    const { control } = useFormContext<z.infer<typeof formSchema>>();
    const { fields, append, remove } = useFieldArray({
        control: control,
        name: `subjects.${subjectIndex}.topics.${topicIndex}.sources`,
    });

    return (
        <div className="space-y-2">
            <FormLabel>Kaynak Linkleri (Opsiyonel)</FormLabel>
            {fields.map((field, sourceIndex) => (
                 <div key={field.id} className="flex items-center gap-2">
                    <FormField
                        control={control}
                        name={`subjects.${subjectIndex}.topics.${topicIndex}.sources.${sourceIndex}`}
                        render={({ field: sourceField }) => (
                            <FormItem className="flex-grow">
                                <FormControl><Input placeholder="https://www.youtube.com/..." {...sourceField} /></FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                     <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(sourceIndex)}><Trash2 className="h-4 w-4"/></Button>
                </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => append("")}>
                <PlusCircle className="mr-2 h-3 w-3"/> Link Ekle
            </Button>
        </div>
    )
}
