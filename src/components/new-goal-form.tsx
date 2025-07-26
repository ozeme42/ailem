
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyMember, Goal, GoalSection, GoalTask } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";


const sectionSchema = z.object({
  title: z.string().min(1, "Bölüm başlığı boş olamaz.").default(""),
  taskCount: z.coerce.number().min(1, "Görev sayısı en az 1 olmalı.").default(1),
});

const formSchema = z.object({
  title: z.string().min(3, "Hedef adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  totalUnits: z.coerce.number().min(1, "Toplam birim en az 1 olmalıdır."),
  unitName: z.string().min(1, "Birim adı zorunludur."),
  sectionCount: z.coerce.number().min(1, "En az 1 bölüm olmalıdır.").default(1),
  sections: z.array(sectionSchema),
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

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const sectionCount = form.watch('sectionCount');
  const totalUnits = form.watch('totalUnits');
  const unitsPerSection = sectionCount > 0 ? Math.floor(totalUnits / sectionCount) : 0;
  const remainderUnits = sectionCount > 0 ? totalUnits % sectionCount : 0;


  React.useEffect(() => {
    const currentSections = form.getValues('sections');
    const newSections = Array.from({ length: sectionCount || 0 }, (_, i) => {
      return currentSections[i] || { title: `Bölüm ${i + 1}`, taskCount: 10 };
    });
    replace(newSections);
  }, [sectionCount, replace, form]);

  React.useEffect(() => {
    if (initialData) {
        // Since editing is complex with this auto-generation logic, we will reset to a clean slate.
        // A more advanced implementation might try to reverse-engineer the form state from the data.
        // For now, we will just load the main details.
        form.reset({
            title: initialData.title,
            description: initialData.description,
            assigneeId: initialData.assigneeId,
            // Resetting auto-generation fields as they are not easily reversible
            totalUnits: 100,
            unitName: 'sayfa',
            sectionCount: initialData.sections.length,
            sections: initialData.sections.map(s => ({ title: s.title, taskCount: s.tasks.length }))
        });
    }
  }, [initialData, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    let unitTracker = 0;

    const finalSections = values.sections.map((section, sectionIndex) => {
        // Calculate units for this specific section, distributing the remainder
        const currentSectionUnits = unitsPerSection + (sectionIndex < remainderUnits ? 1 : 0);
        const unitsPerTask = section.taskCount > 0 ? currentSectionUnits / section.taskCount : 0;

        const tasks = Array.from({ length: section.taskCount }, (_, taskIndex) => {
            const startUnit = Math.floor(unitTracker) + 1;
            unitTracker += unitsPerTask;
            const endUnit = Math.floor(unitTracker);
            
            return {
                title: `${startUnit}-${endUnit}. ${values.unitName} tamamla`,
                order: taskIndex + 1,
            };
        });

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
                    <FormLabel>Bölümleri Özelleştir</FormLabel>
                     {fields.map((sectionField, sectionIndex) => {
                         const sectionUnitCount = unitsPerSection + (sectionIndex < remainderUnits ? 1 : 0);
                         return (
                            <Card key={sectionField.id} className="p-4">
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField control={form.control} name={`sections.${sectionIndex}.title`} render={({ field }) => (
                                        <FormItem className="sm:col-span-2"><FormLabel>Bölüm {sectionIndex + 1} Adı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                      <FormField control={form.control} name={`sections.${sectionIndex}.taskCount`} render={({ field }) => (
                                        <FormItem><FormLabel>Görev Sayısı</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                               </div>
                               <p className="text-xs text-muted-foreground mt-2">Bu bölüm otomatik olarak ~{sectionUnitCount} {form.getValues('unitName') || 'birim'} olarak ayarlandı.</p>
                            </Card>
                        )
                     })}
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
