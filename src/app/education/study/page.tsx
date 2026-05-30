"use client";

import * as React from "react";
import { useAuth } from '@/components/auth-provider';
import { StudyPlan, StudyAssignment, FamilyMember } from '@/lib/data';
import { onStudyPlansUpdate, onStudyAssignmentsUpdate, updateStudyAssignment } from '@/lib/dataService';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { parseISO, compareAsc, isPast, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";

export default function StudyPage() {
  const router = useRouter();
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
    
    const filtered = assignments.filter(a => a.studentId === selectedStudent.id)
      .sort((a,b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
      
    const groupedByPlan: { [planId: string]: StudyAssignment[] } = {};

    filtered.forEach(assignment => {
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
      <div className="relative">
          <PageHeader title="Konu Anlatımı Takibi" />
          <div className="absolute top-6 left-16 md:left-20">
             <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => router.back()} 
                className="rounded-full shadow-md bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm transition-all active:scale-95"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Geri
             </Button>
          </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
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
        <div className="space-y-8">
            {Object.keys(studentAssignments).length > 0 ? (
                <Accordion type="multiple" className="space-y-6">
                    {Object.entries(studentAssignments).map(([planId, planAssignments]) => {
                        const plan = studyPlans.find(p => p.id === planId);
                        if (!plan) return null;

                        const completedCount = planAssignments.filter(a => a.status === 'completed').length;
                        const totalCount = planAssignments.length;
                        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                        return (
                            <AccordionItem key={planId} value={planId} className="border-none">
                                <Card className="shadow-md border-l-4 border-primary overflow-hidden">
                                    <AccordionTrigger className="hover:no-underline px-6 py-4 flex items-center justify-between group">
                                        <div className="flex flex-col items-start text-left flex-1 min-w-0 pr-4">
                                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{plan.title}</CardTitle>
                                            <CardDescription className="line-clamp-1">{plan.description}</CardDescription>
                                        </div>
                                        <div className="flex flex-col items-end mr-4 shrink-0">
                                            <span className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">{completedCount}/{totalCount} Tamamlandı</span>
                                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0 border-t bg-muted/5">
                                        <CardContent className="p-6 pt-6 space-y-4">
                                            {planAssignments.map((assignment) => (
                                                <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                                                    <div className="flex items-center gap-3 flex-grow">
                                                        <Checkbox 
                                                            id={`checkbox-${assignment.id}`}
                                                            checked={assignment.status === 'completed'} 
                                                            onCheckedChange={() => handleStatusChange(assignment)}
                                                            className="size-5"
                                                        />
                                                        <div className="flex-grow">
                                                            <label htmlFor={`checkbox-${assignment.id}`} className={cn("font-semibold cursor-pointer", assignment.status === 'completed' && "line-through text-muted-foreground dark:text-muted-foreground/70")}>{assignment.topic}</label>
                                                            <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">{assignment.subject}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-2 pl-8 sm:pl-0">
                                                        <div className="flex items-center gap-2">
                                                            {getStatusBadge(assignment)}
                                                            {(assignment.sources || []).length > 0 && (
                                                                <a href={assignment.sources[0].startsWith('http') ? assignment.sources[0] : `https://${assignment.sources[0]}`} target="_blank" rel="noopener noreferrer">
                                                                    <Button size="sm" variant="outline" className="h-8">
                                                                        <ExternalLink className="size-3.5 mr-1.5"/> Kaynağa Git
                                                                    </Button>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
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
