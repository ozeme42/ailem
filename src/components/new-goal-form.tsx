
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
import type { FamilyMember, Goal, GoalSection } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";


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
  onCreate: (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>) => void;
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
      sections: [{ title: 'Bölüm 1', taskCount: 5 }],
    },
  });

  const { fields, replace, remove } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const sectionCount = form.watch('sectionCount');
  const totalUnits = form.watch('totalUnits');
  const unitsPerSection = sectionCount > 0 ? Math.floor(totalUnits / sectionCount) : 0;
  const remainderUnits = sectionCount > 0 ? totalUnits % sectionCount : 0;
  
  React.useEffect(() => {
    if (initialData) {
        // When editing, load the EXACT data from the goal object.
        form.reset({
            title: initialData.title,
            description: initialData.description || "",
            assigneeId: initialData.assigneeId,
            totalUnits: initialData.totalUnits || 100,
            unitName: initialData.unitName || 'birim',
            sectionCount: initialData.sectionCount || initialData.sections.length,
            sections: initialData.sections.map(s => ({
                title: s.title,
                taskCount: s.tasks.length
            }))
        });
    } else {
        // For a new goal, set default values.
        form.reset({
            title: "",
            description: "",
            assigneeId: undefined,
            totalUnits: 100,
            unitName: 'sayfa',
            sectionCount: 1,
            sections: [{ title: 'Bölüm 1', taskCount: 5 }],
        });
    }
  }, [initialData, form]);

  React.useEffect(() => {
    const currentSections = form.getValues('sections');
    const newSections = Array.from({ length: sectionCount || 0 }, (_, i) => {
      return currentSections[i] || { title: `Bölüm ${i + 1}`, taskCount: 5 };
    });
    replace(newSections);
  }, [sectionCount, replace, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {

    const finalSections: Omit<GoalSection, 'id' | 'status'>[] = values.sections.map((section, sectionIndex) => {
      const currentSectionUnits = unitsPerSection + (sectionIndex < remainderUnits ? 1 : 0);
      const unitsPerTask = section.taskCount > 0 ? Math.floor(currentSectionUnits / section.taskCount) : 0;
      const remainderUnitsPerTask = section.taskCount > 0 ? currentSectionUnits % section.taskCount : 0;
      
      const tasks = Array.from({ length: section.taskCount }, (_, taskIndex) => {
          const taskUnits = unitsPerTask + (taskIndex < remainderUnitsPerTask ? 1 : 0);
          
          return {
              title: `${taskUnits} ${values.unitName} tamamla`,
              order: taskIndex + 1,
              completed: false,
          };
      });

      return {
          title: section.title,
          order: sectionIndex + 1,
          tasks: tasks,
          status: 'unlocked',
      };
    });
    
    const goalData = {
        title: values.title,
        description: values.description,
        assigneeId: values.assigneeId,
        sections: finalSections,
        totalUnits: values.totalUnits,
        unitName: values.unitName,
        sectionCount: values.sectionCount,
    };

    onCreate(goalData as Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>);
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
                            <Card key={sectionField.id} className="p-4 relative">
                               <div className="flex justify-between items-start">
                                    <p className="text-sm font-semibold text-primary">Bölüm {sectionIndex + 1}</p>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 absolute top-1 right-1" onClick={() => remove(sectionIndex)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                               </div>
                               <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mt-2")}>
                                    <FormField control={form.control} name={`sections.${sectionIndex}.title`} render={({ field }) => (
                                        <FormItem><FormLabel>Bölüm Adı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
