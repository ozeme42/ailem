

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
import { AlertTriangle, Trash2, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";


const sectionSchema = z.object({
  title: z.string().min(1, "Bölüm başlığı boş olamaz.").default(""),
});

const formSchema = z.object({
  goalType: z.enum(['book', 'video']).default('book'),
  title: z.string().min(3, "Hedef adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  totalUnits: z.coerce.number().min(1, "Toplam birim en az 1 olmalıdır."),
  unitName: z.string().min(1, "Birim adı zorunludur."),
  sectionCount: z.coerce.number().min(1, "En az 1 bölüm olmalıdır.").default(1),
  sections: z.array(sectionSchema),
  videoUrl: z.string().url("Lütfen geçerli bir YouTube URL'si girin.").optional().or(z.literal('')),
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
      goalType: 'book',
      title: "",
      description: "",
      totalUnits: 100,
      unitName: 'sayfa',
      sectionCount: 1,
      sections: [{ title: 'Bölüm 1' }],
      videoUrl: "",
    },
  });

  const { fields, replace, remove } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const sectionCount = form.watch('sectionCount');
  const goalType = form.watch('goalType');

  React.useEffect(() => {
    if (goalType === 'video') {
        form.setValue('unitName', 'video');
        form.setValue('sectionCount', 1);
    } else {
        form.setValue('unitName', 'sayfa');
    }
  }, [goalType, form]);
  
  React.useEffect(() => {
    if (initialData) {
        form.reset({
            goalType: initialData.platform ? 'video' : 'book',
            title: initialData.title,
            description: initialData.description || "",
            assigneeId: initialData.assigneeId,
            totalUnits: initialData.totalUnits,
            unitName: initialData.unitName,
            sectionCount: initialData.sectionCount,
            sections: initialData.sections.map(s => ({ title: s.title })),
            videoUrl: initialData.videoUrl || "",
        });
    } else {
        form.reset({
            goalType: 'book',
            title: "",
            description: "",
            assigneeId: undefined,
            totalUnits: 100,
            unitName: 'sayfa',
            sectionCount: 1,
            sections: [{ title: 'Bölüm 1' }],
            videoUrl: "",
        });
    }
  }, [initialData, form]);

  React.useEffect(() => {
    const currentSections = form.getValues('sections');
    const newSections = Array.from({ length: sectionCount || 0 }, (_, i) => {
      return currentSections[i] || { title: `Bölüm ${i + 1}` };
    });
    replace(newSections);
  }, [sectionCount, replace, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const totalUnits = values.totalUnits;
    const sectionCount = values.sectionCount;
    const unitsPerSection = sectionCount > 0 ? Math.floor(totalUnits / sectionCount) : 0;
    const remainderUnits = sectionCount > 0 ? totalUnits % sectionCount : 0;

    const finalSections: Omit<GoalSection, 'id' | 'status' | 'completedUnits'>[] = values.sections.map((section, sectionIndex) => {
      return {
          title: section.title,
          order: sectionIndex + 1,
          sectionTotalUnits: unitsPerSection + (sectionIndex < remainderUnits ? 1 : 0),
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
        platform: values.goalType === 'video' ? 'YouTube' as const : undefined,
        videoUrl: values.goalType === 'video' ? values.videoUrl : undefined,
    };

    onCreate(goalData as Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>);
  }

  return (
    <Form {...form}>
       <DialogHeader>
        <DialogTitle>{initialData ? "Yol Haritasını Düzenle" : "Yeni Yol Haritası Oluştur"}</DialogTitle>
        <DialogDescription>
          {initialData ? "Mevcut hedefin ayrıntılarını güncelleyin." : "Yeni bir okuma veya izleme hedefi oluşturun."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-4">
                 <FormField
                    control={form.control}
                    name="goalType"
                    render={({ field }) => (
                         <FormItem className="p-0">
                            <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="book">Kitap Okuma</TabsTrigger>
                                    <TabsTrigger value="video">Video İzleme</TabsTrigger>
                                </TabsList>
                            </Tabs>
                         </FormItem>
                    )}
                 />

                 <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl><Input placeholder={goalType === 'book' ? "Okunacak kitabın adı..." : "İzlenecek oynatma listesi..."} {...field} /></FormControl>
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

                {goalType === 'video' && (
                     <FormField
                        control={form.control}
                        name="videoUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>YouTube Playlist URL</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="https://www.youtube.com/playlist?list=..." {...field} className="pl-10" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <Card className="p-4 bg-muted/50">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-lg">Hedef Yapılandırması</CardTitle>
                        <CardDescription>Hedefini otomatik olarak bölümlere ayırmak için bu alanları doldur.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="totalUnits" render={({ field }) => (
                                <FormItem><FormLabel>Toplam Birim</FormLabel><FormControl><Input type="number" placeholder={goalType === 'book' ? "300" : "25"} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="unitName" render={({ field }) => (
                                <FormItem><FormLabel>Birim Adı</FormLabel><FormControl><Input placeholder={goalType === 'book' ? "sayfa" : "video"} {...field} disabled={goalType === 'video'} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        {goalType === 'book' && (
                             <FormField control={form.control} name="sectionCount" render={({ field }) => (
                                <FormItem><FormLabel>Bölüm Sayısı</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        )}
                    </CardContent>
                </Card>

                {goalType === 'book' && (
                    <div className="space-y-4">
                        <FormLabel>Bölümleri Özelleştir</FormLabel>
                        {fields.map((sectionField, sectionIndex) => {
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
                                </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </ScrollArea>
        <div className="pt-4 border-t">
            <Button type="submit" className="w-full">{initialData ? "Değişiklikleri Kaydet" : "Yol Haritasını Oluştur"}</Button>
        </div>
      </form>
    </Form>
  );
}
