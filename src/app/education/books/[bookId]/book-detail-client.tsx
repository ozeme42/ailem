"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Edit, Trash2, BookCopy, Calendar as CalendarIcon, ClipboardList, BookOpen, CheckSquare, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onSinglePracticeExamUpdate, addTest, updatePracticeExam, deleteTrackedBookSubject, deleteTrackedBookTopic } from "@/lib/dataService";
import type { PracticeExam, PracticeExamSubject, FamilyMember, TrackedBook, TrackedBookSubject, Topic } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/components/auth-provider";
import { AnswerKeyForm } from "@/components/answer-key-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { onTrackedBookUpdate, updateTrackedBook } from "@/lib/dataService";
import { FileText, HelpCircle, CheckCircle, XCircle, Library } from "lucide-react";


// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

// DEĞİŞİKLİK BURADA: 'export default' eklendi
export default function BookDetailClient() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;
  const { toast } = useToast();
  const { familyMembers } = useAuth();

  const [book, setBook] = useState<TrackedBook | null>(null);
  
  // Dialog States
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  
  // Form States
  const [currentSubject, setCurrentSubject] = useState<TrackedBookSubject | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!bookId) return;
    const unsub = onTrackedBookUpdate(bookId, setBook);
    return () => unsub();
  }, [bookId]);

  // --- ACTIONS ---

  const handleSubjectSave = async () => {
    if (!book || !newName.trim()) return;
    const subjects = book.subjects || [];
    
    if (currentSubject) { // Edit
        const updatedSubjects = subjects.map(s => 
            s.id === currentSubject.id ? { ...s, name: newName } : s
        );
        await updateTrackedBook(book.id, { subjects: updatedSubjects });
        toast({ title: "Ders Güncellendi" });
    } else { // Add
        const newSubject: TrackedBookSubject = { 
            id: Date.now().toString(), 
            name: newName, 
            topics: [], 
            questionCount: 0 // Optional
        };
        await updateTrackedBook(book.id, { subjects: [...subjects, newSubject] });
        toast({ title: "Ders Eklendi" });
    }
    setIsSubjectDialogOpen(false);
    setNewName("");
    setCurrentSubject(null);
  };

  const handleTopicSave = async () => {
      if (!book || !currentSubject || !newName.trim()) return;
      
      const subjects = book.subjects.map(subject => {
        if (subject.id === currentSubject.id) {
             const topics = subject.topics || [];
             if (currentTopic) { // Edit Topic
                 return { ...subject, topics: topics.map(t => t.id === currentTopic.id ? { ...t, name: newName } : t) };
             } else { // Add Topic
                 const newTopic: Topic = { id: Date.now().toString(), name: newName };
                 return { ...subject, topics: [...topics, newTopic] };
             }
        }
        return subject;
      });

      await updateTrackedBook(book.id, { subjects });
      toast({ title: currentTopic ? "Konu Güncellendi" : "Konu Eklendi" });
      setIsTopicDialogOpen(false);
      setNewName("");
      setCurrentTopic(null);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!book) return;
    try {
        await deleteTrackedBookSubject(book.id, subjectId);
        toast({ title: "Ders Silindi", variant: "destructive" });
    } catch (e) {
        toast({ title: "Hata", variant: "destructive" });
    }
  }

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    if (!book) return;
    try {
        await deleteTrackedBookTopic(book.id, subjectId, topicId);
        toast({ title: "Konu Silindi", variant: "destructive" });
    } catch (e) {
        toast({ title: "Hata", variant: "destructive" });
    }
  }


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
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Kitap Detayı</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => { setCurrentSubject(null); setNewName(""); setIsSubjectDialogOpen(true); }} className={glassColors.BUTTON_GLASS}>
                        <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Ders Ekle</span>
                    </Button>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
            
            {/* STATS CARD */}
            <div className={cn("rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5", glassColors.CARD_BG)}>
                <div className="text-center sm:text-left">
                    <h2 className="text-lg font-bold text-slate-200">İçerik Özeti</h2>
                    <p className="text-slate-400 text-sm">{book.publisher}</p>
                </div>
                <div className="flex gap-8 divide-x divide-white/10">
                    <div className="px-4 text-center">
                        <p className="text-3xl font-black text-white">{book.subjectCount || (book.subjects || []).length}</p>
                        <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Ders</p>
                    </div>
                    <div className="px-4 text-center">
                        <p className="text-3xl font-black text-blue-400">{book.questionCount || 0}</p>
                        <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Soru</p>
                    </div>
                     <div className="px-4 text-center">
                        <p className="text-3xl font-black text-emerald-400">{book.testCount || 0}</p>
                        <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Test</p>
                    </div>
                </div>
            </div>

            {/* SUBJECTS LIST */}
             <Accordion type="multiple" className="w-full space-y-4" defaultValue={(book.subjects || []).map(s => s.id)}>
                {(book.subjects || []).map(subject => (
                    <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                        <div className="flex items-center justify-between bg-slate-900/30 pr-2">
                             <AccordionTrigger className="p-4 hover:no-underline flex gap-3 text-slate-200 hover:text-white transition-colors w-full">
                                <span className="font-bold text-lg flex items-center gap-2"><Library className="w-5 h-5 text-cyan-400"/> {subject.name}</span>
                                <span className="text-xs font-normal text-slate-500 ml-auto mr-4 hidden sm:inline-block">{(subject.topics || []).length} Konu</span>
                            </AccordionTrigger>
                            
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setCurrentSubject(subject); setNewName(subject.name); setIsSubjectDialogOpen(true); }}>
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
                             <div className="p-2 space-y-1">
                                {(subject.topics || []).map(topic => (
                                    <div key={topic.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                            <span className="font-medium text-slate-300 group-hover:text-white transition-colors">{topic.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-white" onClick={() => { setCurrentSubject(subject); setCurrentTopic(topic); setNewName(topic.name); setIsTopicDialogOpen(true); }}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-rose-400">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Konuyu Sil?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400">"{topic.name}" konusunu silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTopic(subject.id, topic.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                                
                                <Button variant="ghost" size="sm" className="w-full justify-start text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 mt-1 h-9" onClick={() => { setCurrentSubject(subject); setCurrentTopic(null); setNewName(""); setIsTopicDialogOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" /> Yeni Konu Ekle
                                </Button>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
             </Accordion>

             {/* Empty State */}
            {(book.subjects || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-slate-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">Ders Yok</h3>
                        <p className="text-slate-400 mt-1 text-sm">Bu kitaba henüz hiç ders eklenmemiş.</p>
                        <Button variant="link" className="text-indigo-400 mt-2" onClick={() => { setCurrentSubject(null); setNewName(""); setIsSubjectDialogOpen(true); }}>İlk dersi ekle</Button>
                    </div>
                </div>
            )}
        </div>
        
        {/* DIALOGS */}
        
        {/* Subject Dialog */}
        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
            <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{currentSubject ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</DialogTitle>
                    <DialogDescription className="text-slate-400">Kitap için bir ders adı girin.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        placeholder="Ders Adı (örn: Matematik)" 
                        className={glassColors.INPUT_BG}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsSubjectDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button onClick={handleSubjectSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Topic Dialog */}
        <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
            <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{currentTopic ? 'Konuyu Düzenle' : 'Yeni Konu Ekle'}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Ders: <span className="text-white font-medium">{currentSubject?.name}</span>
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4">
                     <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        placeholder="Konu Adı (örn: Üslü Sayılar)" 
                        className={glassColors.INPUT_BG}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsTopicDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button onClick={handleTopicSave} className="bg-indigo-600 hover:bg-indigo-500 text-white">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}