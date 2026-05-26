
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test as TestType, QuickTestQuestion, EvaluationStatus, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { 
    ArrowLeft, CheckCircle, Clock, Play, Pause, Check, X, MinusCircle, 
    LayoutGrid, Loader2, Sparkles, ChevronRight, ChevronLeft, 
    CheckCircle2, XCircle, Send, MessageSquareText, ImageIcon, 
    RotateCcw, FileCode, BookCopy, BarChart3, TrendingUp, Search, Eye, 
    ChevronUp, ListTodo, ChevronDown, Maximize2, Minimize2, CheckSquare, Save
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { doc, getDocs, collection, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- DESIGN SYSTEM ---
const glassColors = {
    PAGE_BG: "bg-slate-50", 
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200",
    CARD_BG: "bg-white border border-slate-200 shadow-sm", 
    OPTION_BUTTON: "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-200 font-bold text-[10px] md:text-xs text-slate-600 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:shadow-lg",
};

const getIframeDocument = (htmlContent: string) => `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 20px; color: #1e293b; background: white; }
        h1, h2, h3 { color: #0f172a; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
        p { line-height: 1.6; margin-bottom: 1em; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
        .question-block { margin-bottom: 30px; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;

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
    <div className="flex items-center gap-3 bg-indigo-50 p-1.5 md:p-2 pl-3 md:pl-4 pr-1.5 md:pr-2 rounded-lg md:rounded-xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-1.5 md:gap-2 font-mono text-base md:text-xl font-bold text-indigo-700">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
            <span>{formatTime(timeLeft)}</span>
        </div>
        <button type="button" onClick={() => setIsRunning(!isRunning)} className="p-1 rounded hover:bg-indigo-100 transition-colors">
            {isRunning ? <Pause className="h-3 w-3 md:h-4 md:w-4 text-indigo-600" /> : <Play className="h-3 w-3 md:h-4 md:w-4 text-indigo-600" />}
        </button>
    </div>
  );
}

const QuestionPalette = ({ 
    total, 
    currentIndex, 
    onNavigate, 
    isAnswered,
    evaluationMap
}: { 
    total: number; 
    currentIndex: number; 
    onNavigate: (index: number) => void;
    isAnswered: (index: number) => boolean;
    evaluationMap?: { [key: string]: EvaluationStatus };
}) => {
    return (
        <div className="grid grid-cols-5 md:grid-cols-5 gap-1.5 md:gap-2 p-3 md:p-4">
            {Array.from({ length: total }).map((_, i) => {
                const qNum = (i + 1).toString();
                const answered = isAnswered(i);
                const active = currentIndex === i;
                const status = evaluationMap?.[qNum];
                
                return (
                    <Button
                        key={i}
                        type="button"
                        variant={active ? "default" : answered ? "secondary" : "outline"}
                        className={cn(
                            "h-8 w-8 md:h-10 md:w-10 p-0 font-bold rounded-lg text-[10px] md:text-xs transition-all relative",
                            active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                            answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
                            status === 'correct' && "border-emerald-500 bg-emerald-50 text-emerald-700",
                            status === 'incorrect' && "border-rose-500 bg-rose-50 text-rose-700",
                        )}
                        onClick={() => onNavigate(i)}
                    >
                        {i + 1}
                        {status === 'correct' && <Check className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 text-white rounded-full p-0.5" />}
                        {status === 'incorrect' && <X className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-rose-500 text-white rounded-full p-0.5" />}
                    </Button>
                );
            })}
        </div>
    );
};

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const testId = params.testId as string;
    const isEvaluationMode = searchParams.get('mode') === 'evaluate';

    const [test, setTest] = React.useState<TestType | null>(null);
    const [practiceExamData, setPracticeExamData] = React.useState<PracticeExam | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<{ [key: string]: string | null }>({});
    const [textAnswers, setTextAnswers] = React.useState<{ [key: string]: string }>({});
    const [manualEvaluation, setManualEvaluation] = React.useState<{ [key: string]: EvaluationStatus }>({});
    const [textFeedback, setTextFeedback] = React.useState<{ [key: string]: string }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [openSubjectStats, setOpenSubjectStats] = React.useState<Set<string>>(new Set());
    
    // UI Navigation States
    const [showMobilePalette, setShowMobilePalette] = React.useState(false);
    const [showMobileOptical, setShowMobileOptical] = React.useState(false);
    const [showDesktopOptical, setShowDesktopOptical] = React.useState(true);
    const [isHtmlFullScreen, setIsHtmlFullScreen] = React.useState(false);

    const isInitializedRef = React.useRef(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
                
                if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                    const examRef = doc(db, 'practiceExams', currentTest.sourceId);
                    const examSnap = await getDoc(examRef);
                    if (examSnap.exists()) {
                        setPracticeExamData({ id: examSnap.id, ...examSnap.data() } as PracticeExam);
                    }
                }

                if ((currentTest.sourceType === 'quick' || currentTest.sourceType === 'bank' || currentTest.sourceType === 'mistake' || currentTest.sourceType === 'trackedBook') && (!currentTest.questions || currentTest.questions.length === 0)) {
                  currentTest.questions = await fetchQuestions(testId);
                }
                setTest(currentTest);
                if (!isInitializedRef.current) {
                    setMcqAnswers(currentTest.studentAnswers || {});
                    setTextAnswers(currentTest.studentTextAnswers || {});
                    setManualEvaluation(currentTest.studentTextAnswersEvaluation || {});
                    setTextFeedback(currentTest.studentTextAnswersFeedback || {});
                    isInitializedRef.current = true;
                }
            } else {
                setTest(null);
            }
            setIsLoading(false);
        });
        
        return () => unsubTest();
    }, [testId, fetchQuestions]);

    const isReviewMode = test?.status === 'Sonuçlandı' && !isEvaluationMode;

    const handleSavePartial = React.useCallback(async (latestMcq: any, latestText: any) => {
        if (!test || isReviewMode || isEvaluationMode) return;
        try {
            await updateTest(test.id, {
                studentAnswers: latestMcq,
                studentTextAnswers: latestText,
            });
        } catch (e) {
            console.error("Partial save error:", e);
        }
    }, [test, isReviewMode, isEvaluationMode]);

    const debouncedSave = (newMcq: any, newText: any) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSavePartial(newMcq, newText);
        }, 1000);
    };

    const handleMcqAnswerChange = (questionNumber: string, value: string) => {
        if(isReviewMode || isEvaluationMode) return;
        const updated = { ...mcqAnswers, [questionNumber]: value };
        setMcqAnswers(updated);
        debouncedSave(updated, textAnswers);
    };

    const handleTextAnswerChange = (questionNumber: string, value: string) => {
        if(isReviewMode || isEvaluationMode) return;
        const updated = { ...textAnswers, [questionNumber]: value };
        setTextAnswers(updated);
        debouncedSave(mcqAnswers, updated);
    };

    const handleEvaluationChange = (questionNumber: string, status: EvaluationStatus) => {
        setManualEvaluation(prev => ({ ...prev, [questionNumber]: status }));
    };

    const handleFeedbackChange = (questionNumber: string, feedback: string) => {
        setTextFeedback(prev => ({ ...prev, [questionNumber]: feedback }));
    };

    const handleSubmitEvaluation = async () => {
        if (!test || !user) return;
        setIsSubmitting(true);
        try {
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
            let correct = 0, incorrect = 0, empty = 0;
            for (let i = 1; i <= questionCount; i++) {
                const status = manualEvaluation[i.toString()] || 'unevaluated';
                if (status === 'correct') correct++;
                else if (status === 'incorrect') incorrect++;
                else empty++;
            }
            const score = (correct / questionCount) * 100;
            
            await updateTest(test.id, {
                status: 'Sonuçlandı',
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                emptyAnswers: empty,
                score,
                studentTextAnswersEvaluation: manualEvaluation,
                studentTextAnswersFeedback: textFeedback
            });
            
            toast({ title: "Değerlendirme Kaydedildi!", className: "bg-indigo-600 text-white" });
            router.push('/education');
        } catch (e) {
            toast({ variant: "destructive", title: "Hata!" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user || isReviewMode || isEvaluationMode) return;
        setIsSubmitting(true);
        try {
            let updatedData: Partial<TestType> = { 
                timerStatus: 'finished',
                status: 'Değerlendirme Bekliyor',
                studentAnswers: mcqAnswers,
                studentTextAnswers: textAnswers,
            };
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
            const isAutoGrade = !test.openEnded && test.answerKey && Object.keys(test.answerKey).length > 0;
            if (isAutoGrade) {
                let correct = 0, incorrect = 0, empty = 0;
                for (let i = 1; i <= questionCount; i++) {
                    const qNumStr = i.toString();
                    const sAns = mcqAnswers[qNumStr];
                    const cAns = test.answerKey![qNumStr];
                    if (!sAns) empty++;
                    else if (sAns === cAns) correct++;
                    else incorrect++;
                }
                updatedData.status = 'Sonuçlandı';
                updatedData.correctAnswers = correct;
                updatedData.incorrectAnswers = incorrect;
                updatedData.emptyAnswers = empty;
                updatedData.score = (correct / questionCount) * 100;
            }
            await updateTest(test.id, updatedData);
            if (updatedData.status === 'Sonuçlandı') {
                toast({ title: "Sınav Sonuçlandı!", description: `Başarı: %${updatedData.score?.toFixed(0)}`, className: "bg-indigo-600 border-none text-white" });
                if (test.familyId && test.studentId) {
                    await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
                }
            } else {
                toast({ title: isFinishedByTimer ? "Süre Doldu!" : "Ödev Gönderildi!", description: "Cevapların kaydedildi. Değerlendirme bekliyor.", className: "bg-emerald-600 border-none text-white" });
            }
            router.push('/education');
        } catch (error) {
            toast({ variant: "destructive", title: "Hata!", description: "Kaydedilirken bir sorun oluştu." });
        } finally {
            setIsSubmitting(false);
        }
    }, [test, mcqAnswers, textAnswers, toast, user, router, isReviewMode, isEvaluationMode]);

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        return test?.openEnded ? !!textAnswers[qNumStr] : !!mcqAnswers[qNumStr];
    };

    const toggleSubjectStats = (subjectId: string) => {
        setOpenSubjectStats(prev => {
            const next = new Set(prev);
            if (next.has(subjectId)) next.delete(subjectId);
            else next.add(subjectId);
            return next;
        });
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" /><p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1><Link href="/education"><Button type="button" size="lg">Geri Dön</Button></Link></div>;

    const totalQuestions = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
    const testDurationMinutes = test.durationMinutes || totalQuestions * 1.5;

    return (
        <Form {...form}>
            <div className="h-full flex flex-col">
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-3 md:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-7xl mx-auto w-full mb-6 md:mb-8 flex justify-between items-center bg-white/40 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-3xl border border-white/40 shadow-sm">
                        <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900 rounded-lg md:rounded-2xl h-9 md:h-10 px-2 md:px-4"><ArrowLeft className="md:mr-2 h-5 w-5" /> <span className="hidden md:inline">Çıkış</span></Button>
                        <div className="text-center">
                            <h1 className="text-sm md:text-lg font-black text-slate-900 tracking-tight truncate max-w-[120px] md:max-w-full">{test.title}</h1>
                            {isReviewMode && <Badge className="bg-emerald-600">İnceleme Modu</Badge>}
                            {isEvaluationMode && <Badge className="bg-indigo-600">Değerlendirme Modu</Badge>}
                            {!isReviewMode && !isEvaluationMode && <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest">{test.subject}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                            {!isReviewMode && !isEvaluationMode && <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />}
                            {isSolveMode && <Button type="button" className="hidden md:flex bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl" onClick={() => handleSubmit(false)}>Bitir</Button>}
                            {isEvaluationMode && <Button type="button" className="bg-indigo-600 text-white font-black rounded-xl" onClick={handleSubmitEvaluation} disabled={isSubmitting}>{isSubmitting ? "Kaydediliyor..." : "Değerlendirmeyi Bitir"}</Button>}
                        </div>
                    </header>

                    {/* DERS BAZLI GÖRÜNÜM (Deneme Sınavı) */}
                    {test.sourceType === 'exam' ? (
                        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-32">
                             <div className="lg:col-span-8 space-y-4">
                                <Accordion type="multiple" className="space-y-4">
                                    {practiceExamData?.subjects.map((subject, sIdx) => {
                                        let questionOffset = 0;
                                        for(let i=0; i<sIdx; i++) questionOffset += practiceExamData.subjects[i].questionCount;
                                        
                                        const qNums = Array.from({ length: subject.questionCount }, (_, i) => (questionOffset + i + 1).toString());
                                        const correctInSubject = qNums.filter(q => mcqAnswers[q] && mcqAnswers[q] === test.answerKey?.[q]).length;
                                        const incorrectInSubject = qNums.filter(q => mcqAnswers[q] && mcqAnswers[q] !== test.answerKey?.[q]).length;
                                        const emptyInSubject = qNums.filter(q => !mcqAnswers[q]).length;

                                        return (
                                            <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-xl md:rounded-[2rem] bg-white border border-slate-200 shadow-md overflow-hidden">
                                                <AccordionTrigger className="px-5 py-4 hover:no-underline bg-slate-50/50">
                                                    <div className="flex items-center justify-between w-full pr-2">
                                                        <div className="flex items-center gap-3 text-left">
                                                            <div className="h-10 w-10 rounded-lg md:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0"><BookCopy className="w-5 h-5"/></div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-base font-black text-slate-800">{subject.name}</h3>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{subject.questionCount} Soru</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-4 md:p-6 space-y-6">
                                                    {(isReviewMode || isEvaluationMode) && (
                                                         <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-inner">
                                                            <div className="text-center">
                                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Doğru</p>
                                                                <p className="text-xl font-black text-emerald-700">{correctInSubject}</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Yanlış</p>
                                                                <p className="text-xl font-black text-rose-700">{incorrectInSubject}</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Boş</p>
                                                                <p className="text-xl font-black text-slate-600">{emptyInSubject}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                            const qNum = (questionOffset + i + 1).toString();
                                                            const sAns = mcqAnswers[qNum];
                                                            const cAns = test.answerKey?.[qNum];
                                                            const isCorrect = sAns === cAns;
                                                            return (
                                                                <div key={qNum} className={cn("flex items-center gap-3 p-2 rounded-xl border group", isReviewMode ? (isCorrect ? "bg-emerald-50 border-emerald-100" : (sAns ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100")) : "bg-slate-50 border-slate-100")}>
                                                                    <Badge className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0", isReviewMode ? (isCorrect ? "bg-emerald-600" : (sAns ? "bg-rose-600" : "bg-slate-400")) : "bg-white border border-slate-200 text-slate-600")}>{i + 1}</Badge>
                                                                    <RadioGroup value={sAns || ""} onValueChange={(v) => handleMcqAnswerChange(qNum, v)} disabled={isReviewMode || isEvaluationMode} className="flex gap-1">
                                                                        {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                            <div key={opt} className="flex items-center">
                                                                                <RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" />
                                                                                <Label htmlFor={`q${qNum}-${opt}`} className={cn(glassColors.OPTION_BUTTON, "w-8 h-8", isReviewMode && opt === cAns && "border-emerald-600 bg-emerald-100 text-emerald-800", isReviewMode && sAns === opt && !isCorrect && "border-rose-600 bg-rose-100 text-rose-800")}>{opt}</Label>
                                                                            </div>
                                                                        ))}
                                                                    </RadioGroup>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                             </div>
                             <div className="hidden lg:block lg:col-span-4">
                                <div className="sticky top-28 rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col h-[70vh]">
                                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center"><h3 className="font-black text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-600" /> Soru Gezgini</h3></div>
                                    <ScrollArea className="flex-1">
                                        <QuestionPalette total={totalQuestions} currentIndex={-1} onNavigate={() => {}} isAnswered={isQuestionAnswered} />
                                    </ScrollArea>
                                    {!isReviewMode && !isEvaluationMode && <div className="p-4 border-t"><Button type="button" className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black" onClick={() => handleSubmit(false)}>Sınavı Bitir</Button></div>}
                                </div>
                             </div>
                        </main>
                    ) : test.sourceType === 'html' ? (
                        /* HTML GÖRÜNÜMÜ (Döküman Tabanlı) */
                        <main className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 pb-32">
                             <div className={cn(
                                "bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative",
                                showDesktopOptical ? "lg:col-span-9" : "lg:col-span-12",
                                "min-h-[600px] lg:h-[88vh]",
                                isHtmlFullScreen && "fixed inset-0 z-[100] h-screen w-screen rounded-none m-0"
                             )}>
                                <iframe srcDoc={getIframeDocument(test.htmlContent || "")} className="w-full h-full border-none" title={test.title} sandbox="allow-scripts allow-same-origin" />
                             </div>
                             
                             <div className={cn(
                                "transition-all duration-300",
                                showMobileOptical ? "fixed inset-0 z-[110] bg-slate-50/95 backdrop-blur-xl p-4 flex flex-col" : 
                                (showDesktopOptical && !isHtmlFullScreen ? "lg:col-span-3 lg:flex lg:flex-col" : "hidden")
                             )}>
                                <Card className="rounded-3xl border-slate-200 shadow-xl flex-1 flex flex-col overflow-hidden h-full">
                                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center"><h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-indigo-600" /> Cevap Formu</h3></div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 space-y-3">
                                            {Array.from({ length: test.questionCount }).map((_, i) => {
                                                const qNum = (i + 1).toString();
                                                const sAns = mcqAnswers[qNum];
                                                const cAns = test.answerKey?.[qNum];
                                                const isCorrect = sAns === cAns;
                                                return (
                                                    <div key={qNum} className={cn("flex items-center gap-3 p-2 rounded-xl border transition-all", isReviewMode ? (isCorrect ? "bg-emerald-50 border-emerald-100" : (sAns ? "bg-rose-50 border-rose-100" : "bg-slate-50")) : "bg-slate-50 border-slate-100")}>
                                                        <Badge className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-black p-0 text-[10px] shrink-0", isReviewMode ? (isCorrect ? "bg-emerald-600" : (sAns ? "bg-rose-600" : "bg-slate-400")) : "bg-indigo-600 text-white")}>{i + 1}</Badge>
                                                        <RadioGroup value={sAns || ""} onValueChange={(v) => handleMcqAnswerChange(qNum, v)} disabled={isReviewMode || isEvaluationMode} className="flex gap-1">
                                                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                <div key={opt} className="flex items-center">
                                                                    <RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" />
                                                                    <Label htmlFor={`q${qNum}-${opt}`} className={cn("w-7 h-7 text-[10px] flex items-center justify-center rounded-lg border border-slate-200 bg-white cursor-pointer transition-all peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white", isReviewMode && opt === cAns && "border-emerald-600 bg-emerald-100", isReviewMode && sAns === opt && !isCorrect && "border-rose-600 bg-rose-100")}>{opt}</Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </Card>
                             </div>
                        </main>
                    ) : test.sourceType === 'trackedBook' ? (
                        /* LİSTE GÖRÜNÜMÜ (Kitap Takibi) */
                        <main className="flex-1 max-w-2xl mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-24">
                            <ScrollArea className="h-[75vh]">
                                <div className="p-6 space-y-6">
                                    {Array.from({ length: test.questionCount }).map((_, i) => {
                                        const qNum = (i + 1).toString();
                                        const evalStatus = manualEvaluation[qNum];
                                        return (
                                            <div key={qNum} className={cn("flex flex-col gap-3 p-4 rounded-2xl border transition-all", test.openEnded ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 items-center justify-between flex-row")}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <Badge className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0", isReviewMode && test.openEnded ? (evalStatus === 'correct' ? "bg-emerald-600" : (evalStatus === 'incorrect' ? "bg-rose-600" : "bg-slate-400")) : "bg-indigo-600 text-white shadow-md")}>{i + 1}</Badge>
                                                        {test.openEnded && <span className="font-bold text-slate-600 text-sm">Soru {i + 1}</span>}
                                                    </div>
                                                    {isEvaluationMode && test.openEnded && (
                                                        <div className="flex gap-1">
                                                            <Button size="sm" variant={evalStatus === 'correct' ? "default" : "outline"} className={cn("h-8 rounded-lg", evalStatus === 'correct' && "bg-emerald-600")} onClick={() => handleEvaluationChange(qNum, 'correct')}><Check className="w-4 h-4 mr-1"/> Doğru</Button>
                                                            <Button size="sm" variant={evalStatus === 'incorrect' ? "default" : "outline"} className={cn("h-8 rounded-lg", evalStatus === 'incorrect' && "bg-rose-600")} onClick={() => handleEvaluationChange(qNum, 'incorrect')}><X className="w-4 h-4 mr-1"/> Yanlış</Button>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {test.openEnded ? (
                                                    <div className="w-full space-y-3">
                                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Öğrenci Cevabı</p>
                                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{textAnswers[qNum] || "Cevap verilmedi."}</p>
                                                        </div>
                                                        {(isReviewMode || isEvaluationMode) && (
                                                            <Textarea 
                                                                placeholder="Öğretmen geri bildirimi..."
                                                                className="min-h-[60px] rounded-xl text-xs"
                                                                value={textFeedback[qNum] || ""}
                                                                onChange={(e) => handleFeedbackChange(qNum, e.target.value)}
                                                                disabled={isReviewMode}
                                                            />
                                                        )}
                                                        {!isReviewMode && !isEvaluationMode && (
                                                            <Textarea 
                                                                placeholder="Cevabını yaz..."
                                                                className="min-h-[100px] rounded-xl"
                                                                value={textAnswers[qNum] || ""}
                                                                onChange={(e) => handleTextAnswerChange(qNum, e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <RadioGroup value={mcqAnswers[qNum] || ""} onValueChange={(v) => handleMcqAnswerChange(qNum, v)} disabled={isReviewMode || isEvaluationMode} className="flex gap-2">
                                                        {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                            <div key={opt} className="flex items-center">
                                                                <RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" />
                                                                <Label htmlFor={`q${qNum}-${opt}`} className={cn(glassColors.OPTION_BUTTON, "w-9 h-9", isReviewMode && opt === test.answerKey?.[qNum] && "border-emerald-600 bg-emerald-100", isReviewMode && mcqAnswers[qNum] === opt && mcqAnswers[qNum] !== test.answerKey?.[qNum] && "border-rose-600 bg-rose-100")}>{opt}</Label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </main>
                    ) : (
                        /* SİHİRBAZ GÖRÜNÜMÜ (Soru Bankası, Yazılı) */
                        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-32">
                             <div className="lg:col-span-8 space-y-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentQuestionIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <Card className="rounded-[2rem] border-slate-200 shadow-xl overflow-hidden">
                                            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                                                <Badge className="bg-white/20 text-white border-none font-black px-4">Soru {currentQuestionIndex + 1} / {totalQuestions}</Badge>
                                                {isReviewMode && test.openEnded && (
                                                    <Badge className={cn(manualEvaluation[(currentQuestionIndex + 1).toString()] === 'correct' ? "bg-emerald-500" : "bg-rose-500")}>
                                                        {manualEvaluation[(currentQuestionIndex + 1).toString()] === 'correct' ? "DOĞRU" : "YANLIŞ"}
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardContent className="p-6 md:p-10 space-y-8">
                                                {test.sourceType === 'json' ? (
                                                    <div className="text-xl md:text-2xl font-medium leading-relaxed text-slate-800 bg-slate-50 p-8 rounded-2xl border border-slate-100">
                                                        {test.jsonQuestions?.[currentQuestionIndex]?.text}
                                                    </div>
                                                ) : (
                                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                                                        {test.questions?.[currentQuestionIndex]?.imageUrl ? (
                                                            <Image src={test.questions[currentQuestionIndex].imageUrl} alt="Soru" fill className="object-contain p-4" />
                                                        ) : <ImageIcon className="w-16 h-16 text-slate-200" />}
                                                    </div>
                                                )}

                                                {test.openEnded ? (
                                                    <div className="space-y-6">
                                                        <div className="space-y-3">
                                                            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Öğrenci Cevabı</Label>
                                                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[100px] text-lg text-slate-700">
                                                                {textAnswers[(currentQuestionIndex + 1).toString()] || "Cevap verilmemiş."}
                                                            </div>
                                                        </div>

                                                        {isEvaluationMode && (
                                                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                                                <Label className="text-xs font-black uppercase text-indigo-600 tracking-widest">Değerlendirme</Label>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <Button 
                                                                        variant={manualEvaluation[(currentQuestionIndex+1).toString()] === 'correct' ? "default" : "outline"}
                                                                        className={cn("h-14 rounded-2xl font-bold", manualEvaluation[(currentQuestionIndex+1).toString()] === 'correct' && "bg-emerald-600")}
                                                                        onClick={() => handleEvaluationChange((currentQuestionIndex+1).toString(), 'correct')}
                                                                    >
                                                                        <CheckCircle2 className="mr-2 w-5 h-5"/> Doğru
                                                                    </Button>
                                                                    <Button 
                                                                        variant={manualEvaluation[(currentQuestionIndex+1).toString()] === 'incorrect' ? "default" : "outline"}
                                                                        className={cn("h-14 rounded-2xl font-bold", manualEvaluation[(currentQuestionIndex+1).toString()] === 'incorrect' && "bg-rose-600")}
                                                                        onClick={() => handleEvaluationChange((currentQuestionIndex+1).toString(), 'incorrect')}
                                                                    >
                                                                        <XCircle className="mr-2 w-5 h-5"/> Yanlış
                                                                    </Button>
                                                                </div>
                                                                <Textarea 
                                                                    placeholder="Geri bildirim veya çözüm notu ekle..."
                                                                    className="min-h-[100px] rounded-2xl"
                                                                    value={textFeedback[(currentQuestionIndex+1).toString()] || ""}
                                                                    onChange={(e) => handleFeedbackChange((currentQuestionIndex+1).toString(), e.target.value)}
                                                                />
                                                            </div>
                                                        )}

                                                        {!isReviewMode && !isEvaluationMode && (
                                                            <Textarea 
                                                                placeholder="Cevabını buraya yazabilirsin..."
                                                                className="min-h-[200px] text-lg p-5 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:bg-white transition-all leading-relaxed shadow-inner"
                                                                value={textAnswers[(currentQuestionIndex + 1).toString()] || ""}
                                                                onChange={(e) => handleTextAnswerChange((currentQuestionIndex + 1).toString(), e.target.value)}
                                                            />
                                                        )}

                                                        {isReviewMode && textFeedback[(currentQuestionIndex+1).toString()] && (
                                                            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1"><MessageSquareText className="w-3 h-3"/> Öğretmen Notu</p>
                                                                <p className="text-sm text-indigo-900 italic">"{textFeedback[(currentQuestionIndex+1).toString()]}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <RadioGroup 
                                                        value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                        onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)} 
                                                        disabled={isReviewMode || isEvaluationMode}
                                                        className={cn("grid gap-3", test.sourceType === 'json' ? "grid-cols-1" : "grid-cols-5 md:grid-cols-5 justify-center max-w-md mx-auto")}
                                                    >
                                                        {test.sourceType === 'json' ? (
                                                            test.jsonQuestions?.[currentQuestionIndex]?.options.map((option, idx) => {
                                                                const label = String.fromCharCode(65 + idx);
                                                                const isCorrect = option === test.jsonQuestions![currentQuestionIndex].answer;
                                                                const isSelected = mcqAnswers[(currentQuestionIndex + 1).toString()] === label;
                                                                return (
                                                                    <div key={idx} className="flex items-center">
                                                                        <RadioGroupItem value={label} id={`q-opt-${idx}`} className="peer sr-only" />
                                                                        <Label htmlFor={`q-opt-${idx}`} className={cn(
                                                                            "flex-1 flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                                                            isReviewMode ? (isCorrect ? "border-emerald-500 bg-emerald-50" : (isSelected ? "border-rose-500 bg-rose-50" : "border-slate-100 bg-white")) : "border-slate-100 bg-white peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:bg-indigo-50"
                                                                        )}>
                                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", isReviewMode ? (isCorrect ? "bg-emerald-600 text-white" : (isSelected ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500")) : "bg-slate-100 text-slate-500 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white")}>{label}</div>
                                                                            <span className="font-semibold text-slate-700">{option}</span>
                                                                        </Label>
                                                                    </div>
                                                                )
                                                            })
                                                        ) : (
                                                            ['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                <div key={opt} className="flex items-center justify-center">
                                                                    <RadioGroupItem value={opt} id={`q-opt-${opt}`} className="peer sr-only" />
                                                                    <Label htmlFor={`q-opt-${opt}`} className={cn(glassColors.OPTION_BUTTON, "w-12 h-12 text-lg", isReviewMode && opt === test.answerKey?.[(currentQuestionIndex+1).toString()] && "border-emerald-600 bg-emerald-100 text-emerald-800", isReviewMode && mcqAnswers[(currentQuestionIndex+1).toString()] === opt && mcqAnswers[(currentQuestionIndex+1).toString()] !== test.answerKey?.[(currentQuestionIndex+1).toString()] && "border-rose-600 bg-rose-100 text-rose-800")}>{opt}</Label>
                                                                </div>
                                                            ))
                                                        )}
                                                    </RadioGroup>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </AnimatePresence>

                                <div className="flex justify-between gap-4 pt-4">
                                    <Button type="button" variant="outline" size="lg" className="flex-1 h-14 rounded-2xl font-black text-slate-500" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}><ChevronLeft className="mr-2 h-6 w-6"/> Önceki</Button>
                                    {currentQuestionIndex < totalQuestions - 1 ? (
                                        <Button type="button" size="lg" className="flex-1 h-14 rounded-2xl font-black bg-indigo-600 text-white" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Sonraki <ChevronRight className="ml-2 h-6 w-6"/></Button>
                                    ) : (
                                        !isReviewMode && !isEvaluationMode && <Button type="button" size="lg" className="flex-1 h-14 rounded-2xl font-black bg-emerald-600 text-white" onClick={() => handleSubmit(false)}><CheckCircle className="mr-2 h-6 w-6"/> Testi Bitir</Button>
                                    )}
                                </div>
                             </div>
                             
                             <div className="lg:col-span-4 transition-all duration-300">
                                <div className="sticky top-28 rounded-[2rem] border border-slate-200 bg-white shadow-xl flex-1 flex flex-col overflow-hidden max-h-[85vh] lg:h-[70vh]">
                                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center"><h3 className="font-black text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-600" /> Soru Gezgini</h3></div>
                                    <ScrollArea className="flex-1">
                                        <QuestionPalette 
                                            total={totalQuestions} 
                                            currentIndex={currentQuestionIndex} 
                                            onNavigate={(idx) => setCurrentQuestionIndex(idx)} 
                                            isAnswered={isQuestionAnswered} 
                                            evaluationMap={test.openEnded ? manualEvaluation : {}}
                                        />
                                    </ScrollArea>
                                </div>
                             </div>
                        </main>
                    )}
                </div>
            </div>
        </Form>
    );
}
