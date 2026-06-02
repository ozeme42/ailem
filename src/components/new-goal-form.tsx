"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyMember, Goal, GoalSection } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Trash2, Youtube, BookOpen, Layers, User, Edit3, Type, X, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { DialogFooter } from "./ui/dialog";

// --- DESIGN SYSTEM ---
const appColors = {
    inputBg: "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:border-indigo-500/50 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500",
    cardBg: "bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm",
    tabList: "bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 p-1",
    tabTrigger: "data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
    label: "text-slate-700 dark:text-slate-300 font-bold",
    icon: "text-slate-400 dark:text-slate-500",
};

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
  formId: string;
};

export function NewGoalForm({ familyMembers, onCreate, initialData, formId }: NewGoalFormProps) {
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
  const goalTitle = form.watch('title');

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
            goalType: initialData.platform === 'YouTube' ? 'video' : 'book',
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
        if(goalType === 'video'){
            return { title: goalTitle || 'Video Listesi' };
        }
        return currentSections[i] || { title: `Bölüm ${i + 1}` };
    });
    replace(newSections);
  }, [sectionCount, replace, form, goalType, goalTitle]);

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
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 w-full">
              <div className="px-4 md:px-8 py-6 space-y-8">
                  {/* Type Selection */}
                  <FormField
                      control={form.control}
                      name="goalType"
                      render={({ field }) => (
                          <FormItem>
                              <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                                  <TabsList className={cn("grid w-full grid-cols-2 rounded-2xl h-14", appColors.tabList)}>
                                      <TabsTrigger value="book" className={cn("rounded-xl h-12 transition-all text-sm font-bold", appColors.tabTrigger)}>
                                          <BookOpen className="w-5 h-5 mr-2" /> Kitap
                                      </TabsTrigger>
                                      <TabsTrigger value="video" className={cn("rounded-xl h-12 transition-all text-sm font-bold", appColors.tabTrigger)}>
                                          <Youtube className="w-5 h-5 mr-2" /> Video
                                      </TabsTrigger>
                                  </TabsList>
                              </Tabs>
                          </FormItem>
                      )}
                  />

                  {/* Basic Info */}
                  <div className="space-y-5">
                      <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel className={appColors.label}>Başlık</FormLabel>
                                  <FormControl>
                                      <div className="relative">
                                          <Type className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5", appColors.icon)} />
                                          <Input placeholder={goalType === 'book' ? "Kitap adı..." : "Playlist adı..."} {...field} className={cn("pl-12 h-14 rounded-2xl text-base font-medium", appColors.inputBg)} />
                                      </div>
                                  </FormControl>
                                  <FormMessage className="text-rose-500" />
                              </FormItem>
                          )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                              control={form.control}
                              name="assigneeId"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel className={appColors.label}>Sorumlu Kişi</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                          <SelectTrigger className={cn("h-14 pl-4 rounded-2xl text-base font-medium", appColors.inputBg)}>
                                              <div className="flex items-center gap-3">
                                                  <User className={cn("h-5 w-5", appColors.icon)} />
                                                  <SelectValue placeholder="Seçiniz" />
                                              </div>
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-2xl">
                                          {familyMembers.map((member) => (
                                              <SelectItem key={member.id} value={member.id} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10 rounded-xl py-2.5 px-3 m-1 font-medium">
                                                  {member.name}
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage className="text-rose-500" />
                                  </FormItem>
                              )}
                          />
                          
                          {goalType === 'video' ? (
                              <FormField
                                  control={form.control}
                                  name="videoUrl"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel className={appColors.label}>Video Linki</FormLabel>
                                          <FormControl>
                                              <div className="relative">
                                                  <Youtube className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5", appColors.icon)} />
                                                  <Input placeholder="youtube.com/..." {...field} className={cn("pl-12 h-14 rounded-2xl text-base font-medium", appColors.inputBg)} />
                                              </div>
                                          </FormControl>
                                          <FormMessage className="text-rose-500" />
                                      </FormItem>
                                  )}
                              />
                          ) : (
                              <FormField
                                  control={form.control}
                                  name="description"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel className={appColors.label}>Açıklama</FormLabel>
                                      <FormControl>
                                          <div className="relative">
                                              <Edit3 className={cn("absolute left-4 top-4 h-5 w-5", appColors.icon)} />
                                              <Textarea placeholder="Kısa not..." {...field} className={cn("pl-12 min-h-[56px] h-14 py-4 rounded-2xl resize-none text-base font-medium", appColors.inputBg)} />
                                          </div>
                                      </FormControl>
                                      <FormMessage className="text-rose-500" />
                                      </FormItem>
                                  )}
                              />
                          )}
                      </div>
                  </div>

                  {/* Configuration Card */}
                  <Card className={cn("rounded-2xl overflow-hidden", appColors.cardBg)}>
                      <CardHeader className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/5">
                          <div className="flex items-center gap-2">
                              <Layers className="w-5 h-5 text-indigo-500" />
                              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Yapılandırma</CardTitle>
                          </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-5">
                          <div className="grid grid-cols-2 gap-5">
                              <FormField control={form.control} name="totalUnits" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest block mb-1.5">Miktar</FormLabel>
                                      <FormControl><Input type="number" placeholder="300" {...field} className={cn("h-12 rounded-xl text-center text-lg font-bold", appColors.inputBg)} /></FormControl>
                                      <FormMessage className="text-rose-500" />
                                  </FormItem>
                              )}/>
                              <FormField control={form.control} name="unitName" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest block mb-1.5">Birim</FormLabel>
                                      <FormControl><Input placeholder="sayfa" {...field} disabled={goalType === 'video'} className={cn("h-12 rounded-xl text-center text-base font-bold", appColors.inputBg)} /></FormControl>
                                      <FormMessage className="text-rose-500" />
                                  </FormItem>
                              )}/>
                          </div>
                          {goalType === 'book' && (
                              <FormField control={form.control} name="sectionCount" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest block mb-1.5">Bölüm Sayısı</FormLabel>
                                      <FormControl><Input type="number" {...field} className={cn("h-12 rounded-xl text-base font-bold", appColors.inputBg)} /></FormControl>
                                      <FormMessage className="text-rose-500" />
                                  </FormItem>
                              )}/>
                          )}
                      </CardContent>
                  </Card>

                  {/* Section Customization */}
                  {goalType === 'book' && (
                      <div className="space-y-4 pb-6">
                          <FormLabel className="text-slate-700 dark:text-slate-300 font-bold pl-1 block">Bölüm İsimleri</FormLabel>
                          <div className="grid grid-cols-1 gap-3">
                              {fields.map((sectionField, sectionIndex) => {
                                  return (
                                      <div key={sectionField.id} className="flex items-center gap-3">
                                          <div className="flex-1">
                                              <FormField control={form.control} name={`sections.${sectionIndex}.title`} render={({ field }) => (
                                                  <FormItem>
                                                      <FormControl>
                                                          <Input {...field} className={cn("h-12 rounded-xl text-base font-medium", appColors.inputBg)} placeholder={`Bölüm ${sectionIndex + 1}`} />
                                                      </FormControl>
                                                      <FormMessage className="text-rose-500" />
                                                  </FormItem>
                                              )}/>
                                          </div>
                                          <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl" onClick={() => remove(sectionIndex)}>
                                              <Trash2 className="h-5 w-5"/>
                                          </Button>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  )}
              </div>
          </ScrollArea>
      </form>
    </Form>
  );
}
