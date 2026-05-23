"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Calendar as CalendarIcon, BookHeart, FileText, CheckCircle, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onStudyPlanUpdate, addStudyAssignment } from "@/lib/dataService";
import type { StudyPlan, StudyTopic, StudyAssignment } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth-provider";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { useForm, FormProvider } from 'react-hook-form';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

const assignSchema = z.object({
  studentIds: z.array(z.string()).min(1, "En az bir öğrenci seçmelisiniz."),
  dateRange: z.object({
      from: z.date(),
      to: z.date(),
  }),
});
type AssignFormData = z.infer<typeof assignSchema>;

export function StudyPlanClient() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { toast } = useToast();
  const { familyMembers } = useAuth();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<StudyTopic[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const students = familyMembers.filter(m => m.role.includes("Çocuk"));
  
  const form = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      studentIds: [],
      dateRange: { from: new Date(), to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    },
  });

  useEffect(() => {
    if (!planId) return;
    const unsub = onStudyPlanUpdate(planId, setPlan);
    return () => unsub();
  }, [planId]);

  const toggleTopicSelection = (topic: StudyTopic) => {
    setSelectedTopics(prev =>
      prev.some(t => t.id === topic.id)
        ? prev.filter(t => t.id !== topic.id)
        : [...prev, topic]
    );
  };
  
  const assignSelectedTopics = async (data: AssignFormData) => {
    if (!plan || selectedTopics.length === 0 || data.studentIds.length === 0) {
      toast({ title: "Eksik Bilgi", description: "Lütfen en az bir konu ve bir öğrenci seçin.", variant: "destructive" });
      return;
    }
    
    let assignedCount = 0;
    for (const topic of selectedTopics) {
      const subject = plan.subjects.find(s => s.topics.some(t => t.id === topic.id));
      if (!subject) continue;

      for (const studentId of data.studentIds) {
        const assignmentData: Omit<StudyAssignment, 'id' | 'familyId' | 'status'> = {
          studentId: studentId,
          studyPlanId: plan.id,
          subject: subject.name,
          topic: topic.name,
          topicId: topic.id!,
          sources: topic.sources || [],
          startDate: data.dateRange.from.toISOString(),
          dueDate: data.dateRange.to.toISOString(),
        };
        await addStudyAssignment(assignmentData);
        assignedCount++;
      }
    }
    
    toast({ title: "Atama Başarılı!", description: `${selectedTopics.length} konu, ${data.studentIds.length} öğrenciye atandı.` });
    setIsAssignDialogOpen(false);
    setSelectedTopics([]);
    form.reset();
  };

  if (!plan) return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
  );
  
  const totalTopics = plan.subjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-rose-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-4xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                     <Button 
                        onClick={() => router.push('/education/management/study-plans')} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-pink-500 to-rose-600", glassColors.ICON_BOX)}>
                         <BookHeart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none truncate max-w-[200px] sm:max-w-md">
                            {plan.title}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Plan Detayları</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsAssignDialogOpen(true)} disabled={selectedTopics.length === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/20">
                        <Send className="mr-1.5 h-4 w-4"/> <span className="hidden sm:inline">Seçilenleri Ata ({selectedTopics.length})</span>
                    </Button>
                </div>
            </div>
        </div>
      
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
          
        <div className={cn("rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5", glassColors.CARD_BG)}>
             <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold text-slate-200">Plan Özeti</h2>
                <p className="text-slate-400 text-sm">Toplam ders ve konu dağılımı.</p>
            </div>
            <div className="flex gap-8">
                <div className="text-center">
                    <p className="text-3xl font-black text-white">{plan.subjects?.length || 0}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Ders</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-pink-400">{totalTopics}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Konu</p>
                </div>
            </div>
        </div>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={(plan.subjects || []).map(s => s.id)}>
        {(plan.subjects || []).map(subject => (
          <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-2xl overflow-hidden bg-white/5 border border-white/5">
              <div className="flex items-center justify-between bg-slate-900/30">
                <AccordionTrigger className="p-4 hover:no-underline flex gap-3 text-slate-200 hover:text-white transition-colors w-full">
                    <span className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-pink-400"/> {subject.name}</span>
                    <span className="text-xs font-normal text-slate-500 ml-auto mr-4">{(subject.topics || []).length} Konu</span>
                </AccordionTrigger>
              </div>
               <AccordionContent className="p-0 border-t border-white/5 bg-black/20">
                   <div className="p-2 space-y-1">
                    {(subject.topics || []).map(topic => (
                        <div key={topic.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => toggleTopicSelection(topic)}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`topic-${topic.id}`}
                              checked={selectedTopics.some(t => t.id === topic.id)}
                              onCheckedChange={() => toggleTopicSelection(topic)}
                              className="border-white/30 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                            />
                            <label htmlFor={`topic-${topic.id}`} className="font-medium text-slate-300 cursor-pointer group-hover:text-white transition-colors">{topic.name}</label>
                          </div>
                           <CheckCircle className={cn("w-4 h-4 transition-all", selectedTopics.some(t => t.id === topic.id) ? "text-pink-500 opacity-100" : "text-slate-600 opacity-0 group-hover:opacity-50")} />
                        </div>
                    ))}
                    {(subject.topics || []).length === 0 && (
                        <p className="text-center text-slate-500 py-4 italic text-sm">Bu derste henüz konu yok.</p>
                    )}
                   </div>
               </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
        {/* Empty State */}
        {(plan.subjects || []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-200">Konu Yok</h3>
                    <p className="text-slate-400 mt-1 text-sm">Bu plana henüz hiç ders veya konu eklenmemiş.</p>
                </div>
            </div>
        )}
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">Konu Anlatımı Ata</DialogTitle>
                <DialogDescription className="text-slate-400">{selectedTopics.length} adet konu seçildi.</DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(assignSelectedTopics)} className="space-y-6 pt-2">
                <FormField
                    control={form.control}
                    name="studentIds"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-slate-300 uppercase">Öğrenci(ler)</FormLabel>
                            <div className="space-y-2 p-3 bg-black/20 rounded-xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                                {students.map((student) => (
                                    <FormField
                                        key={student.id}
                                        control={form.control}
                                        name="studentIds"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(student.id)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                            ? field.onChange([...(field.value || []), student.id])
                                                            : field.onChange(field.value?.filter((value) => value !== student.id));
                                                        }}
                                                        className="border-white/30 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-medium text-slate-200 cursor-pointer w-full text-sm font-normal">
                                                    {student.name}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="dateRange.from"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <Label className="text-xs font-semibold text-slate-300 uppercase mb-2">Başlangıç</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-white/10 bg-white/5 hover:bg-white/10 hover:text-white")}><CalendarIcon className="mr-2 h-4 w-4" />{format(form.watch('dateRange.from'), "d MMM yyyy", { locale: tr })}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100"><Calendar mode="single" selected={form.watch('dateRange.from')} onSelect={(d) => form.setValue('dateRange.from', d || new Date())} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent>
                                </Popover>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dateRange.to"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <Label className="text-xs font-semibold text-slate-300 uppercase mb-2">Bitiş</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-white/10 bg-white/5 hover:bg-white/10 hover:text-white")}><CalendarIcon className="mr-2 h-4 w-4" />{format(form.watch('dateRange.to'), "d MMM yyyy", { locale: tr })}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100"><Calendar mode="single" selected={form.watch('dateRange.to')} onSelect={(d) => form.setValue('dateRange.to', d || new Date())} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent>
                                </Popover>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAssignDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">Ata</Button>
                </div>
            </form>
            </FormProvider>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
