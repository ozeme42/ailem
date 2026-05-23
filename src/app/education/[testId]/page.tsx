"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuickTestQuestion, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, ArrowRight, Play, Pause, Check, X, MinusCircle, LayoutGrid, BookOpen, ChevronRight, Home, Loader2, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- DESIGN SYSTEM: Fixed Light Theme for Test Solving ---
const glassColors = {
    PAGE_BG: "bg-slate-50", 
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200",
    CARD_BG: "bg-white border border-slate-200 shadow-sm", 
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg text-white",
    BUTTON_GLASS: "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm",
    OPTION_BUTTON: "flex items-center justify-center w-12 h-12 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-200 font-bold text-lg text-slate-600 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:scale-110",
    INPUT_BG: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500",
};

type McqAnswers = { [key: string]: string | null };
type TextAnswers = { [key: string]: string };
type EvaluationStatus = "correct" | "incorrect" | "unevaluated" | "empty";
type ManualEvaluation = { [key: string]: EvaluationStatus };

function formatTime(seconds: number) {
  if (seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function Timer({ durationMinutes, onTimeUp }: { durationMinutes: number; onTimeUp: () => void }) {
  const [timeLeft, setTimeLeft] = React.useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = React.useState(true);

  React.useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0) onTimeUp();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, onTimeUp, isRunning]);

  return (
    <div className="flex items-center gap-3 bg-indigo-50 p-2 pl-4 pr-2 rounded-xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-2 font-mono text-xl font-bold text-indigo-700">
            <Clock className="h-5 w-5 text-indigo-600" />
            <span>{formatTime(timeLeft)}</span>
        </div>
        <button type="button" onClick={() => setIsRunning(!isRunning)} className="p-1 rounded hover:bg-indigo-100 transition-colors">
            {isRunning ? <Pause className="h-4 w-4 text-indigo-600" /> : <Play className="h-4 w-4 text-indigo-600" />}
        </button>
    </div>
  );
}

