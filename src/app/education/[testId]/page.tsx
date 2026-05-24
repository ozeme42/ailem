"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuickTestQuestion, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, ArrowRight, Play, Pause, Check, LayoutGrid, BookOpen, ChevronRight, Home, Loader2, Trophy, ChevronLeft, Flag } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- TASARIM SİSTEMİ (Premium Eğitim Arayüzü) ---
const themeStyles = {
    PAGE_BG: "bg-[#F8FAFC]", // Çok hafif gri/mavi arka plan (Slate 50)
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50",
    CARD_BG: "bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem]", 
    OPTION_LIST_BUTTON: "flex items-center space-x-4 p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer group",
    OPTION_LIST_SELECTED: "bg-indigo-50/50 border-indigo-600 shadow-sm",
    OPTION_LIST_UNSELECTED: "bg-white border-slate-100 hover:border-indigo-300 hover:bg-slate-50",
    // Optik form için dairesel/kare seçenek
    OPTICAL_BUTTON: "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-200 bg-white cursor-pointer transition-all duration-200 font-bold text-base sm:text-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:shadow-md peer-data-[state=checked]:scale-110",
    INPUT_BG: "bg-slate-50 border-2 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all",
};

type McqAnswers = { [key: string]: string | null };
type TextAnswers = { [key: string]: string };
type EvaluationStatus = "correct" | "incorrect" | "unevaluated" | "empty";

