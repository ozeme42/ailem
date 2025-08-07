

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, FilePen, Archive, Library, Settings, BookHeart, NotebookText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { NewTestForm } from "@/components/new-test-form";
import { QuestionBank, PracticeExam, Test, StudyPlan, StudyAssignment, Mistake } from "@/lib/data";
import {
  onQuestionBanksUpdate,
  onPracticeExamsUpdate,
  onSubjectsUpdate,
  updateSubjects,
  addQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  addPracticeExam,
  updatePracticeExam,
  deletePracticeExam,
  onTestsUpdate,
  deleteTest,
  addTest,
  updateTest,
  checkAndAwardBadges,
  onStudyPlansUpdate,
  addStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  onStudyAssignmentsUpdate,
  addStudyAssignment,
  deleteStudyAssignment
} from "@/lib/dataService";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NewStudyAssignmentForm } from "@/components/new-study-assignment-form";
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';


const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Atanmış Ödevler': Send,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
    'Yanlış Havuzu': NotebookText,
    'Diğer': Library
};

const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlış Havuzu';
    return test.subject || 'Diğer';
};

const newStudyPlanSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  description: z.string().optional(),
});


function ContentLibrary({ questionBanks, practiceExams, tests, onOpenEditBank, onDeleteBank, onOpenEditExam, onDeleteExam, onOpenEditTest, onArchiveTest, onDeleteTest }) {
    const { familyMembers } = useAuth();

    const contentByCategory = React.useMemo(() => {
        const categories: { [key: string]: { banks: QuestionBank[], exams: PracticeExam[], tests: Test[] } } = {};
        
        const allTestCategories = new Set(tests.map(getCategoryName));
        const allSubjects = new Set(questionBanks.flatMap(qb => qb.subjects.map(s => s.name)));
        
        // Initialize all possible categories
        new Set([...allTestCategories, ...allSubjects, 'Genel Deneme Sınavları', 'Yanlış Havuzu']).forEach(cat => {
            if (!categories[cat]) categories[cat] = { banks: [], exams: [], tests: [] };
        });
        
        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => {
                 if (categories[subject.name]) {
                    if (!categories[subject.name].banks.find(b => b.id === bank.id)) {
                        categories[subject.name].banks.push(bank);
                    }
                }
            });
        });

        practiceExams.forEach(exam => {
            if (categories['Genel Deneme Sınavları']) {
               categories['Genel Deneme Sınavları'].exams.push(exam);
            }
        });
        
        tests.filter(t => !t.isArchived).forEach(test => {
            const category = getCategoryName(test);
            if (categories[category]) {
                categories[category].tests.push(test);
            }
        });


        return categories;
    }, [questionBanks, practiceExams, tests]);

    return (
        <Accordion type="multiple" defaultValue={Object.keys(contentByCategory)} className="w-full space-y-4">
            {Object.entries(contentByCategory).map(([category, content]) => {
                const Icon = categoryIcons[category] || BookCopy;
                const totalCount = content.banks.length + content.exams.length + content.tests.length;
                
                if (totalCount === 0) return null;

                return (
                    <Card key={category}>
                         <AccordionItem value={category} className="border-b-0">
                            <AccordionTrigger className="p-4 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <Icon className="w-8 h-8" />
                                    <div className="text-left">
                                        <h3 className="text-lg font-semibold">{category}</h3>
                                        <p className="text-sm text-muted-foreground">{totalCount} içerik bulundu</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="space-y-3">
                                    {content.banks.map(bank => (
                                        <Card key={bank.id} className="p-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{bank.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {bank.subjects.length} Ders, {bank.subjects.reduce((acc, s) => acc + s.topics.length, 0)} Konu
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => onOpenEditBank(bank)}><Edit className="w-4 h-4"/></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Soru Bankasını Sil</AlertDialogTitle><AlertDialogDescription>"{bank.name}" soru bankası kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteBank(bank.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {content.exams.map(exam => (
                                        <Card key={exam.id} className="p-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{exam.name}</p>
                                                     <p className="text-xs text-muted-foreground">
                                                        {exam.subjects.length} Ders, {exam.subjects.reduce((acc, s) => acc + s.questionCount, 0)} Soru
                                                     </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => onOpenEditExam(exam)}><Edit className="w-4 h-4"/></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Sınavı Sil</AlertDialogTitle><AlertDialogDescription>"{exam.name}" deneme sınavı kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteExam(exam.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {content.tests.map(test => {
                                        const student = familyMembers.find(m => m.id === test.studentId);
                                        return (
                                            <Card key={test.id} className="p-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold">{test.title}</p>
                                                            <Badge variant={test.status === 'Sonuçlandı' ? 'default' : 'outline'}>
                                                                {test.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {student?.name || 'Bilinmeyen Öğrenci'} - Son Teslim: {test.dueDate}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {test.status === 'Sonuçlandı' && (
                                                            <Button variant="ghost" size="icon" onClick={() => onArchiveTest(test)} title="Arşivle">
                                                                <Archive className="w-4 h-4 text-muted-foreground"/>
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" onClick={() => onOpenEditTest(test)}><Edit className="w-4 h-4"/></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Ödevi sil?</AlertDialogTitle><AlertDialogDescription>"{test.title}" ödevi kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteTest(test.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Card>
                )
            })}
        </Accordion>
    );
}

const newSubjectSchema = z.object({
  name: z.string().min(2, "Ders adı en az 2 karakter olmalıdır."),
});
function NewSubjectDialog({ open, onOpenChange, onCreate }) {
  const form = useForm({
    resolver: zodResolver(newSubjectSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (data) => {
    onCreate(data.name);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Ders Ekle</DialogTitle>
          <DialogDescription>Müfredata yeni bir ders ekleyin.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ders Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="örn: Fizik" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


function SubjectManagement({ subjects, questionBanks, onOpenEditBank, onDeleteSubject, onCreateSubject }) {
    const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = React.useState(false);

    const topicsBySubject = React.useMemo(() => {
        const mapping: { [key: string]: any[] } = {};
        subjects.forEach(s => mapping[s] = []);
        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => {
                if (mapping[subject.name]) {
                    subject.topics.forEach(topic => {
                        if (!mapping[subject.name].some(t => t.name === topic.name)) {
                             mapping[subject.name].push({ ...topic, bankName: bank.name, bankId: bank.id });
                        }
                    });
                }
            });
        });
        return mapping;
    }, [subjects, questionBanks]);
    
    const handleEditTopic = (bankId) => {
        const bank = questionBanks.find(b => b.id === bankId);
        if (bank) {
            onOpenEditBank(bank);
        }
    };

    return (
        <>
        <div className="flex justify-end mb-4">
            <Button onClick={() => setIsNewSubjectDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ders Ekle
            </Button>
        </div>
         <Accordion type="multiple" className="w-full space-y-4">
            {subjects.map((subject) => {
                const Icon = categoryIcons[subject] || BookCopy;
                const topics = topicsBySubject[subject] || [];
                return (
                     <Card key={subject}>
                         <AccordionItem value={subject} className="border-b-0">
                            <div className="flex items-center p-4">
                                <AccordionTrigger className="hover:no-underline flex-grow">
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-8 h-8" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-semibold">{subject}</h3>
                                            <p className="text-sm text-muted-foreground">{topics.length} konu</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive shrink-0"><Trash2 className="w-4 h-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Dersi Sil</AlertDialogTitle><AlertDialogDescription>"{subject}" dersini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteSubject(subject)}>Sil</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <AccordionContent className="p-4 pt-0">
                                <div className="space-y-2">
                                {topics.map(topic => (
                                    <div key={`${topic.id}-${topic.bankId}`} className="flex justify-between items-center p-2 border rounded-md">
                                        <div>
                                            <p className="font-medium">{topic.name}</p>
                                            <p className="text-xs text-muted-foreground">{topic.bankName}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleEditTopic(topic.bankId)}><Edit className="w-4 h-4 mr-2"/>Konuları Düzenle</Button>
                                    </div>
                                ))}
                                {topics.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Bu derse ait konu bulunamadı.</p>}
                                </div>
                            </AccordionContent>
                         </AccordionItem>
                    </Card>
                );
            })}
         </Accordion>
         <NewSubjectDialog open={isNewSubjectDialogOpen} onOpenChange={setIsNewSubjectDialogOpen} onCreate={onCreateSubject} />
         </>
    );
}

function StudyPlanManagement() {
  const { familyMembers } = useAuth();
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [assignments, setAssignments] = React.useState<StudyAssignment[]>([]);
  const [editingPlan, setEditingPlan] = React.useState<StudyPlan | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = React.useState(false);
  const [currentPlanForAssignment, setCurrentPlanForAssignment] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof newStudyPlanSchema>>({
    resolver: zodResolver(newStudyPlanSchema),
  });

  React.useEffect(() => {
    const unsubPlans = onStudyPlansUpdate(setStudyPlans);
    const unsubAssignments = onStudyAssignmentsUpdate(setAssignments);
    return () => {
      unsubPlans();
      unsubAssignments();
    };
  }, []);
  
  const handleOpenPlanDialog = (plan: StudyPlan | null) => {
    setEditingPlan(plan);
    form.reset(plan ? { title: plan.title, description: plan.description } : { title: '', description: '' });
    setIsPlanDialogOpen(true);
  };
  
  const handleOpenAssignmentDialog = (planId: string) => {
      setCurrentPlanForAssignment(planId);
      setIsAssignmentDialogOpen(true);
  }

  const handlePlanSubmit = async (values: z.infer<typeof newStudyPlanSchema>) => {
    try {
      if (editingPlan) {
        await updateStudyPlan(editingPlan.id, values);
        toast({ title: 'Çalışma Planı Güncellendi' });
      } else {
        await addStudyPlan(values);
        toast({ title: 'Çalışma Planı Oluşturuldu' });
      }
      setIsPlanDialogOpen(false);
    } catch (error) {
      toast({ title: 'Hata', variant: 'destructive' });
    }
  };
  
  const handleAssignmentSubmit = async (values: Omit<StudyAssignment, 'id' | 'familyId' | 'studyPlanId' | 'status'>) => {
      if (!currentPlanForAssignment) return;
      try {
          await addStudyAssignment({ ...values, studyPlanId: currentPlanForAssignment, status: 'assigned' });
          toast({ title: 'Konu Atandı' });
          setIsAssignmentDialogOpen(false);
      } catch (error) {
           toast({ title: 'Hata', variant: 'destructive' });
      }
  }

  const handleDeletePlan = async (planId: string) => {
      try {
          await deleteStudyPlan(planId);
          toast({title: "Plan Silindi", variant: "destructive"});
      } catch (error) {
          toast({title: "Hata", variant: "destructive"});
      }
  }
  
  const handleDeleteAssignment = async (assignmentId: string) => {
       try {
          await deleteStudyAssignment(assignmentId);
          toast({title: "Atama Silindi", variant: "destructive"});
      } catch (error) {
          toast({title: "Hata", variant: "destructive"});
      }
  }

  const assignmentsByPlan = React.useMemo(() => {
    const grouped: { [planId: string]: StudyAssignment[] } = {};
    assignments.forEach(a => {
        if (!grouped[a.studyPlanId]) grouped[a.studyPlanId] = [];
        grouped[a.studyPlanId].push(a);
    });
    return grouped;
  }, [assignments]);


  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenPlanDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Yeni Çalışma Planı Ekle
        </Button>
      </div>
       <Accordion type="multiple" className="w-full space-y-4">
        {studyPlans.map(plan => {
            const planAssignments = assignmentsByPlan[plan.id] || [];
            return (
            <Card key={plan.id}>
                <AccordionItem value={plan.id} className="border-b-0">
                    <CardHeader className="flex flex-row justify-between items-start pb-2">
                        <AccordionTrigger className="flex-grow p-0 hover:no-underline">
                             <div>
                                <CardTitle>{plan.title}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </div>
                        </AccordionTrigger>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenPlanDialog(plan)}><Edit className="w-4 h-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Planı sil?</AlertDialogTitle><AlertDialogDescription>"{plan.title}" planı ve içindeki tüm atamalar kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardHeader>
                    <AccordionContent className="px-6 pb-6">
                        <div className="space-y-3 pt-4 border-t">
                            {planAssignments.map(assignment => {
                                const student = familyMembers.find(m => m.id === assignment.studentId);
                                return (
                                    <div key={assignment.id} className="p-3 border rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{assignment.topic} <span className="text-sm text-muted-foreground font-normal">({assignment.subject})</span></p>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                <Badge variant="outline">{student?.name || '?'}</Badge>
                                                <span>{format(parseISO(assignment.startDate), 'dd MMM', {locale: tr})} - {format(parseISO(assignment.dueDate), 'dd MMM yyyy', {locale: tr})}</span>
                                            </div>
                                        </div>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Atamayı Sil</AlertDialogTitle><AlertDialogDescription>Bu atamayı silmek istediğinize emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAssignment(assignment.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )
                            })}
                            <Button variant="outline" className="w-full mt-2" onClick={() => handleOpenAssignmentDialog(plan.id)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Yeni Atama Ekle
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Card>
        )})}
        {studyPlans.length === 0 && (
            <p className="text-center p-8 text-muted-foreground">Henüz çalışma planı oluşturulmadı.</p>
        )}
      </Accordion>

       <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Çalışma Planını Düzenle' : 'Yeni Çalışma Planı Oluştur'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handlePlanSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Başlığı</FormLabel>
                      <FormControl><Input placeholder="LGS Tekrar Kampı" {...field} /></FormControl>
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
                      <FormControl><Textarea placeholder="Bu planın amacını veya içeriğini açıklayın..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsPlanDialogOpen(false)}>İptal</Button>
                  <Button type="submit">Kaydet</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Konu Ataması</DialogTitle>
                    <DialogDescription>
                        Çalışma planına yeni bir konu ekleyin.
                    </DialogDescription>
                </DialogHeader>
                <NewStudyAssignmentForm
                    students={familyMembers.filter(m => m.role.includes('Çocuk'))}
                    availableSubjects={[]} 
                    onAssign={handleAssignmentSubmit}
                />
            </DialogContent>
        </Dialog>
    </>
  )
}


export default function EducationManagementPage() {
    const { toast } = useToast();
    const { familyMembers, familyId } = useAuth();

    const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [tests, setTests] = React.useState<Test[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    
    const [isBankDialogOpen, setIsBankDialogOpen] = React.useState(false);
    const [isExamDialogOpen, setIsExamDialogOpen] = React.useState(false);
    const [isTestDialogOpen, setIsTestDialogOpen] = React.useState(false);
    const [isGradeDialogOpen, setIsGradeDialogOpen] = React.useState(false);

    const [editingBank, setEditingBank] = React.useState<QuestionBank | null>(null);
    const [editingExam, setEditingExam] = React.useState<PracticeExam | null>(null);
    const [editingTest, setEditingTest] = React.useState<Test | null>(null);
    const [gradingTest, setGradingTest] = React.useState<Test | null>(null);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
        const unsubTests = onTestsUpdate(setTests);
        return () => {
            unsubBanks();
            unsubExams();
            unsubSubjects();
            unsubTests();
        };
    }, []);

    const testsAwaitingGrading = React.useMemo(() => {
        return tests.filter(test => test.status === 'Değerlendirme Bekliyor');
    }, [tests]);

    const handleCreateSubject = async (subjectName: string) => {
        if (availableSubjects.map(s => s.toLowerCase()).includes(subjectName.toLowerCase())) {
            toast({ variant: 'destructive', title: "Hata", description: "Bu ders zaten mevcut." });
            return;
        }
        const newSubjects = [...new Set([...availableSubjects, subjectName])];
        await updateSubjects(newSubjects);
        toast({ title: "Yeni Ders Oluşturuldu" });
    };

    const handleDeleteSubject = async (subjectToDelete: string) => {
        if (questionBanks.some(qb => qb.subjects.some(s => s.name === subjectToDelete))) {
            toast({ variant: 'destructive', title: "Silme Hatası", description: "Bu dersi silemezsiniz çünkü bir soru bankasında kullanılıyor." });
            return;
        }
         if (practiceExams.some(pe => pe.subjects.some(s => s.name === subjectToDelete))) {
            toast({ variant: 'destructive', title: "Silme Hatası", description: "Bu dersi silemezsiniz çünkü bir deneme sınavında kullanılıyor." });
            return;
        }
        const newSubjects = availableSubjects.filter(s => s !== subjectToDelete);
        await updateSubjects(newSubjects);
        toast({ variant: 'destructive', title: "Ders Silindi" });
    };
    
    const openEditBankDialog = (bank: QuestionBank) => {
        setEditingBank(bank);
        setIsBankDialogOpen(true);
    }
    
    const openEditExamDialog = (exam: PracticeExam) => {
        setEditingExam(exam);
        setIsExamDialogOpen(true);
    }
    
    const openEditTestDialog = (test: Test) => {
        setEditingTest(test);
        setIsTestDialogOpen(true);
    }

    const openGradeDialog = (test: Test) => {
        setGradingTest(test);
        setIsGradeDialogOpen(true);
    };

    const handleBankSubmit = async (bankData: Omit<QuestionBank, 'id' | 'familyId'>, id?: string) => {
        try {
            if (id) {
                await updateQuestionBank(id, bankData);
                toast({ title: "✅ Soru Bankası Güncellendi" });
            } else {
                await addQuestionBank(bankData);
                toast({ title: "✅ Soru Bankası Oluşturuldu" });
            }
            setEditingBank(null);
            setIsBankDialogOpen(false);
        } catch (error) {
             toast({ title: "❌ Kaydetme Hatası", variant: 'destructive'});
        }
    };
    
    const handleDeleteBank = async (bankId: string) => {
        try {
            await deleteQuestionBank(bankId);
            toast({ title: "🗑️ Soru Bankası Silindi", variant: "destructive" });
        } catch (error) {
            toast({ title: "❌ Silme Hatası", variant: 'destructive' });
        }
    }

    const handleExamSubmit = async (examData: Omit<PracticeExam, 'id' | 'familyId'>, id?: string) => {
        try {
            if (id) {
                await updatePracticeExam(id, examData);
                toast({ title: "✅ Deneme Sınavı Güncellendi" });
            } else {
                await addPracticeExam(examData);
                toast({ title: "✅ Deneme Sınavı Oluşturuldu" });
            }
            setEditingExam(null);
            setIsExamDialogOpen(false);
        } catch (error) {
            toast({ title: "❌ Kaydetme Hatası", variant: 'destructive'});
        }
    };
    
    const handleDeleteExam = async (examId: string) => {
        try {
            await deletePracticeExam(examId);
            toast({ title: "🗑️ Deneme Sınavı Silindi", variant: "destructive" });
        } catch (error) {
            toast({ title: "❌ Silme Hatası", variant: 'destructive' });
        }
    }

    const handleTestSubmit = async (testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => {
        try {
            if (id) {
                await updateTest(id, testData);
                toast({ title: "✅ Ödev Güncellendi" });
            } else {
                let finalTestData = { ...testData, status: 'Atandı', isArchived: false };
                await addTest(finalTestData);
                toast({ title: "✅ Ödev Atandı" });
            }
            setEditingTest(null);
            setIsTestDialogOpen(false);
        } catch (error) {
             console.error("Error assigning test:", error);
             toast({ title: "❌ Kaydetme Hatası", description: "Ödev kaydedilirken bir hata oluştu.", variant: 'destructive'});
        }
    };

    const handleDeleteTest = async (testId: string) => {
        try {
            await deleteTest(testId);
            toast({ title: "🗑️ Ödev Silindi", variant: "destructive" });
        } catch (error) {
             toast({ title: "❌ Silme Hatası", variant: 'destructive'});
        }
    };

    const handleArchiveTest = async (test: Test) => {
        try {
            await updateTest(test.id, { isArchived: true });
            toast({ title: "Ödev Arşivlendi", description: `"${test.title}" arşive taşındı.` });
        } catch (error) {
            toast({ title: "❌ Arşivleme Hatası", variant: 'destructive'});
        }
    }

    const handleGradeSubmit = async (gradeData: ManualGradeData) => {
        if (!gradingTest || !familyId) return;
        try {
            const score = gradingTest.questionCount > 0
                ? (gradeData.correct / gradingTest.questionCount) * 100
                : 0;

            const updatedData: Partial<Test> = {
                status: 'Sonuçlandı',
                correctAnswers: gradeData.correct,
                incorrectAnswers: gradeData.incorrect,
                emptyAnswers: gradeData.empty,
                score: score,
                studentTextAnswersEvaluation: gradeData.evaluations,
            };

            await updateTest(gradingTest.id, updatedData);
            await checkAndAwardBadges(gradingTest.studentId, familyId, { type: 'test_completed', test: { ...gradingTest, ...updatedData } });
            
            toast({ title: "✅ Test Değerlendirildi", description: `${gradingTest.title} için sonuçlar kaydedildi.` });
            setIsGradeDialogOpen(false);
            setGradingTest(null);
        } catch (error) {
            toast({ title: "❌ Değerlendirme Hatası", description: "Sonuçlar kaydedilirken bir hata oluştu.", variant: 'destructive' });
        }
    };

    return (
        <>
            <PageHeader title="İçerik Yönetimi">
                <Link href="/education">
                    <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><ArrowLeft className="mr-2 h-4 w-4" /> Eğitim Sayfası</Button>
                </Link>
                 <Dialog open={isTestDialogOpen} onOpenChange={(open) => { if (!open) setEditingTest(null); setIsTestDialogOpen(open); }}>
                    <DialogTrigger asChild>
                         <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><PlusCircle className="mr-2 h-4 w-4" /> Yeni Ödev Ata</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingTest ? "Ödevi Düzenle" : "Yeni Ödev Ata"}</DialogTitle>
                        </DialogHeader>
                        <NewTestForm 
                            students={studentMembers} 
                            questionBanks={questionBanks}
                            practiceExams={practiceExams}
                            onAssign={handleTestSubmit}
                            initialData={editingTest}
                            availableSubjects={availableSubjects}
                            onSubjectCreated={handleCreateSubject}
                        />
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
            {testsAwaitingGrading.length > 0 && (
                <Card className="mb-6 border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <FilePen />
                            Değerlendirme Bekleyenler ({testsAwaitingGrading.length})
                        </CardTitle>
                        <CardDescription>
                            Öğrenciler tarafından tamamlanan ve sonucunu girmeniz gereken testler.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {testsAwaitingGrading.map(test => {
                             const student = familyMembers.find(m => m.id === test.studentId);
                             return (
                                 <div key={test.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                     <div>
                                        <p className="font-semibold">{test.title}</p>
                                        <p className="text-sm text-muted-foreground">{student?.name || 'Bilinmeyen Öğrenci'}</p>
                                     </div>
                                     <div className="flex items-center gap-1">
                                        <Button size="sm" onClick={() => openGradeDialog(test)}>
                                            Sonuç Gir
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Ödevi sil?</AlertDialogTitle>
                                                    <AlertDialogDescription>"{test.title}" ödevi kalıcı olarak silinecektir.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                     </div>
                                 </div>
                             )
                        })}
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="library" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="library">İçerik Kütüphanesi</TabsTrigger>
                    <TabsTrigger value="curriculum">Ders ve Konu Yönetimi</TabsTrigger>
                    <TabsTrigger value="study-plans">Çalışma Planları</TabsTrigger>
                </TabsList>
                <TabsContent value="library" className="mt-4">
                     <Dialog>
                        <DialogTrigger asChild>
                           <Button><PlusCircle className="mr-2 h-4 w-4" /> Yeni İçerik Ekle</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ne Oluşturmak İstersiniz?</DialogTitle>
                            </DialogHeader>
                             <div className="grid grid-cols-2 gap-4 py-4">
                                <Button variant="outline" className="h-24" onClick={() => { setEditingBank(null); setIsBankDialogOpen(true); }}>Soru Bankası</Button>
                                <Button variant="outline" className="h-24" onClick={() => { setEditingExam(null); setIsExamDialogOpen(true); }}>Deneme Sınavı</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <ContentLibrary 
                        questionBanks={questionBanks}
                        practiceExams={practiceExams}
                        tests={tests}
                        onOpenEditBank={openEditBankDialog}
                        onDeleteBank={handleDeleteBank}
                        onOpenEditExam={openEditExamDialog}
                        onDeleteExam={handleDeleteExam}
                        onOpenEditTest={openEditTestDialog}
                        onArchiveTest={handleArchiveTest}
                        onDeleteTest={handleDeleteTest}
                    />
                </TabsContent>
                <TabsContent value="curriculum" className="mt-4">
                    <SubjectManagement 
                        subjects={availableSubjects}
                        questionBanks={questionBanks}
                        onOpenEditBank={openEditBankDialog}
                        onDeleteSubject={handleDeleteSubject}
                        onCreateSubject={handleCreateSubject}
                    />
                </TabsContent>
                 <TabsContent value="study-plans" className="mt-4">
                    <StudyPlanManagement />
                </TabsContent>
            </Tabs>
            
            <Dialog open={isBankDialogOpen} onOpenChange={(open) => { if(!open) setEditingBank(null); setIsBankDialogOpen(open); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingBank ? "Soru Bankasını Düzenle" : "Yeni Soru Bankası Oluştur"}</DialogTitle>
                    </DialogHeader>
                    <NewQuestionBankForm 
                        onSubmit={handleBankSubmit} 
                        initialData={editingBank}
                        availableSubjects={availableSubjects}
                        onSubjectCreated={handleCreateSubject}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isExamDialogOpen} onOpenChange={(open) => { if(!open) setEditingExam(null); setIsExamDialogOpen(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingExam ? "Deneme Sınavını Düzenle" : "Yeni Deneme Sınavı Oluştur"}</DialogTitle>
                    </DialogHeader>
                    <NewPracticeExamForm 
                        onSubmit={handleExamSubmit}
                        initialData={editingExam}
                        availableSubjects={availableSubjects}
                        onSubjectCreated={handleCreateSubject}
                    />
                </DialogContent>
            </Dialog>
            

            <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Testi Değerlendir</DialogTitle>
                        <DialogDescription>
                            {gradingTest?.title} testinin sonuçlarını girin.
                        </DialogDescription>
                    </DialogHeader>
                    {gradingTest && (
                        <ManualGradeForm
                            test={gradingTest}
                            onSave={handleGradeSubmit}
                            onCancel={() => setIsGradeDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

    