const QuestionPalette = ({ 
    total, 
    currentIndex, 
    onNavigate, 
    isAnswered,
    practiceExam,
    submittedSubjects = []
}: { 
    total: number; 
    currentIndex: number; 
    onNavigate: (index: number) => void;
    isAnswered: (index: number) => boolean;
    practiceExam?: PracticeExam | null;
    submittedSubjects?: string[];
}) => {
    if (practiceExam && practiceExam.subjects) {
        let currentOffset = 0;
        return (
            <div className="space-y-4 p-4">
                {practiceExam.subjects.map(subject => {
                    const rangeStart = currentOffset;
                    currentOffset += subject.questionCount;
                    const isSubjectSubmitted = submittedSubjects.includes(subject.id);
                    
                    return (
                        <div key={subject.id} className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{subject.name}</p>
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: subject.questionCount }).map((_, i) => {
                                    const actualIndex = rangeStart + i;
                                    const answered = isAnswered(actualIndex) || isSubjectSubmitted;
                                    const active = currentIndex === actualIndex;
                                    
                                    return (
                                        <Button
                                            key={actualIndex}
                                            variant={active ? "default" : answered ? "secondary" : "outline"}
                                            className={cn(
                                                "h-8 w-8 p-0 font-bold rounded-lg text-xs transition-all",
                                                active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                                                answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                            )}
                                            onClick={() => onNavigate(actualIndex)}
                                        >
                                            {i + 1}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-5 gap-2 p-4">
            {Array.from({ length: total }).map((_, i) => {
                const answered = isAnswered(i);
                const active = currentIndex === i;
                
                return (
                    <Button
                        key={i}
                        variant={active ? "default" : answered ? "secondary" : "outline"}
                        className={cn(
                            "h-10 w-10 p-0 font-bold rounded-lg text-xs transition-all",
                            active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                            answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                        )}
                        onClick={() => onNavigate(i)}
                    >
                        {i + 1}
                    </Button>
                );
            })}
        </div>
    );
};

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useAuth();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<TestType | null>(null);
    const [practiceExam, setPracticeExam] = React.useState<PracticeExam | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<McqAnswers>({});
    const [textAnswers, setTextAnswers] = React.useState<TextAnswers>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [manualEvaluations, setManualEvaluations] = React.useState<ManualEvaluation>({});
    const [submittedSubjectIds, setSubmittedSubjectIds] = React.useState<string[]>([]);
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    
    const form = useForm();

    const fetchQuestions = React.useCallback(async (id: string) => {
        const questionsColRef = collection(db, 'tests', id, 'questions');
        const questionsQuery = query(questionsColRef, orderBy("questionNumber"));
        const questionsSnap = await getDocs(questionsQuery);
        return questionsSnap.docs.map(d => d.data() as QuickTestQuestion);
    }, []);

    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        const unsubTest = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                if ((currentTest.sourceType === 'quick' || currentTest.sourceType === 'bank' || currentTest.sourceType === 'mistake') && (!currentTest.questions || currentTest.questions.length === 0)) {
                  currentTest.questions = await fetchQuestions(testId);
                }
                if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                    const examDoc = await getDoc(doc(db, 'practiceExams', currentTest.sourceId));
                    if (examDoc.exists()) setPracticeExam({ id: examDoc.id, ...examDoc.data() } as PracticeExam);
                }
                setTest(currentTest);
                if (currentTest.openEnded) setTextAnswers(currentTest.studentTextAnswers || {});
                else setMcqAnswers(currentTest.studentAnswers || {});

                if (currentTest.status === 'Değerlendirme Bekliyor') {
                    const initialEvals: ManualEvaluation = {};
                    const questionCount = currentTest.sourceType === 'json' ? currentTest.jsonQuestions!.length : currentTest.questionCount;
                    for (let i = 1; i <= questionCount; i++) {
                        const qNumStr = i.toString();
                        if(currentTest.openEnded) initialEvals[qNumStr] = currentTest.studentTextAnswersEvaluation?.[qNumStr] || 'unevaluated';
                        else {
                            const studentAns = currentTest.studentAnswers?.[qNumStr];
                            const correctAns = currentTest.sourceType === 'json' ? currentTest.jsonQuestions![i-1].answer : currentTest.answerKey?.[qNumStr];
                            if (!studentAns) initialEvals[qNumStr] = 'empty';
                            else if (correctAns && studentAns === correctAns) initialEvals[qNumStr] = 'correct';
                            else if (correctAns && studentAns !== correctAns) initialEvals[qNumStr] = 'incorrect';
                            else initialEvals[qNumStr] = 'unevaluated';
                        }
                    }
                    setManualEvaluations(initialEvals);
                }
            } else setTest(null);
            setIsLoading(false);
        });
        return () => unsubTest();
    }, [testId, fetchQuestions]);

    const handleSavePartial = async () => {
        if (!test) return;
        try {
            await updateTest(test.id, {
                studentAnswers: test.openEnded ? undefined : mcqAnswers,
                studentTextAnswers: test.openEnded ? textAnswers : undefined,
            });
        } catch (e) {
            console.error("Partial save error:", e);
        }
    }

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user) return;
        const isMcqTest = !test.openEnded;
        try {
            let updatedData: Partial<TestType> = { timerStatus: 'finished' };
            if (isMcqTest) {
                let allStudentMcqAnswers: McqAnswers = {};
                const questionCount = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;
                for (let i = 1; i <= questionCount; i++) {
                    const qNumStr = i.toString();
                    allStudentMcqAnswers[qNumStr] = mcqAnswers[qNumStr] || null;
                }
                updatedData.studentAnswers = allStudentMcqAnswers;
                const answerKey = test.sourceType === 'json' 
                    ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {})
                    : test.answerKey;
                
                if (answerKey && Object.keys(answerKey).length > 0) {
                    let correct = 0, incorrect = 0, empty = 0;
                    for (let i = 1; i <= questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = allStudentMcqAnswers[qNumStr];
                        if (!studentAns) empty++;
                        else if (studentAns === (answerKey as any)[qNumStr]) correct++;
                        else incorrect++;
                    }
                    updatedData.status = 'Sonuçlandı';
                    updatedData.correctAnswers = correct;
                    updatedData.incorrectAnswers = incorrect;
                    updatedData.emptyAnswers = empty;
                    updatedData.score = (correct / questionCount) * 100;
                } else updatedData.status = 'Değerlendirme Bekliyor';
            } else { 
                updatedData.studentTextAnswers = textAnswers;
                updatedData.status = 'Değerlendirme Bekliyor';
            }
            await updateTest(test.id, updatedData);
            toast({ title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!", description: "Cevapların başarıyla kaydedildi.", className: "bg-emerald-600 border-none text-white" });
            if (updatedData.status === 'Sonuçlandı' && test.familyId && test.studentId) {
                await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "❌ Hata!", description: "Test sonuçları kaydedilirken bir sorun oluştu." });
        }
    }, [test, mcqAnswers, textAnswers, toast, user]);

    const handleSubjectFinish = async (subjectId: string) => {
        await handleSavePartial();
        setSubmittedSubjectIds(prev => [...new Set([...prev, subjectId])]);
        toast({ title: "Ders Kaydedildi", description: "Bu ders için sonuçları görebilirsiniz." });
    }

    const handleMcqAnswerChange = (questionNumber: string, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        setTextAnswers(prev => ({...prev, [questionNumber]: value}));
    };

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        return test?.openEnded ? !!textAnswers[qNumStr] : !!mcqAnswers[qNumStr];
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" /><p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1><Link href="/education"><Button size="lg" className={glassColors.BUTTON_GLASS}>Geri Dön</Button></Link></div>;

    if (test.status === 'Sonuçlandı' || test.status === 'Tekrar Çözülüyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.sourceType === 'json' ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {}) : test.answerKey || {};
        const questionCount = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;
        let currentOffset = 0;
        const subjectsWithRanges = practiceExam?.subjects.map(s => {
            const range = { start: currentOffset + 1, end: currentOffset + s.questionCount };
            currentOffset += s.questionCount;
            return { ...s, range };
        }) || [];

        return (
            <div className={cn("min-h-screen text-slate-900 font-sans relative overflow-hidden flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10 pb-20">
                    <header className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 px-3 py-1 font-bold">Tamamlandı</Badge>
                    </header>
                    <Card className="flex flex-col items-center justify-center py-10 border-emerald-200 bg-emerald-50/50 backdrop-blur-md">
                        <p className="text-sm text-emerald-700 font-bold tracking-widest uppercase mb-2">Toplam Puan</p>
                        <div className="text-8xl font-black text-emerald-700 tracking-tighter">{(test.score || 0).toFixed(0)}</div>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <Badge className="bg-emerald-600 text-white border-0 text-lg px-4 py-1">{test.correctAnswers} Doğru</Badge>
                            <Badge className="bg-rose-600 text-white border-0 text-lg px-4 py-1">{test.incorrectAnswers} Yanlış</Badge>
                            <Badge className="bg-slate-500 text-white border-0 text-lg px-4 py-1">{test.emptyAnswers} Boş</Badge>
                        </div>
                    </Card>
                    <Card className={glassColors.CARD_BG}>
                        <CardHeader><CardTitle>Cevap Anahtarı</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {practiceExam ? (
                                subjectsWithRanges.map(subject => (
                                    <div key={subject.id} className="space-y-3">
                                        <h3 className="font-bold text-slate-700 px-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full" />{subject.name}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                const qNum = subject.range.start + i;
                                                const qNumStr = qNum.toString();
                                                const studentAns = studentAnswers[qNumStr];
                                                const correctAns = answerKey[qNumStr];
                                                const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                                let statusColor = evalStatus === 'correct' ? "border-emerald-200 bg-emerald-50" : (evalStatus === 'incorrect' ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50");
                                                return (
                                                    <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                                        <span className="font-bold text-slate-400 w-8">{i + 1}</span>
                                                        <div className="flex gap-2">
                                                            <span className={cn("font-bold", evalStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                            {evalStatus === 'incorrect' && <span className="font-bold text-emerald-600">{correctAns}</span>}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Array.from({ length: questionCount }).map((_, index) => {
                                        const qNumStr = (index + 1).toString();
                                        const studentAns = studentAnswers[qNumStr];
                                        const correctAns = answerKey[qNumStr];
                                        const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                        let statusColor = evalStatus === 'correct' ? "border-emerald-200 bg-emerald-50" : (evalStatus === 'incorrect' ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50");
                                        return (
                                            <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                                <span className="font-bold text-slate-400 w-8">{qNumStr}</span>
                                                <div className="flex gap-3">
                                                    <span className={cn("font-bold", evalStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                    {evalStatus === 'incorrect' && <span className="font-bold text-emerald-600">{correctAns}</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex justify-center"><Button size="lg" className="bg-white text-slate-900 border border-slate-200 px-8 py-6 text-lg font-bold" onClick={() => router.push('/education')}><Home className="mr-3 h-6 w-6 text-indigo-600" />Eğitim Sayfası</Button></div>
                </div>
            </div>
        );
    }

    let currentOffset = 0;
    const subjectsWithRanges = practiceExam?.subjects.map(s => {
        const range = { start: currentOffset + 1, end: currentOffset + s.questionCount };
        currentOffset += s.questionCount;
        return { ...s, range };
    }) || [];

    const options = ['A', 'B', 'C', 'D', 'E'];
    const testDurationMinutes = test.durationMinutes || (test.sourceType === 'json' ? test.jsonQuestions!.length * 1.5 : test.questionCount * 1.5);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-3xl mx-auto w-full mb-8 flex justify-between items-center">
                        <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <div className="text-right">
                            <h1 className="text-xl font-bold text-slate-900">{test.title}</h1>
                            <p className="text-sm text-slate-500">{test.subject}</p>
                        </div>
                    </header>

                    <main className="max-w-3xl mx-auto w-full space-y-8 pb-32">
                        <Card className="border-l-4 border-l-indigo-600 bg-white">
                            <CardContent className="flex items-center justify-between p-6">
                                <h3 className="font-bold text-lg text-slate-800">Süreniz İşliyor</h3>
                                <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            {practiceExam ? (
                                <Accordion type="multiple" className="w-full space-y-4">
                                    {subjectsWithRanges.map(subject => {
                                        const isSubjectSubmitted = submittedSubjectIds.includes(subject.id);
                                        const subjectAnswers = Array.from({ length: subject.questionCount }).map((_, i) => mcqAnswers[(subject.range.start + i).toString()]);
                                        const answeredCount = subjectAnswers.filter(Boolean).length;
                                        const correctCount = isSubjectSubmitted ? subjectAnswers.filter((ans, i) => ans === (test.answerKey || {})[(subject.range.start + i).toString()]).length : 0;
                                        const incorrectCount = isSubjectSubmitted ? subjectAnswers.filter((ans, i) => ans && ans !== (test.answerKey || {})[(subject.range.start + i).toString()]).length : 0;

                                        return (
                                            <AccordionItem key={subject.id} value={subject.id} className="border rounded-2xl bg-white overflow-hidden shadow-sm">
                                                <AccordionTrigger className="bg-slate-50 hover:bg-slate-100 px-6 py-4 no-underline hover:no-underline">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-600 p-2 rounded-lg text-white"><BookOpen className="w-4 h-4" /></div>
                                                            <h3 className="font-bold text-slate-800 text-lg">{subject.name}</h3>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isSubjectSubmitted ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                                    {correctCount}D - {incorrectCount}Y
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1 shadow-sm">
                                                                    {answeredCount}/{subject.questionCount} Soru
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-0 border-t">
                                                    <div className="divide-y divide-slate-100 bg-white">
                                                        {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                            const qNum = subject.range.start + i;
                                                            const qNumStr = qNum.toString();
                                                            const studentAns = mcqAnswers[qNumStr];
                                                            const correctAns = (test.answerKey || {})[qNumStr];
                                                            
                                                            return (
                                                                <div key={qNum} className="flex items-center p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                                                                    <div className="w-12 text-center font-bold text-slate-400 text-lg">{i + 1}</div>
                                                                    
                                                                    {isSubjectSubmitted ? (
                                                                        <div className="flex-1 flex gap-4 ml-4">
                                                                            <span className={cn("font-bold text-lg", studentAns === correctAns ? "text-emerald-600" : "text-rose-600")}>
                                                                                {studentAns || "Boş"}
                                                                            </span>
                                                                            {studentAns !== correctAns && <span className="text-emerald-600 font-bold text-lg">Doğru: {correctAns}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <RadioGroup 
                                                                            value={studentAns || ""} 
                                                                            onValueChange={(v) => handleMcqAnswerChange(qNumStr, v)}
                                                                            className="flex-1 flex justify-center sm:justify-start gap-2.5 sm:gap-6 ml-4"
                                                                        >
                                                                            {options.slice(0,4).map(option => (
                                                                                <div key={option}>
                                                                                    <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                                                                    <Label htmlFor={`q${qNum}-${option}`} className={glassColors.OPTION_BUTTON}>{option}</Label>
                                                                                </div>
                                                                            ))}
                                                                        </RadioGroup>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    {!isSubjectSubmitted && (
                                                        <div className="p-6 bg-slate-50 border-t flex justify-center">
                                                            <Button type="button" className="bg-indigo-600 text-white font-bold px-8 rounded-xl h-11" onClick={() => handleSubjectFinish(subject.id)}>
                                                                Dersi Bitir ve Sonuçları Gör
                                                            </Button>
                                                        </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        )
                                    })}
                                </Accordion>
                            ) : (
                                <Card className="overflow-hidden bg-white border">
                                    <CardHeader className="bg-slate-50 border-b"><CardTitle className="text-center">Cevap Kağıdı</CardTitle></CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100">
                                            {Array.from({ length: test.questionCount }).map((_, index) => {
                                                const qNum = index + 1;
                                                return (
                                                    <div key={qNum} className="flex items-center p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                                                        <div className="w-12 text-center font-bold text-slate-400 text-lg">{qNum}</div>
                                                        {test.openEnded ? (
                                                            <Textarea placeholder="Cevabınızı yazın..." value={textAnswers[qNum] || ""} onChange={(e) => handleTextAnswerChange(qNum, e.target.value)} className={glassColors.INPUT_BG}/>
                                                        ) : (
                                                            <RadioGroup value={mcqAnswers[qNum.toString()] || ""} onValueChange={(v) => handleMcqAnswerChange(qNum.toString(), v)} className="flex-1 flex justify-center sm:justify-start gap-3 sm:gap-6 ml-4">
                                                                {options.slice(0,4).map(opt => (
                                                                    <div key={opt}><RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" /><Label htmlFor={`q${qNum}-${opt}`} className={glassColors.OPTION_BUTTON}>{opt}</Label></div>
                                                                ))}
                                                            </RadioGroup>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-40">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-14 shadow-2xl rounded-2xl text-lg">
                                        Tüm Testi Bitir ve Genel Sonucu Gör <Check className="ml-3 h-6 w-6" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white border-slate-200 rounded-3xl shadow-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black">Emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-500 text-base">Testi bitirdikten sonra cevaplarını değiştiremezsin. Genel sonucun hesaplanacak.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6">
                                        <AlertDialogCancel className="bg-slate-100 border-slate-200 rounded-xl h-12 font-bold">Vazgeç</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">Evet, Bitir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </main>
                    
                    <div className="lg:hidden fixed bottom-24 left-6 z-50">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button size="icon" className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl border-2 border-white" onClick={() => setIsSheetOpen(true)}><LayoutGrid className="w-6 h-6" /></Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-white p-6 h-[60vh]">
                                <SheetHeader className="mb-4"><SheetTitle className="flex items-center justify-center gap-3">Soru Gezgini</SheetTitle></SheetHeader>
                                <ScrollArea className="h-full">
                                    <div className="pb-20">
                                        <QuestionPalette 
                                            total={test.questionCount} 
                                            currentIndex={currentQuestionIndex} 
                                            onNavigate={(idx) => {
                                                setCurrentQuestionIndex(idx);
                                                setIsSheetOpen(false);
                                            }} 
                                            isAnswered={isQuestionAnswered} 
                                            practiceExam={practiceExam} 
                                            submittedSubjects={submittedSubjectIds}
                                        />
                                    </div>
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </form>
        </Form>
    );
}