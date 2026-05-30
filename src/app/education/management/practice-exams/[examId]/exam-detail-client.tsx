
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Edit, Trash2, BookCopy, Calendar as CalendarIcon, ClipboardList, BookOpen, CheckSquare, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onSinglePracticeExamUpdate, addTest, updatePracticeExam, onSubjectsUpdate, updateSubjects } from "@/lib/dataService";
import type { PracticeExam, PracticeExamSubject, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

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
  
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (!examId) return;
    const unsub = onSinglePracticeExamUpdate(examId, setExam);
    const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
    return () => {
        unsub();
        unsubSubjects();
    };
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

  const handleSubjectCreate = async (name: string) => {
    const newSubjects = [...new Set([...availableSubjects, name])];
    await updateSubjects(newSubjects);
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


  if (!exam) return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
  );
  
  const totalQuestions = (exam.subjects || []).reduce((acc, s) => acc + s.questionCount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-orange-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-4xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => router.push('/education/management/practice-exams')} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-amber-500 to-orange-600", glassColors.ICON_BOX)}>
                         <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none truncate max-w-[200px] sm:max-w-md">
                            {exam.name}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Deneme Yönetimi</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsSubjectDialogOpen(true)} className={glassColors.BUTTON_GLASS}>
                        <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Ders Ekle</span>
                    </Button>
                    <Button onClick={() => setIsAssignDialogOpen(true)} disabled={totalQuestions === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/20">
                        <Send className="mr-1.5 h-4 w-4"/> <span className="hidden sm:inline">Ata</span>
                    </Button>
                </div>
            </div>
        </div>
      
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
          
        <div className={cn("rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5", glassColors.CARD_BG)}>
            <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold text-slate-200">Deneme Özeti</h2>
                <p className="text-slate-400 text-sm">Toplam soru ve ders dağılımı.</p>
            </div>
            <div className="flex gap-8">
                <div className="text-center">
                    <p className="text-3xl font-black text-white">{exam.subjects?.length || 0}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Ders</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-amber-400">{totalQuestions}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Soru</p>
                </div>
            </div>
        </div>

      <Accordion type="multiple" className="w-full space-y-4">
        {(exam.subjects || []).map(subject => (
          <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-2xl overflow-hidden bg-white/5 border border-white/5">
              <div className="flex items-center justify-between pr-4 bg-slate-900/30">
                <AccordionTrigger className="p-4 hover:no-underline flex gap-3 text-slate-200 hover:text-white transition-colors">
                    <span className="font-bold text-lg">{subject.name}</span>
                    <Badge variant="secondary" className="bg-white/10 text-slate-300 font-mono">{subject.questionCount} Soru</Badge>
                </AccordionTrigger>
                
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs border-white/10 hover:bg-white/10 text-slate-300" onClick={(e) => { e.stopPropagation(); setCurrentSubject(subject); setIsAnswerKeyDialogOpen(true); }}>
                       <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Cevap Anahtarı
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">"{subject.name}" dersini bu denemeden kaldırmak istediğinizden emin misiniz?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
              </div>
               <AccordionContent className="p-0 border-t border-white/5 bg-black/20">
                   <div className="p-4 flex gap-4 overflow-x-auto custom-scrollbar">
                       {/* Quick preview of answer key if exists */}
                       {subject.answerKey && Object.keys(subject.answerKey).length > 0 ? (
                           <div className="flex gap-2">
                               {Object.entries(subject.answerKey).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).slice(0, 10).map(([q, a]) => (
                                   <div key={q} className="flex flex-col items-center bg-white/5 rounded p-1 min-w-[2rem] border border-white/5">
                                       <span className="text-[10px] text-slate-500 font-bold">{q}</span>
                                       <span className="text-sm font-bold text-emerald-400">{a}</span>
                                   </div>
                               ))}
                               {Object.keys(subject.answerKey).length > 10 && (
                                   <div className="flex items-center justify-center px-2 text-xs text-slate-500 italic">
                                       +{Object.keys(subject.answerKey).length - 10} daha...
                                   </div>
                               )}
                           </div>
                       ) : (
                           <div className="text-sm text-slate-500 italic w-full text-center py-2">Henüz cevap anahtarı girilmemiş.</div>
                       )}
                   </div>
               </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      {/* Empty State */}
        {(exam.subjects || []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-200">Ders Yok</h3>
                    <p className="text-slate-400 mt-1 text-sm">Bu denemeye henüz hiç ders eklenmemiş.</p>
                    <Button variant="link" className="text-indigo-400 mt-2" onClick={() => setIsSubjectDialogOpen(true)}>İlk dersi ekle</Button>
                </div>
            </div>
        )}

      <SubjectFormDialog 
        isOpen={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        onSave={handleSubjectSave}
        availableSubjects={availableSubjects}
        onSubjectCreate={handleSubjectCreate}
      />
      
      {currentSubject && (
          <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
              <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-slate-100 rounded-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-2 bg-white/5 border-b border-white/5">
                      <DialogTitle className="text-xl flex items-center gap-2">
                          <CheckSquare className="w-5 h-5 text-emerald-400"/>
                          {currentSubject.name} - Cevap Anahtarı
                      </DialogTitle>
                      <DialogDescription className="text-slate-400">Toplam {currentSubject.questionCount} soru için cevapları girin.</DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden p-6 pt-2">
                       <AnswerKeyForm 
                        key={currentSubject.id} // Add a key to force re-mount
                        totalQuestions={currentSubject.questionCount} 
                        answerKey={currentSubject.answerKey || {}}
                        onSave={(newKey) => handleAnswerKeySave(currentSubject.id, newKey)}
                      />
                  </div>
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
    </div>
  );
}


function SubjectFormDialog({ 
    isOpen, 
    onOpenChange, 
    onSave,
    availableSubjects,
    onSubjectCreate
}: { 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void, 
    onSave: (data: SubjectFormData) => void,
    availableSubjects: string[],
    onSubjectCreate: (name: string) => void
}) {
    const form = useForm<SubjectFormData>({
        resolver: zodResolver(subjectSchema),
        defaultValues: { name: "", questionCount: 20 },
    });
    
    const onSubmit = (data: SubjectFormData) => {
        onSave(data);
        form.reset();
    }

    const subjectOptions = useMemo(() => availableSubjects.map(s => ({ label: s, value: s })), [availableSubjects]);

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle>Yeni Ders Ekle</DialogTitle>
                    <DialogDescription className="text-slate-400">Deneme sınavına yeni bir ders alanı ekleyin.</DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Ders Seçin</FormLabel>
                                        <FormControl>
                                            <Combobox 
                                                options={subjectOptions}
                                                value={field.value}
                                                onChange={field.onChange}
                                                onCreate={(name) => {
                                                    onSubjectCreate(name);
                                                    field.onChange(name);
                                                }}
                                                placeholder="Ders ara veya yeni oluştur..."
                                                notfoundText="Ders bulunamadı."
                                                createText="Müfredata ekle:"
                                                className={glassColors.INPUT_BG}
                                            />
                                        </FormControl>
                                        {form.formState.errors.name && <p className="text-sm text-rose-400 mt-1">{form.formState.errors.name.message}</p>}
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="questionCount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Soru Sayısı</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="20" className={glassColors.INPUT_BG} {...field} />
                                        </FormControl>
                                        {form.formState.errors.questionCount && <p className="text-sm text-rose-400 mt-1">{form.formState.errors.questionCount.message}</p>}
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-8">Dersi Ekle</Button>
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

        try {
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
                    status: 'Atandı',
                });
            }
            toast({ title: "Ödev Atandı!", description: `${exam.name} denemesi ${data.studentIds.length} öğrenciye atandı.`});
            onOpenChange(false);
            router.push('/education/management/practice-exams');
        } catch (error) {
             toast({ title: "Hata", description: "Ödev atanırken bir sorun oluştu.", variant: "destructive" });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                 <DialogHeader>
                    <DialogTitle>{exam.name} Ata</DialogTitle>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
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
                                                                        ? field.onChange([...field.value, student.id])
                                                                        : field.onChange(
                                                                            field.value?.filter(
                                                                                (value) => value !== student.id
                                                                            )
                                                                        )
                                                                }}
                                                                className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
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
                             <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-300 uppercase">Başlangıç</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-white/10 bg-white/5 hover:bg-white/10 hover:text-white")}><CalendarIcon className="mr-2 h-4 w-4" />{format(form.watch('assignedDate'), "d MMM yyyy", { locale: tr })}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100"><Calendar mode="single" selected={form.watch('assignedDate')} onSelect={(d) => form.setValue('assignedDate', d || new Date())} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-300 uppercase">Bitiş</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-white/10 bg-white/5 hover:bg-white/10 hover:text-white")}><CalendarIcon className="mr-2 h-4 w-4" />{format(form.watch('dueDate'), "d MMM yyyy", { locale: tr })}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100"><Calendar mode="single" selected={form.watch('dueDate')} onSelect={(d) => form.setValue('dueDate', d || new Date())} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">Ödevi Ata</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
