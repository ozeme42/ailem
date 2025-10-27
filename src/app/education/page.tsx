

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, BarChart3, CheckCircle, XCircle, MinusCircle, Award, Home, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, ArrowRight, NotebookText, BookHeart, Sparkles } from "lucide-react";
import Image from "next/image";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QuestionBank, Test, PracticeExam, FamilyMember, StudyAssignment, StudyPlan } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";
import { onTestsUpdate, onQuestionBanksUpdate, onPracticeExamsUpdate, updateTest, addTest, deleteTest, onSubjectsUpdate, updateSubjects, checkAndAwardBadges, onStudyAssignmentsUpdate, onStudyPlansUpdate, updateStudyAssignment } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parseISO, parse, compareDesc, compareAsc, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
    'Diğer': FileText,
};

const categoryColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'border-yellow-500/80 text-yellow-600',
    'Matematik': 'border-red-500/80 text-red-600',
    'Fen Bilimleri': 'border-orange-500/80 text-orange-600',
    'Türkçe': 'border-yellow-400/80 text-yellow-500',
    'Sosyal Bilgiler': 'border-cyan-500/80 text-cyan-600',
    'İngilizce': 'border-blue-500/80 text-blue-600',
    'Serbest Etkinlikler': 'border-purple-500/80 text-purple-600',
    'Diğer': 'border-gray-500/80 text-gray-600',
};

const categoryProgressColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'bg-yellow-500',
    'Matematik': 'bg-red-500',
    'Fen Bilimleri': 'bg-orange-500',
    'Türkçe': 'bg-yellow-400',
    'Sosyal Bilgiler': 'bg-cyan-500',
    'İngilizce': 'bg-blue-500',
    'Serbest Etkinlikler': 'bg-purple-500',
    'Diğer': 'bg-gray-500',
};

export const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};


