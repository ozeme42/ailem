"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, AlertCircle, ChevronRight, BookOpen, 
    Layers, Search, Filter, HelpCircle, GraduationCap,
    Library, FileText, CheckCircle2, XCircle, BarChart3,
    ChevronDown, BookCopy, ListTree, TrendingUp, TrendingDown, MinusCircle,
    Eye, ExternalLink, LayoutGrid, ClipboardList, ListX
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
import { format, parseISO, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 rounded-xl shadow-lg shadow-rose-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    MISTAKE_ROW: "bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-900",
    TAB_LIST: "bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-1 rounded-xl",
};

const typeIcons: Record<string, any> = {
    json: FileText,
    exam: ClipboardList,
    bank: Library,
    quick: Sparkles,
    html: Code,
    trackedBook: BookOpen,
    mistake: AlertCircle
};

function translateType(type: string) {
    const map: Record<string, string> = {
        json: 'Yazılı Test', exam: 'Deneme Sınavı', bank: 'Soru Bankası',
        quick: 'Hızlı Test', mistake: 'Yanlış Havuzu', trackedBook: 'Kitap Takibi',
        html: 'HTML Test'
    };
    return map[type] || type;
}

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
    const [groupingMode, setGroupingMode] = React.useState<'subject' | 'type'>('subject');

    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedStudent) {
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
        return () => { unsubTests(); unsubBooks(); };
    }, [familyId, selectedStudent]);

    const aggregatedMistakes = React.useMemo(() => {
        const list: MistakeDetail[] = [];
        tests.forEach(test => {
            const subjectName = getCategoryName(test);
            let topicName = "Genel";
            if (test.topicId) {
                const allTopics = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics));
                topicName = allTopics.find(t => t.id === test.topicId)?.name || "Genel";
            } else if ((test as any).topic) {
                topicName = (test as any).topic;
            }

            if (!test.openEnded) {
                const studentAnswers = test.studentAnswers || {};
                let effectiveAnswerKey = test.answerKey || {};
                if (test.sourceType === 'json' && Object.keys(effectiveAnswerKey).length === 0 && test.jsonQuestions) {
                    test.jsonQuestions.forEach((q, idx) => { effectiveAnswerKey[(idx + 1).toString()] = q.answer; });
                }
                Object.entries(effectiveAnswerKey).forEach(([qNum, cAns]) => {
                    const sAns = studentAnswers[qNum];
                    if (!sAns || sAns !== cAns) {
                        list.push({ id: `${test.id}_${qNum}`, questionNumber: qNum, studentAnswer: sAns || null, correctAnswer: cAns, testTitle: test.title, testId: test.id, date: test.assignedDate, subject: subjectName, topic: topicName, sourceType: test.sourceType, isEmpty: !sAns });
                    }
                });
            } else if (test.studentTextAnswersEvaluation) {
                Object.entries(test.studentTextAnswersEvaluation).forEach(([qNum, status]) => {
                    if (status === 'incorrect' || status === 'empty') {
                        list.push({ id: `${test.id}_${qNum}`, questionNumber: qNum, studentAnswer: test.studentTextAnswers?.[qNum] || null, correctAnswer: test.answerKey?.[qNum] || "Bilinmiyor", testTitle: test.title, testId: test.id, date: test.assignedDate, subject: subjectName, topic: topicName, sourceType: test.sourceType, isEmpty: status === 'empty' });
                    }
                });
            }
        });
        return list.filter(m => m.testTitle.toLowerCase().includes(searchTerm.toLowerCase()) || m.subject.toLowerCase().includes(searchTerm.toLowerCase()) || m.topic.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b) => b.date.localeCompare(a.date));
    }, [tests, trackedBooks, searchTerm]);

    const hierarchy = React.useMemo(() => {
        const map: Record<string, Record<string, MistakeDetail[]>> = {};
        aggregatedMistakes.forEach(m => {
            const groupKey = groupingMode === 'subject' ? m.subject : translateType(m.sourceType);
            const subKey = m.testTitle;
            if (!map[groupKey]) map[groupKey] = {};
            if (!map[groupKey][subKey]) map[groupKey][subKey] = [];
            map[groupKey][subKey].push(m);
        });
        return map;
    }, [aggregatedMistakes, groupingMode]);

    if (loading) return <div className="flex h-screen items-center justify-center dark:bg-slate-950"><Loader2 className="animate-spin h-10 w-10 text-rose-500" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                        <div className={themeColors.ICON_BOX}><ListX className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Yanlışlarım</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Eksik ve Hata Havuzu</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                            <button key={member.id} onClick={() => setSelectedStudent(member)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0", selectedStudent?.id === member.id ? "bg-rose-600 text-white border-rose-500 shadow-md" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800")}>{member.name}</button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-8 pb-20">
                <div className={cn("rounded-3xl p-5", themeColors.CARD_BG)}>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <Tabs value={groupingMode} onValueChange={(v) => setGroupingMode(v as any)} className="w-full sm:w-auto">
                            <TabsList className={themeColors.TAB_LIST}>
                                <TabsTrigger value="subject" className="rounded-lg text-xs font-bold px-5 h-9">Ders Kartları</TabsTrigger>
                                <TabsTrigger value="type" className="rounded-lg text-xs font-bold px-5 h-9">Sınav Türleri</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Konu veya sınav ara..." className={cn("pl-10 h-11 rounded-xl", themeColors.INPUT_BG)} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                {Object.keys(hierarchy).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(hierarchy).map(([groupName, testsMap]) => {
                            const totalMistakes = Object.values(testsMap).flat().length;
                            const Icon = groupingMode === 'type' ? (typeIcons[Object.values(testsMap)[0][0].sourceType] || Library) : BookCopy;
                            
                            return (
                                <Accordion type="single" collapsible key={groupName} className="border-none">
                                    <AccordionItem value={groupName} className="border-none">
                                        <div className={cn("rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all")}>
                                            <AccordionTrigger className="px-6 py-5 hover:no-underline group">
                                                <div className="flex items-center gap-4 text-left w-full">
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0", groupingMode === 'subject' ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400")}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate pr-4">{groupName}</h3>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{Object.keys(testsMap).length} Sınav • {totalMistakes} Hata</p>
                                                    </div>
                                                    <Badge className="bg-rose-500 text-white font-black px-2 py-1 rounded-lg shadow-sm shrink-0 mr-4">{totalMistakes}</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 pt-0 bg-slate-50/50 dark:bg-black/20">
                                                <div className="space-y-4">
                                                    {Object.entries(testsMap).map(([testTitle, mistakes]) => (
                                                        <div key={testTitle} className="space-y-2">
                                                            <div className="flex items-center justify-between px-2 pt-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{testTitle}</span>
                                                                </div>
                                                                <Link href={`/education/${mistakes[0].testId}`} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">Testi Gör <ChevronRight className="w-3 h-3"/></Link>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {mistakes.map(m => (
                                                                    <div key={m.id} className={themeColors.MISTAKE_ROW}>
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <div className="flex items-center gap-4 flex-1">
                                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500">{m.questionNumber}</div>
                                                                                <div className="min-w-0">
                                                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{m.topic}</p>
                                                                                    <p className="text-[10px] text-slate-400 font-medium">{m.date}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-6">
                                                                                <div className="text-center">
                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Senin</p>
                                                                                    <span className={cn("text-sm font-black", m.isEmpty ? "text-slate-400" : "text-rose-500")}>{m.studentAnswer || "BOŞ"}</span>
                                                                                </div>
                                                                                <ChevronRight className="w-4 h-4 text-slate-200" />
                                                                                <div className="text-center">
                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Doğru</p>
                                                                                    <span className="text-sm font-black text-emerald-500">{m.correctAnswer}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </div>
                                    </AccordionItem>
                                </Accordion>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-24 text-center rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-800 bg-white/30 dark:bg-white/5">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Harika! Hiç yanlışın yok.</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Sınavları çözmeye devam et, eksiklerini buradan takip edelim.</p>
                        <Button variant="outline" className="mt-8 rounded-full h-11 px-8 border-slate-200 dark:border-slate-800 font-bold" onClick={() => router.push('/education')}>Eğitim Sayfasına Dön</Button>
                    </div>
                )}
            </main>
        </div>
    );
}
