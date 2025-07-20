
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTestForm } from "@/components/new-test-form";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { students, tests as initialTests, questionBanks as initialQuestionBanks, practiceExams as initialPracticeExams, examProgress, QuestionBank, Test, PracticeExam } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";

export default function EducationPage() {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = React.useState(students[0]);
  
  // Use state for tests, questionBanks, etc. to make them interactive
  const [tests, setTests] = React.useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);

  // States for managing modals
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = React.useState(false);
  const [isExamDialogOpen, setIsExamDialogOpen] = React.useState(false);
  const [editingBank, setEditingBank] = React.useState<QuestionBank | null>(null);
  const [editingExam, setEditingExam] = React.useState<PracticeExam | null>(null);
  const [gradingTest, setGradingTest] = React.useState<Test | null>(null);


  React.useEffect(() => {
    // This effect runs only once on component mount
    try {
        const storedTests = localStorage.getItem('tests');
        const storedBanks = localStorage.getItem('questionBanks');
        const storedExams = localStorage.getItem('practiceExams');
        
        setTests(storedTests ? JSON.parse(storedTests) : initialTests);
        setQuestionBanks(storedBanks ? JSON.parse(storedBanks) : initialQuestionBanks);
        setPracticeExams(storedExams ? JSON.parse(storedExams) : initialPracticeExams);
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        // Set to initials if localStorage fails, don't toast here.
        setTests(initialTests);
        setQuestionBanks(initialQuestionBanks);
        setPracticeExams(initialPracticeExams);
    }
  }, []);

  const handleCreateAssignment = (newTest: Omit<Test, 'id' | 'status'>) => {
    setTests(prevTests => {
        const testWithStatus: Test = { ...newTest, id: Date.now(), status: 'Atandı' };
        const updatedTests = [...prevTests, testWithStatus];
        localStorage.setItem('tests', JSON.stringify(updatedTests));
        toast({ title: "✅ Ödev Atandı", description: "Yeni ödev başarıyla öğrenciye atandı." });
        return updatedTests;
    });
    setIsAssignDialogOpen(false);
  };
  
  const handleManualGrade = (testId: number, gradeData: ManualGradeData) => {
      setTests(prevTests => {
          const updatedTests = prevTests.map(t => {
              if (t.id === testId) {
                  return {
                      ...t,
                      status: 'Değerlendirildi',
                      correctAnswers: gradeData.correct,
                      incorrectAnswers: gradeData.incorrect,
                      emptyAnswers: gradeData.empty,
                      score: (gradeData.correct / t.questionCount) * 100
                  }
              }
              return t;
          });
          localStorage.setItem('tests', JSON.stringify(updatedTests));
          toast({ title: "✅ Test Değerlendirildi", description: "Sonuçlar başarıyla kaydedildi." });
          return updatedTests;
      });
      setGradingTest(null);
  }

  const saveQuestionBanks = (banks: QuestionBank[]) => {
    setQuestionBanks(banks);
    localStorage.setItem('questionBanks', JSON.stringify(banks));
  }

  const handleBankSubmit = (bankData: Omit<QuestionBank, 'id'>, id?: number) => {
    let updatedBanks;
    if (id) {
        // Update
        updatedBanks = questionBanks.map(b => b.id === id ? { ...b, ...bankData, id } : b);
        toast({ title: "✅ Soru Bankası Güncellendi", description: `${bankData.name} başarıyla güncellendi.` });
    } else {
        // Create
        const newBank = { ...bankData, id: Date.now() };
        updatedBanks = [...questionBanks, newBank];
        toast({ title: "✅ Soru Bankası Oluşturuldu", description: "Yeni soru bankası başarıyla kaydedildi." });
    }
    saveQuestionBanks(updatedBanks);
    setEditingBank(null);
    setIsBankDialogOpen(false);
  };

  const handleDeleteBank = (bankId: number) => {
    const updatedBanks = questionBanks.filter(b => b.id !== bankId);
    saveQuestionBanks(updatedBanks);
    toast({ title: "🗑️ Soru Bankası Silindi", variant: "destructive" });
  }

  const savePracticeExams = (exams: PracticeExam[]) => {
      setPracticeExams(exams);
      localStorage.setItem('practiceExams', JSON.stringify(exams));
  }

  const handleExamSubmit = (examData: Omit<PracticeExam, 'id'>, id?: number) => {
    let updatedExams;
    if (id) {
        // Update
        updatedExams = practiceExams.map(e => e.id === id ? { ...e, ...examData, id } : e);
        toast({ title: "✅ Deneme Sınavı Güncellendi", description: `${examData.name} başarıyla güncellendi.` });
    } else {
        // Create
        const newExam = { ...examData, id: Date.now() };
        updatedExams = [...practiceExams, newExam];
        toast({ title: "✅ Deneme Sınavı Oluşturuldu", description: "Yeni deneme sınavı başarıyla kaydedildi." });
    }
    savePracticeExams(updatedExams);
    setEditingExam(null);
    setIsExamDialogOpen(false);
  };

  const handleDeleteExam = (examId: number) => {
      const updatedExams = practiceExams.filter(e => e.id !== examId);
      savePracticeExams(updatedExams);
      toast({ title: "🗑️ Deneme Sınavı Silindi", variant: "destructive" });
  }


  const studentTests = tests.filter(t => t.studentId === selectedStudent.id);
  const assignedTests = studentTests.filter(t => t.status === 'Atandı');
  const completedTests = studentTests.filter(t => t.status !== 'Atandı');

  const getStatusBadgeClasses = (status: 'Atandı' | 'Çözüldü' | 'Değerlendirildi') => {
     switch (status) {
      case 'Atandı': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'Çözüldü': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'Değerlendirildi': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  }
  
  const calculateProgress = (total: number, completed: number) => {
    if (total === 0) return 0;
    return (completed / total) * 100;
  }

  return (
    <>
      <PageHeader title="Eğitim & Sınav 🎓">
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Ödev Ata
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Ödev Ata</DialogTitle>
              <DialogDescription>
                Öğrenciye yeni bir test, soru bankası konusu veya deneme sınavı atayın.
              </DialogDescription>
            </DialogHeader>
            <NewTestForm 
                students={students} 
                questionBanks={questionBanks}
                practiceExams={practiceExams}
                onAssign={handleCreateAssignment}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
        {students.map((student) => (
          <Button
            key={student.id}
            variant={selectedStudent.id === student.id ? "default" : "outline"}
            className={`flex-shrink-0 h-auto p-4 flex items-center gap-3 transition-all duration-200 ${selectedStudent.id === student.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
            onClick={() => setSelectedStudent(student)}
          >
            <span className="text-4xl">{student.avatar}</span>
            <div className="text-left">
              <p className="font-bold text-lg">{student.name}</p>
              <p className={`text-sm ${selectedStudent.id === student.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{student.grade}</p>
            </div>
          </Button>
        ))}
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className={cn("grid w-full mb-6", selectedStudent ? "grid-cols-4" : "grid-cols-3")}>
          <TabsTrigger value="assignments">Aktif Ödevler ({assignedTests.length})</TabsTrigger>
          <TabsTrigger value="progress">Genel Başarı</TabsTrigger>
          <TabsTrigger value="results">Tamamlananlar ({completedTests.length})</TabsTrigger>
          {selectedStudent && <TabsTrigger value="management">İçerik Yönetimi</TabsTrigger>}
        </TabsList>

        <TabsContent value="assignments">
           <Card>
             <CardHeader>
              <CardTitle>Atanmış Testler</CardTitle>
              <CardDescription>{selectedStudent.name} için tamamlanması gereken testler.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {assignedTests.length > 0 ? assignedTests.map(test => (
                 <Card key={test.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                   <div className="flex-grow">
                     <h4 className="font-bold">{test.title}</h4>
                     <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {test.subject}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {test.questionCount} Soru</span>
                     </div>
                     <p className="text-xs text-muted-foreground mt-2">Son Teslim: {test.dueDate}</p>
                   </div>
                   <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                    <Button className="w-full">Teste Başla</Button>
                   </Link>
                 </Card>
               )) : <p className="text-muted-foreground text-center py-8">Atanmış yeni test bulunmuyor.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="progress">
          <div className="space-y-6">
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="text-blue-500"/> Soru Bankaları Başarısı</CardTitle>
                  <CardDescription>{selectedStudent.name} için soru bankalarındaki genel ilerleme durumu.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {questionBanks.map(bank => {
                        const progress = examProgress.questionBank[bank.id]?.[selectedStudent.id];
                        if (!progress) return null;
                        const totalQuestions = bank.subjects.reduce((acc, s) => acc + s.topics.reduce((tAcc, t) => tAcc + t.questionCount, 0), 0);
                        const percentage = calculateProgress(totalQuestions, progress.questionsSolved);

                        return (
                            <Card key={bank.id} className="p-4">
                                <h4 className="font-bold">{bank.name}</h4>
                                <Progress value={percentage} className="my-2 h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>İlerleme: {percentage.toFixed(0)}%</span>
                                    <span>{progress.questionsSolved} / {totalQuestions} Soru</span>
                                </div>
                                <div className="mt-2 text-xs grid grid-cols-3 gap-2 text-center">
                                    <Badge variant="outline" className="text-green-600 border-green-500/50">Doğru: {progress.correct}</Badge>
                                    <Badge variant="outline" className="text-red-600 border-red-500/50">Yanlış: {progress.incorrect}</Badge>
                                    <Badge variant="outline" className="text-gray-600 border-gray-500/50">Boş: {progress.empty}</Badge>
                                </div>
                            </Card>
                        )
                    })}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="text-purple-500"/> Deneme Sınavları Başarısı</CardTitle>
                  <CardDescription>{selectedStudent.name} için deneme sınavlarındaki genel performans.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {practiceExams.map(exam => {
                        const progress = examProgress.practiceExam[exam.id]?.[selectedStudent.id];
                        if (!progress) return <p key={exam.id} className="text-sm text-muted-foreground">{exam.name} - Henüz çözülmedi.</p>;
                        const totalQuestions = exam.subjects.reduce((acc, s) => acc + s.questionCount, 0);
                         const percentage = calculateProgress(progress.correct, totalQuestions);
                        return (
                             <Card key={exam.id} className="p-4">
                                <h4 className="font-bold">{exam.name}</h4>
                                <div className="mt-2 text-xs grid grid-cols-3 gap-2 text-center">
                                    <Badge variant="outline" className="text-green-600 border-green-500/50">Doğru: {progress.correct}</Badge>
                                    <Badge variant="outline" className="text-red-600 border-red-500/50">Yanlış: {progress.incorrect}</Badge>
                                    <Badge variant="outline" className="text-gray-600 border-gray-500/50">Boş: {progress.empty}</Badge>
                                </div>
                            </Card>
                        )
                    })}
                </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Tamamlanan Test Sonuçları</CardTitle>
              <CardDescription>{selectedStudent.name} için tamamlanmış testlerin sonuçları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedTests.length > 0 ? completedTests.map(test => (
                <Card key={test.id} className="p-4">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h4 className="font-bold">{test.title}</h4>
                       <p className="text-sm text-muted-foreground">{test.subject}</p>
                     </div>
                      <Badge className={getStatusBadgeClasses(test.status)}>
                        {test.status}
                      </Badge>
                   </div>
                   {test.status === 'Değerlendirildi' && (
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-2xl font-bold">{test.score?.toFixed(1) ?? '-'}</p>
                            <p className="text-sm font-medium text-muted-foreground">Puan</p>
                          </div>
                          <div className="bg-green-500/10 p-3 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{test.correctAnswers ?? '-'}</p>
                            <p className="text-sm font-medium text-green-700">Doğru</p>
                          </div>
                           <div className="bg-red-500/10 p-3 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{test.incorrectAnswers ?? '-'}</p>
                            <p className="text-sm font-medium text-red-700">Yanlış</p>
                          </div>
                           <div className="bg-gray-500/10 p-3 rounded-lg">
                            <p className="text-2xl font-bold text-gray-600">{test.emptyAnswers ?? '-'}</p>
                            <p className="text-sm font-medium text-gray-700">Boş</p>
                          </div>
                       </div>
                   )}
                   {test.status === 'Çözüldü' && (
                        <div className="flex flex-col items-center justify-center text-center text-sm py-4 bg-blue-500/5 rounded-lg">
                           <p className="text-muted-foreground mb-3">Bu test öğrenci tarafından çözüldü, değerlendirme bekleniyor.</p>
                           <Button onClick={() => setGradingTest(test)}>
                               <CheckSquare className="mr-2 h-4 w-4"/>
                               Sonuçları Gir
                           </Button>
                        </div>
                   )}
                </Card>
              )) : <p className="text-muted-foreground text-center py-8">Henüz tamamlanmış bir test yok.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        
        {selectedStudent && (
        <TabsContent value="management">
            <Tabs defaultValue="questionBanks" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="questionBanks">Soru Bankaları</TabsTrigger>
                    <TabsTrigger value="practiceExams">Deneme Sınavları</TabsTrigger>
                </TabsList>
                <TabsContent value="questionBanks" className="mt-4">
                     <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>Soru Bankası Havuzu</CardTitle>
                                <CardDescription>Oluşturulan ve yönetilen soru bankaları.</CardDescription>
                            </div>
                             <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => { setEditingBank(null); setIsBankDialogOpen(true); }}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Ekle
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{editingBank ? "Soru Bankasını Düzenle" : "Yeni Soru Bankası Oluştur"}</DialogTitle>
                                        <DialogDescription>
                                            {editingBank ? "Mevcut soru bankasını güncelleyin." : "Yeni bir soru bankası oluşturun. Dersleri ve konuları ekleyebilirsiniz."}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <NewQuestionBankForm 
                                        onSubmit={handleBankSubmit} 
                                        initialData={editingBank}
                                    />
                                </DialogContent>
                             </Dialog>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {questionBanks.map(bank => (
                                <Card key={bank.id} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg">{bank.name}</h4>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingBank(bank); setIsBankDialogOpen(true); }}>
                                                <Edit className="w-4 h-4"/>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Bu işlem geri alınamaz. "{bank.name}" soru bankası kalıcı olarak silinecektir.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteBank(bank.id)}>Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {bank.subjects.map(subject => (
                                             <div key={subject.id} className="text-sm">
                                                <p className="font-semibold">{subject.name}</p>
                                                <ul className="list-disc list-inside pl-4 text-muted-foreground">
                                                    {subject.topics.map(topic => (
                                                        <li key={topic.id}>{topic.name} ({topic.questionCount} soru)</li>
                                                    ))}
                                                </ul>
                                             </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </CardContent>
                     </Card>
                </TabsContent>
                 <TabsContent value="practiceExams" className="mt-4">
                     <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                             <div>
                                <CardTitle>Deneme Sınavı Havuzu</CardTitle>
                                <CardDescription>Oluşturulan ve yönetilen deneme sınavları.</CardDescription>
                            </div>
                             <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => { setEditingExam(null); setIsExamDialogOpen(true);}}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Ekle
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>{editingExam ? "Deneme Sınavını Düzenle" : "Yeni Deneme Sınavı Oluştur"}</DialogTitle>
                                        <DialogDescription>
                                           {editingExam ? "Mevcut deneme sınavını güncelleyin." : "Yeni bir deneme sınavı oluşturun. Dersleri ve soru sayılarını ekleyebilirsiniz."}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <NewPracticeExamForm 
                                        onSubmit={handleExamSubmit}
                                        initialData={editingExam}
                                    />
                                </DialogContent>
                             </Dialog>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {practiceExams.map(exam => (
                                <Card key={exam.id} className="p-4">
                                     <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg">{exam.name}</h4>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingExam(exam); setIsExamDialogOpen(true); }}>
                                                <Edit className="w-4 h-4"/>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Bu işlem geri alınamaz. "{exam.name}" deneme sınavı kalıcı olarak silinecektir.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteExam(exam.id)}>Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {exam.subjects.map(subject => (
                                            <Badge key={subject.id} variant="secondary">{subject.name}: {subject.questionCount} Soru</Badge>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </TabsContent>
        )}
      </Tabs>
      
      <Dialog open={!!gradingTest} onOpenChange={(open) => !open && setGradingTest(null)}>
        <DialogContent>
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

    