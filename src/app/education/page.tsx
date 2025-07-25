
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { onTestsUpdate, onQuestionBanksUpdate, onPracticeExamsUpdate, updateTest, addTest, deleteTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";

export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  
  const [tests, setTests] = React.useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);

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
    
    return () => {
      unsubTests();
      unsubBanks();
      unsubExams();
    }
  }, [selectedStudent]);
  

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
            <span className="text-4xl">{student.avatar.startsWith('/') ? <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full" /> : student.avatar}</span>
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
           <Card>
             <CardHeader>
              <CardTitle>Atanmış Testler</CardTitle>
              <CardDescription>{selectedStudent?.name} için tamamlanması gereken testler.</CardDescription>
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
                   <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditTest(test)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ödevi Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bu işlem geri alınamaz. "{test.title}" ödevi kalıcı olarak silinecektir.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Sil</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                            <Button className="w-full">Teste Başla</Button>
                        </Link>
                   </div>
                 </Card>
               )) : <p className="text-muted-foreground text-center py-8">Atanmış yeni test bulunmuyor.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Tamamlanan Test Sonuçları</CardTitle>
              <CardDescription>{selectedStudent?.name} için tamamlanmış testlerin sonuçları.</CardDescription>
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
