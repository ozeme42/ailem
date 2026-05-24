"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, AlertCircle, ChevronRight, BookOpen, 
    Layers, Search, Filter, HelpCircle, GraduationCap,
    Library, FileText, CheckCircle2, XCircle, BarChart3,
    ChevronDown, BookCopy, ListTree
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { Test, TrackedBook, FamilyMember } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { getCategoryName } from "@/app/education/page";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 rounded-xl shadow-lg shadow-rose-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    MISTAKE_CARD: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-rose-400 dark:hover:border-rose-600 transition-all",
};

type MistakeDetail = {
    id: string;
    questionNumber: string;
    studentAnswer: string | null;
    correctAnswer: string | null;
    testTitle: string;
    testId: string;
    date: string;
    subject: string;
    topic: string;
    sourceType: string;
    imageUrl?: string;
    isEmpty: boolean;
};

export function MistakesClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentIdParam = searchParams.get('studentId');

    const { familyId, familyMembers } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedStudent, setSelectedStudent] = React.useState<FamilyMember | null>(null);

    // Initial student selection
    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedMember) {
            const initial = studentIdParam 
                ? familyMembers.find(m => m.id === studentIdParam) 
                : familyMembers.find(m => m.role.includes('Çocuk')) || familyMembers[0];
            setSelectedStudent(initial || familyMembers[0]);
        }
    }, [familyMembers, selectedStudent, studentIdParam]);

    React.useEffect(() => {
        if (!familyId || !selectedStudent) return;

        const unsubTests = onTestsUpdate((all) => {
            setTests(all.filter(t => t.studentId === selectedStudent.id && t.status === 'Sonuçlandı'));
            setLoading(false);
        });
        const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);

        return () => {
            unsubTests();
            unsubBooks();
        };
    }, [familyId, selectedStudent]);

    // Aggregate Mistakes & Empties
    const aggregatedMistakes = React.useMemo(() => {
        const list: MistakeDetail[] = [];

        // YALNIZCA SORU BANKASI VE YAZILI TESTLERİ FİLTRELE
        const filteredTestsBySource = tests.filter(t => 
            t.sourceType === 'bank' || 
            t.sourceType === 'quick' || 
            t.sourceType === 'json'
        );

        filteredTestsBySource.forEach(test => {
            const studentAnswers = test.studentAnswers || {};
            const answerKey = test.answerKey || {};
            
            // Get source-specific info
            let topicName = "Genel";
            if (test.topicId) {
                const foundTopic = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics)).find(t => t.id === test.topicId);
                if (foundTopic) topicName = foundTopic.name;
            } else if ((test as any).topic) {
                topicName = (test as any).topic;
            }

            const subjectName = getCategoryName(test);

            // Compare answers and detect empties
            // We iterate based on the answerKey to ensure we catch questions that might be missing from studentAnswers
            Object.entries(answerKey).forEach(([qNum, cAns]) => {
                const sAns = studentAnswers[qNum];
                const isWrong = sAns && sAns !== cAns;
                const isEmpty = !sAns; // null, undefined or empty string

                if (isWrong || isEmpty) {
                    list.push({
                        id: `${test.id}_${qNum}`,
                        questionNumber: qNum,
                        studentAnswer: sAns || null,
                        correctAnswer: cAns,
                        testTitle: test.title,
                        testId: test.id,
                        date: test.assignedDate,
                        subject: subjectName,
                        topic: topicName,
                        sourceType: test.sourceType,
                        isEmpty: !!isEmpty
                    });
                }
            });
        });

        // Search Filter
        return list.filter(m => 
            m.testTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.topic.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => b.date.localeCompare(a.date));
    }, [tests, trackedBooks, searchTerm]);

    // Grouping for Hiearchy: Subject > Topic
    const hiearchy = React.useMemo(() => {
        const map: Record<string, Record<string, MistakeDetail[]>> = {};
        
        aggregatedMistakes.forEach(m => {
            if (!map[m.subject]) map[m.subject] = {};
            if (!map[m.subject][m.topic]) map[m.subject][m.topic] = [];
            map[m.subject][m.topic].push(m);
        });

        return map;
    }, [aggregatedMistakes]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" onClick={() => router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className={themeColors.ICON_BOX}>
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Yanlışlarım & Boşlarım</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Hata ve Eksik Analiz Merkezi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                            <button 
                                key={member.id}
                                onClick={() => setSelectedStudent(member)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0",
                                    selectedStudent?.id === member.id 
                                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md" 
                                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
                                )}
                            >
                                {member.name}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
                
                {/* Stats & Search */}
                <div className={cn("rounded-3xl p-4 md:p-6", themeColors.CARD_BG)}>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-3xl font-black text-rose-500">{aggregatedMistakes.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Toplam Eksik</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
                            <div className="text-center">
                                <p className="text-3xl font-black text-slate-400">{aggregatedMistakes.filter(m => m.isEmpty).length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Boş Sorular</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                            <div className="text-center hidden sm:block">
                                <p className="text-sm font-bold text-slate-400 max-w-[120px] leading-tight">Soru Bankası & Yazılılar</p>
                            </div>
                        </div>

                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Ders, konu veya test ara..." 
                                className={cn("pl-10 h-11 rounded-xl", themeColors.INPUT_BG)}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Mistakes Hiearchy */}
                <div className="pb-20">
                    {Object.keys(hiearchy).length > 0 ? (
                        <Accordion type="multiple" className="space-y-4">
                            {Object.entries(hiearchy).map(([subject, topics]) => (
                                <AccordionItem key={subject} value={subject} className="border-none rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <AccordionTrigger className="px-6 py-5 hover:no-underline bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-700">
                                                <BookCopy className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">{subject}</h3>
                                                <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-wider">
                                                    {Object.keys(topics).length} Konuda {Object.values(topics).flat().length} Eksik
                                                </p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-2">
                                        <div className="space-y-6">
                                            {Object.entries(topics).map(([topic, mistakes]) => (
                                                <div key={topic} className="space-y-3">
                                                    <div className="flex items-center gap-2 px-2">
                                                        <Layers className="w-4 h-4 text-rose-500" />
                                                        <h4 className="font-black text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest">{topic}</h4>
                                                        <Badge variant="secondary" className="ml-auto bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none text-[10px]">{mistakes.length} Eksik</Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {mistakes.map(mistake => (
                                                            <div key={mistake.id} className={cn(themeColors.MISTAKE_CARD, mistake.isEmpty && "border-slate-200 dark:border-slate-800")}>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter truncate">{mistake.testTitle}</p>
                                                                        <p className="text-[10px] text-slate-500 mt-0.5">{mistake.date}</p>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        {mistake.isEmpty && <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 border-none text-[9px] h-5 text-slate-500 font-bold uppercase">Boş</Badge>}
                                                                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 border-none text-[10px] h-5">Soru {mistake.questionNumber}</Badge>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                    <div className="flex flex-col items-center gap-1 flex-1">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Cevabın</span>
                                                                        <div className={cn(
                                                                            "w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-lg",
                                                                            mistake.studentAnswer 
                                                                                ? "bg-rose-500/10 border-rose-500/30 text-rose-600" 
                                                                                : "bg-slate-500/10 border-slate-500/30 text-slate-500"
                                                                        )}>
                                                                            {mistake.studentAnswer || "—"}
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                                    <div className="flex flex-col items-center gap-1 flex-1">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Doğru Cevap</span>
                                                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 font-black text-lg">
                                                                            {mistake.correctAnswer}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-shrink-0 ml-2">
                                                                        <Link href={`/education/${mistake.testId}`}>
                                                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                                                                <FileText className="w-5 h-5" />
                                                                            </Button>
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="py-24 text-center rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-700 bg-white/30 dark:bg-white/5">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Henüz Hata veya Boş Yok!</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                                Soru Bankası ve Yazılı Testlerde yaptığın hatalar ve boş bıraktığın sorular burada toplanacak.
                            </p>
                            <Button variant="outline" className="mt-8 rounded-full border-slate-200 dark:border-slate-800 font-bold" onClick={() => router.push('/education')}>
                                Eğitim Sayfasına Dön
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
