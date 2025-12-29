
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, Send, Check, FileText, HelpCircle, CheckCircle, XCircle, Library, BookOpen, ChevronRight, CheckSquare, ListX, BookCopy, AlertTriangle, FileOutput } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onTrackedBookUpdate, updateTrackedBook, onTrackedBookTestsUpdate, addTrackedBookTest, updateTrackedBookTest, deleteTrackedBookTest, addTest, addBulkTrackedBookTests, deleteTrackedBookTopic, deleteTrackedBookSubject, onTestsUpdate } from "@/lib/dataService";
import type { TrackedBook, TrackedBookSubject, TrackedBookTest, FamilyMember, Topic, Test } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth-provider";
import { AnswerKeyForm } from "@/components/answer-key-form";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

type MistakeInfo = {
  test: Test;
  testDefinition: TrackedBookTest;
  questionNumber: string;
};

export default function BookDetailClient() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;
  const { toast } = useToast();
  const { familyMembers } = useAuth();

  const [book, setBook] = useState<TrackedBook | null>(null);
  const [bookTests, setBookTests] = useState<TrackedBookTest[]>([]); // Test definitions for the book
  const [allAssignedTests, setAllAssignedTests] = useState<Test[]>([]); // Solved instances of tests
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("contents");

  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isBulkTestDialogOpen, setIsBulkTestDialogOpen] = useState(false);
  
  // Form/Context states
  const [currentSubject, setCurrentSubject] = useState<TrackedBookSubject | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [currentTest, setCurrentTest] = useState<TrackedBookTest | null>(null);
  
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  
  // States for forms inside dialogs
  const [testFormData, setTestFormData] = useState<{name: string, questionCount: number, answerKey: {[key:string]: string}}>({ name: "", questionCount: 20, answerKey: {} });
  const [bulkTestFormData, setBulkTestFormData] = useState({ testCount: 10, questionCount: 20, prefix: "Test" });
  const [assignFormData, setAssignFormData] = useState<{studentIds: string[], assignedDate: Date, dueDate: Date}>({ studentIds: [], assignedDate: new Date(), dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

  useEffect(() => {
    if (!bookId) return;
    const unsubBook = onTrackedBookUpdate(bookId, setBook);
    const unsubBookTests = onTrackedBookTestsUpdate(bookId, setBookTests);
    const unsubAllTests = onTestsUpdate((tests) => {
        const relevantTests = tests.filter(t => t.sourceType === 'trackedBook' && bookTests.some(bt => bt.id === t.sourceId));
        setAllAssignedTests(relevantTests);
    });
    return () => {
      unsubBook();
      unsubBookTests();
      unsubAllTests();
    };
  }, [bookId, bookTests]);
  
  const mistakeList = useMemo(() => {
    const mistakesBySubject: Record<string, Record<string, MistakeInfo[]>> = {};

    const solvedTests = allAssignedTests.filter(t => t.status === 'Sonuçlandı');

    for (const test of solvedTests) {
      const testDefinition = bookTests.find(bt => bt.id === test.sourceId);
      if (!testDefinition || !test.studentAnswers || !testDefinition.answerKey) continue;
      
      const subject = book?.subjects?.find(s => s.id === testDefinition.subjectId);
      const topic = subject?.topics?.find(t => t.id === testDefinition.topicId);
      if (!subject || !topic) continue;

      for (const qNum in test.studentAnswers) {
        const studentAnswer = test.studentAnswers[qNum];
        const correctAnswer = testDefinition.answerKey[qNum];
        if (studentAnswer && correctAnswer && studentAnswer !== correctAnswer) {
            if (!mistakesBySubject[subject.name]) {
                mistakesBySubject[subject.name] = {};
            }
            if (!mistakesBySubject[subject.name][topic.name]) {
                mistakesBySubject[subject.name][topic.name] = [];
            }
            mistakesBySubject[subject.name][topic.name].push({
                test: test,
                testDefinition,
                questionNumber: qNum
            });
        }
      }
    }
    return mistakesBySubject;
  }, [allAssignedTests, bookTests, book]);
  
  const handleOpenTestDialog = (test: TrackedBookTest | null) => {
      setCurrentTest(test);
      if (test) {
          setTestFormData({
              name: test.name,
              questionCount: test.questionCount,
              answerKey: test.answerKey || {}
          });
      } else {
           setTestFormData({ name: "", questionCount: 20, answerKey: {} });
      }
      setIsTestDialogOpen(true);
  }

  const handleSubjectSave = async () => {
    if (!book || !newSubjectName.trim()) return;
    const subjects = book.subjects || [];
    if (currentSubject) { // Editing
      const updatedSubjects = subjects.map(s => s.id === currentSubject.id ? { ...s, name: newSubjectName } : s);
      await updateTrackedBook(book.id, { subjects: updatedSubjects });
    } else { // Adding
      const newSubject: TrackedBookSubject = { id: Date.now().toString(), name: newSubjectName, topics: [] };
      await updateTrackedBook(book.id, { subjects: [...subjects, newSubject] });
    }
    setIsSubjectDialogOpen(false);
    setNewSubjectName("");
    setCurrentSubject(null);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!book) return;
    try {
      await deleteTrackedBookSubject(book.id, subjectId);
      toast({ title: "Ders Silindi", description: "Ders, konuları ve testleriyle birlikte silindi.", variant: "destructive" });
    } catch (e) {
      console.error("Error deleting subject:", e);
      toast({ title: "Hata", description: "Ders silinirken bir sorun oluştu.", variant: "destructive" });
    }
  };
  
  const handleTopicSave = async () => {
    if (!book || !currentSubject || !newTopicName.trim()) return;
    
    const subjects = book.subjects.map(subject => {
        if(subject.id === currentSubject.id) {
            const topics = subject.topics || [];
            if (currentTopic) { // Editing topic
                return {...subject, topics: topics.map(t => t.id === currentTopic.id ? { ...t, name: newTopicName } : t)};
            } else { // Adding new topic
                 const newTopic: Topic = { id: Date.now().toString(), name: newTopicName };
                 return {...subject, topics: [...topics, newTopic]};
            }
        }
        return subject;
    });

    await updateTrackedBook(book.id, { subjects });
    setIsTopicDialogOpen(false);
    setNewTopicName("");
    setCurrentTopic(null);
  };

  const handleTestSave = async () => {
    if (!book || !currentSubject || !currentTopic || !testFormData.name.trim()) return;

    const testPayload: Partial<Omit<TrackedBookTest, 'id'>> = {
      subjectId: currentSubject.id,
      topicId: currentTopic.id,
      name: testFormData.name,
      questionCount: testFormData.questionCount,
    };
    
    if (book.bookType !== 'open_ended') {
        testPayload.answerKey = testFormData.answerKey;
    }

    if (currentTest) { // Editing
      await updateTrackedBookTest(currentTest.id, testPayload);
    } else { // Adding
      await addTrackedBookTest(book.id, testPayload);
    }
    setIsTestDialogOpen(false);
  };
  
  const handleBulkTestSave = async () => {
    if (!book || !currentSubject || !currentTopic) return;
    const { testCount, questionCount, prefix } = bulkTestFormData;
    
    await addBulkTrackedBookTests(book.id, currentSubject.id, currentTopic.id, testCount, questionCount, prefix);
    
    toast({ title: "Toplu Testler Eklendi", description: `${testCount} adet test başarıyla oluşturuldu.`});
    setIsBulkTestDialogOpen(false);
  };
  
  const handleDeleteTest = async (testId: string) => {
    try {
        await deleteTrackedBookTest(testId);
        toast({ title: "Test Silindi", variant: "destructive" });
    } catch(e) {
        toast({ title: "Hata", variant: "destructive" });
    }
  }

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    if (!book) return;
    try {
        await deleteTrackedBookTopic(book.id, subjectId, topicId);
        toast({ title: "Konu Silindi", description: "Konu ve içindeki tüm testler silindi.", variant: "destructive"});
    } catch (e) {
        console.error("Error deleting topic:", e);
        toast({ title: "Hata", description: "Konu silinirken bir sorun oluştu.", variant: "destructive"});
    }
  }

  const handleAssignSelectedTests = async () => {
    if (!book || selectedTests.length === 0 || assignFormData.studentIds.length === 0) {
        toast({ title: "Eksik Bilgi", description: "Lütfen en az bir test ve bir öğrenci seçin.", variant: "destructive"});
        return;
    }

    let assignedCount = 0;
    for (const testId of selectedTests) {
      const testToAssign = bookTests.find(t => t.id === testId);
      if (!testToAssign) continue;

      for (const studentId of assignFormData.studentIds) {
          const testData: any = {
              title: `${book.title} - ${testToAssign.name}`,
              subject: book.subjects?.find(s => s.id === testToAssign.subjectId)?.name || "Bilinmiyor",
              topicId: testToAssign.topicId,
              studentId: studentId,
              questionCount: testToAssign.questionCount,
              assignedDate: format(assignFormData.assignedDate, 'dd MMMM yyyy', { locale: tr }),
              dueDate: format(assignFormData.dueDate, 'dd MMMM yyyy', { locale: tr }),
              sourceType: 'trackedBook' as const,
              sourceId: testToAssign.id,
              status: 'Atandı' as const,
              openEnded: book.bookType === 'open_ended',
              answerKey: book.bookType !== 'open_ended' ? testToAssign.answerKey : undefined,
          };
          if (testData.answerKey === undefined) {
              delete testData.answerKey;
          }
      
          await addTest(testData);
          assignedCount++;
      }
    }

    toast({title: "Ödevler Atandı!", description: `${selectedTests.length} test, ${assignFormData.studentIds.length} öğrenciye başarıyla atandı.`});
    setIsAssignDialogOpen(false);
    setSelectedTests([]);
    setAssignFormData(prev => ({ ...prev, studentIds: [] })); // Reset selection
  }

  const toggleTestSelection = (testId: string) => {
      setSelectedTests(prev => 
        prev.includes(testId) 
          ? prev.filter(id => id !== testId) 
          : [...prev, testId]
      );
  };
  
  const handleAssignDialogStudentSelection = (studentId: string, checked: boolean) => {
    const currentIds = assignFormData.studentIds;
    const nextIds = checked 
        ? [...currentIds, studentId]
        : currentIds.filter(id => id !== studentId);
    
    setAssignFormData({ 
        assignedDate: assignFormData.assignedDate, 
        dueDate: assignFormData.dueDate, 
        studentIds: nextIds 
    });
  };


  const handleDownloadMistakes = () => {
    if (!book || Object.keys(mistakeList).length === 0) {
      toast({ title: "Hata", description: "İndirilecek yanlış bulunamadı.", variant: "destructive" });
      return;
    }

    let content = `"${book.title}" Kitabı Yanlış Analizi\n`;
    content += "====================================\n\n";

    for (const subjectName in mistakeList) {
      content += `DERS: ${subjectName}\n`;
      content += "--------------------\n";
      for (const topicName in mistakeList[subjectName]) {
        content += `  Konu: ${topicName}\n`;
        mistakeList[subjectName][topicName].forEach(mistake => {
          const student = familyMembers.find(m => m.id === mistake.test.studentId);
          content += `    - Test: ${mistake.testDefinition.name}, Soru: ${mistake.questionNumber} (${student?.name || 'Bilinmiyor'})\n`;
        });
        content += "\n";
      }
      content += "\n";
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yanlis-analizi-${book.title.replace(/ /g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Başarılı", description: "Yanlış analizi indirildi." });
  };


  if (!book) return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-cyan-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => router.push('/education/books')} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-blue-500 to-cyan-600", glassColors.ICON_BOX)}>
                         <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none truncate max-w-[200px] sm:max-w-md">
                            {book.title}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{book.publisher}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }} className={glassColors.BUTTON_GLASS}>
                        <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Ders Ekle</span>
                    </Button>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
            
            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <div className={cn("p-1 rounded-2xl flex relative mb-8 w-fit mx-auto", glassColors.CARD_BG)}>
                    <TabsList className="bg-transparent h-auto flex p-0 gap-2">
                        <TabsTrigger value="contents" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                            İçindekiler
                        </TabsTrigger>
                         <TabsTrigger value="mistakes" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all flex items-center gap-2">
                            Yanlış Analizi 
                            {Object.keys(mistakeList).length > 0 && <Badge variant="destructive" className="bg-rose-500 text-white border-0">{Object.values(mistakeList).flatMap(Object.values).flat().length}</Badge>}
                        </TabsTrigger>
                    </TabsList>
                 </div>

                 <TabsContent value="contents" className="animate-in fade-in zoom-in-95 duration-300">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {(book.subjects || []).map(subject => (
                            <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                                <div className="flex items-center justify-between bg-slate-900/30 pr-2">
                                    <AccordionTrigger className="p-4 hover:no-underline flex gap-3 text-slate-200 hover:text-white transition-colors w-full">
                                        <span className="font-bold text-lg flex items-center gap-2"><BookCopy className="w-5 h-5 text-cyan-400"/> {subject.name}</span>
                                        <span className="text-xs font-normal text-slate-500 ml-auto mr-4 hidden sm:inline-block">{(subject.topics || []).length} Konu</span>
                                    </AccordionTrigger>
                                    
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setCurrentSubject(subject); setNewSubjectName(subject.name); setIsSubjectDialogOpen(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Dersi Sil?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-400">"{subject.name}" dersini ve içindeki tüm konuları silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                
                                <AccordionContent className="p-0 border-t border-white/5 bg-black/20">
                                    <div className="p-3 space-y-2">
                                        <Accordion type="multiple" className="space-y-2">
                                            {(subject.topics || []).map(topic => {
                                                const topicTests = bookTests.filter(t => t.topicId === topic.id);
                                                return (
                                                    <AccordionItem key={topic.id} value={topic.id} className="border-none rounded-xl bg-slate-900/40 overflow-hidden">
                                                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5">
                                                            <div className="flex items-center justify-between w-full pr-4">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="w-4 h-4 text-blue-400" />
                                                                    <span className="font-semibold text-slate-200">{topic.name}</span>
                                                                </div>
                                                                <Badge variant="secondary" className="bg-white/5 text-slate-400 hover:bg-white/10 ml-2">{topicTests.length} Test</Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="px-3 pb-3 pt-1 bg-black/20">
                                                            <div className="space-y-2 mt-2">
                                                                {topicTests.map(test => {
                                                                    const assignedCount = allAssignedTests.filter(t => t.sourceType === 'trackedBook' && t.sourceId === test.id).length;
                                                                    return (
                                                                        <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors ml-2 group/test">
                                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                <Checkbox checked={selectedTests.includes(test.id)} onCheckedChange={() => toggleTestSelection(test.id)} className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" />
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <p className="text-sm font-medium text-slate-200 truncate">{test.name}</p>
                                                                                    <span className="text-[10px] text-slate-500">{test.questionCount} Soru {assignedCount > 0 && `• ${assignedCount} kişiye atandı`}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/test:opacity-100 transition-opacity">
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); handleOpenTestDialog(test); }}><Edit className="h-3.5 w-3.5" /></Button>
                                                                                <AlertDialog>
                                                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                                                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100"><AlertDialogHeader><AlertDialogTitle>Testi Sil?</AlertDialogTitle><AlertDialogDescription>"{test.name}" silinecek.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTest(test.id)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                                                </AlertDialog>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                                {topicTests.length === 0 && <div className="text-xs text-slate-500 italic ml-2 py-2">Bu konuda henüz test yok.</div>}
                                                            </div>
                                                            <div className="flex gap-2 ml-2 mt-3">
                                                                <Button size="sm" variant="ghost" className="h-8 text-xs bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); handleOpenTestDialog(null); }}><Plus className="w-3 h-3 mr-1.5" /> Test Ekle</Button>
                                                                <Button size="sm" variant="ghost" className="h-8 text-xs bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setIsBulkTestDialogOpen(true); }}><CheckSquare className="w-3 h-3 mr-1.5" /> Toplu Ekle</Button>
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )
                                            })}
                                        </Accordion>
                                        <Button variant="ghost" className="w-full justify-start text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 mt-2 border border-dashed border-indigo-500/20" onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true); }}>
                                            <Plus className="w-4 h-4 mr-2" /> Yeni Konu Ekle
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 </TabsContent>
                 
                 <TabsContent value="mistakes" className="animate-in fade-in zoom-in-95 duration-300">
                      <div className={cn("rounded-2xl p-6 space-y-4", glassColors.CARD_BG)}>
                         <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <ListX className="w-6 h-6 text-rose-400"/>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-100">Yanlış Analizi</h3>
                                    <p className="text-sm text-slate-400">Çözülen testlerdeki yanlış cevapların dökümü.</p>
                                </div>
                            </div>
                            {Object.keys(mistakeList).length > 0 && (
                                <Button variant="outline" className={glassColors.BUTTON_GLASS} onClick={handleDownloadMistakes}>
                                    <FileOutput className="mr-2 h-4 w-4" /> İndir
                                </Button>
                            )}
                         </div>
                          {Object.keys(mistakeList).length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-3">
                                {Object.entries(mistakeList).map(([subjectName, topics]) => (
                                    <AccordionItem key={subjectName} value={subjectName} className="border-none rounded-xl bg-white/5 overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 text-slate-200 hover:no-underline hover:bg-white/5">
                                            {subjectName}
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4 pt-2">
                                            <Accordion type="multiple" className="space-y-2">
                                                {Object.entries(topics).map(([topicName, mistakes]) => (
                                                    <AccordionItem key={topicName} value={topicName} className="border-none rounded-lg bg-black/20 overflow-hidden">
                                                        <AccordionTrigger className="px-3 py-2 text-sm font-semibold text-slate-300 hover:no-underline hover:bg-black/20">
                                                            {topicName}
                                                        </AccordionTrigger>
                                                        <AccordionContent className="px-3 pb-3 pt-1">
                                                             <div className="pl-4 space-y-1">
                                                                {mistakes.map((mistake, i) => {
                                                                    const student = familyMembers.find(m => m.id === mistake.test.studentId);
                                                                    return (
                                                                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-rose-900/30">
                                                                        <span className="font-medium text-slate-300">{mistake.testDefinition.name}, Soru: ${'mistake.questionNumber'}</span>
                                                                        {student && <Badge variant="destructive" className="bg-transparent border border-rose-400/30 text-rose-400">{student.name}</Badge>}
                                                                    </div>
                                                                )})}
                                                             </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                          ) : (
                             <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 space-y-3">
                                <CheckCircle className="w-12 h-12 text-emerald-500"/>
                                <p className="font-semibold text-lg text-slate-300">Harika!</p>
                                <p>Bu kitaptan hiç yanlış soru bulunamadı.</p>
                            </div>
                          )}
                      </div>
                 </TabsContent>
            </Tabs>

             {/* Empty State */}
            {(book.subjects || []).length === 0 && activeTab === "contents" && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center"><BookOpen className="h-8 w-8 text-slate-500" /></div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">Ders Yok</h3>
                        <p className="text-slate-400 mt-1 text-sm">Bu kitaba henüz hiç ders eklenmemiş.</p>
                        <Button variant="link" className="text-indigo-400 mt-2" onClick={() => { setCurrentSubject(null); setNewSubjectName(""); setIsSubjectDialogOpen(true); }}>İlk dersi ekle</Button>
                    </div>
                </div>
            )}
            
            {selectedTests.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="font-bold">{selectedTests.length} Test Seçildi</span>
                    <div className="h-4 w-px bg-white/30"></div>
                    <button onClick={() => setIsAssignDialogOpen(true)} className="hover:underline font-medium flex items-center gap-1">Ata <Send className="w-4 h-4"/></button>
                    <button onClick={() => setSelectedTests([])} className="ml-2 bg-indigo-700 rounded-full p-1 hover:bg-indigo-800"><XCircle className="w-4 h-4"/></button>
                </div>
            )}
        </div>
        
        {/* --- DIALOGS --- */}
        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}><DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>{currentSubject ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</DialogTitle><DialogDescription className="text-slate-400">Kitap için bir ders adı girin.</DialogDescription></DialogHeader><div className="py-4"><Input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Ders Adı (örn: Matematik)" className={glassColors.INPUT_BG}/></div><DialogFooter><Button variant="ghost" onClick={() => setIsSubjectDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button><Button onClick={handleSubjectSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">Kaydet</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}><DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>{currentTopic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</DialogTitle><DialogDescription className="text-slate-400">Ders: <span className="text-white font-medium">{currentSubject?.name}</span></DialogDescription></DialogHeader><div className="py-4"><Input value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} placeholder="Konu Adı (örn: Üslü Sayılar)" className={glassColors.INPUT_BG}/></div><DialogFooter><Button variant="ghost" onClick={() => setIsTopicDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button><Button onClick={handleTopicSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">Kaydet</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}><DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>{currentTest ? 'Testi Düzenle' : 'Yeni Test Ekle'}</DialogTitle><DialogDescription className="text-slate-400">{currentTopic?.name} konusuna test ekleyin.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Test Adı</Label><Input value={testFormData.name} onChange={(e) => setTestFormData(prev => ({...prev, name: e.target.value}))} placeholder="Örn: Test 1" className={glassColors.INPUT_BG}/></div><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Soru Sayısı</Label><Input type="number" value={testFormData.questionCount} onChange={(e) => setTestFormData(prev => ({...prev, questionCount: parseInt(e.target.value) || 0}))} className={glassColors.INPUT_BG}/></div>{book.bookType !== 'open_ended' && (<div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cevap Anahtarı (Opsiyonel)</Label><div className="bg-black/20 p-2 rounded-lg border border-white/5 max-h-40 overflow-y-auto"><AnswerKeyForm totalQuestions={testFormData.questionCount} answerKey={testFormData.answerKey} onSave={(key) => setTestFormData(prev => ({...prev, answerKey: key}))} /></div></div>)}</div><DialogFooter><Button variant="ghost" onClick={() => setIsTestDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button><Button onClick={handleTestSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">Kaydet</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isBulkTestDialogOpen} onOpenChange={setIsBulkTestDialogOpen}><DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>Toplu Test Ekle</DialogTitle><DialogDescription className="text-slate-400">{currentTopic?.name} konusuna birden fazla test ekleyin.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Eklenecek Test Sayısı</Label><Input type="number" value={bulkTestFormData.testCount} onChange={(e) => setBulkTestFormData(prev => ({...prev, testCount: parseInt(e.target.value) || 0}))} className={glassColors.INPUT_BG}/></div><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Her Testteki Soru Sayısı</Label><Input type="number" value={bulkTestFormData.questionCount} onChange={(e) => setBulkTestFormData(prev => ({...prev, questionCount: parseInt(e.target.value) || 0}))} className={glassColors.INPUT_BG}/></div><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">İsim Ön Eki</Label><Input value={bulkTestFormData.prefix} onChange={(e) => setBulkTestFormData(prev => ({...prev, prefix: e.target.value}))} placeholder="Örn: Test" className={glassColors.INPUT_BG}/><p className="text-xs text-slate-500">Örn: "Test" -> "Test 1", "Test 2"...</p></div></div><DialogFooter><Button variant="ghost" onClick={() => setIsBulkTestDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button><Button onClick={handleBulkTestSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">Oluştur</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}><DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>Ödev Ata</DialogTitle><DialogDescription className="text-slate-400">{selectedTests.length} adet test seçildi.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Öğrenci(ler)</Label><div className="space-y-2 p-3 bg-black/20 rounded-xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">{familyMembers.filter(m => m.role.includes("Çocuk")).map(s => (<div key={s.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" onClick={() => handleAssignDialogStudentSelection(s.id, !assignFormData.studentIds.includes(s.id))}><Checkbox id={`student-${s.id}`} checked={assignFormData.studentIds.includes(s.id)} onCheckedChange={(checked) => handleAssignDialogStudentSelection(s.id, !!checked)} className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" /><label htmlFor={`student-${s.id}`} className="font-medium text-slate-200 cursor-pointer w-full text-sm">{s.name}</label></div>))}</div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Başlangıç</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-white/10 bg-white/5 hover:bg-white/10 hover:text-white")}><CalendarIcon className="mr-2 h-4 w-4" />{format(assignFormData.assignedDate, "d MMM yyyy", { locale: tr })}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100"><Calendar mode="single" selected={assignFormData.assignedDate} onSelect={(d) => setAssignFormData({...assignFormData, assignedDate: d || new Date()})} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent></Popover></div><div className="space-y-2"><Label className="text-xs font-bold text-slate-400 uppercase">Bitiş</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-white/10 bg-white/5 hover:bg-white/10 hover:text-white")}><CalendarIcon className="mr-2 h-4 w-4" />{format(assignFormData.dueDate, "d MMM yyyy", { locale: tr })}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100"><Calendar mode="single" selected={assignFormData.dueDate} onSelect={(d) => setAssignFormData({...assignFormData, dueDate: d || new Date()})} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent></Popover></div></div></div><DialogFooter><Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button><Button onClick={handleAssignSelectedTests} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">Ödevleri Ata</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
