

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, FilePen, Archive, Library, Settings, BookHeart, NotebookText, AlertCircle, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { NewTestForm } from "@/components/new-test-form";
import { QuestionBank, PracticeExam, Test, StudyPlan, StudyAssignment, Topic, Mistake } from "@/lib/data";
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
  deleteStudyAssignment,
  deleteTopicFromBank,
  addTopicToBank,
  addMistake,
  onMistakesUpdate,
  updateMistake,
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
import { EditMistakeForm } from "@/components/edit-mistake-form";
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from "next/image";
import { ImageCropper } from "@/components/image-cropper";
import { migrateImage } from "@/ai/flows/migrate-image-flow";


const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Atanmış Ödevler': Send,
    'Yanlış Havuzu': AlertCircle,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
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


function ContentLibrary({ questionBanks, practiceExams, tests, mistakes, onOpenEditBank, onDeleteBank, onOpenEditExam, onDeleteExam, onOpenEditTest, onArchiveTest, onDeleteTest, onOpenEditMistake }: { questionBanks: QuestionBank[], practiceExams: PracticeExam[], tests: Test[], mistakes: Mistake[], onOpenEditBank: (bank: QuestionBank) => void, onDeleteBank: (id: string) => void, onOpenEditExam: (exam: PracticeExam) => void, onDeleteExam: (id: string) => void, onOpenEditTest: (test: Test) => void, onArchiveTest: (test: Test) => void, onDeleteTest: (id: string) => void, onOpenEditMistake: (mistake: Mistake) => void }) {
    const { familyMembers } = useAuth();

    const contentByCategory = React.useMemo(() => {
        const categories: { [key: string]: { banks: QuestionBank[], exams: PracticeExam[], tests: Test[], mistakes: Mistake[] } } = {};

        const initializeCategory = (name: string) => {
            if (!categories[name]) {
                categories[name] = { banks: [], exams: [], tests: [], mistakes: [] };
            }
        };

        // Initialize all subject categories from question banks
        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => initializeCategory(subject.name));
        });
        
        // Initialize static categories
        initializeCategory('Genel Deneme Sınavları');
        if (mistakes.length > 0) {
            initializeCategory('Yanlış Havuzu');
        }

        // Populate question banks
        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => {
                if (categories[subject.name] && !categories[subject.name].banks.find(b => b.id === bank.id)) {
                    categories[subject.name].banks.push(bank);
                }
            });
        });
        
        // Populate practice exams
        practiceExams.forEach(exam => {
            if (!categories['Genel Deneme Sınavları']) {
                initializeCategory('Genel Deneme Sınavları');
            }
            categories['Genel Deneme Sınavları'].exams.push(exam);
        });
        
        // Populate all mistakes into the central "Yanlış Havuzu" category
        if (mistakes.length > 0) {
            if (!categories['Yanlış Havuzu']) {
                initializeCategory('Yanlış Havuzu');
            }
             categories['Yanlış Havuzu'].mistakes.push(...mistakes);
        }

        return categories;
    }, [questionBanks, practiceExams, mistakes]);

    return (
        <Accordion type="multiple" defaultValue={Object.keys(contentByCategory)} className="w-full space-y-4">
            {Object.entries(contentByCategory).map(([category, content]) => {
                const Icon = categoryIcons[category] || BookCopy;
                const totalCount = content.banks.length + content.exams.length + content.mistakes.length;
                
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
                                    {content.mistakes.map(mistake => {
                                        const student = familyMembers.find(m => m.id === mistake.creatorId);
                                        return (
                                            <Card key={mistake.id} className="p-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold">{mistake.subject} - {mistake.topic}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Öğrenci: {student?.name || '?'} - Oluşturulma: {format(parseISO(mistake.createdAt), 'dd.MM.yy')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => onOpenEditMistake(mistake)}><Edit className="w-4 h-4"/></Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
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
                                                            <AlertDialogHeader><AlertDialogTitleComponent>Soru Bankasını Sil</AlertDialogTitleComponent><AlertDialogDescription>"{bank.name}" soru bankası kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteBank(bank.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
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
                                                            <AlertDialogHeader><AlertDialogTitleComponent>Sınavı Sil</AlertDialogTitleComponent><AlertDialogDescription>"{exam.name}" deneme sınavı kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteExam(exam.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
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
function NewSubjectDialog({ open, onOpenChange, onCreate }: { open: boolean, onOpenChange: (open: boolean) => void, onCreate: (name: string) => void }) {
  const form = useForm({
    resolver: zodResolver(newSubjectSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (data: z.infer<typeof newSubjectSchema>) => {
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

const newTopicSchema = z.object({
  name: z.string().min(2, "Konu adı en az 2 karakter olmalıdır."),
});

function NewTopicDialog({ open, onOpenChange, onSave }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: (name: string) => void }) {
  const form = useForm({
    resolver: zodResolver(newTopicSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (data: z.infer<typeof newTopicSchema>) => {
    onSave(data.name);
    form.reset();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Yeni Konu Ekle</DialogTitle>
            </DialogHeader>
             <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konu Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="örn: Üslü Sayılar" {...field} />
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
  )
}

function SubjectManagement({ subjects, questionBanks, onOpenEditBank, onDeleteSubject, onCreateSubject, onDeleteTopic, onAddTopic }: { subjects: string[], questionBanks: QuestionBank[], onOpenEditBank: (bank: QuestionBank) => void, onDeleteSubject: (subject: string) => void, onCreateSubject: (subject: string) => void, onDeleteTopic: (bankId: string, subjectId: number, topicId: number) => void, onAddTopic: (subject: string, topic: string) => void}) {
    const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = React.useState(false);
    const [isNewTopicDialogOpen, setIsNewTopicDialogOpen] = React.useState(false);
    const [currentSubjectForNewTopic, setCurrentSubjectForNewTopic] = React.useState<string | null>(null);

    const topicsBySubject = React.useMemo(() => {
        const mapping: { [key: string]: { topic: Topic, bankName: string, bankId: string, subjectId: number }[] } = {};
        subjects.forEach(s => mapping[s] = []);
        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => {
                if (mapping[subject.name]) {
                    subject.topics.forEach(topic => {
                        if (!mapping[subject.name].some(t => t.topic.name === topic.name)) {
                             mapping[subject.name].push({ topic: topic, bankName: bank.name, bankId: bank.id, subjectId: subject.id });
                        }
                    });
                }
            });
        });
        return mapping;
    }, [subjects, questionBanks]);
    
    const handleEditTopic = (bankId: string) => {
        const bank = questionBanks.find(b => b.id === bankId);
        if (bank) {
            onOpenEditBank(bank);
        }
    };

    const handleOpenNewTopicDialog = (subjectName: string) => {
        setCurrentSubjectForNewTopic(subjectName);
        setIsNewTopicDialogOpen(true);
    };

    const handleSaveNewTopic = (topicName: string) => {
        if(currentSubjectForNewTopic) {
            onAddTopic(currentSubjectForNewTopic, topicName);
        }
    }

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
                                        <AlertDialogHeader><AlertDialogTitleComponent>Dersi Sil</AlertDialogTitleComponent><AlertDialogDescription>"{subject}" dersini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteSubject(subject)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <AccordionContent className="p-4 pt-0">
                                <div className="space-y-2">
                                {topics.map(topicInfo => (
                                    <div key={`${topicInfo.topic.id}-${topicInfo.bankId}`} className="flex justify-between items-center p-2 border rounded-md">
                                        <div>
                                            <p className="font-medium">{topicInfo.topic.name}</p>
                                            <p className="text-xs text-muted-foreground">{topicInfo.bankName}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditTopic(topicInfo.bankId)}><Edit className="w-4 h-4 mr-2"/>Soru Bankasını Düzenle</Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitleComponent>Konuyu Sil</AlertDialogTitleComponent><AlertDialogDescription>"{topicInfo.topic.name}" konusunu "{topicInfo.bankName}" soru bankasından kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteTopic(topicInfo.bankId, topicInfo.subjectId, topicInfo.topic.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                                {topics.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Bu derse ait konu bulunamadı.</p>}
                                <Button variant="outline" className="w-full mt-4" onClick={() => handleOpenNewTopicDialog(subject)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Yeni Konu Ekle
                                </Button>
                                </div>
                            </AccordionContent>
                         </AccordionItem>
                    </Card>
                );
            })}
         </Accordion>
         <NewSubjectDialog open={isNewSubjectDialogOpen} onOpenChange={setIsNewSubjectDialogOpen} onCreate={onCreateSubject} />
         <NewTopicDialog open={isNewTopicDialogOpen} onOpenChange={setIsNewTopicDialogOpen} onSave={handleSaveNewTopic} />
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
                                    <AlertDialogHeader><AlertDialogTitleComponent>Planı sil?</AlertDialogTitleComponent><AlertDialogDescription>"{plan.title}" planı ve içindeki tüm atamalar kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
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
                                                <AlertDialogHeader><AlertDialogTitleComponent>Atamayı Sil</AlertDialogTitleComponent><AlertDialogDescription>Bu atamayı silmek istediğinize emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAssignment(assignment.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
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
    const gradeFormRef = React.useRef<{ submit: () => void }>(null);


    const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [tests, setTests] = React.useState<Test[]>([]);
    const [mistakes, setMistakes] = React.useState<Mistake[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    
    const [isBankDialogOpen, setIsBankDialogOpen] = React.useState(false);
    const [isExamDialogOpen, setIsExamDialogOpen] = React.useState(false);
    const [isTestDialogOpen, setIsTestDialogOpen] = React.useState(false);
    const [isGradeDialogOpen, setIsGradeDialogOpen] = React.useState(false);
    const [isMistakeDialogOpen, setIsMistakeDialogOpen] = React.useState(false);
    const [isImageUploadOpen, setIsImageUploadOpen] = React.useState(false);


    const [editingBank, setEditingBank] = React.useState<QuestionBank | null>(null);
    const [editingExam, setEditingExam] = React.useState<PracticeExam | null>(null);
    const [editingTest, setEditingTest] = React.useState<Test | null>(null);
    const [editingMistake, setEditingMistake] = React.useState<Mistake | null>(null);
    const [gradingTest, setGradingTest] = React.useState<Test | null>(null);
    const [editingQuestion, setEditingQuestion] = React.useState<{ testId: string; questionIndex: number } | null>(null);
    const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);

    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
        const unsubTests = onTestsUpdate(setTests);
        const unsubMistakes = onMistakesUpdate(setMistakes);

        return () => {
            unsubBanks();
            unsubExams();
            unsubSubjects();
            unsubTests();
            unsubMistakes();
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
    
    const handleDeleteTopic = async (bankId: string, subjectId: number, topicId: number) => {
        try {
            await deleteTopicFromBank(bankId, subjectId, topicId);
            toast({ title: "Konu Silindi", variant: 'destructive' });
        } catch(e) {
            toast({ title: "Hata", description: "Konu silinirken bir hata oluştu.", variant: 'destructive' });
        }
    };
    
    const handleAddTopic = async (subjectName: string, topicName: string) => {
      // Find a bank that has this subject, or create a new bank.
      let targetBank = questionBanks.find(qb => qb.subjects.some(s => s.name === subjectName));
      let isNewBank = false;
      
      if (!targetBank) {
          targetBank = questionBanks.find(qb => qb.name === "Yeni Oluşturulan Konular");
          if (!targetBank) {
              const newBank: Omit<QuestionBank, 'id' | 'familyId'> = {
                  name: 'Yeni Oluşturulan Konular',
                  subjects: [{ id: Date.now(), name: subjectName, topics: [] }]
              };
              try {
                const newBankId = await addQuestionBank(newBank);
                targetBank = { ...newBank, id: newBankId, familyId: familyId! };
                isNewBank = true;
              } catch (e) {
                 toast({ title: "Soru bankası oluşturma hatası", variant: "destructive" });
                 return;
              }
          }
      }

      const subjectInBank = targetBank.subjects.find(s => s.name === subjectName);

      const newTopic: Topic = {
        id: Date.now(),
        name: topicName,
        questionCount: 0,
        gradingType: 'manual',
        answerKey: {}
      };
      
      try {
        await addTopicToBank(targetBank.id, subjectName, newTopic);
        toast({ title: "Konu Eklendi", description: `"${topicName}" konusu "${targetBank.name}" bankasına eklendi.` });
      } catch (e) {
         toast({ title: "Konu ekleme hatası", variant: "destructive" });
      }
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
    
    const openEditMistakeDialog = (mistake: Mistake) => {
        setEditingMistake(mistake);
        setIsMistakeDialogOpen(true);
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
            console.error("Error grading test:", error);
            toast({ title: "❌ Değerlendirme Hatası", description: "Sonuçlar kaydedilirken bir hata oluştu.", variant: 'destructive' });
        }
    };
    
    const handleMistakeFormSubmit = async () => {
        setIsMistakeDialogOpen(false);
        setEditingMistake(null);
        toast({title: "Geri Bildirim Kaydedildi"});
    };
    
     const handleOpenImageUpload = (testId: string, questionIndex: number) => {
        setEditingQuestion({ testId, questionIndex });
        setIsImageUploadOpen(true);
    };

    const handleImageCrop = async (croppedImageUrl: string) => {
        if (!editingQuestion) return;
        
        toast({ title: "Görsel Yükleniyor..." });
        try {
            const destinationPath = `test-questions/${editingQuestion.testId}-${editingQuestion.questionIndex}-${Date.now()}.jpg`;
            const migrationResult = await migrateImage({ imageDataUri: croppedImageUrl, destinationPath });
            if (!migrationResult.success || !migrationResult.newUrl) {
                throw new Error("Görsel yüklenemedi.");
            }
            
            const testToUpdate = tests.find(t => t.id === editingQuestion.testId);
            if (testToUpdate) {
                const updatedQuestions = [...(testToUpdate.questions || [])];
                const qIndex = updatedQuestions.findIndex(q => q.questionNumber === editingQuestion.questionIndex + 1);
                
                if (qIndex !== -1) {
                    updatedQuestions[qIndex].imageUrl = migrationResult.newUrl;
                } else {
                    updatedQuestions.push({
                        questionNumber: editingQuestion.questionIndex + 1,
                        imageUrl: migrationResult.newUrl
                    });
                }
                
                await updateTest(editingQuestion.testId, { questions: updatedQuestions });
                toast({ title: "Görsel Güncellendi!" });
            }
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        } finally {
            setIsImageUploadOpen(false);
            setImageToCrop(null);
            setEditingQuestion(null);
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
                                                    <AlertDialogTitleComponent>Ödevi sil?</AlertDialogTitleComponent>
                                                    <AlertDialogDescription>"{test.title}" ödevi kalıcı olarak silinecektir.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                     </div>
                                 </div>
                             )
                        })}
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="assignments" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="assignments">Atanmış Ödevler</TabsTrigger>
                    <TabsTrigger value="library">İçerik Kütüphanesi</TabsTrigger>
                    <TabsTrigger value="curriculum">Ders ve Konu Yönetimi</TabsTrigger>
                    <TabsTrigger value="study-plans">Çalışma Planları</TabsTrigger>
                </TabsList>
                <TabsContent value="assignments" className="mt-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {tests.filter(t => !t.isArchived).map(test => {
                           const student = familyMembers.find(m => m.id === test.studentId);
                           return (
                               <Card key={test.id}>
                                   <CardHeader>
                                       <CardTitle>{test.title}</CardTitle>
                                       <CardDescription>
                                           {student?.name || "Bilinmeyen"} - {test.subject}
                                           <Badge variant={test.status === 'Sonuçlandı' ? "default" : "outline"} className="ml-2">{test.status}</Badge>
                                       </CardDescription>
                                   </CardHeader>
                                   <CardContent>
                                       <div className="grid grid-cols-4 gap-2">
                                            {Array.from({ length: test.questionCount }).map((_, index) => {
                                                const question = test.questions?.find(q => q.questionNumber === index + 1);
                                                return (
                                                    <div key={index} className="aspect-square border rounded-md flex items-center justify-center relative">
                                                        {question?.imageUrl ? (
                                                            <Image src={question.imageUrl} alt={`Soru ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="h-full w-full text-xs" onClick={() => handleOpenImageUpload(test.id, index)}>
                                                                <FileImage className="h-4 w-4 mr-1"/>
                                                                Soru {index + 1}
                                                            </Button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                       </div>
                                   </CardContent>
                               </Card>
                           )
                        })}
                     </div>
                </TabsContent>
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
                        mistakes={mistakes}
                        onOpenEditBank={openEditBankDialog}
                        onDeleteBank={handleDeleteBank}
                        onOpenEditExam={openEditExamDialog}
                        onDeleteExam={handleDeleteExam}
                        onOpenEditTest={openEditTestDialog}
                        onArchiveTest={handleArchiveTest}
                        onDeleteTest={handleDeleteTest}
                        onOpenEditMistake={openEditMistakeDialog}
                    />
                </TabsContent>
                <TabsContent value="curriculum" className="mt-4">
                    <SubjectManagement 
                        subjects={availableSubjects}
                        questionBanks={questionBanks}
                        onOpenEditBank={openEditBankDialog}
                        onDeleteSubject={handleDeleteSubject}
                        onCreateSubject={handleCreateSubject}
                        onDeleteTopic={handleDeleteTopic}
                        onAddTopic={handleAddTopic}
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
                        <DialogTitle>Testi Değerlendir: {gradingTest?.title}</DialogTitle>
                    </DialogHeader>
                    {gradingTest && (
                        <ManualGradeForm
                            ref={gradeFormRef}
                            test={gradingTest}
                            onSave={handleGradeSubmit}
                        />
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsGradeDialogOpen(false)}>İptal</Button>
                        <Button onClick={() => gradeFormRef.current?.submit()}>Değerlendirmeyi Tamamla</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isMistakeDialogOpen} onOpenChange={(open) => {if (!open) setEditingMistake(null); setIsMistakeDialogOpen(open);}}>
                <DialogContent>
                    {editingMistake && (
                        <EditMistakeForm 
                            mistake={editingMistake}
                            onFormSubmit={handleMistakeFormSubmit}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={isImageUploadOpen} onOpenChange={setIsImageUploadOpen}>
                <DialogContent className="max-w-4xl h-[80vh]">
                     <DialogHeader>
                        <DialogTitle>Soru Görseli Yükle</DialogTitle>
                     </DialogHeader>
                     {imageToCrop ? (
                        <ImageCropper image={imageToCrop} onCropComplete={handleImageCrop} />
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                             <input type="file" accept="image/*" className="hidden" ref={(node) => {
                                 if (node) node.onchange = (e) => {
                                     const file = (e.target as HTMLInputElement).files?.[0];
                                     if (file) {
                                         const reader = new FileReader();
                                         reader.onload = (event) => {
                                             setImageToCrop(event.target?.result as string);
                                         };
                                         reader.readAsDataURL(file);
                                     }
                                 };
                             }} />
                             <Button onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>Görsel Seç</Button>
                        </div>
                     )}
                </DialogContent>
            </Dialog>
        </>
    );
}

    

