"use client";

import * as React from "react";
import { PlusCircle, GraduationCap, TrendingUp, BookOpen, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { students, subjects, upcomingExams, assignments } from "@/lib/data";

export default function EducationPage() {
  const [selectedStudent, setSelectedStudent] = React.useState(students[0]);
  
  const getPriorityBadgeClasses = (priority: 'Yüksek' | 'Orta' | 'Düşük') => {
    switch (priority) {
      case 'Yüksek': return 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400';
      case 'Orta': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'Düşük': return 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <>
      <PageHeader title="Eğitim Takibi 🎓">
        <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Kayıt Ekle
        </Button>
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="exams">Yaklaşan Sınavlar</TabsTrigger>
          <TabsTrigger value="assignments">Ödevler</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Genel Not Ortalaması</CardTitle>
                <GraduationCap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85.5</div>
                <p className="text-xs text-muted-foreground">Tüm dersler</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aylık Gelişim</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">+5.2 puan</div>
                <p className="text-xs text-muted-foreground">Geçen aya göre</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Yaklaşan Sınav</CardTitle>
                <CalendarIcon className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Matematik</div>
                <p className="text-xs text-muted-foreground">3 gün içinde</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bekleyen Ödev</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1 Ödev</div>
                <p className="text-xs text-muted-foreground">Bugün teslim</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Ders Notları</CardTitle>
              <CardDescription>{selectedStudent.name} için ders bazında not ortalamaları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subjects.map((subject) => (
                <div key={subject.id}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold">{subject.name}</p>
                    <p className="text-sm font-bold" style={{ color: subject.color }}>{subject.grade}</p>
                  </div>
                  <Progress value={subject.grade} indicatorClassName="bg-[var(--subject-color)]" style={{ '--subject-color': subject.color } as React.CSSProperties} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="exams">
          <Card>
             <CardHeader>
              <CardTitle>Yaklaşan Sınavlar</CardTitle>
              <CardDescription>{selectedStudent.name} için planlanmış sınavlar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {upcomingExams.filter(e => e.studentId === selectedStudent.id).map(exam => (
                 <Card key={exam.id} className="p-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <h4 className="font-bold">{exam.subject}</h4>
                       <p className="text-sm text-muted-foreground">{exam.date} - {exam.time}</p>
                     </div>
                     <Badge variant="outline" className={getPriorityBadgeClasses(exam.priority)}>
                       <AlertCircle className="w-3 h-3 mr-1"/>
                       {exam.priority}
                     </Badge>
                   </div>
                   <div className="mt-2">
                     <p className="text-xs font-semibold">Konular:</p>
                     <p className="text-xs text-muted-foreground">{exam.topics.join(', ')}</p>
                   </div>
                 </Card>
               ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Ödev Takibi</CardTitle>
              <CardDescription>{selectedStudent.name} için tüm ödevler.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignments.filter(a => a.studentId === selectedStudent.id).map(assignment => (
                <Card key={assignment.id} className="p-4">
                   <div className="flex justify-between items-center">
                     <div>
                       <h4 className="font-bold">{assignment.title}</h4>
                       <p className="text-sm text-muted-foreground">{assignment.subject} • Teslim: {assignment.dueDate}</p>
                     </div>
                      <Badge className={assignment.status === 'Tamamlandı' ? 'bg-green-600' : 'bg-yellow-600'}>
                        {assignment.status}
                      </Badge>
                   </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}