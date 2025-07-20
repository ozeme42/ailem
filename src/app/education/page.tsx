
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Clock, TrendingUp, FileText, BarChart3, Target, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTestForm, AssignmentType } from "@/components/new-test-form";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { students, tests, questionBanks, practiceExams, examProgress, QuestionBank } from "@/lib/data";
import { Progress } from "@/components/ui/progress";

export default function EducationPage() {
  const [selectedStudent, setSelectedStudent] = React.useState(students[0]);

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
        <Dialog>
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="assignments">Aktif Ödevler ({assignedTests.length})</TabsTrigger>
          <TabsTrigger value="progress">Genel Başarı</TabsTrigger>
          <TabsTrigger value="results">Tamamlananlar ({completedTests.length})</TabsTrigger>
          <TabsTrigger value="management">İçerik Yönetimi</TabsTrigger>
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
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-2xl font-bold">{test.score}</p>
                        <p className="text-sm font-medium text-muted-foreground">Puan</p>
                      </div>
                      <div className="bg-green-500/10 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{test.correctAnswers}</p>
                        <p className="text-sm font-medium text-green-700">Doğru</p>
                      </div>
                       <div className="bg-red-500/10 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{test.incorrectAnswers}</p>
                        <p className="text-sm font-medium text-red-700">Yanlış</p>
                      </div>
                       <div className="bg-gray-500/10 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{test.emptyAnswers}</p>
                        <p className="text-sm font-medium text-gray-700">Boş</p>
                      </div>
                   </div>
                </Card>
              )) : <p className="text-muted-foreground text-center py-8">Henüz tamamlanmış bir test yok.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        
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
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2 h-4 w-4"/> Yeni Ekle</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Yeni Soru Bankası Oluştur</DialogTitle>
                                        <DialogDescription>
                                            Yeni bir soru bankası oluşturun. Dersleri ve konuları ekleyebilirsiniz.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <NewQuestionBankForm />
                                </DialogContent>
                             </Dialog>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {questionBanks.map(bank => (
                                <Card key={bank.id} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg">{bank.name}</h4>
                                        <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive"/></Button>
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
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2 h-4 w-4"/> Yeni Ekle</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Yeni Deneme Sınavı Oluştur</DialogTitle>
                                        <DialogDescription>
                                           Yeni bir deneme sınavı oluşturun. Dersleri ve soru sayılarını ekleyebilirsiniz.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <NewPracticeExamForm />
                                </DialogContent>
                             </Dialog>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {practiceExams.map(exam => (
                                <Card key={exam.id} className="p-4">
                                     <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg">{exam.name}</h4>
                                        <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive"/></Button>
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

      </Tabs>
    </>
  );
}
