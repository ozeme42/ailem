"use client";

import * as React from "react";
import Link from "next/link";
// XCircle ikonu buraya eklendi
import { ArrowLeft, Check, CheckCircle, XCircle, Edit, ListFilter, MinusCircle, Trash2, X, ClipboardList, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2, FileText, Calendar, Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Test, FamilyMember } from "@/lib/data";
import { onTestsUpdate, deleteTest } from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isToday, isPast, differenceInDays, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
};

const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
    'Diğer': FileText,
};

const categoryIconColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'text-yellow-400 bg-yellow-400/10',
    'Matematik': 'text-red-400 bg-red-400/10',
    'Fen Bilimleri': 'text-orange-400 bg-orange-400/10',
    'Türkçe': 'text-amber-400 bg-amber-400/10',
    'Sosyal Bilgiler': 'text-cyan-400 bg-cyan-400/10',
    'İngilizce': 'text-blue-400 bg-blue-400/10',
    'Serbest Etkinlikler': 'text-purple-400 bg-purple-400/10',
    'Diğer': 'text-slate-400 bg-slate-400/10',
};

export default function AllTestsPage() {
    const { toast } = useToast();
    const { familyMembers, familyId } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubTests = onTestsUpdate(setTests, false, 'assignedDate', 'desc');
        return () => unsubTests();
    }, []);
    
    const handleDeleteTest = async (testId: string) => {
        try {
            await deleteTest(testId);
            toast({ title: "Ödev Silindi", variant: "destructive"});
        } catch (error) {
            toast({ title: "Hata", description: "Ödev silinirken bir hata oluştu.", variant: "destructive"});
        }
    };
    
    const { pendingTests, completedTests, allFilteredTests } = React.useMemo(() => {
        const filteredByStudent = selectedStudents.length > 0 
            ? tests.filter(t => selectedStudents.includes(t.studentId))
            : tests;

        const pending = filteredByStudent.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
        const completed = filteredByStudent.filter(t => t.status === 'Sonuçlandı');
        
        return {
            pendingTests: pending,
            completedTests: completed,
            allFilteredTests: filteredByStudent
        };
    }, [tests, selectedStudents]);


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => window.history.back()} 
                            variant="ghost" 
                            size="icon"
                            className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className={cn("from-indigo-500 to-purple-600", glassColors.ICON_BOX)}>
                             <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                                Tüm Ödevler
                            </h1>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Ödev Takip ve Analiz</p>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={cn("rounded-xl h-9 text-xs font-semibold whitespace-nowrap border-white/10 bg-white/5 hover:bg-white/10 text-slate-300", selectedStudents.length > 0 && "bg-indigo-600 border-indigo-500 text-white")}>
                                <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                                Filtrele {selectedStudents.length > 0 && `(${selectedStudents.length})`}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10 text-slate-100">
                            <DropdownMenuLabel>Öğrenciye Göre</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuCheckboxItem
                                checked={selectedStudents.length === 0}
                                onCheckedChange={() => setSelectedStudents([])}
                                className="focus:bg-white/10 focus:text-white"
                            >
                                Tümü
                            </DropdownMenuCheckboxItem>
                            {studentMembers.map(student => (
                                <DropdownMenuCheckboxItem
                                    key={student.id}
                                    checked={selectedStudents.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedStudents(prev => 
                                            checked 
                                            ? [...prev, student.id] 
                                            : prev.filter(id => id !== student.id)
                                        );
                                    }}
                                    className="focus:bg-white/10 focus:text-white"
                                >
                                    {student.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
                
                <Tabs defaultValue="all" className="w-full space-y-6">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 h-12 p-1 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
                        <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Tümü ({allFilteredTests.length})</TabsTrigger>
                        <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Bekleyen ({pendingTests.length})</TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Biten ({completedTests.length})</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        {allFilteredTests.length > 0 ? (
                            allFilteredTests.map(test => {
                                const student = familyMembers.find(m => m.id === test.studentId);
                                return <TestCard key={test.id} test={test} student={student} onDelete={handleDeleteTest} />;
                            })
                        ) : (
                            <EmptyState />
                        )}
                    </TabsContent>
                    
                    <TabsContent value="pending" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        {pendingTests.length > 0 ? (
                            pendingTests.map(test => {
                                const student = familyMembers.find(m => m.id === test.studentId);
                                return <TestCard key={test.id} test={test} student={student} onDelete={handleDeleteTest} />;
                            })
                        ) : (
                            <EmptyState message="Bekleyen ödev bulunamadı." />
                        )}
                    </TabsContent>
                    
                    <TabsContent value="completed" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        {completedTests.length > 0 ? (
                            completedTests.map(test => {
                                const student = familyMembers.find(m => m.id === test.studentId);
                                return <TestCard key={test.id} test={test} student={student} onDelete={handleDeleteTest} />;
                            })
                        ) : (
                            <EmptyState message="Tamamlanmış ödev bulunamadı." />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function EmptyState({ message = "Bu filtreye uygun ödev bulunamadı." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto max-w-lg w-full">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-slate-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-200">Kayıt Yok</h3>
                <p className="text-slate-400 mt-1 text-sm">{message}</p>
            </div>
        </div>
    );
}

function TestCard({ test, student, onDelete }: { test: Test, student?: FamilyMember, onDelete: (id: string) => void }) {
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
    const categoryName = getCategoryName(test);
    const Icon = categoryIcons[categoryName] || FileText;
    const iconStyle = categoryIconColors[categoryName] || 'text-slate-400 bg-slate-400/10';

    const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
    const now = new Date();
    const daysDiff = differenceInDays(dueDate, now);
    const isTestDue = isPast(dueDate) && !isToday(dueDate);

    // Score Calculation
    const totalQuestions = (test.correctAnswers || 0) + (test.incorrectAnswers || 0) + (test.emptyAnswers || 0);
    const successRate = totalQuestions > 0 ? ((test.correctAnswers || 0) / totalQuestions) * 100 : 0;

    return (
        <div className={cn(
            "group relative flex flex-col sm:flex-row gap-4 p-5 rounded-3xl transition-all border backdrop-blur-md",
            isCompleted ? "bg-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
        )}>
            {/* Status Indicator Bar */}
            <div className={cn(
                "absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all",
                isCompleted ? "bg-emerald-500" : isTestDue ? "bg-rose-500" : "bg-indigo-500"
            )} />

            <div className="flex-grow min-w-0 pl-3">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-slate-900/50 border-slate-700 text-slate-400 text-[10px] h-5 rounded-md px-2 font-medium tracking-wide uppercase">
                        {categoryName}
                    </Badge>
                    {student && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: student.color }} />
                            {student.name}
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-3">
                    <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", iconStyle)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={cn("text-lg font-bold leading-tight mb-1 text-slate-100 group-hover:text-white transition-colors")}>
                            {test.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> 
                                {test.dueDate}
                            </span>
                            {!isCompleted && (
                                <span className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-md",
                                    isTestDue ? "text-rose-300 bg-rose-500/10" : "text-emerald-300 bg-emerald-500/10"
                                )}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {isTestDue ? "Süresi Geçti" : `${daysDiff + 1} gün kaldı`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Score Summary for Completed Tests */}
                {isCompleted && (
                    <div className="mt-4 flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5 w-fit">
                        <div className="text-center px-2 border-r border-white/10">
                            <span className="block text-xl font-black text-emerald-400">%{successRate.toFixed(0)}</span>
                            <span className="text-[10px] uppercase text-slate-500 font-bold">Başarı</span>
                        </div>
                        <div className="flex gap-3 text-xs font-medium">
                            <div className="text-emerald-400 flex flex-col items-center"><CheckCircle className="w-4 h-4 mb-0.5"/> <span>{test.correctAnswers} D</span></div>
                            <div className="text-rose-400 flex flex-col items-center"><XCircle className="w-4 h-4 mb-0.5"/> <span>{test.incorrectAnswers} Y</span></div>
                            <div className="text-slate-400 flex flex-col items-center"><MinusCircle className="w-4 h-4 mb-0.5"/> <span>{test.emptyAnswers} B</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-row sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
                 {isPendingGrade ? (
                    <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                        <Button variant="secondary" size="sm" className="w-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30">Not Ver</Button>
                    </Link>
                ) : isCompleted ? (
                     <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                        <Button variant="secondary" size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white border-white/10">Sonuç</Button>
                    </Link>
                ) : (
                    <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                         <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                            Çöz <ChevronRight className="w-3.5 h-3.5 ml-1"/>
                         </Button>
                    </Link>
                )}
                
                <div className="flex gap-1 w-full sm:w-auto justify-end">
                    <Link href={`/education/management/questions?edit=${test.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <Edit className="w-4 h-4" />
                        </Button>
                    </Link>
                    
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Ödevi Sil</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Evet, Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}