

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, BarChart3, CheckCircle, XCircle, MinusCircle, Award, Home, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, ArrowRight, NotebookText, BookHeart } from "lucide-react";
import Image from "next/image";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTestForm } from "@/components/new-test-form";
import { QuestionBank, Test, PracticeExam, FamilyMember } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";
import { onTestsUpdate, onQuestionBanksUpdate, onPracticeExamsUpdate, updateTest, addTest, deleteTest, onSubjectsUpdate, updateSubjects, checkAndAwardBadges } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parseISO, parse, compareDesc } from 'date-fns';
import { tr } from 'date-fns/locale';

const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
    'Yanlış Havuzu': NotebookText,
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
    'Yanlış Havuzu': 'border-pink-500/80 text-pink-600',
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
    'Yanlış Havuzu': 'bg-pink-500',
    'Diğer': 'bg-gray-500',
};

const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlış Havuzu';
    return test.subject || 'Diğer';
};


export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers, familyId } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [editingTest, setEditingTest] = React.useState<Test | null>(null);
  
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
    const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
    const unsubExams = onPracticeExamsUpdate(setPracticeExams);
    const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
    
    return () => {
      unsubTests();
      unsubBanks();
      unsubExams();
      unsubSubjects();
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
  
  const handleCreateSubject = async (subjectName: string) => {
    const newSubjects = [...new Set([...availableSubjects, subjectName])];
    await updateSubjects(newSubjects);
  };


  const handleAssignmentSubmit = async (testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => {
    try {
        if (id) {
            await updateTest(id, testData);
            toast({ title: "✅ Ödev Güncellendi", description: "Ödev bilgileri başarıyla güncellendi." });
        } else {
            await addTest({ ...testData, status: 'Atandı', isArchived: false });
            toast({ title: "✅ Ödev Atandı", description: "Yeni ödev başarıyla öğrenciye atandı." });
        }
        setIsAssignDialogOpen(false);
        setEditingTest(null);
    } catch (error) {
         toast({ title: "❌ Kaydetme Hatası", description: "Ödev kaydedilirken bir hata oluştu.", variant: 'destructive'});
    }
  };

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

    const categoryOrder = ['Genel Deneme Sınavları', 'Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Yanlış Havuzu', 'Diğer'];
    
    return Object.entries(categories).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

  }, [tests]);

  return (
    <>
      <PageHeader title="Eğitim & Sınav 🎓">
        <Link href="/education/study">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                <BookHeart className="mr-2 h-4 w-4" />
                Konu Anlatımı
            </Button>
        </Link>
         <Link href="/education/mistake-pool">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                <NotebookText className="mr-2 h-4 w-4" />
                Yanlış Havuzu
            </Button>
        </Link>
         <Link href="/education/management">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                <Settings className="mr-2 h-4 w-4" />
                İçerik Yönetimi
            </Button>
        </Link>
         <Dialog open={isAssignDialogOpen} onOpenChange={(open) => { if (!open) setEditingTest(null); setIsAssignDialogOpen(open); }}>
            <DialogTrigger asChild>
                <Button className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Ödev Ata
                </Button>
            </DialogTrigger>
             <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>{editingTest ? "Ödevi Düzenle" : "Yeni Ödev Ata"}</DialogTitle>
                <DialogDescription>
                    {editingTest ? "Mevcut ödevin ayrıntılarını düzenleyin." : "Öğrenciye yeni bir test, soru bankası konusu veya deneme sınavı atayın."}
                </DialogDescription>
                </DialogHeader>
                <NewTestForm 
                    students={studentMembers} 
                    questionBanks={questionBanks}
                    practiceExams={practiceExams}
                    onAssign={handleAssignmentSubmit}
                    initialData={editingTest}
                    availableSubjects={availableSubjects}
                    onSubjectCreated={handleCreateSubject}
                />
            </DialogContent>
         </Dialog>
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
          <CardTitle>Atanmış ve Bekleyen Tüm Testler</CardTitle>
          <CardDescription>{selectedStudent?.name} için atanmış ve tamamlanmış tüm testlerin birleşik listesi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tests.length > 0 ? (
            tests.filter(test => test.status !== 'Değerlendirme Bekliyor').map(test => {
                return (
                    <Card key={test.id} className="flex flex-col sm:flex-row justify-between items-center p-4">
                        <div className="flex-grow">
                            <Badge variant={test.status === 'Sonuçlandı' ? "default" : "outline"}>{test.status}</Badge>
                            <h3 className="font-semibold text-lg">{test.title}</h3>
                            <p className="text-sm text-muted-foreground">{test.subject} - Son Teslim: {test.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0">
                             {test.status === 'Atandı' && <Link href={`/education/${test.id}`}><Button>Teste Git</Button></Link>}
                             {test.status === 'Sonuçlandı' && <Link href={`/education/${test.id}`}><Button variant="secondary">Sonuçları Göster</Button></Link>}
                        </div>
                    </Card>
                );
            })
          ) : (
            <p className="text-center text-muted-foreground p-4">Bu öğrenci için test bulunmuyor.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

    
