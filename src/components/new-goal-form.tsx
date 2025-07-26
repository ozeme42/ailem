
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyMember, Goal, GoalSection, GoalTask } from "@/lib/data";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";


const sectionSchema = z.object({
  title: z.string().min(1, "Bölüm başlığı boş olamaz.").default(""),
  unitCount: z.coerce.number().min(1, "Birim sayısı en az 1 olmalı.").default(0),
  taskCount: z.coerce.number().min(1, "Görev sayısı en az 1 olmalı.").default(1),
});

const formSchema = z.object({
  title: z.string().min(3, "Hedef adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  totalUnits: z.coerce.number().min(1, "Toplam birim en az 1 olmalıdır."),
  unitName: z.string().min(1, "Birim adı zorunludur."),
  sectionCount: z.coerce.number().min(1, "En az 1 bölüm olmalıdır."),
  sections: z.array(sectionSchema),
}).refine(data => {
    const totalSectionUnits = data.sections.reduce((acc, section) => acc + (section.unitCount || 0), 0);
    return totalSectionUnits === data.totalUnits;
}, {
    message: "Bölümlere atanan toplam birim sayısı, genel toplam birim sayısıyla eşleşmelidir.",
    path: ['totalUnits']
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
      totalUnits: 100,
      unitName: 'sayfa',
      sectionCount: 1,
      sections: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const sectionCount = form.watch('sectionCount');

  React.useEffect(() => {
    const currentSections = form.getValues('sections');
    const newSections = Array.from({ length: sectionCount || 0 }, (_, i) => {
      return currentSections[i] || { title: `Bölüm ${i + 1}`, unitCount: 0, taskCount: 1 };
    });
    replace(newSections);
  }, [sectionCount, replace, form]);

  React.useEffect(() => {
    if (initialData) {
        // Since this form is for auto-generation, we don't pre-fill it for editing.
        // Editing will require a different, manual form logic.
        // For now, reset to default when initialData is present but not suitable for this form.
        form.reset({
            title: "",
            description: "",
            assigneeId: undefined,
            sections: [],
            totalUnits: 100,
            unitName: 'sayfa',
            sectionCount: 1
        });
    }
  }, [initialData, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    let unitTracker = 0;

    const finalSections = values.sections.map((section, sectionIndex) => {
        const unitsPerTask = section.unitCount / section.taskCount;
        const tasks = Array.from({ length: section.taskCount }, (_, taskIndex) => {
            const startUnit = Math.round(unitTracker + (taskIndex * unitsPerTask)) + 1;
            const endUnit = Math.round(unitTracker + ((taskIndex + 1) * unitsPerTask));
            return {
                title: `${startUnit}-${endUnit}. ${values.unitName} tamamla`,
                order: taskIndex + 1,
            };
        });
        unitTracker += section.unitCount;

        return {
            title: section.title,
            order: sectionIndex + 1,
            tasks: tasks,
        };
    });

    const goalData = {
        title: values.title,
        description: values.description,
        assigneeId: values.assigneeId,
        sections: finalSections,
    };

    onCreate(goalData as any);
  }
  
  const totalAllocatedUnits = form.watch('sections').reduce((acc, s) => acc + (s.unitCount || 0), 0);
  const totalUnits = form.watch('totalUnits');
  const remainingUnits = totalUnits - totalAllocatedUnits;

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

                <Card className="p-4 bg-muted/50">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-lg">Hedef Yapılandırması</CardTitle>
                        <CardDescription>Hedefini otomatik olarak görevlere bölmek için bu alanları doldur.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="totalUnits" render={({ field }) => (
                                <FormItem><FormLabel>Toplam Birim</FormLabel><FormControl><Input type="number" placeholder="300" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="unitName" render={({ field }) => (
                                <FormItem><FormLabel>Birim Adı</FormLabel><FormControl><Input placeholder="sayfa" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="sectionCount" render={({ field }) => (
                            <FormItem><FormLabel>Bölüm Sayısı</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <FormLabel>Bölümleri Özelleştir</FormLabel>
                        {form.formState.errors.totalUnits && (
                             <p className="text-sm font-medium text-destructive">{form.formState.errors.totalUnits.message}</p>
                        )}
                        {remainingUnits !== 0 && (
                            <p className="text-sm font-medium text-destructive">Kalan Birim: {remainingUnits}</p>
                        )}
                    </div>
                     {fields.map((sectionField, sectionIndex) => (
                        <Card key={sectionField.id} className="p-4">
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`sections.${sectionIndex}.title`} render={({ field }) => (
                                    <FormItem className="sm:col-span-3"><FormLabel>Bölüm {sectionIndex + 1} Adı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name={`sections.${sectionIndex}.unitCount`} render={({ field }) => (
                                    <FormItem className="sm:col-span-2"><FormLabel>Bölümün Birim Sayısı</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                  <FormField control={form.control} name={`sections.${sectionIndex}.taskCount`} render={({ field }) => (
                                    <FormItem><FormLabel>Görev Sayısı</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                           </div>
                        </Card>
                    ))}
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
