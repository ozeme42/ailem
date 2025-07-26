
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
import { cn } from "@/lib/utils";

const sectionNameSchema = z.object({
  name: z.string().min(1, "Bölüm adı boş olamaz."),
});

const formSchema = z.object({
  title: z.string().min(3, "Hedef adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),

  // Automatic Generation Fields
  totalUnits: z.coerce.number().min(1, "Toplam birim en az 1 olmalıdır."),
  unitName: z.string().min(1, "Birim adı zorunludur. (örn: sayfa, kilometre, video)"),
  sectionCount: z.coerce.number().min(1, "En az 1 bölüm olmalıdır.").max(100, "En fazla 100 bölüm olabilir."),
  tasksPerSection: z.coerce.number().min(1, "Bölüm başına en az 1 görev olmalıdır.").max(50, "Bölüm başına en fazla 50 görev olabilir."),
  
  sectionNames: z.array(sectionNameSchema),
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
      unitName: "sayfa",
      sectionCount: 10,
      tasksPerSection: 1,
      sectionNames: Array.from({ length: 10 }, (_, i) => ({ name: `Bölüm ${i + 1}` })),
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "sectionNames",
  });

  const sectionCount = form.watch("sectionCount");

  React.useEffect(() => {
    const currentFields = form.getValues('sectionNames') || [];
    const currentCount = currentFields.length;
    if (sectionCount > 0 && sectionCount !== currentCount) {
      const newFields = Array.from({ length: sectionCount }, (_, i) => {
        return currentFields[i] || { name: `Bölüm ${i + 1}` };
      });
      replace(newFields);
    }
  }, [sectionCount, replace, form]);

  React.useEffect(() => {
    if (initialData) {
        form.reset({
            title: initialData.title,
            description: initialData.description,
            assigneeId: initialData.assigneeId,
            sectionCount: initialData.sections.length,
            sectionNames: initialData.sections.sort((a,b) => a.order - b.order).map(s => ({ name: s.title })),
            // Note: Automatic generation fields might not map perfectly back.
            // This assumes a certain structure was used to create them.
            totalUnits: initialData.sections.flatMap(s => s.tasks).length,
            tasksPerSection: initialData.sections[0]?.tasks.length || 1,
            unitName: 'görev'
        });
    } else {
        form.reset({
          title: "",
          description: "",
          assigneeId: undefined,
          totalUnits: 100,
          unitName: "sayfa",
          sectionCount: 10,
          tasksPerSection: 1,
          sectionNames: Array.from({ length: 10 }, (_, i) => ({ name: `Bölüm ${i + 1}` })),
        });
    }
  }, [initialData, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const totalTasks = values.sectionCount * values.tasksPerSection;
    if (totalTasks === 0) return;
    
    const unitsPerTask = Math.ceil(values.totalUnits / totalTasks);
    let unitsAssigned = 0;

    const sections: any[] = [];
    for (let i = 0; i < values.sectionCount; i++) {
        const sectionTasks: any[] = [];
        for (let j = 0; j < values.tasksPerSection; j++) {
            const startUnit = unitsAssigned + 1;
            const endUnit = Math.min(unitsAssigned + unitsPerTask, values.totalUnits);
            
            if (startUnit > values.totalUnits) continue;

            const taskTitle = `${startUnit}-${endUnit}. ${values.unitName} tamamla`;
            sectionTasks.push({
                title: taskTitle,
                order: j + 1
            });
            unitsAssigned = endUnit;
        }

        if (sectionTasks.length > 0) {
            sections.push({
                title: values.sectionNames[i].name,
                order: i + 1,
                tasks: sectionTasks
            });
        }
    }


    const goalData = {
        title: values.title,
        description: values.description,
        assigneeId: values.assigneeId,
        sections: sections
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
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Otomatik Planlama</CardTitle>
                        <CardDescription>
                            Hedefinizi bölümlere ve görevlere otomatik olarak ayırmak için bu alanları doldurun.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="totalUnits"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Toplam Birim</FormLabel>
                                    <FormControl><Input type="number" placeholder="300" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unitName"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Birim Adı</FormLabel>
                                    <FormControl><Input placeholder="sayfa, km, video" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="sectionCount"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Bölüm Sayısı</FormLabel>
                                    <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tasksPerSection"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Bölüm Başına Görev</FormLabel>
                                    <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                 </Card>

                <div className="space-y-4">
                    <FormLabel>Bölüm İsimleri</FormLabel>
                    {fields.map((sectionField, sectionIndex) => (
                        <Card key={sectionField.id} className="p-4 bg-muted/50">
                            <FormField
                                control={form.control}
                                name={`sectionNames.${sectionIndex}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Bölüm {sectionIndex + 1} Adı</FormLabel>
                                        <FormControl><Input placeholder={`Bölüm ${sectionIndex + 1} için özel bir isim girin`} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </Card>
                    ))}
                     <FormMessage>{form.formState.errors.sectionNames?.message}</FormMessage>
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
