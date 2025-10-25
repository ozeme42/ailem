

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Edit, Trash2, Clock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onStudyPlanUpdate, onStudyAssignmentsUpdate, addStudyAssignment, updateStudyPlan, updateStudyAssignment } from "@/lib/dataService";
import type { StudyPlan, StudyPlanSubject, StudyTopic, FamilyMember, StudyAssignment } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth-provider";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PlanDetailClient() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { toast } = useToast();
  const { familyMembers } = useAuth();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<StudyTopic[]>([]);

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicData, setNewTopicData] = useState<{name: string, sources: string}>({ name: "", sources: ""});
  const [editingSubject, setEditingSubject] = useState<StudyPlanSubject | null>(null);
  
  // Form/Context states
  const [assignFormData, setAssignFormData] = useState<{studentIds: string[], assignedDate: Date, dueDate: Date}>({ studentIds: [], assignedDate: new Date(), dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

  useEffect(() => {
    if (!planId) return;
    const unsubPlan = onStudyPlanUpdate(planId, setPlan);
    const unsubAssignments = onStudyAssignmentsUpdate(setAssignments);
    return () => {
      unsubPlan();
      unsubAssignments();
    };
  }, [planId]);

  const handleAssignSelectedTopics = async () => {
    if (!plan || selectedTopics.length === 0 || assignFormData.studentIds.length === 0) {
        toast({ title: "Eksik Bilgi", description: "Lütfen en az bir konu ve bir öğrenci seçin.", variant: "destructive"});
        return;
    }

    for (const topic of selectedTopics) {
      const subject = plan.subjects.find(s => s.topics.some(t => t.id === topic.id));
      if (!subject) continue;

      for (const studentId of assignFormData.studentIds) {
          const assignmentData: Omit<StudyAssignment, 'id' | 'familyId'> = {
            studentId,
            studyPlanId: plan.id,
            subject: subject.name,
            topic: topic.name,
            topicId: topic.id,
            sources: topic.sources || [],
            status: 'assigned',
            startDate: assignFormData.assignedDate.toISOString(),
            dueDate: assignFormData.dueDate.toISOString(),
          };
      
          await addStudyAssignment(assignmentData);
      }
    }

    toast({title: "Ödevler Atandı!", description: `${selectedTopics.length} konu, ${assignFormData.studentIds.length} öğrenciye başarıyla atandı.`});
    setIsAssignDialogOpen(false);
    setSelectedTopics([]);
    setAssignFormData(prev => ({ ...prev, studentIds: [] })); // Reset student selection
  }

  const handleAddSubject = async () => {
    if (!plan || !newSubjectName.trim()) return;
    const newSubject: StudyPlanSubject = {
        id: Date.now().toString(),
        name: newSubjectName.trim(),
        topics: [],
    };
    try {
        await updateStudyPlan(plan.id, {
            subjects: [newSubject]
        });
        toast({ title: "Ders Eklendi" });
        setNewSubjectName("");
        setIsSubjectDialogOpen(false);
    } catch(e) {
        console.error(e);
        toast({ title: "Hata", description: "Ders eklenirken bir hata oluştu.", variant: "destructive" });
    }
  };
  
  const handleOpenTopicDialog = (subject: StudyPlanSubject) => {
    setEditingSubject(subject);
    setNewTopicData({ name: "", sources: "" });
    setIsTopicDialogOpen(true);
  };
  
  const handleAddTopic = async () => {
    if (!plan || !editingSubject || !newTopicData.name.trim()) return;
    const newTopic: StudyTopic = {
        id: Date.now().toString(),
        name: newTopicData.name.trim(),
        sources: newTopicData.sources.split('\n').filter(s => s.trim() !== ''),
    };

    const updatedSubjects = plan.subjects.map(subject => {
        if (subject.id === editingSubject.id) {
            return {
                ...subject,
                topics: [...(subject.topics || []), newTopic]
            };
        }
        return subject;
    });
    
    try {
        await updateStudyPlan(plan.id, { subjects: updatedSubjects });
        toast({ title: "Konu Eklendi" });
        setIsTopicDialogOpen(false);
        setEditingSubject(null);
    } catch(e) {
        console.error(e);
        toast({ title: "Hata", description: "Konu eklenirken bir hata oluştu.", variant: "destructive" });
    }
  };


  const toggleTopicSelection = (topic: StudyTopic) => {
      setSelectedTopics(prev => 
        prev.some(t => t.id === topic.id) 
          ? prev.filter(t => t.id !== topic.id) 
          : [...prev, topic]
      );
  };
  
  const handleToggleAssignmentStatus = async (assignment: StudyAssignment) => {
    const newStatus = assignment.status === 'completed' ? 'assigned' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : undefined;
    try {
      await updateStudyAssignment(assignment.id, { status: newStatus, completedAt });
      toast({ title: `Görev ${newStatus === 'completed' ? 'tamamlandı' : 'geri alındı'}` });
    } catch (error) {
      toast({ title: 'Hata', description: 'Görev durumu güncellenemedi', variant: 'destructive' });
    }
  }

  if (!plan) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={plan.title}>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/education/management/study-plans')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
            </Button>
            <Button variant="outline" onClick={() => setIsSubjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Ders Ekle
            </Button>
            <Button onClick={() => { if(selectedTopics.length > 0) setIsAssignDialogOpen(true) }} disabled={selectedTopics.length === 0}>
                <Send className="mr-2 h-4 w-4"/> Seçilenleri Ata ({selectedTopics.length})
            </Button>
        </div>
      </PageHeader>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={(plan.subjects || []).map(s => s.id)}>
        {(plan.subjects || []).map(subject => (
          <AccordionItem key={subject.id} value={subject.id} className="border-b-0">
             <div className="bg-muted/50 rounded-lg">
                <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
                    {subject.name}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-3">
                    <Button variant="outline" size="sm" onClick={() => handleOpenTopicDialog(subject)}>
                        <Plus className="mr-2 h-4 w-4" /> Konu Ekle
                    </Button>
                    {(subject.topics || []).map(topic => {
                        const topicAssignments = assignments.filter(a => a.topicId === topic.id);
                        return (
                            <div key={topic.id} className="p-3 border bg-background rounded-md">
                                <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id={`topic-${topic.id}`}
                                        checked={selectedTopics.some(t => t.id === topic.id)}
                                        onCheckedChange={() => toggleTopicSelection(topic)}
                                    />
                                    <label htmlFor={`topic-${topic.id}`} className="font-medium cursor-pointer">{topic.name}</label>
                                </div>
                                {/* Add Edit/Delete for topic here later */}
                                </div>
                                {topicAssignments.length > 0 && (
                                    <div className="pl-8 mt-3 space-y-2">
                                        <h4 className="text-sm font-semibold text-muted-foreground">Atanan Öğrenciler:</h4>
                                        {topicAssignments.map(assignment => {
                                            const student = familyMembers.find(m => m.id === assignment.studentId);
                                            return (
                                                <div key={assignment.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full" style={{backgroundColor: student?.color || '#ccc'}}></div>
                                                        <span>{student?.name}</span>
                                                    </div>
                                                    <div className='flex items-center gap-3'>
                                                         <span className='text-xs text-muted-foreground flex items-center gap-1'><Clock className='h-3 w-3'/> {format(parseISO(assignment.dueDate), 'dd MMM', {locale: tr})}</span>
                                                        <Button size="sm" variant={assignment.status === 'completed' ? 'default' : 'secondary'} className="h-7" onClick={() => handleToggleAssignmentStatus(assignment)}>
                                                            {assignment.status === 'completed' ? <Check className='h-4 w-4'/> : <Clock className='h-4 w-4'/>}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </AccordionContent>
             </div>
          </AccordionItem>
        ))}
      </Accordion>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => { if (!open) setSelectedTopics([]); setIsAssignDialogOpen(open)}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Konu Anlatımı Ata</DialogTitle>
                <DialogDescription>{selectedTopics.length} adet konu seçildi.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Öğrenci(ler)</Label>
                    <div className="space-y-2">
                        {familyMembers.filter(m => m.role.includes("Çocuk")).map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`student-${s.id}`}
                                    checked={assignFormData.studentIds.includes(s.id)}
                                    onCheckedChange={(checked) => {
                                        setAssignFormData(prev => ({
                                            ...prev,
                                            studentIds: checked
                                                ? [...prev.studentIds, s.id]
                                                : prev.studentIds.filter(id => id !== s.id)
                                        }));
                                    }}
                                />
                                <label htmlFor={`student-${s.id}`}>{s.name}</label>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Başlangıç Tarihi</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !assignFormData.assignedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{assignFormData.assignedDate ? format(assignFormData.assignedDate, "PPP", { locale: tr }) : <span>Tarih seç</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignFormData.assignedDate} onSelect={(d) => setAssignFormData(prev => ({...prev, assignedDate: d || new Date()}))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Bitiş Tarihi</Label>
                         <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !assignFormData.dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{assignFormData.dueDate ? format(assignFormData.dueDate, "PPP", { locale: tr }) : <span>Tarih seç</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignFormData.dueDate} onSelect={(d) => setAssignFormData(prev => ({...prev, dueDate: d || new Date()}))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
             <DialogFooter>
             <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>İptal</Button>
             <Button onClick={handleAssignSelectedTopics}>Ödevleri Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Ders Ekle</DialogTitle>
              <DialogDescription>Plana yeni bir ders ekleyin.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="new-subject-name">Ders Adı</Label>
                <Input 
                    id="new-subject-name" 
                    value={newSubjectName} 
                    onChange={e => setNewSubjectName(e.target.value)} 
                    placeholder="Ders Adı (örn: Türkçe)" 
                />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsSubjectDialogOpen(false)}>İptal</Button>
              <Button onClick={handleAddSubject}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
       <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Konu Ekle</DialogTitle>
              <DialogDescription>Ders: {editingSubject?.name}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="new-topic-name">Konu Adı</Label>
                    <Input 
                        id="new-topic-name" 
                        value={newTopicData.name} 
                        onChange={e => setNewTopicData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Konu adı (örn: Cümlenin Öğeleri)" 
                    />
                </div>
                <div>
                    <Label htmlFor="new-topic-sources">Kaynak Linkleri (Her satıra bir link)</Label>
                    <Textarea 
                        id="new-topic-sources" 
                        value={newTopicData.sources} 
                        onChange={e => setNewTopicData(prev => ({ ...prev, sources: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=...&#10;https://www.derslinki.com/..." 
                    />
                </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsTopicDialogOpen(false)}>İptal</Button>
              <Button onClick={handleAddTopic}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
