
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Edit, Trash2, BookCopy, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onSinglePracticeExamUpdate, addTest, updatePracticeExam } from "@/lib/dataService";
import type { PracticeExam, PracticeExamSubject, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth-provider";
import { AnswerKeyForm } from "@/components/answer-key-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

const subjectSchema = z.object({
  name: z.string().min(2, "Ders adı zorunludur."),
  questionCount: z.coerce.number().min(1, "Soru sayısı en az 1 olmalıdır."),
});
type SubjectFormData = z.infer<typeof subjectSchema>;

export function ExamDetailClient() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const { toast } = useToast();
  const { familyMembers } = useAuth();

  const [exam, setExam] = useState<PracticeExam | null>(null);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<PracticeExamSubject | null>(null);

  useEffect(() => {
    if (!examId) return;
    const unsub = onSinglePracticeExamUpdate(examId, setExam);
    return () => unsub();
  }, [examId]);

  const handleSubjectSave = async (data: SubjectFormData) => {
    if (!exam) return;
    const subjects = exam.subjects || [];
    const newSubject: PracticeExamSubject = {
      id: Date.now().toString(),
      name: data.name,
      questionCount: data.questionCount,
      answerKey: {},
    };
    await updatePracticeExam(exam.id, { subjects: [...subjects, newSubject] });
    toast({ title: "Ders Eklendi" });
    setIsSubjectDialogOpen(false);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!exam) return;
    const updatedSubjects = (exam.subjects || []).filter(s => s.id !== subjectId);
    await updatePracticeExam(exam.id, { subjects: updatedSubjects });
    toast({ title: "Ders Silindi", variant: "destructive" });
  };
  
  const handleAnswerKeySave = async (subjectId: string, newAnswerKey: { [key: string]: string }) => {
    if (!exam) return;
    const updatedSubjects = (exam.subjects || []).map(s => 
      s.id === subjectId ? { ...s, answerKey: newAnswerKey } : s
    );
    await updatePracticeExam(exam.id, { subjects: updatedSubjects });
    setIsAnswerKeyDialogOpen(false);
    setCurrentSubject(null);
  };


  if (!exam) return <div>Yükleniyor...</div>;
  
  const totalQuestions = (exam.subjects || []).reduce((acc, s) => acc + s.questionCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={exam.name}>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/education/management/practice-exams')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
            </Button>
            <Button onClick={() => setIsSubjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Ders Ekle
            </Button>
            <Button onClick={() => setIsAssignDialogOpen(true)} disabled={totalQuestions === 0}>
                <Send className="mr-2 h-4 w-4"/> Ödev Ata
            </Button>
        </div>
      </PageHeader>
      
       <Card>
            <CardHeader>
                <CardTitle>Deneme Özeti</CardTitle>
                <CardDescription>Bu deneme {exam.subjects?.length || 0} dersten ve toplam {totalQuestions} sorudan oluşmaktadır.</CardDescription>
            </CardHeader>
       </Card>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={(exam.subjects || []).map(s => s.id)}>
        {(exam.subjects || []).map(subject => (
          <AccordionItem key={subject.id} value={subject.id} className="border-b-0">
             <div className="bg-muted/50 rounded-lg">
                <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
                    {subject.name} - ({subject.questionCount} Soru)
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-3">
                   <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setCurrentSubject(subject); setIsAnswerKeyDialogOpen(true); }}>
                           <BookCopy className="mr-2 h-4 w-4" /> Cevap Anahtarı
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Dersi Sil</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>"{subject.name}" dersini bu denemeden kaldırmak istediğinizden emin misiniz?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)}>Evet, Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                   </div>
                </AccordionContent>
             </div>
          </AccordionItem>
        ))}
      </Accordion>

      <SubjectFormDialog 
        isOpen={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        onSave={handleSubjectSave}
      />
      
      {currentSubject && (
          <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
              <DialogContent className="max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>{currentSubject.name} - Cevap Anahtarı</DialogTitle>
                      <DialogDescription>Toplam {currentSubject.questionCount} soru için cevapları girin.</DialogDescription>
                  </DialogHeader>
                  <AnswerKeyForm 
                    totalQuestions={currentSubject.questionCount} 
                    answerKey={currentSubject.answerKey || {}}
                    onSave={(newKey) => handleAnswerKeySave(currentSubject.id, newKey)}
                  />
              </DialogContent>
          </Dialog>
      )}

      <AssignExamForm 
        isOpen={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        exam={exam}
        students={familyMembers.filter(m => m.role.includes("Çocuk"))}
      />
    </div>
  );
}


