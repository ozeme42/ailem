
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyMember, Goal, GoalSection, GoalTask } from "@/lib/data";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";


const formSchema = z.object({
  title: z.string().min(3, "Hedef adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  
  // New automated fields
  totalUnits: z.coerce.number().min(1, "Toplam birim en az 1 olmalıdır."),
  unitName: z.string().min(1, "Birim adı zorunludur.").default("sayfa"),
  unitsPerTask: z.coerce.number().min(1, "Birim başına görev en az 1 olmalıdır.").default(20),
  sectionCount: z.coerce.number().min(1, "En az 1 bölüm olmalıdır.").max(100, "En fazla 100 bölüm olabilir.").default(1),

}).refine(data => data.totalUnits >= data.unitsPerTask, {
    message: "Toplam birim, görev başına birimden küçük olamaz.",
    path: ["totalUnits"],
});

type NewGoalFormProps = {
  familyMembers: FamilyMember[];
  onCreate: (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status' | 'sections'> & { sections: Omit<GoalSection, 'id'|'status'|'tasks'>[] & { tasks: Omit<GoalTask, 'id'|'completed'>[] }[] }) => void;
};

export function NewGoalForm({ familyMembers, onCreate }: NewGoalFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      totalUnits: 100,
      unitName: "sayfa",
      unitsPerTask: 10,
      sectionCount: 4,
    },
  });

  const { totalUnits, unitName, unitsPerTask, sectionCount } = useWatch({ control: form.control });

  const generatedPlan = React.useMemo(() => {
    if (!totalUnits || !unitName || !unitsPerTask || !sectionCount || sectionCount === 0 || totalUnits < unitsPerTask) {
        return null;
    }
    
    const totalTasks = Math.ceil(totalUnits / unitsPerTask);
    const tasksPerSection = Math.ceil(totalTasks / sectionCount);
    
    const sections: { title: string; tasks: { title: string }[] }[] = [];

    let currentUnit = 0;

    for (let i = 0; i < sectionCount; i++) {
        if (currentUnit >= totalUnits) break;

        const sectionTasks: { title: string }[] = [];
        const startUnitForSection = currentUnit + 1;

        for (let j = 0; j < tasksPerSection; j++) {
            if (currentUnit >= totalUnits) break;
            
            const taskStartUnit = currentUnit + 1;
            const taskEndUnit = Math.min(currentUnit + unitsPerTask, totalUnits);
            sectionTasks.push({ title: `${taskStartUnit}-${taskEndUnit}. ${unitName}` });
            currentUnit = taskEndUnit;
        }

        const endUnitForSection = currentUnit;
        sections.push({
            title: `Bölüm ${i + 1}: ${startUnitForSection}-${endUnitForSection}. ${unitName}`,
            tasks: sectionTasks
        });
    }

    return sections;

  }, [totalUnits, unitName, unitsPerTask, sectionCount]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!generatedPlan) return;

    const goalData = {
        title: values.title,
        description: values.description,
        assigneeId: values.assigneeId,
        sections: generatedPlan.map((section, sectionIndex) => ({
            title: section.title,
            order: sectionIndex + 1,
            tasks: section.tasks.map((task, taskIndex) => ({
                title: task.title,
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
                
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                    <h3 className="text-lg font-semibold">Hedef Otomasyonu</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="totalUnits" render={({ field }) => (
                            <FormItem><FormLabel>Toplam Birim</FormLabel><FormControl><Input type="number" placeholder="300" {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="unitName" render={({ field }) => (
                            <FormItem><FormLabel>Birim Adı</FormLabel><FormControl><Input placeholder="sayfa, km, video" {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="unitsPerTask" render={({ field }) => (
                            <FormItem><FormLabel>Görev Başına Birim</FormLabel><FormControl><Input type="number" placeholder="20" {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="sectionCount" render={({ field }) => (
                            <FormItem><FormLabel>Bölüm Sayısı</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                    </div>
                </div>

                {generatedPlan && (
                    <Alert>
                        <AlertTitle>Otomatik Plan Özeti</AlertTitle>
                        <AlertDescription>
                            Bu ayarlarla, toplamda {generatedPlan.reduce((acc, s) => acc + s.tasks.length, 0)} görev ve {generatedPlan.length} bölüm oluşturulacak.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </ScrollArea>
        <div className="pt-4 border-t">
            <Button type="submit" className="w-full" disabled={!generatedPlan}>Yol Haritasını Oluştur</Button>
        </div>
      </form>
    </Form>
  );
}
