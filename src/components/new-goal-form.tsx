
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyMember, Goal, GoalSection, GoalTask } from "@/lib/data";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Görev başlığı boş olamaz."),
});

const sectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Bölüm adı boş olamaz."),
  tasks: z.array(taskSchema).min(1, "Her bölümde en az bir görev olmalıdır."),
});

const formSchema = z.object({
  title: z.string().min(3, "Hedef adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  sections: z.array(sectionSchema).min(1, "En az bir bölüm oluşturmalısınız."),
});


type NewGoalFormProps = {
  familyMembers: FamilyMember[];
  onCreate: (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status' | 'sections'> & { sections: Omit<GoalSection, 'id'|'status'|'tasks'>[] & { tasks: Omit<GoalTask, 'id'|'completed'>[] }[] }) => void;
  initialData?: Goal | null;
};

export function NewGoalForm({ familyMembers, onCreate, initialData }: NewGoalFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      sections: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  React.useEffect(() => {
    if (initialData) {
        form.reset({
            title: initialData.title,
            description: initialData.description,
            assigneeId: initialData.assigneeId,
            sections: initialData.sections.sort((a,b) => a.order - b.order).map(s => ({
                id: s.id,
                title: s.title,
                tasks: s.tasks.sort((a,b) => a.order - b.order).map(t => ({ id: t.id, title: t.title }))
            }))
        });
    } else {
        form.reset({
          title: "",
          description: "",
          assigneeId: undefined,
          sections: [],
        });
    }
  }, [initialData, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const goalData = {
        title: values.title,
        description: values.description,
        assigneeId: values.assigneeId,
        sections: values.sections.map((section, sectionIndex) => ({
            ...section,
            order: sectionIndex + 1,
            tasks: section.tasks.map((task, taskIndex) => ({
                ...task,
                order: taskIndex + 1
            }))
        }))
    };
    onCreate(goalData as any);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hedef Başlığı</FormLabel>
                    <FormControl><Input placeholder="Büyük hedefin nedir?" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Bu hedefin önemini veya detaylarını açıkla..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sorumlu Kişi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Bu hedef kimin için?" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {familyMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                            {member.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <div className="space-y-4">
                    <FormLabel>Bölümler</FormLabel>
                    {fields.map((sectionField, sectionIndex) => (
                        <Card key={sectionField.id} className="p-4 bg-muted/50">
                            <div className="flex justify-between items-start mb-2">
                                <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.title`}
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormLabel className="text-xs">Bölüm {sectionIndex + 1}</FormLabel>
                                            <FormControl><Input placeholder={`Bölüm adı...`} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" className="ml-2 mt-6" onClick={() => remove(sectionIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                            <SectionTasks control={form.control} sectionIndex={sectionIndex} />
                        </Card>
                    ))}
                    <Button type="button" variant="outline" className="w-full" onClick={() => append({ title: "", tasks: [{title: ""}] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Yeni Bölüm Ekle
                    </Button>
                    <FormMessage>{form.formState.errors.sections?.message || form.formState.errors.sections?.root?.message}</FormMessage>
                </div>
            </div>
        </ScrollArea>
        <div className="pt-4 border-t">
            <Button type="submit" className="w-full">{initialData ? "Değişiklikleri Kaydet" : "Yol Haritasını Oluştur"}</Button>
        </div>
      </form>
    </Form>
  );
}


function SectionTasks({ control, sectionIndex }: { control: any; sectionIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.tasks`,
  });

  return (
    <div className="space-y-3 pl-4 border-l-2 ml-2">
       <FormLabel className="text-xs">Görevler</FormLabel>
        {fields.map((taskField, taskIndex) => (
            <div key={taskField.id} className="flex items-center gap-2">
                <FormField
                    control={control}
                    name={`sections.${sectionIndex}.tasks.${taskIndex}.title`}
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl><Input placeholder={`Görev ${taskIndex + 1}`} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(taskIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        ))}
         <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ title: "" })}
            >
            <PlusCircle className="mr-2 h-4 w-4" /> Görev Ekle
        </Button>
    </div>
  );
}
