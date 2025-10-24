
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onTrackedBookUpdate, updateTrackedBook, onTrackedBookTestsUpdate, addTrackedBookTest, updateTrackedBookTest, deleteTrackedBookTest, addTest, addBulkTrackedBookTests } from "@/lib/dataService";
import type { TrackedBook, TrackedBookSubject, TrackedBookTest, FamilyMember, Topic } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
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


export function BookDetailClient() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;
  const { toast } = useToast();
  const { familyMembers } = useAuth();

  const [book, setBook] = useState<TrackedBook | null>(null);
  const [tests, setTests] = useState<TrackedBookTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

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
    const unsubTests = onTrackedBookTestsUpdate(bookId, setTests);
    return () => {
      unsubBook();
      unsubTests();
    };
  }, [bookId]);
  
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
      answerKey: testFormData.answerKey,
    };
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

  const handleAssignSelectedTests = async () => {
    if (!book || selectedTests.length === 0 || assignFormData.studentIds.length === 0) {
        toast({ title: "Eksik Bilgi", description: "Lütfen en az bir test ve bir öğrenci seçin.", variant: "destructive"});
        return;
    }

    let assignedCount = 0;
    for (const testId of selectedTests) {
      const testToAssign = tests.find(t => t.id === testId);
      if (!testToAssign) continue;

      for (const studentId of assignFormData.studentIds) {
          const testData = {
              title: `${book.title} - ${testToAssign.name}`,
              subject: book.subjects?.find(s => s.id === testToAssign.subjectId)?.name || "Bilinmiyor",
              studentId: studentId,
              questionCount: testToAssign.questionCount,
              assignedDate: format(assignFormData.assignedDate, 'dd MMMM yyyy', { locale: tr }),
              dueDate: format(assignFormData.dueDate, 'dd MMMM yyyy', { locale: tr }),
              sourceType: 'trackedBook' as const,
              sourceId: testToAssign.id,
              gradingType: 'auto' as const,
              status: 'Atandı' as const,
              answerKey: testToAssign.answerKey,
          };
      
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


  if (!book) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={book.title}>
        <Button variant="outline" onClick={() => router.push('/education/books')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setCurrentSubject(null); setNewSubjectName(""); }}>
              <Plus className="mr-2 h-4 w-4" /> Ders Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentSubject ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</DialogTitle>
            </DialogHeader>
            <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Ders Adı (örn: Matematik)" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsSubjectDialogOpen(false)}>İptal</Button>
              <Button onClick={handleSubjectSave}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={(book.subjects || []).map(s => s.id)}>
        {(book.subjects || []).map(subject => (
          <AccordionItem key={subject.id} value={subject.id} className="border-b-0">
             <div className="bg-muted/50 rounded-lg">
                <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
                    {subject.name}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-3">
                   <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => {setCurrentSubject(subject); setCurrentTopic(null); setNewTopicName(""); setIsTopicDialogOpen(true)}}>
                          <Plus className="mr-2 h-4 w-4"/> Konu Ekle
                      </Button>
                       <Button variant="secondary" size="sm" onClick={() => { if(selectedTests.length > 0) setIsAssignDialogOpen(true) }} disabled={selectedTests.length === 0}>
                          <Send className="mr-2 h-4 w-4"/> Seçilenleri Ata ({selectedTests.length})
                      </Button>
                   </div>
                    <Accordion type="multiple" className="w-full space-y-2">
                        {(subject.topics || []).map(topic => (
                             <AccordionItem key={topic.id} value={topic.id} className="border bg-background rounded-md px-4">
                                <AccordionTrigger>{topic.name}</AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="space-y-2">
                                    {tests.filter(t => t.topicId === topic.id).map(test => (
                                        <div key={test.id} className="flex items-center justify-between p-2 border rounded-md">
                                          <div className="flex items-center gap-3">
                                            <Checkbox
                                              checked={selectedTests.includes(test.id)}
                                              onCheckedChange={() => toggleTestSelection(test.id)}
                                            />
                                            <p>{test.name} ({test.questionCount} soru)</p>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); handleOpenTestDialog(test); }}><Edit className="h-4 w-4" /></Button>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>"{test.name}" testi kalıcı olarak silinecektir.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Evet, Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="secondary" className="w-full" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); handleOpenTestDialog(null); }}>
                                            <Plus className="mr-2 h-4 w-4" /> Tek Test Ekle
                                        </Button>
                                        <Button variant="secondary" className="w-full" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setIsBulkTestDialogOpen(true); }}>
                                            <Plus className="mr-2 h-4 w-4" /> Toplu Test Ekle
                                        </Button>
                                    </div>
                                    </div>
                                </AccordionContent>
                             </AccordionItem>
                        ))}
                    </Accordion>
                </AccordionContent>
             </div>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentTopic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</DialogTitle>
              <DialogDescription>Ders: {currentSubject?.name}</DialogDescription>
            </DialogHeader>
            <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Konu Adı (örn: Üslü Sayılar)" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsTopicDialogOpen(false)}>İptal</Button>
              <Button onClick={handleTopicSave}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
       <Dialog open={isBulkTestDialogOpen} onOpenChange={setIsBulkTestDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Toplu Test Oluştur</DialogTitle>
                <DialogDescription>Ders: {currentSubject?.name} / Konu: {currentTopic?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Oluşturulacak Test Sayısı</Label>
                    <Input type="number" value={bulkTestFormData.testCount} onChange={e => setBulkTestFormData(prev => ({...prev, testCount: Number(e.target.value)}))} placeholder="10" />
                </div>
                <div className="space-y-2">
                    <Label>Her Testteki Soru Sayısı</Label>
                    <Input type="number" value={bulkTestFormData.questionCount} onChange={e => setBulkTestFormData(prev => ({...prev, questionCount: Number(e.target.value)}))} placeholder="20" />
                </div>
                 <div className="space-y-2">
                    <Label>Test Adı Ön Eki</Label>
                    <Input value={bulkTestFormData.prefix} onChange={e => setBulkTestFormData(prev => ({...prev, prefix: e.target.value}))} placeholder="Test" />
                </div>
            </div>
            <DialogFooter>
             <Button variant="ghost" onClick={() => setIsBulkTestDialogOpen(false)}>İptal</Button>
             <Button onClick={handleBulkTestSave}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentTest ? 'Testi Düzenle' : 'Yeni Test Ekle'}</DialogTitle>
            <DialogDescription>Ders: {currentSubject?.name} / Konu: {currentTopic?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={testFormData.name} onChange={e => setTestFormData(prev => ({...prev, name: e.target.value}))} placeholder="Test Adı (örn: Test 1)" />
            <Input type="number" value={testFormData.questionCount} onChange={e => setTestFormData(prev => ({...prev, questionCount: Number(e.target.value)}))} placeholder="Soru Sayısı" />
            <AnswerKeyForm 
                totalQuestions={testFormData.questionCount} 
                answerKey={testFormData.answerKey} 
                onSave={(key) => setTestFormData(prev => ({...prev, answerKey: key}))} />
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsTestDialogOpen(false)}>İptal</Button>
             <Button onClick={handleTestSave}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => { if (!open) setSelectedTests([]); setIsAssignDialogOpen(open)}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ödev Ata</DialogTitle>
                <DialogDescription>{selectedTests.length} adet test seçildi.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Öğrenci(ler)</Label>
                    <div className="space-y-2">
                        {familyMembers.filter(m => m.role.includes("Çocuk")).map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`student-${s.id}`}
                                    checked={assignFormData.studentIds.includes(s.id)}
                                    onCheckedChange={(checked) => {
                                        setAssignFormData(prev => ({
                                            ...prev,
                                            studentIds: checked
                                                ? [...prev.studentIds, s.id]
                                                : prev.studentIds.filter(id => id !== s.id)
                                        }));
                                    }}
                                />
                                <label htmlFor={`student-${s.id}`}>{s.name}</label>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Başlangıç Tarihi</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !assignFormData.assignedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{assignFormData.assignedDate ? format(assignFormData.assignedDate, "PPP", { locale: tr }) : <span>Tarih seç</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignFormData.assignedDate} onSelect={(d) => setAssignFormData(prev => ({...prev, assignedDate: d || new Date()}))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Bitiş Tarihi</Label>
                         <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !assignFormData.dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{assignFormData.dueDate ? format(assignFormData.dueDate, "PPP", { locale: tr }) : <span>Tarih seç</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignFormData.dueDate} onSelect={(d) => setAssignFormData(prev => ({...prev, dueDate: d || new Date()}))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
             <DialogFooter>
             <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>İptal</Button>
             <Button onClick={handleAssignSelectedTests}>Ödevleri Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