function SubjectFormDialog({ isOpen, onOpenChange, onSave }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (data: SubjectFormData) => void}) {
    const form = useForm<SubjectFormData>({
        resolver: zodResolver(subjectSchema),
        defaultValues: { name: "", questionCount: 20 },
    });
    
    const onSubmit = (data: SubjectFormData) => {
        onSave(data);
        form.reset();
    }

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Ders Ekle</DialogTitle>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Input {...form.register("name")} placeholder="Ders adı (örn: Matematik)" />
                        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        
                        <Input type="number" {...form.register("questionCount")} placeholder="Soru Sayısı" />
                        {form.formState.errors.questionCount && <p className="text-sm text-destructive">{form.formState.errors.questionCount.message}</p>}

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit">Ekle</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    )
}

const assignSchema = z.object({
  studentIds: z.array(z.string()).min(1, "En az bir öğrenci seçmelisiniz."),
  assignedDate: z.date(),
  dueDate: z.date(),
});
type AssignFormData = z.infer<typeof assignSchema>;

function AssignExamForm({ isOpen, onOpenChange, exam, students }: {isOpen: boolean, onOpenChange: (open: boolean) => void, exam: PracticeExam, students: FamilyMember[]}) {
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<AssignFormData>({
        resolver: zodResolver(assignSchema),
        defaultValues: { studentIds: [], assignedDate: new Date(), dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)},
    });

    const onSubmit = async (data: AssignFormData) => {
        const questionCount = (exam.subjects || []).reduce((acc, s) => acc + s.questionCount, 0);
        
        let combinedAnswerKey: { [key: string]: string } = {};
        let questionOffset = 0;
        (exam.subjects || []).forEach(subject => {
            Object.entries(subject.answerKey || {}).forEach(([qNum, answer]) => {
                const newQNum = parseInt(qNum) + questionOffset;
                combinedAnswerKey[newQNum.toString()] = answer;
            });
            questionOffset += subject.questionCount;
        });

        for (const studentId of data.studentIds) {
            await addTest({
                title: exam.name,
                subject: 'Genel Deneme Sınavları',
                studentId: studentId,
                questionCount: questionCount,
                assignedDate: format(data.assignedDate, 'dd MMMM yyyy', { locale: tr }),
                dueDate: format(data.dueDate, 'dd MMMM yyyy', { locale: tr }),
                sourceType: 'exam',
                sourceId: exam.id,
                gradingType: 'auto',
                answerKey: combinedAnswerKey,
            });
        }
        toast({ title: "Ödev Atandı!", description: `${exam.name} denemesi ${data.studentIds.length} öğrenciye atandı.`});
        onOpenChange(false);
        router.push('/education/management/practice-exams');
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>{exam.name} Ata</DialogTitle>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <div className="space-y-2">
                            <Label>Öğrenci(ler)</Label>
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
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Başlangıç Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal")}><CalendarIcon className="mr-2 h-4 w-4" />{format(form.watch('assignedDate'), "PPP", { locale: tr })}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.watch('assignedDate')} onSelect={(d) => form.setValue('assignedDate', d || new Date())} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Bitiş Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal")}><CalendarIcon className="mr-2 h-4 w-4" />{format(form.watch('dueDate'), "PPP", { locale: tr })}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.watch('dueDate')} onSelect={(d) => form.setValue('dueDate', d || new Date())} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>

                         <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit">Ödevi Ata</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    )
}
