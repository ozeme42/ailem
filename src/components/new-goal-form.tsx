
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
const glassColors = {
    INPUT_BG: "bg-slate-950/50 border-white/10 text-slate-100 focus:border-indigo-500/50 focus:ring-indigo-500/20 placeholder:text-slate-500",
    CARD_BG: "bg-white/5 border border-white/10",
    TAB_LIST: "bg-slate-950/50 border border-white/10 p-1",
    TAB_TRIGGER: "data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200",
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
              <div className="px-4 md:px-6 py-4 space-y-6">
                  {/* Type Selection */}
                  <FormField
                      control={form.control}
                      name="goalType"
                      render={({ field }) => (
                          <FormItem>
                              <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                                  <TabsList className={cn("grid w-full grid-cols-2 rounded-xl h-12", glassColors.TAB_LIST)}>
                                      <TabsTrigger value="book" className={cn("rounded-lg h-10 transition-all", glassColors.TAB_TRIGGER)}>
                                          <BookOpen className="w-4 h-4 mr-2" /> Kitap
                                      </TabsTrigger>
                                      <TabsTrigger value="video" className={cn("rounded-lg h-10 transition-all", glassColors.TAB_TRIGGER)}>
                                          <Youtube className="w-4 h-4 mr-2" /> Video
                                      </TabsTrigger>
                                  </TabsList>
                              </Tabs>
                          </FormItem>
                      )}
                  />

                  {/* Basic Info */}
                  <div className="space-y-4">
                      <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-slate-300">Başlık</FormLabel>
                                  <FormControl>
                                      <div className="relative">
                                          <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                          <Input placeholder={goalType === 'book' ? "Kitap adı..." : "Playlist adı..."} {...field} className={cn("pl-10 h-11 rounded-xl", glassColors.INPUT_BG)} />
                                      </div>
                                  </FormControl>
                                  <FormMessage className="text-rose-400" />
                              </FormItem>
                          )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                              control={form.control}
                              name="assigneeId"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel className="text-slate-300">Sorumlu Kişi</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                          <SelectTrigger className={cn("h-11 rounded-xl", glassColors.INPUT_BG)}>
                                              <div className="flex items-center gap-2">
                                                  <User className="h-4 w-4 text-slate-500" />
                                                  <SelectValue placeholder="Seçiniz" />
                                              </div>
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                                          {familyMembers.map((member) => (
                                              <SelectItem key={member.id} value={member.id} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white">
                                                  {member.name}
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage className="text-rose-400" />
                                  </FormItem>
                              )}
                          />
                          
                          {goalType === 'video' ? (
                              <FormField
                                  control={form.control}
                                  name="videoUrl"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel className="text-slate-300">Video Linki</FormLabel>
                                          <FormControl>
                                              <div className="relative">
                                                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                  <Input placeholder="youtube.com/..." {...field} className={cn("pl-10 h-11 rounded-xl", glassColors.INPUT_BG)} />
                                              </div>
                                          </FormControl>
                                          <FormMessage className="text-rose-400" />
                                      </FormItem>
                                  )}
                              />
                          ) : (
                              <FormField
                                  control={form.control}
                                  name="description"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel className="text-slate-300">Açıklama</FormLabel>
                                      <FormControl>
                                          <div className="relative">
                                              <Edit3 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                              <Textarea placeholder="Kısa not..." {...field} className={cn("pl-10 min-h-[44px] h-11 py-2.5 rounded-xl resize-none", glassColors.INPUT_BG)} />
                                          </div>
                                      </FormControl>
                                      <FormMessage className="text-rose-400" />
                                      </FormItem>
                                  )}
                              />
                          )}
                      </div>
                  </div>

                  {/* Configuration Card */}
                  <Card className={cn("rounded-2xl overflow-hidden", glassColors.CARD_BG)}>
                      <CardHeader className="px-5 py-4 border-b border-white/5 bg-white/5">
                          <div className="flex items-center gap-2">
                              <Layers className="w-5 h-5 text-indigo-400" />
                              <CardTitle className="text-base text-slate-200">Yapılandırma</CardTitle>
                          </div>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="totalUnits" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-slate-400 text-xs uppercase font-bold tracking-wider">Miktar</FormLabel>
                                      <FormControl><Input type="number" placeholder="300" {...field} className={glassColors.INPUT_BG} /></FormControl>
                                      <FormMessage className="text-rose-400" />
                                  </FormItem>
                              )}/>
                              <FormField control={form.control} name="unitName" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-slate-400 text-xs uppercase font-bold tracking-wider">Birim</FormLabel>
                                      <FormControl><Input placeholder="sayfa" {...field} disabled={goalType === 'video'} className={glassColors.INPUT_BG} /></FormControl>
                                      <FormMessage className="text-rose-400" />
                                  </FormItem>
                              )}/>
                          </div>
                          {goalType === 'book' && (
                              <FormField control={form.control} name="sectionCount" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-slate-400 text-xs uppercase font-bold tracking-wider">Bölüm Sayısı</FormLabel>
                                      <FormControl><Input type="number" {...field} className={glassColors.INPUT_BG} /></FormControl>
                                      <FormMessage className="text-rose-400" />
                                  </FormItem>
                              )}/>
                          )}
                      </CardContent>
                  </Card>

                  {/* Section Customization */}
                  {goalType === 'book' && (
                      <div className="space-y-3 pb-6">
                          <FormLabel className="text-slate-300 pl-1 block">Bölüm İsimleri</FormLabel>
                          <div className="grid grid-cols-1 gap-3">
                              {fields.map((sectionField, sectionIndex) => {
                                  return (
                                      <div key={sectionField.id} className="flex items-center gap-2">
                                          <div className="flex-1">
                                              <FormField control={form.control} name={`sections.${sectionIndex}.title`} render={({ field }) => (
                                                  <FormItem>
                                                      <FormControl>
                                                          <Input {...field} className={cn("h-10 rounded-lg", glassColors.INPUT_BG)} placeholder={`Bölüm ${sectionIndex + 1}`} />
                                                      </FormControl>
                                                      <FormMessage className="text-rose-400" />
                                                  </FormItem>
                                              )}/>
                                          </div>
                                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg" onClick={() => remove(sectionIndex)}>
                                              <Trash2 className="h-4 w-4"/>
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
