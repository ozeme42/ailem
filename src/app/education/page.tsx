
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, BookOpen, Check, Clock, TrendingUp, AlertCircle, Award } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTestForm } from "@/components/new-test-form";
import { students, tests } from "@/lib/data";

export default function EducationPage() {
  const [selectedStudent, setSelectedStudent] = React.useState(students[0]);

  const studentTests = tests.filter(t => t.studentId === selectedStudent.id);
  const assignedTests = studentTests.filter(t => t.status === 'Atandı');
  const completedTests = studentTests.filter(t => t.status !== 'Atandı');
  
  const getPriorityBadgeClasses = (priority: 'Yüksek' | 'Orta' | 'Düşük') => {
    switch (priority) {
      case 'Yüksek': return 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400';
      case 'Orta': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'Düşük': return 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusBadgeClasses = (status: 'Atandı' | 'Çözüldü' | 'Değerlendirildi') => {
     switch (status) {
      case 'Atandı': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'Çözüldü': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'Değerlendirildi': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Yeni Test Ödevi Ata</DialogTitle>
              <DialogDescription>
                Öğrenciye yeni bir test veya deneme sınavı atayın.
              </DialogDescription>
            </DialogHeader>
            <NewTestForm students={students} />
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
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="assignments">Ödevler ({assignedTests.length})</TabsTrigger>
          <TabsTrigger value="results">Sonuçlar ({completedTests.length})</TabsTrigger>
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
      </Tabs>
    </>
  );
}
