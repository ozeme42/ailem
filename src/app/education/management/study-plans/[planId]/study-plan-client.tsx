
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Edit, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onStudyPlanUpdate, addStudyAssignment } from "@/lib/dataService";
import type { StudyPlan, StudyPlanSubject, StudyTopic, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";


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

  if (!plan) return <div>Yükleniyor...</div>;
  
  const totalTopics = plan.subjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={plan.title}>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/education/management/study-plans')} className="bg-white/20 text-white hover:bg-white/30 border-none">
                <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
            </Button>
            <Button onClick={() => setIsAssignDialogOpen(true)} disabled={selectedTopics.length === 0} className="bg-white/20 text-white hover:bg-white/30 border-none">
                <Send className="mr-2 h-4 w-4"/> Seçilenleri Ata ({selectedTopics.length})
            </Button>
        </div>
      </PageHeader>
      
       <Card>
            <CardHeader>
                <CardTitle>Plan Özeti</CardTitle>
                <CardDescription>Bu plan {plan.subjects?.length || 0} dersten ve toplam {totalTopics} konudan oluşmaktadır.</CardDescription>
            </CardHeader>
       </Card>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={(plan.subjects || []).map(s => s.id)}>
        {(plan.subjects || []).map(subject => (
          <AccordionItem key={subject.id} value={subject.id} className="border-b-0">
             <div className="bg-muted/50 rounded-lg">
                <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
                    {subject.name} - ({(subject.topics || []).length} Konu)
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-2">
                    {(subject.topics || []).map(topic => (
                        <div key={topic.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`topic-${topic.id}`}
                              checked={selectedTopics.some(t => t.id === topic.id)}
                              onCheckedChange={() => toggleTopicSelection(topic)}
                            />
                            <label htmlFor={`topic-${topic.id}`} className="font-medium cursor-pointer">{topic.name}</label>
                          </div>
                        </div>
                    ))}
                </AccordionContent>
             </div>
          </AccordionItem>
        ))}
      </Accordion>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Konu Anlatımı Ata</DialogTitle>
                <DialogDescription>{selectedTopics.length} adet konu seçildi.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(assignSelectedTopics)} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label>Öğrenci(ler)</Label>
                    <div className="space-y-2">
                        {students.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`student-${s.id}`}
                                    checked={form.watch('studentIds').includes(s.id)}
                                    onCheckedChange={(checked) => {
                                        const currentIds = form.getValues('studentIds');
                                        const newIds = checked ? [...currentIds, s.id] : currentIds.filter(id => id !== s.id);
                                        form.setValue('studentIds', newIds);
                                    }}
                                />
                                <label htmlFor={`student-${s.id}`}>{s.name}</label>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Çalışma Tarihleri</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch('dateRange').from ? (
                                    form.watch('dateRange').to ? (
                                        <>
                                        {format(form.watch('dateRange').from, "LLL dd, y", { locale: tr })} -{" "}
                                        {format(form.watch('dateRange').to, "LLL dd, y", { locale: tr })}
                                        </>
                                    ) : (
                                        format(form.watch('dateRange').from, "LLL dd, y", { locale: tr })
                                    )
                                ) : <span>Tarih aralığı seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={form.watch('dateRange').from}
                                selected={form.watch('dateRange')}
                                onSelect={(range) => form.setValue('dateRange', range || {from: new Date(), to: new Date()})}
                                numberOfMonths={1}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>İptal</Button>
                    <Button type="submit">Atama Yap</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
