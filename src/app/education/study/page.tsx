
"use client";

import * as React from "react";
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { StudyPlan, StudyAssignment, FamilyMember } from '@/lib/data';
import { onStudyPlansUpdate, onStudyAssignmentsUpdate, updateStudyAssignment } from '@/lib/dataService';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, isToday, isFuture, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BookCopy, Check, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function StudyPage() {
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<FamilyMember | null>(null);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [assignments, setAssignments] = React.useState<StudyAssignment[]>([]);
  const { toast } = useToast();

  const studentMembers = React.useMemo(() => 
    familyMembers.filter(m => m.role.includes('Çocuk')), 
  [familyMembers]);

  React.useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  React.useEffect(() => {
    const unsubPlans = onStudyPlansUpdate(setStudyPlans);
    const unsubAssignments = onStudyAssignmentsUpdate(setAssignments);
    return () => {
      unsubPlans();
      unsubAssignments();
    };
  }, []);

  const studentAssignments = React.useMemo(() => {
    if (!selectedStudent) return {};
    
    const studentAssignments = assignments.filter(a => a.studentId === selectedStudent.id);
    const groupedByPlan: { [planId: string]: StudyAssignment[] } = {};

    studentAssignments.forEach(assignment => {
      if (!groupedByPlan[assignment.studyPlanId]) {
        groupedByPlan[assignment.studyPlanId] = [];
      }
      groupedByPlan[assignment.studyPlanId].push(assignment);
    });
    
    return groupedByPlan;
  }, [selectedStudent, assignments]);

  const handleStatusChange = async (assignment: StudyAssignment) => {
    const newStatus = assignment.status === 'assigned' ? 'completed' : 'assigned';
    const updateData: Partial<StudyAssignment> = {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    }
    try {
        await updateStudyAssignment(assignment.id, updateData);
        if (newStatus === 'completed') {
            toast({ title: '✅ Harika İş!', description: `"${assignment.topic}" konusunu tamamladın.` });
        }
    } catch (error) {
        toast({ title: 'Hata', description: 'Durum güncellenirken bir hata oluştu.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (assignment: StudyAssignment) => {
    const dueDate = parseISO(assignment.dueDate);
    if (assignment.status === 'completed') {
        return <Badge variant="default" className="bg-green-600">Tamamlandı</Badge>
    }
    if (isPast(dueDate) && !isToday(dueDate)) {
        return <Badge variant="destructive">Süresi Geçti</Badge>
    }
    if (isToday(dueDate)) {
        return <Badge variant="outline" className="text-orange-500 border-orange-500">Bugün Bitiyor</Badge>
    }
    return <Badge variant="secondary">Devam Ediyor</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Konu Anlatımı Takibi" />

      <div className="flex gap-4 overflow-x-auto pb-4">
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
      
      {selectedStudent ? (
        <div className="space-y-6">
            {Object.keys(studentAssignments).length > 0 ? Object.entries(studentAssignments).map(([planId, planAssignments]) => {
                const plan = studyPlans.find(p => p.id === planId);
                if (!plan) return null;

                const completedCount = planAssignments.filter(a => a.status === 'completed').length;
                const totalCount = planAssignments.length;
                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                return (
                    <Card key={planId} className="shadow-lg">
                        <CardHeader>
                            <CardTitle>{plan.title}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>İlerleme</span>
                                    <span className="font-medium">{completedCount} / {totalCount} konu tamamlandı</span>
                                </div>
                                <Progress value={progress} />
                            </div>
                            <div className="space-y-3">
                                {planAssignments.map((assignment) => (
                                    <div key={assignment.id} className="p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-grow">
                                            <Checkbox 
                                                id={`checkbox-${assignment.id}`}
                                                checked={assignment.status === 'completed'} 
                                                onCheckedChange={() => handleStatusChange(assignment)}
                                                className="size-5"
                                            />
                                            <div className="flex-grow">
                                                <label htmlFor={`checkbox-${assignment.id}`} className={cn("font-semibold cursor-pointer", assignment.status === 'completed' && "line-through text-muted-foreground")}>{assignment.topic}</label>
                                                <p className="text-sm text-muted-foreground">{assignment.subject}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-2 pl-8 sm:pl-0">
                                           <div className="flex items-center gap-2">
                                              {getStatusBadge(assignment)}
                                              {(assignment.sources || []).length > 0 && (
                                                <a href={assignment.sources[0].startsWith('http') ? assignment.sources[0] : `https://${assignment.sources[0]}`} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" variant="outline">
                                                        <ExternalLink className="size-4 mr-2"/> Kaynağa Git
                                                    </Button>
                                                </a>
                                              )}
                                           </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )
            }) : (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        {selectedStudent.name} için atanmış konu anlatımı görevi bulunmuyor.
                    </CardContent>
                </Card>
            )}
        </div>
      ) : (
          <p className="text-center text-muted-foreground">Lütfen bir öğrenci seçin.</p>
      )}
    </div>
  );
}
