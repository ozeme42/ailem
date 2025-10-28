

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, BarChart3, CheckCircle, XCircle, MinusCircle, Award, Home, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, ArrowRight, NotebookText, BookHeart, Sparkles, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, GraduationCap } from "lucide-react";
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
  
  const [viewMode, setViewMode] = React.useState<'cards' | 'weekly' | 'monthly' | 'list'>('cards');
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
    }, [tests, studentStudyAssignments]);
    
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
        
        if (viewMode === 'monthly') {
            const monthStart = startOfMonth(currentDate);
            const monthDays = Array.from({ length: 42 }).map((_, i) => addDays(startOfWeek(monthStart, {weekStartsOn: 1}), i));
            
            return (
                <div className="grid grid-cols-7 border-l border-t rounded-lg overflow-hidden">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                        <div key={day} className="p-2 text-center border-r border-b font-semibold text-sm">{day}</div>
                    ))}
                    {monthDays.map(day => (
                        <div key={day.toISOString()} className={cn("p-1.5 border-r border-b h-32 flex flex-col", format(day, 'M') !== format(currentDate, 'M') && 'bg-muted/50')}>
                           <span className={cn("font-semibold", isToday(day) && 'text-primary')}>{format(day, 'd')}</span>
                           <div className="space-y-0.5 overflow-y-auto mt-1">
                               {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).map(a => (
                                   <div key={a.id} className={cn("h-1.5 w-full rounded-full", a.type === 'test' ? 'bg-red-500' : 'bg-blue-500')} title={a.title}></div>
                               ))}
                           </div>
                        </div>
                    ))}
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
            <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="cards">Kartlar</TabsTrigger>
                <TabsTrigger value="weekly">Haftalık</TabsTrigger>
                <TabsTrigger value="monthly">Aylık</TabsTrigger>
                <TabsTrigger value="list">Liste</TabsTrigger>
            </TabsList>
            
             {(viewMode === 'weekly' || viewMode === 'monthly') && (
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => viewMode === 'weekly' ? addDays(d, -7) : subMonths(d, 1))}><ChevronLeft className="h-4 w-4"/></Button>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                     <p className="font-semibold text-center text-lg w-48">
                       {format(currentDate, viewMode === 'weekly' ? 'dd MMMM yyyy' : 'MMMM yyyy', { locale: tr })}
                    </p>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => viewMode === 'weekly' ? addDays(d, 7) : addMonths(d, 1))}><ChevronRight className="h-4 w-4"/></Button>
                </div>
             )}

            {viewMode === 'cards' ? (
                 <>
                    {selectedStudent && (
                        <Link href={`/education/stats?studentId=${selectedStudent.id}`} className="block mb-8 group">
                        <Card className="transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/50 group-hover:shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3"><BarChart3 className="text-primary"/> Genel Durum</CardTitle>
                                <CardDescription>{selectedStudent.name} için genel başarı durumu özeti. Detaylar için tıklayın.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-6 items-center">
                                    <div>
                                        <div className="text-4xl font-bold">{overallStats.testCount}</div>
                                        <p className="text-muted-foreground">Sonuçlanan Test</p>
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-2"><span className="text-4xl font-bold">{overallStats.successRate.toFixed(1)}</span><span className="text-xl text-muted-foreground">%</span></div>
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
                                            <CardHeader className="text-center"><Icon className="w-16 h-16 mx-auto mb-4" /><CardTitle className={cn("text-xl", colorClass)}>{category}</CardTitle></CardHeader>
                                            <CardContent className="flex-grow flex flex-col justify-center items-center text-center"><p className="text-lg text-foreground">{data.total} Adet Sınav</p><p className="text-sm text-green-600 font-medium">{data.completed} Adet Tamamlandı</p></CardContent>
                                            <CardFooter className="p-0"><Progress value={progressValue} className="h-1 rounded-b-lg rounded-t-none" indicatorClassName={progressColor} /></CardFooter>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    
                    <Card className="mt-8">
                        <CardHeader><CardTitle>Çözülecek Testler</CardTitle><CardDescription>{selectedStudent?.name} için atanmış ve henüz çözülmemiş tüm testler.</CardDescription></CardHeader>
                        <CardContent className="space-y-3">
                        {tests.length > 0 ? (
                            tests.filter(test => test.status === 'Atandı').map(test => {
                                const categoryName = getCategoryName(test);
                                const Icon = categoryIcons[categoryName] || FileText;
                                const colorClass = categoryColors[categoryName] || 'border-gray-500/80 text-gray-600';
                                const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                                const now = new Date();
                                const daysDiff = differenceInDays(dueDate, now);
                                const isTestDue = isPast(dueDate) && !isToday(dueDate);

                                return (
                                     <Card key={test.id} className={cn("overflow-hidden border-l-4", colorClass.replace('text-', 'border-'))}>
                                        <div className="flex items-center p-4 gap-4">
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon className={cn("w-4 h-4", colorClass)} />
                                                    <h3 className="font-semibold text-lg">{test.title}</h3>
                                                </div>
                                                <div className="flex items-center gap-4 ml-6">
                                                    <p className="text-sm text-muted-foreground">Son Teslim: {test.dueDate}</p>
                                                     {isTestDue
                                                        ? <Badge variant="destructive">{-daysDiff} gün geçti</Badge>
                                                        : isToday(dueDate)
                                                            ? <Badge variant="outline" className="text-orange-500 border-orange-500">Bugün Bitiyor</Badge>
                                                            : <Badge variant="secondary">Son {daysDiff + 1} gün</Badge>
                                                    }
                                                </div>
                                            </div>
                                            <Link href={`/education/${test.id}`} className="ml-auto">
                                                <Button size="sm">Teste Git <ArrowRight className="h-4 w-4 ml-2"/></Button>
                                            </Link>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (<p className="text-center text-muted-foreground p-4">Bu öğrenci için test bulunmuyor.</p>)}
                        {tests.filter(test => test.status === 'Atandı').length === 0 && tests.length > 0 && (<p className="text-center text-muted-foreground p-4">Bekleyen test bulunmuyor. Harika!</p>)}
                        </CardContent>
                    </Card>
                    
                    <Card className="mt-8">
                        <CardHeader><CardTitle>Konu Anlatımı Takibi</CardTitle><CardDescription>{selectedStudent?.name} için atanmış ve tamamlanmamış konu anlatımı görevleri.</CardDescription></CardHeader>
                        <CardContent>
                        {pendingStudies.length > 0 ? (
                            <div className="space-y-2">
                            {pendingStudies.map(study => (
                                <div key={study.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/10 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200 hover:bg-blue-500/20">
                                <Checkbox id={`study-${study.id}`} onCheckedChange={() => handleStudyAssignmentStatusChange(study)} className="border-primary"/>
                                <div className="flex-grow"><label htmlFor={`study-${study.id}`} className="font-semibold cursor-pointer text-sm">{study.topic}</label><p className="text-xs text-blue-800/80 dark:text-blue-300/80">{study.studyPlanTitle} - {study.subject}</p></div>
                                <Badge variant="outline" className="text-xs">Bitiş: {format(parseISO(study.dueDate), "dd MMM", {locale: tr})}</Badge>
                                </div>
                            ))}
                            </div>
                        ) : (<p className="text-center text-muted-foreground p-4">Tamamlanmamış konu anlatımı görevi bulunmuyor.</p>)}
                        </CardContent>
                    </Card>
                 </>
            ) : renderCalendarView() }

        </Tabs>
    </>
  );
}