function formatTime(seconds: number) {
  if (seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Şık Zamanlayıcı Hapı
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

  const isLowTime = timeLeft < 300; // Son 5 dakika

  return (
    <div className={cn("flex items-center gap-3 p-1.5 pl-4 pr-1.5 rounded-full border shadow-sm transition-colors", 
        isLowTime ? "bg-rose-50 border-rose-200" : "bg-indigo-50 border-indigo-100")}>
        <div className={cn("flex items-center gap-2 font-mono text-[17px] font-bold tracking-tight", 
            isLowTime ? "text-rose-600" : "text-indigo-700")}>
            <Clock className={cn("h-4 w-4", isLowTime ? "text-rose-500 animate-pulse" : "text-indigo-500")} />
            <span>{formatTime(timeLeft)}</span>
        </div>
        <button type="button" onClick={() => setIsRunning(!isRunning)} className={cn("p-1.5 rounded-full transition-colors", 
            isLowTime ? "hover:bg-rose-100 bg-rose-200/50" : "hover:bg-indigo-100 bg-indigo-200/50")}>
            {isRunning ? <Pause className={cn("h-4 w-4", isLowTime ? "text-rose-700" : "text-indigo-700")} /> : <Play className={cn("h-4 w-4", isLowTime ? "text-rose-700" : "text-indigo-700")} />}
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
    // Soru Gezgini Haritası
    if (practiceExam && practiceExam.subjects) {
        let currentOffset = 0;
        return (
            <div className="space-y-6 p-5">
                {practiceExam.subjects.map(subject => {
                    const rangeStart = currentOffset;
                    currentOffset += subject.questionCount;
                    const isSubjectSubmitted = submittedSubjects.includes(subject.id);
                    
                    return (
                        <div key={subject.id} className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {subject.name}
                            </h4>
                            <div className="grid grid-cols-5 gap-2.5">
                                {Array.from({ length: subject.questionCount }).map((_, i) => {
                                    const actualIndex = rangeStart + i;
                                    const answered = isAnswered(actualIndex) || isSubjectSubmitted;
                                    const active = currentIndex === actualIndex;
                                    
                                    return (
                                        <Button
                                            key={actualIndex}
                                            variant={active ? "default" : answered ? "secondary" : "outline"}
                                            className={cn(
                                                "h-10 w-10 p-0 font-bold rounded-xl text-[13px] transition-all duration-200 border-2",
                                                active && "bg-indigo-600 text-white border-indigo-600 shadow-md scale-110 z-10",
                                                answered && !active && "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300",
                                                !answered && !active && "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
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
        <div className="grid grid-cols-5 gap-3 p-5">
            {Array.from({ length: total }).map((_, i) => {
                const answered = isAnswered(i);
                const active = currentIndex === i;
                
                return (
                    <Button
                        key={i}
                        variant={active ? "default" : answered ? "secondary" : "outline"}
                        className={cn(
                            "h-11 w-11 p-0 font-bold rounded-xl text-[14px] transition-all duration-200 border-2",
                            active && "bg-indigo-600 text-white border-indigo-600 shadow-md scale-110 z-10",
                            answered && !active && "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
                            !answered && !active && "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
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
            const questionCount = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;

            if (isMcqTest) {
                let allStudentMcqAnswers: McqAnswers = {};
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
        setTimeout(() => handleSavePartial(), 500);
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        const qNumStr = questionNumber.toString();
        setTextAnswers(prev => ({...prev, [qNumStr]: value}));
        setTimeout(() => handleSavePartial(), 500);
    };

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        return test?.openEnded ? !!textAnswers[qNumStr] : !!mcqAnswers[qNumStr];
    };

    if (isLoading) return (
        <div className="flex flex-col h-screen items-center justify-center bg-slate-50 space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="w-16 h-16 animate-spin text-indigo-600 relative z-10" />
            </div>
            <p className="text-slate-500 font-bold tracking-widest uppercase animate-pulse">Sınav Hazırlanıyor</p>
        </div>
    );
    
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2 text-slate-800">Test Bulunamadı</h1><Link href="/education"><Button size="lg" className="rounded-xl font-bold bg-indigo-600 text-white">Eğitim Paneline Dön</Button></Link></div>;

    const totalQuestions = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;
    const answeredCount = Object.keys(mcqAnswers).length + Object.keys(textAnswers).length;
    const progressPercentage = (answeredCount / totalQuestions) * 100;
    const options = ['A', 'B', 'C', 'D', 'E'];
    const testDurationMinutes = test.durationMinutes || totalQuestions * 1.5;
    const isSingleQuestionView = test.sourceType === 'json' || test.sourceType === 'bank' || test.sourceType === 'mistake' || test.sourceType === 'quick';

    // --- SONUÇ EKRANI (PREMIUM GÖRÜNÜM) ---
    if (test.status === 'Sonuçlandı' || test.status === 'Tekrar Çözülüyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.sourceType === 'json' ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {}) : test.answerKey || {};
        
        let currentOffset = 0;
        const subjectsWithRanges = practiceExam?.subjects.map(s => {
            const range = { start: currentOffset + 1, end: currentOffset + s.questionCount };
            currentOffset += s.questionCount;
            return { ...s, range };
        }) || [];

        return (
            <div className={cn("min-h-[100dvh] font-sans relative overflow-x-hidden flex flex-col bg-slate-50/50")}>
                {/* Sonuç Ekranı Arka Plan Dekoru */}
                <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10 p-4 sm:p-8 pb-20">
                    <header className="flex justify-between items-center mb-4">
                        <Button variant="ghost" onClick={() => router.push('/education')} className="text-slate-600 hover:text-slate-900 bg-white shadow-sm rounded-full px-5 font-bold h-12">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış Yap
                        </Button>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-4 py-1.5 text-sm font-black uppercase tracking-wider rounded-full shadow-sm">Tamamlandı</Badge>
                    </header>

                    {/* Skorbord */}
                    <div className="flex flex-col items-center justify-center py-12 bg-white rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] border border-emerald-100 relative overflow-hidden">
                        <Trophy className="absolute top-10 left-10 w-32 h-32 text-emerald-500/5 rotate-[-15deg]" />
                        <Flag className="absolute bottom-10 right-10 w-32 h-32 text-emerald-500/5 rotate-[15deg]" />
                        
                        <p className="text-sm text-emerald-600/80 font-black tracking-widest uppercase mb-4 relative z-10">Başarı Puanı</p>
                        <div className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-teal-600 tracking-tighter drop-shadow-sm leading-none mb-6 relative z-10">
                            {(test.score || 0).toFixed(0)}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 relative z-10">
                            <div className="flex flex-col items-center justify-center bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-3 min-w-[120px]">
                                <span className="text-3xl font-black text-emerald-600">{test.correctAnswers}</span>
                                <span className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-wider">Doğru</span>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-rose-50 border border-rose-100 rounded-2xl px-6 py-3 min-w-[120px]">
                                <span className="text-3xl font-black text-rose-600">{test.incorrectAnswers}</span>
                                <span className="text-[11px] font-bold text-rose-600/70 uppercase tracking-wider">Yanlış</span>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-slate-100 border border-slate-200 rounded-2xl px-6 py-3 min-w-[120px]">
                                <span className="text-3xl font-black text-slate-500">{test.emptyAnswers}</span>
                                <span className="text-[11px] font-bold text-slate-500/70 uppercase tracking-wider">Boş</span>
                            </div>
                        </div>
                    </div>

                    {/* Cevap Anahtarı */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><LayoutGrid className="w-5 h-5" /></div>
                            <h2 className="text-2xl font-black text-slate-800">Cevap Anahtarı İncelemesi</h2>
                        </div>
                        
                        <div className="space-y-10">
                            {practiceExam ? (
                                subjectsWithRanges.map(subject => (
                                    <div key={subject.id} className="space-y-4">
                                        <h3 className="font-black text-slate-700 text-lg flex items-center gap-2">
                                            <div className="w-2 h-5 bg-indigo-500 rounded-full" /> {subject.name}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                const qNum = subject.range.start + i;
                                                const qNumStr = qNum.toString();
                                                const studentAns = studentAnswers[qNumStr];
                                                const correctAns = answerKey[qNumStr];
                                                const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                                
                                                return (
                                                    <div key={qNumStr} className={cn("p-3.5 border-2 rounded-2xl flex justify-between items-center transition-colors", 
                                                        evalStatus === 'correct' ? "border-emerald-100 bg-emerald-50/50" : 
                                                        evalStatus === 'incorrect' ? "border-rose-100 bg-rose-50/50" : "border-slate-100 bg-slate-50"
                                                    )}>
                                                        <span className="font-bold text-slate-400 text-sm w-6">{qNum}</span>
                                                        <div className="flex items-center gap-2.5">
                                                            <span className={cn("font-black text-lg", evalStatus === 'incorrect' ? 'text-rose-500' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                            {evalStatus === 'incorrect' && (
                                                                <>
                                                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                                                    <span className="font-black text-lg text-emerald-500">{correctAns}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {Array.from({ length: totalQuestions }).map((_, index) => {
                                        const qNumStr = (index + 1).toString();
                                        const studentAns = studentAnswers[qNumStr];
                                        const correctAns = answerKey[qNumStr];
                                        const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                        
                                        return (
                                            <div key={qNumStr} className={cn("p-3.5 border-2 rounded-2xl flex justify-between items-center transition-colors", 
                                                evalStatus === 'correct' ? "border-emerald-100 bg-emerald-50/50" : 
                                                evalStatus === 'incorrect' ? "border-rose-100 bg-rose-50/50" : "border-slate-100 bg-slate-50"
                                            )}>
                                                <span className="font-bold text-slate-400 text-sm w-6">{qNumStr}</span>
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn("font-black text-lg", evalStatus === 'incorrect' ? 'text-rose-500' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                    {evalStatus === 'incorrect' && (
                                                        <>
                                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                                            <span className="font-black text-lg text-emerald-500">{correctAns}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-center mt-10">
                        <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-10 h-16 text-lg font-bold shadow-xl shadow-slate-900/20" onClick={() => router.push('/education')}>
                            <Home className="mr-3 h-6 w-6" /> Ana Sayfaya Dön
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // --- SINAV EKRANI ---
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                <div className={cn("min-h-[100dvh] text-slate-900 font-sans flex flex-col", themeStyles.PAGE_BG)}>
                    
                    {/* ÜST BİLGİ VE İLERLEME ÇUBUĞU (Mobil Uyumlu Sticky) */}
                    <div className={themeStyles.HEADER_BG}>
                        {/* İlerleme Çubuğu */}
                        <div className="h-1.5 w-full bg-slate-100">
                            <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                        </div>
                        
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
                            <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900 rounded-full font-bold px-3">
                                <ArrowLeft className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Çıkış</span>
                            </Button>
                            
                            <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2 w-1/2 sm:w-auto">
                                <h1 className="text-sm sm:text-base font-black text-slate-800 truncate w-full text-center">{test.title}</h1>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{test.subject}</p>
                            </div>
                            
                            <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                        </div>
                    </div>

                    <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-6 pb-32">
                        
                        {/* SOL KOLON: SORU ALANI */}
                        <div className="lg:col-span-8 space-y-6">
                            <AnimatePresence mode="wait">
                                {isSingleQuestionView ? (
                                    <motion.div 
                                        key={currentQuestionIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {test.sourceType === 'json' && test.jsonQuestions ? (
                                            /* JSON TEK SORU */
                                            <div className={themeStyles.CARD_BG}>
                                                <div className="p-6 sm:p-8 border-b border-slate-100 flex gap-5">
                                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100 shadow-sm">
                                                        {currentQuestionIndex + 1}
                                                    </div>
                                                    <p className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed pt-1.5">
                                                        {test.jsonQuestions[currentQuestionIndex].text}
                                                    </p>
                                                </div>
                                                <div className="p-6 sm:p-8 bg-slate-50/30 rounded-b-[2rem]">
                                                    <RadioGroup 
                                                        value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                        onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)}
                                                        className="space-y-4"
                                                    >
                                                        {test.jsonQuestions[currentQuestionIndex].options.map((opt, optIdx) => {
                                                            const letter = String.fromCharCode(65 + optIdx);
                                                            const isSelected = mcqAnswers[(currentQuestionIndex + 1).toString()] === opt;
                                                            return (
                                                                <div 
                                                                    key={optIdx} 
                                                                    onClick={() => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), opt)}
                                                                    className={cn(themeStyles.OPTION_LIST_BUTTON, isSelected ? themeStyles.OPTION_LIST_SELECTED : themeStyles.OPTION_LIST_UNSELECTED)}
                                                                >
                                                                    <RadioGroupItem value={opt} id={`q${currentQuestionIndex}-${optIdx}`} className="sr-only" />
                                                                    <div className={cn(
                                                                        "w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black text-[15px] shrink-0 transition-colors",
                                                                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-100 border-slate-200 text-slate-500"
                                                                    )}>
                                                                        {letter}
                                                                    </div>
                                                                    <Label htmlFor={`q${currentQuestionIndex}-${optIdx}`} className="flex-1 cursor-pointer text-base sm:text-[17px] font-semibold text-slate-700 leading-snug">
                                                                        {opt}
                                                                    </Label>
                                                                </div>
                                                            );
                                                        })}
                                                    </RadioGroup>
                                                </div>
                                            </div>
                                        ) : (
                                            /* BANKA / MISTAKE (GÖRSELLİ) TEK SORU */
                                            <div className={themeStyles.CARD_BG}>
                                                <div className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50 rounded-t-[2rem]">
                                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-base font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                        {currentQuestionIndex + 1}
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border shadow-sm">Görsel Soru</span>
                                                </div>
                                                <div className="relative w-full aspect-auto min-h-[300px] sm:min-h-[400px] bg-slate-100/50 p-4 sm:p-8 flex items-center justify-center">
                                                    <div className="relative w-full h-full max-h-[600px] rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 bg-white">
                                                        <Image 
                                                            src={test.questions![currentQuestionIndex].imageUrl} 
                                                            alt={`Soru ${currentQuestionIndex + 1}`} 
                                                            fill 
                                                            className="object-contain p-2"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* Cevaplama Alanı (Bottom) */}
                                                <div className="p-6 sm:p-8 border-t border-slate-100 bg-white rounded-b-[2rem]">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                                                        <p className="text-[15px] font-bold text-slate-700">Cevabınızı İşaretleyin</p>
                                                    </div>
                                                    
                                                    {test.openEnded ? (
                                                        <Textarea 
                                                            placeholder="Çözüm veya cevabınızı buraya detaylıca yazabilirsiniz..." 
                                                            value={textAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                            onChange={(e) => handleTextAnswerChange(currentQuestionIndex + 1, e.target.value)} 
                                                            className={cn("min-h-[160px] rounded-2xl text-[17px] p-5 shadow-inner", themeStyles.INPUT_BG)}
                                                        />
                                                    ) : (
                                                        <RadioGroup 
                                                            value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                            onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)}
                                                            className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6"
                                                        >
                                                            {options.slice(0, 5).map(opt => (
                                                                <div key={opt} className="flex items-center">
                                                                    <RadioGroupItem value={opt} id={`opt-${opt}`} className="peer sr-only" />
                                                                    <Label htmlFor={`opt-${opt}`} className={themeStyles.OPTICAL_BUTTON}>
                                                                        {opt}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Alt Navigasyon Barı */}
                                        <div className="flex justify-between items-center mt-8 gap-4">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={handlePrev} 
                                                disabled={currentQuestionIndex === 0}
                                                className="h-14 rounded-2xl px-6 sm:px-8 font-bold text-slate-600 border-2 border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all text-base"
                                            >
                                                <ChevronLeft className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Önceki</span>
                                            </Button>

                                            {currentQuestionIndex === totalQuestions - 1 ? (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" className="h-14 rounded-2xl px-8 font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20 text-base transition-transform active:scale-95 flex-1 sm:flex-none">
                                                            Sınavı Bitir <CheckCircle className="ml-2 h-5 w-5 text-emerald-400" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white border-slate-200 rounded-[2rem] shadow-2xl p-8">
                                                        <AlertDialogHeader className="mb-6">
                                                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                                                                <Flag className="w-8 h-8" />
                                                            </div>
                                                            <AlertDialogTitle className="text-2xl font-black text-center text-slate-800">Sınavı Tamamla</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-center text-base text-slate-500 font-medium">
                                                                Cevaplarınızı kaydedip genel sonucunuzu görmek için onaylayın.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="flex-row gap-3 sm:space-x-0 w-full">
                                                            <AlertDialogCancel className="flex-1 m-0 h-14 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-[15px]">Kontrol Et</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleSubmit(false)} className="flex-1 m-0 h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/20 text-[15px]">Evet, Bitir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            ) : (
                                                <Button 
                                                    type="button" 
                                                    onClick={handleNext} 
                                                    className="h-14 rounded-2xl px-6 sm:px-8 font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all text-base flex-1 sm:flex-none"
                                                >
                                                    Sonraki <ChevronRight className="ml-2 h-5 w-5" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* DENEME SINAVI (MODÜLER OPTİK FORM GÖRÜNÜMÜ) */
                                    <Accordion type="multiple" defaultValue={practiceExam?.subjects.map(s => s.id)} className="w-full space-y-6">
                                        {practiceExam?.subjects.map(subject => {
                                            let currentOffset = 0;
                                            const sub = practiceExam.subjects.find(s => s.id === subject.id)!;
                                            const idx = practiceExam.subjects.indexOf(sub);
                                            for(let i=0; i<idx; i++) currentOffset += practiceExam.subjects[i].questionCount;
                                            const range = { start: currentOffset + 1, end: currentOffset + sub.questionCount };

                                            const isSubjectSubmitted = submittedSubjectIds.includes(subject.id);
                                            const subjectAnswers = Array.from({ length: subject.questionCount }).map((_, i) => mcqAnswers[(range.start + i).toString()]);
                                            const answeredCount = subjectAnswers.filter(Boolean).length;

                                            return (
                                                <AccordionItem key={subject.id} value={subject.id} className="border-0 rounded-[2rem] bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
                                                    <AccordionTrigger className="bg-slate-50/50 hover:bg-slate-50 px-6 py-5 no-underline hover:no-underline border-b border-slate-100">
                                                        <div className="flex items-center justify-between w-full pr-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
                                                                    <BookOpen className="w-5 h-5" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <h3 className="font-black text-slate-800 text-[17px] leading-tight">{subject.name}</h3>
                                                                    <p className="text-[12px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{subject.questionCount} Soru</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center">
                                                                {isSubjectSubmitted ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1 font-bold">Kaydedildi</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-white border-slate-200 text-indigo-600 font-bold px-3 py-1">
                                                                        {answeredCount}/{subject.questionCount} Çözüldü
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-0">
                                                        <div className="divide-y divide-slate-100/80 bg-white">
                                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                                const qNum = range.start + i;
                                                                const qNumStr = qNum.toString();
                                                                const studentAns = mcqAnswers[qNumStr];
                                                                const correctAns = (test.answerKey || {})[qNumStr];
                                                                
                                                                return (
                                                                    <div key={qNum} className="flex flex-col sm:flex-row items-start sm:items-center p-4 sm:p-6 hover:bg-slate-50/50 transition-colors gap-4">
                                                                        <div className="flex items-center gap-4 w-full sm:w-auto shrink-0">
                                                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center text-[15px]">
                                                                                {i + 1}
                                                                            </div>
                                                                            <div className="h-px bg-slate-200 flex-1 sm:hidden" />
                                                                        </div>
                                                                        
                                                                        {isSubjectSubmitted ? (
                                                                            <div className="flex-1 flex gap-6 sm:ml-6 items-center">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Senin Cevabın:</span>
                                                                                    <span className={cn("font-black text-xl w-8 h-8 rounded-lg flex items-center justify-center border", studentAns === correctAns ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200")}>
                                                                                        {studentAns || "-"}
                                                                                    </span>
                                                                                </div>
                                                                                {studentAns !== correctAns && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Doğru:</span>
                                                                                        <span className="font-black text-xl w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 border border-emerald-200 text-emerald-600">
                                                                                            {correctAns}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <RadioGroup 
                                                                                value={studentAns || ""} 
                                                                                onValueChange={(v) => handleMcqAnswerChange(qNumStr, v)}
                                                                                className="flex-1 flex justify-center sm:justify-start gap-3 sm:gap-5 w-full sm:ml-6"
                                                                            >
                                                                                {options.slice(0,5).map(option => (
                                                                                    <div key={option}>
                                                                                        <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                                                                        <Label htmlFor={`q${qNum}-${option}`} className={themeStyles.OPTICAL_BUTTON}>{option}</Label>
                                                                                    </div>
                                                                                ))}
                                                                            </RadioGroup>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        {!isSubjectSubmitted && (
                                                            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-end">
                                                                <Button type="button" className="bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold px-8 rounded-xl h-12 shadow-sm" onClick={() => handleSubjectFinish(subject.id)}>
                                                                    Bölümü Kaydet
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                        
                                        <div className="pt-8">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-16 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] rounded-2xl text-[17px] transition-transform active:scale-[0.98]">
                                                        Tüm Sınavı Bitir ve Genel Sonucu Gör <ArrowRight className="ml-3 h-5 w-5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-white border-slate-200 rounded-[2rem] shadow-2xl p-8">
                                                    <AlertDialogHeader className="mb-6">
                                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                                                            <CheckCircle className="w-8 h-8" />
                                                        </div>
                                                        <AlertDialogTitle className="text-2xl font-black text-center text-slate-800">Sınavı Tamamla</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-center text-base text-slate-500 font-medium">
                                                            Tüm bölümler için cevaplarınız hesaplanacak ve sonuç ekranına yönlendirileceksiniz.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="flex-row gap-3 sm:space-x-0 w-full">
                                                        <AlertDialogCancel className="flex-1 m-0 h-14 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-[15px]">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleSubmit(false)} className="flex-1 m-0 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 text-[15px]">Bitir ve Gör</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Accordion>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* SAĞ KOLON: SORU GEZGİNİ (DESKTOP) */}
                        <div className="hidden lg:block lg:col-span-4 relative">
                            <div className={cn("sticky top-28 rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100")}>
                                <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
                                    <h3 className="font-black text-slate-800 text-[17px] flex items-center gap-2">
                                        <LayoutGrid className="w-5 h-5 text-indigo-500" /> Soru Gezgini
                                    </h3>
                                    <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold text-sm">
                                        {answeredCount} / {totalQuestions}
                                    </div>
                                </div>
                                <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px] bg-slate-50/30">
                                    <QuestionPalette 
                                        total={totalQuestions} 
                                        currentIndex={currentQuestionIndex} 
                                        onNavigate={setCurrentQuestionIndex} 
                                        isAnswered={isQuestionAnswered} 
                                        practiceExam={practiceExam} 
                                        submittedSubjects={submittedSubjectIds}
                                    />
                                </ScrollArea>
                            </div>
                        </div>
                    </main>
                    
                    {/* MOBİL: SORU GEZGİNİ BUTONU VE SHEET */}
                    <div className="lg:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-6 z-50">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button size="icon" className="h-16 w-16 rounded-full bg-indigo-600 text-white shadow-[0_8px_30px_rgb(79,70,229,0.4)] border-[3px] border-white active:scale-95 transition-transform flex flex-col gap-0.5 items-center justify-center p-0">
                                    <LayoutGrid className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-white p-0 h-[80vh] border-0 shadow-2xl flex flex-col">
                                <SheetHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                                    <SheetTitle className="font-black text-xl flex items-center gap-2 m-0 text-slate-800">
                                        <LayoutGrid className="w-5 h-5 text-indigo-600" /> Soru Haritası
                                    </SheetTitle>
                                    <div className="bg-white border border-slate-200 text-indigo-600 px-3 py-1 rounded-full font-bold text-[13px] shadow-sm">
                                        {answeredCount} / {totalQuestions} Çözüldü
                                    </div>
                                </SheetHeader>
                                <ScrollArea className="flex-1 p-2 bg-white">
                                    <div className="pb-8">
                                        <QuestionPalette 
                                            total={totalQuestions} 
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