export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers, familyId } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  
  const studentMembers = React.useMemo(() => 
    familyMembers.filter(m => m.role.includes('Çocuk')), 
  [familyMembers]);

  React.useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  React.useEffect(() => {
    const unsubTests = onTestsUpdate(setAllTests);
    const unsubStudyAssignments = onStudyAssignmentsUpdate(setStudyAssignments);
    const unsubStudyPlans = onStudyPlansUpdate(setStudyPlans);
    
    return () => {
      unsubTests();
      unsubStudyAssignments();
      unsubStudyPlans();
    }
  }, []);
  
  const tests = React.useMemo(() => {
    if (!selectedStudent) return [];
    return allTests
      .filter(t => t.studentId === selectedStudent.id)
      .sort((a,b) => {
          try {
              const dateA = parse(a.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
              const dateB = parse(b.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
              if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
              return compareDesc(dateA, dateB);
          } catch (e) {
              return 0;
          }
      });
  }, [selectedStudent, allTests]);

  const studentStudyAssignments = React.useMemo(() => {
    if (!selectedStudent) return [];
    return studyAssignments.filter(sa => sa.studentId === selectedStudent.id);
  }, [selectedStudent, studyAssignments]);

  const pendingStudies = React.useMemo(() => {
    return studentStudyAssignments
      .filter(sa => sa.status === 'assigned')
      .map(sa => ({...sa, studyPlanTitle: studyPlans.find(p => p.id === sa.studyPlanId)?.title }))
      .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
  }, [studentStudyAssignments, studyPlans]);
  
  const overallStats = React.useMemo(() => {
    const evaluatedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const totalQuestions = evaluatedTests.reduce((sum, test) => sum + (test.questionCount || 0), 0);
    const totalCorrect = evaluatedTests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0);
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      testCount: evaluatedTests.length,
      successRate: successRate,
    }
  }, [tests]);
  
  const testsByCategory = React.useMemo(() => {
    const categories: { [key: string]: { total: number, completed: number } } = {};

    tests.forEach(test => {
        const categoryName = getCategoryName(test);
        if (!categories[categoryName]) {
            categories[categoryName] = { total: 0, completed: 0 };
        }
        categories[categoryName].total++;
        if (test.status !== 'Atandı') {
            categories[categoryName].completed++;
        }
    });

    const categoryOrder = ['Genel Deneme Sınavları', 'Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Yanlışlarım', 'Diğer'];
    
    return Object.entries(categories).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

  }, [tests]);

  const handleStudyAssignmentStatusChange = async (assignment: StudyAssignment) => {
    const newStatus = assignment.status === 'completed' ? 'assigned' : 'completed';
    const updateData: Partial<StudyAssignment> = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };
    try {
      await updateStudyAssignment(assignment.id, updateData);
      if (newStatus === 'completed') {
        toast({
          title: '✅ Harika İş!',
          description: `"${assignment.topic}" konusunu tamamladın.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Görev durumu güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };


  return (
    <>
      <PageHeader title="Eğitim & Sınav 🎓">
         <Link href="/education/management">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                <Settings className="mr-2 h-4 w-4" />
                İçerik Yönetimi
            </Button>
        </Link>
        <Link href="/education/management/assign">
            <Button className="bg-white/20 text-white hover:bg-white/30 border-none">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Ödev Ata
            </Button>
        </Link>
      </PageHeader>


      <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
        {studentMembers.map((student) => (
          <Button
            key={student.id}
            variant={selectedStudent?.id === student.id ? "default" : "outline"}
            className={`flex-shrink-0 h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 ${selectedStudent?.id === student.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
            onClick={() => setSelectedStudent(student)}
          >
            <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                style={{ backgroundColor: student.color, color: '#fff' }}
            >
                {student.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-sm">{student.name}</p>
          </Button>
        ))}
      </div>
      
      {selectedStudent && (
        <Link href={`/education/stats?studentId=${selectedStudent.id}`} className="block mb-8 group">
          <Card className="transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/50 group-hover:shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <BarChart3 className="text-primary"/>
                  Genel Durum
                </CardTitle>
                <CardDescription>
                  {selectedStudent.name} için genel başarı durumu özeti. Detaylar için tıklayın.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6 items-center">
                    <div>
                        <div className="text-4xl font-bold">{overallStats.testCount}</div>
                        <p className="text-muted-foreground">Sonuçlanan Test</p>
                    </div>
                     <div>
                        <div className="flex items-baseline gap-2">
                           <span className="text-4xl font-bold">{overallStats.successRate.toFixed(1)}</span>
                           <span className="text-xl text-muted-foreground">%</span>
                        </div>
                        <p className="text-muted-foreground">Genel Başarı Oranı</p>
                        <Progress value={overallStats.successRate} className="mt-2 h-2" />
                    </div>
                </div>
            </CardContent>
          </Card>
        </Link>
      )}

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {testsByCategory.map(([category, data]) => {
                if (data.total === 0) return null;
                const Icon = categoryIcons[category] || FileText;
                const colorClass = categoryColors[category] || 'border-gray-500/80 text-gray-600';
                const progressColor = categoryProgressColors[category] || 'bg-gray-500';
                const progressValue = data.total > 0 ? (data.completed / data.total) * 100 : 0;

                return (
                    <Link key={category} href={`/education/category/${encodeURIComponent(category)}?studentId=${selectedStudent?.id}`} className="block group">
                        <Card className={cn("flex flex-col border-t-4 shadow-sm hover:shadow-lg transition-all group-hover:-translate-y-1 h-full", colorClass)}>
                            <CardHeader className="text-center">
                                <Icon className="w-16 h-16 mx-auto mb-4" />
                                <CardTitle className={cn("text-xl", colorClass)}>{category}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                                <p className="text-lg text-foreground">{data.total} Adet Sınav</p>
                                <p className="text-sm text-green-600 font-medium">{data.completed} Adet Tamamlandı</p>
                            </CardContent>
                            <CardFooter className="p-0">
                                <Progress value={progressValue} className="h-1 rounded-b-lg rounded-t-none" indicatorClassName={progressColor} />
                            </CardFooter>
                        </Card>
                    </Link>
                )
            })}
        </div>
       
       <Card className="mt-8">
        <CardHeader>
          <CardTitle>Çözülecek Testler</CardTitle>
          <CardDescription>{selectedStudent?.name} için atanmış ve henüz çözülmemiş tüm testler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tests.length > 0 ? (
            tests.filter(test => test.status === 'Atandı').map(test => {
                return (
                    <Card key={test.id} className="flex flex-col sm:flex-row justify-between items-center p-4">
                        <div className="flex-grow">
                            <Badge variant={"outline"}>{test.subject}</Badge>
                            <h3 className="font-semibold text-lg">{test.title}</h3>
                            <p className="text-sm text-muted-foreground">Son Teslim: {test.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0">
                             <Link href={`/education/${test.id}`}><Button>Teste Git</Button></Link>
                        </div>
                    </Card>
                );
            })
          ) : (
            <p className="text-center text-muted-foreground p-4">Bu öğrenci için test bulunmuyor.</p>
          )}
          {tests.filter(test => test.status === 'Atandı').length === 0 && tests.length > 0 && (
              <p className="text-center text-muted-foreground p-4">Bekleyen test bulunmuyor. Harika!</p>
          )}
        </CardContent>
      </Card>
      
       <Card className="mt-8">
        <CardHeader>
          <CardTitle>Konu Anlatımı Takibi</CardTitle>
          <CardDescription>{selectedStudent?.name} için atanmış ve tamamlanmamış konu anlatımı görevleri.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingStudies.length > 0 ? (
            <div className="space-y-2">
              {pendingStudies.map(study => (
                <div key={study.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/10 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200 hover:bg-blue-500/20">
                   <Checkbox
                        id={`study-${study.id}`}
                        onCheckedChange={() => handleStudyAssignmentStatusChange(study)}
                        className="border-primary"
                    />
                  <div className="flex-grow">
                    <label htmlFor={`study-${study.id}`} className="font-semibold cursor-pointer text-sm">{study.topic}</label>
                    <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
                      {study.studyPlanTitle} - {study.subject}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">Bitiş: {format(parseISO(study.dueDate), "dd MMM", {locale: tr})}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground p-4">Tamamlanmamış konu anlatımı görevi bulunmuyor.</p>
          )}
        </CardContent>
      </Card>

    </>
  );
}

