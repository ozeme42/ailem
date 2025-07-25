
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, BarChart3, CheckCircle, XCircle, MinusCircle, Award } from "lucide-react";
import Image from "next/image";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTestForm } from "@/components/new-test-form";
import { students, examProgress, QuestionBank, Test, PracticeExam } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";
import { onTestsUpdate, onQuestionBanksUpdate, onPracticeExamsUpdate, updateTest, addTest, deleteTest, onSubjectsUpdate, updateSubjects } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  
  const [tests, setTests] = React.useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [editingTest, setEditingTest] = React.useState<Test | null>(null);
  const [gradingTest, setGradingTest] = React.useState<Test | null>(null);

  const studentMembers = React.useMemo(() => 
    familyMembers.filter(m => m.role.includes('Çocuk')), 
  [familyMembers]);

  React.useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  React.useEffect(() => {
    if (!selectedStudent) return;
    const unsubTests = onTestsUpdate((allTests) => {
        setTests(allTests.filter(t => t.studentId === selectedStudent.id));
    });
    const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
    const unsubExams = onPracticeExamsUpdate(setPracticeExams);
    const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
    
    return () => {
      unsubTests();
      unsubBanks();
      unsubExams();
      unsubSubjects();
    }
  }, [selectedStudent]);
  
  const handleCreateSubject = async (subjectName: string) => {
    const newSubjects = [...new Set([...availableSubjects, subjectName])];
    await updateSubjects(newSubjects);
  };


  const handleAssignmentSubmit = async (testData: Omit<Test, 'id' | 'status' | 'familyId'>, id?: string) => {
    try {
        if (id) {
            await updateTest(id, testData);
            toast({ title: "✅ Ödev Güncellendi", description: "Ödev bilgileri başarıyla güncellendi." });
        } else {
            await addTest({ ...testData, status: 'Atandı' });
            toast({ title: "✅ Ödev Atandı", description: "Yeni ödev başarıyla öğrenciye atandı." });
        }
        setIsAssignDialogOpen(false);
        setEditingTest(null);
    } catch (error) {
         toast({ title: "❌ Kaydetme Hatası", description: "Ödev kaydedilirken bir hata oluştu.", variant: 'destructive'});
    }
  };
  
  const handleDeleteTest = async (testId: string) => {
    try {
        await deleteTest(testId);
        toast({ title: "🗑️ Ödev Silindi", variant: "destructive" });
    } catch (error) {
         toast({ title: "❌ Silme Hatası", description: "Ödev silinirken bir hata oluştu.", variant: 'destructive'});
    }
  };

  const handleManualGrade = async (testId: string, gradeData: ManualGradeData) => {
      try {
        await updateTest(testId, {
            status: 'Değerlendirildi',
            correctAnswers: gradeData.correct,
            incorrectAnswers: gradeData.incorrect,
            emptyAnswers: gradeData.empty,
            score: (gradeData.correct / (gradingTest?.questionCount || 1)) * 100,
            studentTextAnswersEvaluation: gradeData.evaluations,
        });
        toast({ title: "✅ Test Değerlendirildi", description: "Sonuçlar başarıyla kaydedildi." });
        setGradingTest(null);
      } catch(error) {
        toast({ title: "❌ Kaydetme Hatası", description: "Sonuçlar kaydedilirken bir hata oluştu.", variant: 'destructive'});
      }
  }

  const handleOpenEditTest = (test: Test) => {
    setEditingTest(test);
    setIsAssignDialogOpen(true);
  };
  
  const handleOpenNewTest = () => {
    setEditingTest(null);
    setIsAssignDialogOpen(true);
  };

  const assignedTests = tests.filter(t => t.status === 'Atandı');
  const completedTests = tests.filter(t => t.status !== 'Atandı');

  const getStatusBadgeClasses = (status: 'Atandı' | 'Çözüldü' | 'Değerlendirildi') => {
     switch (status) {
      case 'Atandı': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'Çözüldü': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'Değerlendirildi': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  }
  
  const overallStats = React.useMemo(() => {
    const evaluatedTests = completedTests.filter(t => t.status === 'Değerlendirildi');
    const totalQuestions = evaluatedTests.reduce((sum, test) => sum + (test.questionCount || 0), 0);
    const totalCorrect = evaluatedTests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0);
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      testCount: evaluatedTests.length,
      successRate: successRate,
    }
  }, [completedTests]);

  const parseAndFormatDate = (dateString: string) => {
    try {
        const parsedDate = parse(dateString, 'dd MMMM yyyy', new Date(), { locale: tr });
        const month = format(parsedDate, 'MMMM', { locale: tr });
        const day = format(parsedDate, 'dd');
        return { month, day };
    } catch (e) {
        return { month: "Bilinmiyor", day: "?? "};
    }
  };


  return (
    <>
      <PageHeader title="Eğitim & Sınav 🎓">
         <Link href="/education/management">
            <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                İçerik Yönetimi
            </Button>
        </Link>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNewTest} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow">
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
            className={`flex-shrink-0 h-auto p-4 flex items-center gap-3 transition-all duration-200 ${selectedStudent?.id === student.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
            onClick={() => setSelectedStudent(student)}
          >
            <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" 
                style={{ backgroundColor: student.color, color: '#fff' }}
            >
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="font-bold text-lg">{student.name}</p>
            </div>
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
                        <p className="text-muted-foreground">Değerlendirilen Test</p>
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


      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">Aktif Ödevler ({assignedTests.length})</TabsTrigger>
          <TabsTrigger value="results">Tamamlananlar ({completedTests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
               {assignedTests.length > 0 ? assignedTests.map(test => {
                  const startDate = parseAndFormatDate(test.assignedDate);
                  const endDate = parseAndFormatDate(test.dueDate);
                  return (
                    <Card key={test.id} className="flex flex-col">
                        <CardHeader>
                            <CardDescription>{test.subject}</CardDescription>
                            <CardTitle>{test.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs mt-1 text-muted-foreground">
                                    {test.questionCount} Soru
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-2 border-l pl-4">
                                <p><span className="font-semibold text-foreground">Başlangıç:</span> {startDate.day} {startDate.month}</p>
                                <p><span className="font-semibold text-foreground">Bitiş:</span> {endDate.day} {endDate.month}</p>
                            </div>
                            <div className="ml-auto text-center">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-muted">
                                    <Clock className="h-5 w-5 text-muted-foreground mr-1"/>
                                    <span className="text-xl font-bold">{test.questionCount * 1.5}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">DAKİKA</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/education/${test.id}`} className="w-full">
                                <Button className="w-full bg-cyan-500 hover:bg-cyan-600">Sınav Giriş Ekranına Git</Button>
                            </Link>
                        </CardFooter>
                    </Card>
               )}) : <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">Atanmış yeni test bulunmuyor.</CardContent></Card>}
            </div>
        </TabsContent>
        
        <TabsContent value="results">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {completedTests.length > 0 ? completedTests.map(test => (
                 <Card key={test.id} className="flex flex-col">
                    <CardHeader>
                        <Badge className={cn("w-fit", getStatusBadgeClasses(test.status))}>
                            {test.status}
                        </Badge>
                        <CardTitle className="pt-2">{test.title}</CardTitle>
                        <CardDescription>{test.subject}</CardDescription>
                    </CardHeader>
                   <CardContent className="flex-grow">
                        {test.status === 'Değerlendirildi' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-2 rounded-md bg-purple-500/10">
                                    <span className="font-semibold flex items-center gap-2"><Award className="text-purple-600"/> Puan</span>
                                    <span className="font-bold text-purple-600">{test.score?.toFixed(1) ?? '-'}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-green-500/10">
                                    <span className="font-semibold flex items-center gap-2"><CheckCircle className="text-green-600"/> Doğru</span>
                                    <span className="font-bold text-green-600">{test.correctAnswers ?? '-'}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-red-500/10">
                                    <span className="font-semibold flex items-center gap-2"><XCircle className="text-red-600"/> Yanlış</span>
                                    <span className="font-bold text-red-600">{test.incorrectAnswers ?? '-'}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-gray-500/10">
                                    <span className="font-semibold flex items-center gap-2"><MinusCircle className="text-gray-600"/> Boş</span>
                                    <span className="font-bold text-gray-600">{test.emptyAnswers ?? '-'}</span>
                                </div>
                            </div>
                        )}
                        {test.status === 'Çözüldü' && (
                            <div className="flex flex-col items-center justify-center text-center h-full p-4 bg-blue-500/5 rounded-lg">
                               <p className="text-muted-foreground mb-3 text-sm">Bu test öğrenci tarafından çözüldü, değerlendirme bekleniyor.</p>
                               <Button onClick={() => setGradingTest(test)} className="bg-pink-500 hover:bg-pink-600">
                                   <CheckSquare className="mr-2 h-4 w-4"/>
                                   Sonuçları Gir
                               </Button>
                            </div>
                        )}
                   </CardContent>
                    <CardFooter className="flex gap-2">
                         <Button variant="outline" className="w-full" onClick={() => handleOpenEditTest(test)}>
                          <Edit className="mr-2 h-4 w-4" /> Düzenle
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Testi Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                              <AlertDialogDescription>Bu işlem geri alınamaz. "{test.title}" testi ve sonuçları kalıcı olarak silinecektir.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Sil</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
              )) : <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">Henüz tamamlanmış bir test yok.</CardContent></Card>}
            </div>
        </TabsContent>
      </Tabs>
      
      <Dialog open={!!gradingTest} onOpenChange={(open) => !open && setGradingTest(null)}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Manuel Değerlendirme</DialogTitle>
                <DialogDescription>
                    "{gradingTest?.title}" testinin sonuçlarını girin. Toplam {gradingTest?.questionCount} soru.
                </DialogDescription>
            </DialogHeader>
            {gradingTest && (
                <ManualGradeForm
                    test={gradingTest}
                    onSave={(data) => handleManualGrade(gradingTest.id, data)}
                    onCancel={() => setGradingTest(null)}
                />
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
