
"use client";

import * as React from "react";
import Link from 'next/link';
import { ArrowLeft, Code, PlusCircle, Trash2, Edit, Send, Repeat, Loader2, MoreVertical, BookOpen, User, Calendar as CalendarLucide } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onTestsUpdate, deleteTest, addTest, updateTest, onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, onTrackedBooksUpdate, onStudyPlansUpdate, onBankQuestionsUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember, TrackedBook, StudyPlan, BankQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewHtmlTestForm } from "@/components/new-html-test-form";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-slate-900/40 border border-slate-800 shadow-xl backdrop-blur-md hover:bg-slate-900/60 hover:border-slate-700 transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-blue-500 to-sky-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white",
    BUTTON_PRIMARY: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95",
    TAB_LIST: "h-11 p-1 rounded-xl bg-slate-950/50 border border-slate-800 w-full lg:w-auto grid grid-cols-1",
    TAB_TRIGGER: "rounded-lg text-xs font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200"
};

export function HtmlTestsClient() {
  const { familyId, familyMembers } = useAuth();
  const { toast } = useToast();
  const [htmlTests, setHtmlTests] = React.useState<Test[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTest, setEditingTest] = React.useState<Test | null>(null);
  const [reassigningTest, setReassigningTest] = React.useState<Test | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Curriculum Data
  const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
  const [allTopics, setAllTopics] = React.useState<string[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);

  React.useEffect(() => {
    if (!familyId) return;
    const unsub = onTestsUpdate((allTests) => {
      setHtmlTests(allTests.filter(t => t.sourceType === 'html'));
      setLoading(false);
    });
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    const unsubTopics = onTopicsUpdate(setAllTopics);
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    const unsubPlans = onStudyPlansUpdate(setStudyPlans);
    const unsubBank = onBankQuestionsUpdate(setBankQuestions);

    return () => {
        unsub();
        unsubSubjects();
        unsubTopics();
        unsubBooks();
        unsubPlans();
        unsubBank();
    };
  }, [familyId]);

  const handleOpenForm = (test: Test | null) => {
    setEditingTest(test);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Test, 'id' | 'familyId'>) => {
    try {
      if (editingTest && !reassigningTest) {
        await updateTest(editingTest.id, data);
        toast({ title: "✅ HTML Test Güncellendi" });
      } else {
        await addTest(data);
        toast({ title: reassigningTest ? "✅ Test Yeni Görev Olarak Atandı" : "✅ HTML Testi Oluşturuldu" });
      }
      setIsFormOpen(false);
      setEditingTest(null);
      setReassigningTest(null);
    } catch (e) {
      toast({ title: "❌ Hata", description: "İşlem tamamlanamadı.", variant: "destructive" });
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteTest(testId);
      toast({ title: "🗑️ Test Silindi", variant: "destructive" });
    } catch (e) {
      toast({ title: "❌ Hata", variant: "destructive" });
    }
  };

  const handleCreateSubject = async (name: string) => {
    const newList = [...new Set([...allSubjects, name])];
    await updateSubjects(newList);
  };

  const handleCreateTopic = async (name: string) => {
    const newList = [...new Set([...allTopics, name])];
    await updateTopics(newList);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative flex flex-col">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-sky-900/10 rounded-full blur-[120px]" />
        </div>

        <header className={themeColors.HEADER_BG}>
            <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/education/management">
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                      </Button>
                    </Link>
                    <div className={cn(themeColors.ICON_BOX)}>
                         <Code className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100 leading-none">HTML Testler</h1>
                        <p className="text-xs font-medium text-slate-400 mt-1">Yönetim Paneli</p>
                    </div>
                </div>
                <Button onClick={() => { setReassigningTest(null); handleOpenForm(null); }} className={cn("rounded-xl h-11 px-5 font-bold", themeColors.BUTTON_PRIMARY)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Yeni HTML Test</span>
                </Button>
            </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 relative z-10">
            <Tabs value="active" className="w-full space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <TabsList className={themeColors.TAB_LIST}>
                            <TabsTrigger value="active" className={themeColors.TAB_TRIGGER}>Aktif HTML Testler ({htmlTests.length})</TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                <TabsContent value="active" className="m-0 animate-in fade-in zoom-in-95 duration-300">
                    {htmlTests.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {htmlTests.map(test => {
                                const student = familyMembers.find(m => m.id === test.studentId);
                                const isCompleted = test.status === 'Sonuçlandı';
                                return (
                                    <Card key={test.id} className={cn("flex flex-col h-full group", themeColors.CARD_BG)}>
                                        <CardHeader className="pb-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                                                    {test.subject}
                                                </Badge>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100 w-48 rounded-xl p-1">
                                                        <DropdownMenuItem onClick={() => { setReassigningTest(test); handleOpenForm(test); }} className="cursor-pointer hover:bg-slate-800 rounded-lg py-2.5">
                                                            <Repeat className="mr-2 h-4 w-4 text-blue-400" /> Tekrar Ata / Klonla
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setReassigningTest(null); handleOpenForm(test); }} className="cursor-pointer hover:bg-slate-800 rounded-lg py-2.5">
                                                            <Edit className="mr-2 h-4 w-4 text-blue-400" /> Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-slate-800" />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-400 cursor-pointer focus:text-rose-400 focus:bg-rose-50 rounded-lg py-2.5">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Testi Sil
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Testi Sil?</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-slate-400">
                                                                        "{test.title}" HTML testi kalıcı olarak silinecektir.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteTest(test.id)} className="bg-rose-600 hover:bg-rose-700 border-none">Evet, Sil</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <CardTitle className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">{test.title}</CardTitle>
                                        </CardHeader>
                                        
                                        <CardContent className="flex-grow space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                                                    <span className="text-xl font-black text-white">{test.questionCount}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Soru</span>
                                                </div>
                                                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", isCompleted ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                                                        {isCompleted ? "Bitti" : "Atandı"}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">Durum</span>
                                                </div>
                                            </div>
                                            
                                            {student && (
                                                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{backgroundColor: student.color}}>
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">Atanan</p>
                                                        <p className="text-sm font-semibold text-slate-200 truncate mt-1">{student.name}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                        
                                        <CardFooter className="p-4 pt-0 mt-auto">
                                            <Link href={`/education/${test.id}`} className="w-full">
                                                <Button variant="secondary" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border-none font-bold h-10 rounded-xl">
                                                    {isCompleted ? 'İncele' : 'Testi Çöz'}
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 m-auto max-w-2xl w-full">
                            <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <Code className="h-10 w-10 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">HTML Test Bulunamadı</h3>
                            <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">Yeni bir HTML tabanlı test oluşturarak başlayın.</p>
                            <Button onClick={() => handleOpenForm(null)} className="mt-8 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold px-8 shadow-lg shadow-blue-500/20">
                                <PlusCircle className="mr-2 h-5 w-5" /> İlk Testi Oluştur
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </main>

        <Dialog open={isFormOpen} onOpenChange={(open) => { if(!open) { setEditingTest(null); setReassigningTest(null); } setIsFormOpen(open); }}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-2 border-b border-white/5 bg-white/5">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {reassigningTest ? <Repeat className="w-5 h-5 text-blue-400" /> : editingTest ? <Edit className="w-5 h-5 text-blue-400" /> : <PlusCircle className="w-5 h-5 text-emerald-400" />}
                        {reassigningTest ? 'HTML Testini Tekrar Ata' : editingTest ? 'HTML Testini Düzenle' : 'Yeni HTML Testi Oluştur'}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden p-6 pt-0">
                    <NewHtmlTestForm
                        familyMembers={familyMembers.filter(m => m.role.includes('Çocuk'))}
                        onFormSubmit={handleFormSubmit}
                        initialData={editingTest}
                        availableSubjects={allSubjects}
                        onSubjectCreated={handleCreateSubject}
                        availableTopics={allTopics}
                        onTopicCreated={handleCreateTopic}
                        trackedBooks={trackedBooks}
                        studyPlans={studyPlans}
                        bankQuestions={bankQuestions}
                        isReassigning={!!reassigningTest}
                    />
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
