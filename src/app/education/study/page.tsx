"use client";

import * as React from "react";
import { useAuth } from '@/components/auth-provider';
import { StudyPlan, StudyAssignment, FamilyMember } from '@/lib/data';
import { onStudyPlansUpdate, onStudyAssignmentsUpdate, updateStudyAssignment } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { parseISO, compareAsc, isPast, isToday } from 'date-fns';
import { ExternalLink, ArrowLeft, CheckCircle2, Clock, BookOpen, Sparkles, ChevronRight, GraduationCap, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const subjectThemes: Record<string, { bg: string, text: string, border: string, gradient: string }> = {
  'Matematik': { bg: 'bg-blue-50/50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', gradient: 'from-blue-500 to-indigo-600' },
  'Fen Bilimleri': { bg: 'bg-teal-50/50 dark:bg-teal-950/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30', gradient: 'from-teal-400 to-emerald-600' },
  'Türkçe': { bg: 'bg-orange-50/50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30', gradient: 'from-orange-400 to-amber-600' },
  'Sosyal Bilgiler': { bg: 'bg-purple-50/50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30', gradient: 'from-purple-500 to-pink-600' },
  'İngilizce': { bg: 'bg-rose-50/50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30', gradient: 'from-rose-400 to-red-500' },
  'Diğer': { bg: 'bg-slate-50/50 dark:bg-slate-900/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800', gradient: 'from-slate-400 to-slate-600' },
};

export default function StudyPage() {
  const router = useRouter();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<FamilyMember | null>(null);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [assignments, setAssignments] = React.useState<StudyAssignment[]>([]);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = React.useState<'pending' | 'completed'>('pending');

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
        } else {
            toast({ title: '🔄 Geri Alındı', description: `Görev bekleyenlere eklendi.` });
        }
    } catch (error) {
        toast({ title: 'Hata', description: 'Durum güncellenirken bir hata oluştu.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (assignment: StudyAssignment) => {
    const dueDate = parseISO(assignment.dueDate);
    if (assignment.status === 'completed') {
        return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50">Tamamlandı</Badge>
    }
    if (isPast(dueDate) && !isToday(dueDate)) {
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 animate-pulse">Süresi Geçti</Badge>
    }
    if (isToday(dueDate)) {
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50">Bugün Bitiyor</Badge>
    }
    return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50">Bekliyor</Badge>
  }

  // Derived state
  const { pendingTasks, completedTasks } = React.useMemo(() => {
    if (!selectedStudent) return { pendingTasks: [], completedTasks: [] };
    
    const filtered = assignments.filter(a => a.studentId === selectedStudent.id)
      .sort((a,b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
      
    return {
        pendingTasks: filtered.filter(a => a.status !== 'completed'),
        completedTasks: filtered.filter(a => a.status === 'completed').reverse() // Most recently completed first conceptually
    };
  }, [selectedStudent, assignments]);

  // Group by Kategori (Study Plan)
  const groupTasksByPlan = (tasks: StudyAssignment[]) => {
      const grouped: { [planId: string]: StudyAssignment[] } = {};
      tasks.forEach(t => {
          const p = t.studyPlanId || 'uncategorized';
          if (!grouped[p]) grouped[p] = [];
          grouped[p].push(t);
      });
      return Object.entries(grouped);
  };

  const pendingGrouped = groupTasksByPlan(pendingTasks);
  const completedGrouped = groupTasksByPlan(completedTasks);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Şık ve Sabit Üst Menü */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => router.back()} 
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-none">Konu Çalışma</h1>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Platform Education</p>
                    </div>
                </div>

                {/* Profil / Öğrenci Seçici (Sağ Üst) */}
                <div className="flex items-center gap-2">
                    {studentMembers.map((student) => {
                        const isActive = selectedStudent?.id === student.id;
                        return (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className={cn(
                                    "relative rounded-full transition-all duration-300 p-1 group flex items-center justify-center",
                                    isActive ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#0F172A]" : "hover:scale-105 opacity-70 hover:opacity-100"
                                )}
                            >
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-inner" 
                                    style={{ backgroundColor: student.color, color: '#fff' }}
                                >
                                    {student.name.charAt(0).toUpperCase()}
                                </div>
                                {/* Hover tooltip */}
                                <div className="absolute -bottom-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    {student.name}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Şık Sekmeler (Tabs) Header'ın altında */}
            <div className="flex items-center pb-4 pt-2 w-full">
                <div className="flex p-1.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl w-full max-w-sm shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={cn("flex-1 relative py-2 px-4 rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 z-10", activeTab === 'pending' ? "text-blue-700 dark:text-blue-300" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                    >
                        {activeTab === 'pending' && <motion.div layoutId="tab-bg-2" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-600/50 -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                        <Clock className="w-4 h-4" />
                        Bekleyenler
                        {pendingTasks.length > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{pendingTasks.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={cn("flex-1 relative py-2 px-4 rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 z-10", activeTab === 'completed' ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                    >
                        {activeTab === 'completed' && <motion.div layoutId="tab-bg-2" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-600/50 -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                        <CheckCircle2 className="w-4 h-4" />
                        Tamamlananlar
                    </button>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {selectedStudent ? (
            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    {activeTab === 'pending' ? (
                        pendingTasks.length > 0 ? (
                            <div className="space-y-12">
                                {pendingGrouped.map(([planId, tasks]) => {
                                    const plan = studyPlans.find(p => p.id === planId);
                                    const planTitle = plan?.title || "Genel Plan";
                                    const planDesc = plan?.description || "Atanmış genel görevler.";
                                    
                                    return (
                                        <div key={planId} className="relative">
                                            {/* Kategori Başlığı (Study Plan) - Çok Belirgin */}
                                            <div className="sticky top-[140px] z-30 bg-slate-50/90 dark:bg-[#0B1120]/90 backdrop-blur-md py-4 mb-4 border-b border-slate-200/50 dark:border-slate-800/50 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                                        <LayoutGrid className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{planTitle}</h2>
                                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{planDesc}</p>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-slate-600 dark:text-slate-300">
                                                    {tasks.length}
                                                </div>
                                            </div>
                                            
                                            {/* Derslere göre gruplandırılmış veya karışık listelenmiş görevler (Şu an direkt listeliyoruz ama ders etiketleri kocaman) */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                {tasks.map(assignment => {
                                                    const subject = assignment.subject || 'Diğer';
                                                    const theme = subjectThemes[subject] || subjectThemes['Diğer'];
                                                    
                                                    return (
                                                        <motion.div 
                                                            layout
                                                            key={assignment.id}
                                                            className="group flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] p-1 shadow-sm border border-slate-200/60 dark:border-slate-800 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 relative overflow-hidden"
                                                        >
                                                            <div className="flex items-stretch flex-1 p-4 sm:p-5 gap-4 relative z-10 bg-white dark:bg-slate-900 rounded-[1.75rem]">
                                                                <div className="flex-1 flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border", theme.bg, theme.text, theme.border)}>
                                                                            {subject}
                                                                        </span>
                                                                        {getStatusBadge(assignment)}
                                                                    </div>
                                                                    
                                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug mb-4">{assignment.topic}</h3>
                                                                    
                                                                    <div className="mt-auto flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <Checkbox 
                                                                                id={`check-${assignment.id}`} 
                                                                                className="w-7 h-7 rounded-lg border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all"
                                                                                checked={assignment.status === 'completed'}
                                                                                onCheckedChange={() => handleStatusChange(assignment)}
                                                                            />
                                                                            <label htmlFor={`check-${assignment.id}`} className="text-sm font-black text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                                                                Ödevi Bitirdim
                                                                            </label>
                                                                        </div>
                                                                        
                                                                        {(assignment.sources || []).length > 0 && (
                                                                            <a href={assignment.sources[0].startsWith('http') ? assignment.sources[0] : `https://${assignment.sources[0]}`} target="_blank" rel="noopener noreferrer">
                                                                                <Button size="sm" variant="secondary" className="h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 font-bold px-4">
                                                                                    <BookOpen className="w-4 h-4 mr-2" /> Kaynak
                                                                                </Button>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Dekoratif Arka Plan Şeridi (Sol Kenar) */}
                                                            <div className={cn("absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b opacity-50 group-hover:opacity-100 transition-opacity", theme.gradient)} />
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24 text-center bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
                                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-6 relative">
                                    <Sparkles className="w-12 h-12 text-emerald-500" />
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Harika İş!</h3>
                                <p className="text-slate-500 max-w-sm text-base">Bekleyen hiçbir çalışma görevi kalmadı. Yeni konular eklenene kadar dinlenebilirsin.</p>
                            </motion.div>
                        )
                    ) : (
                        completedTasks.length > 0 ? (
                            <Accordion type="multiple" className="space-y-6">
                                {completedGrouped.map(([planId, tasks]) => {
                                     const plan = studyPlans.find(p => p.id === planId);
                                     const planTitle = plan?.title || "Genel Plan";
                                     
                                     return (
                                        <AccordionItem key={`completed-${planId}`} value={planId} className="border-none">
                                            <div className="bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden backdrop-blur-sm">
                                                <AccordionTrigger className="hover:no-underline px-5 py-4">
                                                    <div className="flex items-center gap-3 text-left">
                                                        <div className="w-2 h-6 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                                                        <h3 className="text-lg font-black text-slate-500 dark:text-slate-400">{planTitle} <span className="text-sm ml-2 font-medium opacity-60">({tasks.length} Görev)</span></h3>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-0 border-t border-slate-200/50 dark:border-slate-800/50">
                                                    {tasks.map((assignment, index) => {
                                                        const subject = assignment.subject || 'Diğer';
                                                        return (
                                                            <div key={assignment.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-colors hover:bg-white dark:hover:bg-slate-800/80", index !== tasks.length - 1 && "border-b border-slate-100 dark:border-slate-800/50")}>
                                                                <div className="flex items-start gap-4">
                                                                    <Checkbox 
                                                                        checked={true}
                                                                        onCheckedChange={() => handleStatusChange(assignment)}
                                                                        className="mt-1 data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400 opacity-60 w-6 h-6 rounded"
                                                                    />
                                                                    <div>
                                                                        <p className="text-base font-bold text-slate-700 dark:text-slate-300 line-through opacity-70 decoration-slate-400">{assignment.topic}</p>
                                                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{subject}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="pl-10 sm:pl-0">
                                                                    {getStatusBadge(assignment)}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </AccordionContent>
                                            </div>
                                        </AccordionItem>
                                     )
                                })}
                            </Accordion>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <GraduationCap className="w-20 h-20 text-slate-300 dark:text-slate-700 mb-6" />
                                <h3 className="text-xl font-black text-slate-500 dark:text-slate-400 mb-2">Henüz Tamamlanan Yok</h3>
                                <p className="text-slate-400 text-base">Çalışmalarını bitirdikçe burada arşivlenecek.</p>
                            </div>
                        )
                    )}
                </motion.div>
            </AnimatePresence>
        ) : (
          <div className="flex justify-center py-32">
             <div className="animate-pulse flex flex-col items-center gap-6">
                 <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                 <div className="w-64 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
