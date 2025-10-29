
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, BarChart3, CheckCircle, XCircle, MinusCircle, Award, Home, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, ArrowRight, NotebookText, BookHeart, Sparkles, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, GraduationCap, Check } from "lucide-react";
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
import { format, parseISO, parse, compareDesc, compareAsc, isToday, startOfWeek, addDays, endOfMonth, endOfDay, isWithinInterval, startOfMonth, addMonths, subMonths, isPast, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
    'Genel Deneme Sınavları': 'yellow-500',
    'Matematik': 'red-500',
    'Fen Bilimleri': 'orange-500',
    'Türkçe': 'yellow-400',
    'Sosyal Bilgiler': 'cyan-500',
    'İngilizce': 'blue-500',
    'Serbest Etkinlikler': 'purple-500',
    'Diğer': 'gray-500',
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

const categoryCardColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'bg-yellow-500/10 text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-200',
    'Matematik': 'bg-red-500/10 text-red-900 dark:bg-red-500/10 dark:text-red-200',
    'Fen Bilimleri': 'bg-orange-500/10 text-orange-900 dark:bg-orange-500/10 dark:text-orange-200',
    'Türkçe': 'bg-yellow-400/10 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-200',
    'Sosyal Bilgiler': 'bg-cyan-500/10 text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-200',
    'İngilizce': 'bg-blue-500/10 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200',
    'Serbest Etkinlikler': 'bg-purple-500/10 text-purple-900 dark:bg-purple-500/10 dark:text-purple-200',
    'Diğer': 'bg-gray-500/10 text-gray-800 dark:bg-gray-500/10 dark:text-gray-200',
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
  
  const [viewMode, setViewMode] = React.useState<'cards' | 'weekly' | 'list'>('cards');
  const [currentDate, setCurrentDate] = React.useState(new Date());


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

  const { pendingStudies, completedStudies } = React.useMemo(() => {
    if (!selectedStudent) return { pendingStudies: [], completedStudies: [] };

    const studentAssignments = studyAssignments
      .filter(sa => sa.studentId === selectedStudent.id)
      .map(sa => ({...sa, studyPlanTitle: studyPlans.find(p => p.id === sa.studyPlanId)?.title }));
      
    const pending = studentAssignments
      .filter(sa => sa.status === 'assigned')
      .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));

    const completed = studentAssignments
      .filter(sa => sa.status === 'completed')
      .sort((a, b) => compareDesc(parseISO(a.completedAt || '1970-01-01'), parseISO(b.completedAt || '1970-01-01')));

    return { pendingStudies: pending, completedStudies: completed };
}, [selectedStudent, studyAssignments, studyPlans]);


  
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
        if (test.status === 'Sonuçlandı') {
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
  
    const studyPlanStats = React.useMemo(() => {
        if (!selectedStudent) return [];

        const studentAssignments = studyAssignments.filter(sa => sa.studentId === selectedStudent.id);
        const assignmentsByPlan = new Map<string, { completed: number, total: number }>();
        
        studentAssignments.forEach(sa => {
            const current = assignmentsByPlan.get(sa.studyPlanId) || { completed: 0, total: 0 };
            current.total++;
            if (sa.status === 'completed') {
                current.completed++;
            }
            assignmentsByPlan.set(sa.studyPlanId, current);
        });

        return studyPlans
            .filter(plan => assignmentsByPlan.has(plan.id))
            .map(plan => ({
                plan,
                progress: assignmentsByPlan.get(plan.id)!,
            }));
    }, [selectedStudent, studyPlans, studyAssignments]);


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

    const allAssignments = React.useMemo(() => {
        const testAssignments = tests.map(t => ({
            id: t.id,
            title: t.title,
            type: 'test' as const,
            Icon: GraduationCap,
            startDate: parse(t.assignedDate, 'dd MMMM yyyy', new Date(), {locale: tr}),
            endDate: parse(t.dueDate, 'dd MMMM yyyy', new Date(), {locale: tr}),
            isCompleted: t.status !== 'Atandı',
        }));
        const studentStudyAssignments = studyAssignments.filter(sa => sa.studentId === selectedStudent?.id);
        const studyAssignmentsData = studentStudyAssignments.map(s => ({
            id: s.id,
            title: s.topic,
            type: 'study' as const,
            Icon: BookHeart,
            startDate: parseISO(s.startDate),
            endDate: parseISO(s.dueDate),
            isCompleted: s.status === 'completed',
        }));
        return [...testAssignments, ...studyAssignmentsData].sort((a,b) => compareAsc(a.startDate, b.startDate));
    }, [tests, studyAssignments, selectedStudent]);
    
    const renderCalendarView = () => {
        if (viewMode === 'weekly') {
             const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
             const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
             
             return (
                <div className="border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-7">
                    <div className="hidden md:grid md:grid-cols-7 col-span-full border-b">
                         {weekDays.map(day => (
                            <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
                                <p className="font-semibold text-sm capitalize">{format(day, 'EEE', {locale: tr})}</p>
                            </div>
                        ))}
                    </div>
                     <div className="md:hidden col-span-full divide-y">
                        {weekDays.map(day => (
                           <div key={day.toISOString()} className="p-2 flex flex-row md:flex-col gap-2">
                               <div className="w-20 text-center md:text-left md:w-auto shrink-0">
                                    <p className="font-semibold text-sm capitalize">{format(day, 'd MMM', { locale: tr })}</p>
                                    <p className="text-xs capitalize text-muted-foreground">{format(day, 'EEE', {locale: tr})}</p>
                               </div>
                               <div className="space-y-1 overflow-y-auto flex-grow">
                                   {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).map(a => (
                                       <div key={a.id} className={cn("p-1.5 rounded-md text-xs", a.type === 'test' ? 'bg-red-500/10 text-red-900' : 'bg-blue-500/10 text-blue-900')}>
                                           <p className="font-semibold truncate flex items-center gap-1"><a.Icon className="h-3 w-3 shrink-0"/>{a.title}</p>
                                       </div>
                                   ))}
                               </div>
                           </div>
                        ))}
                     </div>
                     <div className="hidden md:grid md:grid-cols-7 col-span-full">
                         {weekDays.map(day => (
                           <div key={day.toISOString()} className="p-2 border-r last:border-r-0 min-h-[10rem] flex flex-col gap-2">
                               <div className="w-auto text-left">
                                    <p className="font-semibold text-sm capitalize">{format(day, 'd MMM', { locale: tr })}</p>
                               </div>
                               <div className="space-y-1 overflow-y-auto flex-grow">
                                   {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).map(a => (
                                       <div key={a.id} className={cn("p-1.5 rounded-md text-xs", a.type === 'test' ? 'bg-red-500/10 text-red-900' : 'bg-blue-500/10 text-blue-900')}>
                                           <p className="font-semibold truncate flex items-center gap-1"><a.Icon className="h-3 w-3 shrink-0"/>{a.title}</p>
                                       </div>
                                   ))}
                               </div>
                           </div>
                        ))}
                    </div>
                 </div>
             )
        }
        
        if (viewMode === 'list') {
            const now = new Date();
            const pendingAssignments = allAssignments.filter(a => !a.isCompleted);
            const completedAssignments = allAssignments.filter(a => a.isCompleted).sort((a,b) => compareDesc(a.endDate, b.endDate));

            const pendingTestAssignments = pendingAssignments.filter(a => a.type === 'test');
            const pendingStudyAssignments = pendingAssignments.filter(a => a.type === 'study');
            
            return (
                 <div className="space-y-8">
                    {pendingAssignments.length > 0 ? (
                        <div>
                             <h3 className="text-xl font-semibold mb-3">Devam Edenler ({pendingAssignments.length})</h3>
                             <div className="space-y-6">
                                {pendingTestAssignments.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-medium mb-2 text-muted-foreground">Testler ve Denemeler ({pendingTestAssignments.length})</h4>
                                        <div className="space-y-2">
                                            {pendingTestAssignments.map(a => {
                                                const daysDiff = differenceInDays(a.endDate, now);
                                                const isDue = isPast(a.endDate) && !isToday(a.endDate);
                                                return (
                                                    <Card key={a.id} className="flex items-center p-3 gap-3">
                                                        <a.Icon className="h-5 w-5 shrink-0 text-red-500" />
                                                        <div className="flex-grow">
                                                            <p className="font-semibold">{a.title}</p>
                                                             <p className="text-xs text-muted-foreground">{format(a.endDate, 'dd MMMM yyyy', {locale: tr})}</p>
                                                        </div>
                                                        {isDue
                                                            ? <Badge variant="destructive">{-daysDiff} gün geçti</Badge>
                                                            : isToday(a.endDate)
                                                                ? <Badge variant="outline" className="text-orange-500 border-orange-500">Bugün Bitiyor</Badge>
                                                                : <Badge variant="secondary">Son {daysDiff + 1} gün</Badge>
                                                        }
                                                    </Card>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                {pendingStudyAssignments.length > 0 && (
                                     <div>
                                        <h4 className="text-lg font-medium mb-2 text-muted-foreground">Konu Anlatımları ({pendingStudyAssignments.length})</h4>
                                        <div className="space-y-2">
                                        {pendingStudyAssignments.map(a => {
                                            const daysDiff = differenceInDays(a.endDate, now);
                                            const isDue = isPast(a.endDate) && !isToday(a.endDate);
                                            return (
                                                <Card key={a.id} className="flex items-center p-3 gap-3">
                                                    <a.Icon className="h-5 w-5 shrink-0 text-blue-500" />
                                                    <div className="flex-grow">
                                                        <p className="font-semibold">{a.title}</p>
                                                        <p className="text-xs text-muted-foreground">{format(a.endDate, 'dd MMMM yyyy', {locale: tr})}</p>
                                                    </div>
                                                    {isDue
                                                        ? <Badge variant="destructive">{-daysDiff} gün geçti</Badge>
                                                        : isToday(a.endDate)
                                                            ? <Badge variant="outline" className="text-orange-500 border-orange-500">Bugün Bitiyor</Badge>
                                                            : <Badge variant="secondary">Son {daysDiff + 1} gün</Badge>
                                                    }
                                                </Card>
                                            )
                                        })}
                                        </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    ) : (
                        <Card className="p-4 text-center text-muted-foreground text-sm">Bekleyen görev yok.</Card>
                    )}

                     <div>
                        <h3 className="text-xl font-semibold mb-3">Tamamlananlar ({completedAssignments.length})</h3>
                         <div className="space-y-2">
                             {completedAssignments.length > 0 ? completedAssignments.map(a => (
                                <Card key={a.id} className="flex items-center p-3 gap-3 bg-muted/50">
                                    <a.Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-muted-foreground line-through">{a.title}</p>
                                        <p className="text-xs text-muted-foreground">{format(a.endDate, 'dd MMMM yyyy', {locale: tr})}</p>
                                    </div>
                                    <Badge variant="secondary">Tamamlandı</Badge>
                                </Card>
                            )) : <Card className="p-4 text-center text-muted-foreground text-sm">Henüz tamamlanan görev yok.</Card>}
                        </div>
                    </div>
                </div>
            )
        }
        
        return null;
    }


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
      
       <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-1">
                <TabsTrigger value="cards" className="data-[state=active]:bg-white/90 data-[state=active]:text-primary data-[state=active]:shadow-md text-white/90">Kartlar</TabsTrigger>
                <TabsTrigger value="weekly" className="data-[state=active]:bg-white/90 data-[state=active]:text-primary data-[state=active]:shadow-md text-white/90">Haftalık</TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-white/90 data-[state=active]:text-primary data-[state=active]:shadow-md text-white/90">Liste</TabsTrigger>
            </TabsList>
            
             {(viewMode === 'weekly') && (
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}><ChevronLeft className="h-4 w-4"/></Button>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                     <p className="font-semibold text-center text-lg w-48">
                       {format(currentDate, 'dd MMMM yyyy', { locale: tr })}
                    </p>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}><ChevronRight className="h-4 w-4"/></Button>
                </div>
             )}

            {viewMode === 'cards' ? (
                 <>
                    {selectedStudent && (
                        <Card className="transition-all duration-300 mb-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3"><BarChart3/> Genel Durum</CardTitle>
                                <CardDescription className="text-white/80">{selectedStudent.name} için genel başarı durumu özeti.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-6 items-center">
                                    <div>
                                        <div className="text-4xl font-bold">{overallStats.testCount}</div>
                                        <p className="text-white/80">Sonuçlanan Test</p>
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-2"><span className="text-4xl font-bold">{overallStats.successRate.toFixed(1)}</span><span className="text-xl text-white/80">%</span></div>
                                        <p className="text-white/80">Genel Başarı Oranı</p>
                                        <Progress value={overallStats.successRate} className="mt-2 h-2 bg-white/30" indicatorClassName="bg-white" />
                                    </div>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Link href={`/education/stats?studentId=${selectedStudent.id}`} className="w-full">
                                    <Button variant="secondary" className="w-full bg-white/20 text-white hover:bg-white/30">
                                        Tüm İstatistikleri Gör <ArrowRight className="h-4 w-4 ml-2"/>
                                    </Button>
                                </Link>
                           </CardFooter>
                        </Card>
                    )}
                    
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-xl font-bold mb-4">Test Kategorileri</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {testsByCategory.map(([category, data]) => {
                                if (data.total === 0) return null;
                                const Icon = categoryIcons[category] || FileText;
                                const colorClass = categoryCardColors[category] || 'bg-gray-500/10 text-gray-800';
                                const progressColor = categoryProgressColors[category] || 'bg-gray-500';
                                const progressValue = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                    
                                return (
                                    <Link key={category} href={`/education/category/${encodeURIComponent(category)}?studentId=${selectedStudent?.id}`} className="block group">
                                        <Card className={cn("flex flex-col shadow-sm hover:shadow-lg transition-all group-hover:-translate-y-1 h-full", colorClass)}>
                                            <CardHeader className="text-center">
                                                <Icon className="w-16 h-16 mx-auto mb-4 opacity-80" />
                                                <CardTitle className="text-xl text-current">{category}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                                                <p className="text-lg font-semibold">{data.total} Adet Sınav</p>
                                                <p className="text-sm text-green-600 font-medium">{data.completed} Adet Tamamlandı</p>
                                            </CardContent>
                                            <CardFooter className="p-0">
                                                <Progress value={progressValue} className="h-1 rounded-b-lg rounded-t-none bg-black/10" indicatorClassName={progressColor} />
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                      </div>

                       <Card>
                            <CardHeader>
                                <CardTitle>Çözülecek Testler</CardTitle>
                                <CardDescription>{selectedStudent?.name} için atanmış ve henüz çözülmemiş tüm testler.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                            {tests.length > 0 ? (
                                tests.filter(test => test.status === 'Atandı').map(test => {
                                    const categoryName = getCategoryName(test);
                                    const cardColor = categoryCardColors[categoryName] || 'bg-gray-500/10 text-gray-800 dark:bg-gray-500/10 dark:text-gray-200';
                                    const iconColor = `text-${categoryColors[categoryName] || 'gray-500'}`;
                                    const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                                    const now = new Date();
                                    const daysDiff = differenceInDays(dueDate, now);
                                    const isTestDue = isPast(dueDate) && !isToday(dueDate);

                                    return (
                                        <Card key={test.id} className={cn('overflow-hidden', cardColor)}>
                                            <div className="flex items-center p-4 gap-4">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={cn('w-4 h-4 text-current')}>{React.createElement(categoryIcons[categoryName] || FileText, { className: "w-4 h-4" })}</div>
                                                        <h3 className="font-semibold text-lg">{test.title}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-4 ml-6">
                                                        <p className="text-sm text-current/80">Son Teslim: {test.dueDate}</p>
                                                        {isTestDue
                                                            ? <Badge variant="destructive">{-daysDiff} gün geçti</Badge>
                                                            : isToday(dueDate)
                                                                ? <Badge variant="outline" className="text-orange-500 border-orange-500">Bugün Bitiyor</Badge>
                                                                : <Badge variant="secondary">Son {daysDiff + 1} gün</Badge>
                                                        }
                                                    </div>
                                                </div>
                                                <Link href={`/education/${test.id}`} className="ml-auto">
                                                    <Button size="sm" variant="default">Teste Git <ArrowRight className="h-4 w-4 ml-2"/></Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    );
                                })
                            ) : (<p className="text-center text-muted-foreground p-4">Bu öğrenci için test bulunmuyor.</p>)}
                            {tests.filter(test => test.status === 'Atandı').length === 0 && tests.length > 0 && (<p className="text-center text-muted-foreground p-4">Bekleyen test bulunmuyor. Harika!</p>)}
                            </CardContent>
                        </Card>
                        
                      {studyPlanStats.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-4">Konu Anlatım Planları</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                             {studyPlanStats.map(({ plan, progress }) => (
                                <Link key={plan.id} href={`/education/study`} className="block group">
                                    <Card className="flex flex-col shadow-sm hover:shadow-lg transition-all group-hover:-translate-y-1 h-full bg-pink-500/10 text-pink-900 dark:bg-pink-500/10 dark:text-pink-200">
                                        <CardHeader className="text-center">
                                            <BookHeart className="w-16 h-16 mx-auto mb-4 opacity-80 text-current" />
                                            <CardTitle className="text-xl text-current">{plan.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                                            <p className="text-lg font-semibold">{progress.total} Konu</p>
                                            <p className="text-sm text-green-600 font-medium">{progress.completed} Tamamlandı</p>
                                        </CardContent>
                                        <CardFooter className="p-0">
                                            <Progress value={(progress.completed / progress.total) * 100} className="h-1 rounded-b-lg rounded-t-none bg-black/10" indicatorClassName="bg-pink-500" />
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                 </>
            ) : renderCalendarView() }

        </Tabs>
    </>
  );
}

    

    

    