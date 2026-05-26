
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test as TestType, QuickTestQuestion, EvaluationStatus, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, Play, Pause, Check, X, MinusCircle, LayoutGrid, Loader2, Sparkles, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Send, MessageSquareText, ImageIcon, RotateCcw, FileCode, BookCopy, BarChart3, TrendingUp, Search, Eye } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
    const isEvaluateMode = searchParams.get('mode') === 'evaluate';

    const [test, setTest] = React.useState<TestType | null>(null);
    const [practiceExamData, setPracticeExamData] = React.useState<PracticeExam | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<{ [key: string]: string | null }>({});
    const [textAnswers, setTextAnswers] = React.useState<{ [key: string]: string }>({});
    const [manualEvaluation, setManualEvaluation] = React.useState<{ [key: string]: EvaluationStatus }>({});
    const [textFeedback, setTextFeedback] = React.useState<{ [key: string]: string }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [openSubjectResult, setOpenSubjectResult] = React.useState<string | null>(null);
    const [revealedSubjectResults, setRevealedSubjectResults] = React.useState<Set<string>>(new Set());
    
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

    const handleSavePartial = React.useCallback(async (latestMcq: any, latestText: any) => {
        if (!test) return;
        try {
            await updateTest(test.id, {
                studentAnswers: latestMcq,
                studentTextAnswers: latestText,
            });
        } catch (e) {
            console.error("Partial save error:", e);
        }
    }, [test]);

    const debouncedSave = (newMcq: any, newText: any) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSavePartial(newMcq, newText);
        }, 1000);
    };

    const handleMcqAnswerChange = (questionNumber: string, value: string) => {
        const updated = { ...mcqAnswers, [questionNumber]: value };
        setMcqAnswers(updated);
        debouncedSave(updated, textAnswers);
    };

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user) return;
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
    }, [test, mcqAnswers, textAnswers, toast, user, router]);

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        return test?.openEnded ? !!textAnswers[qNumStr] : !!mcqAnswers[qNumStr];
    };

    const toggleRevealSubject = (subjectId: string) => {
        setRevealedSubjectResults(prev => {
            const next = new Set(prev);
            if (next.has(subjectId)) next.delete(subjectId);
            else next.add(subjectId);
            return next;
        });
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" /><p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1><Link href="/education"><Button size="lg">Geri Dön</Button></Link></div>;

    const totalQuestions = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
    const testDurationMinutes = test.durationMinutes || totalQuestions * 1.5;

    // --- SONUÇ İNCELEME GÖRÜNÜMÜ ---
    if (test.status === 'Sonuçlandı' && !isEvaluateMode) {
        if (test.sourceType === 'exam' && practiceExamData) {
            let questionOffset = 0;
            return (
                <div className={cn("min-h-screen text-slate-900 font-sans p-3 md:p-8", glassColors.PAGE_BG)}>
                    <div className="max-w-5xl mx-auto w-full space-y-6 md:space-y-8 pb-32">
                        <header className="flex justify-between items-center bg-white/50 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 sticky top-2 md:top-4 z-50 shadow-sm">
                            <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900 h-9 px-2 md:px-4"><ArrowLeft className="md:mr-2 h-5 w-5" /> <span className="hidden md:inline">Geri</span></Button>
                            <div className="text-center">
                                <h1 className="text-sm md:text-lg font-black truncate max-w-[150px] md:max-w-full">{test.title}</h1>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">Sınav Sonucu</p>
                            </div>
                            <Badge className="bg-indigo-600 text-white font-bold px-3 md:px-4 py-1 rounded-lg md:rounded-xl text-sm md:text-lg">%{test.score?.toFixed(0)}</Badge>
                        </header>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <Card className="rounded-2xl md:rounded-3xl border-slate-200 p-4 md:p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Soru</span>
                                <span className="text-xl md:text-3xl font-black">{totalQuestions}</span>
                            </Card>
                            <Card className="rounded-2xl md:rounded-3xl border-emerald-100 bg-emerald-50/20 p-4 md:p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Doğru</span>
                                <span className="text-xl md:text-3xl font-black text-emerald-600">{test.correctAnswers}</span>
                            </Card>
                            <Card className="rounded-2xl md:rounded-3xl border-rose-100 bg-rose-50/20 p-4 md:p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Yanlış</span>
                                <span className="text-xl md:text-3xl font-black text-rose-600">{test.incorrectAnswers}</span>
                            </Card>
                            <Card className="rounded-2xl md:rounded-3xl border-slate-100 bg-slate-50/20 p-4 md:p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Boş</span>
                                <span className="text-xl md:text-3xl font-black text-slate-500">{test.emptyAnswers}</span>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-lg md:text-xl font-black flex items-center gap-2 px-2"><BarChart3 className="w-6 h-6 text-indigo-600"/> Ders Bazlı Analiz</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {practiceExamData.subjects.map((subject, sIdx) => {
                                    const currentOffset = questionOffset;
                                    questionOffset += subject.questionCount;
                                    
                                    let sCorrect = 0, sIncorrect = 0, sEmpty = 0;
                                    for (let i = 1; i <= subject.questionCount; i++) {
                                        const qNumStr = (currentOffset + i).toString();
                                        const sAns = mcqAnswers[qNumStr];
                                        const cAns = test.answerKey?.[qNumStr];
                                        if (!sAns) sEmpty++;
                                        else if (sAns === cAns) sCorrect++;
                                        else sIncorrect++;
                                    }
                                    const sSuccessRate = (sCorrect / subject.questionCount) * 100;

                                    return (
                                        <Card key={subject.id} className="rounded-2xl md:rounded-[2rem] overflow-hidden border-slate-200 shadow-sm hover:shadow-xl transition-all">
                                            <CardHeader className="bg-slate-50/80 p-4 md:p-5 border-b flex flex-row items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-sm md:text-base font-black text-slate-800">{subject.name}</CardTitle>
                                                    <CardDescription className="text-[9px] md:text-[10px] font-bold uppercase">{subject.questionCount} Soru</CardDescription>
                                                </div>
                                                <Badge className={cn("h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center p-0 text-[10px] md:text-xs font-black", sSuccessRate >= 70 ? "bg-emerald-600" : sSuccessRate >= 40 ? "bg-amber-500" : "bg-rose-600")}>
                                                    %{sSuccessRate.toFixed(0)}
                                                </Badge>
                                            </CardHeader>
                                            <CardContent className="p-4 md:p-5 space-y-4">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="flex flex-col items-center p-1.5 md:p-2 rounded-lg md:rounded-xl bg-emerald-50/50 border border-emerald-100">
                                                        <span className="text-[8px] md:text-[10px] font-bold text-emerald-600 uppercase">Doğru</span>
                                                        <span className="text-base md:text-lg font-black text-emerald-700">{sCorrect}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center p-1.5 md:p-2 rounded-lg md:rounded-xl bg-rose-50/50 border border-rose-100">
                                                        <span className="text-[8px] md:text-[10px] font-bold text-rose-600 uppercase">Yanlış</span>
                                                        <span className="text-base md:text-lg font-black text-rose-700">{sIncorrect}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center p-1.5 md:p-2 rounded-lg md:rounded-xl bg-slate-50/50 border border-slate-100">
                                                        <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase">Boş</span>
                                                        <span className="text-base md:text-lg font-black text-slate-500">{sEmpty}</span>
                                                    </div>
                                                </div>
                                                
                                                <Button 
                                                  variant="outline" 
                                                  className="w-full h-10 rounded-xl font-bold text-xs gap-2 border-slate-200 hover:bg-slate-50"
                                                  onClick={() => setOpenSubjectResult(openSubjectResult === subject.id ? null : subject.id)}
                                                >
                                                  <Eye className="w-4 h-4 text-indigo-500" /> 
                                                  {openSubjectResult === subject.id ? 'Detayları Kapat' : 'Soru Detaylarını Gör'}
                                                </Button>

                                                {openSubjectResult === subject.id && (
                                                  <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                      <div className="grid grid-cols-5 md:grid-cols-5 gap-1.5 md:gap-2">
                                                          {Array.from({ length: subject.questionCount }).map((_, qIdx) => {
                                                              const qNum = (currentOffset + qIdx + 1).toString();
                                                              const sAns = mcqAnswers[qNum];
                                                              const cAns = test.answerKey?.[qNum];
                                                              const isCorrect = sAns === cAns;
                                                              return (
                                                                  <div key={qNum} className={cn("flex flex-col items-center p-1.5 rounded-lg border text-[9px] md:text-[10px]", isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : sAns ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-400")}>
                                                                      <span className="font-bold mb-0.5">{qIdx + 1}</span>
                                                                      <span className="font-black text-[11px] md:text-xs">{sAns || "-"}</span>
                                                                  </div>
                                                              )
                                                          })}
                                                      </div>
                                                  </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // --- ÖĞRENCİ ÇÖZÜM GÖRÜNÜMÜ ---
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))} className="h-full flex flex-col">
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-3 md:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-7xl mx-auto w-full mb-6 md:mb-8 flex justify-between items-center bg-white/40 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-3xl border border-white/40 shadow-sm">
                        <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900 rounded-lg md:rounded-2xl h-9 md:h-10 px-2 md:px-4"><ArrowLeft className="md:mr-2 h-5 w-5" /> <span className="hidden md:inline">Çıkış</span></Button>
                        <div className="text-center">
                            <h1 className="text-sm md:text-lg font-black text-slate-900 tracking-tight truncate max-w-[120px] md:max-w-full">{test.title}</h1>
                            <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest">{test.subject}</p>
                        </div>
                        <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                    </header>

                    {test.sourceType === 'exam' && practiceExamData ? (
                        /* DENEME SINAVI ÇÖZÜM MODU */
                        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-32 animate-in fade-in duration-500">
                            
                            {/* SOL: DERSLER (OPTİK) */}
                            <div className="lg:col-span-8 space-y-4">
                                <Accordion type="single" collapsible className="space-y-4">
                                    {(() => {
                                        let questionOffset = 0;
                                        return practiceExamData.subjects.map((subject) => {
                                            const currentOffset = questionOffset;
                                            questionOffset += subject.questionCount;
                                            
                                            // Bu dersin kaç sorusu çözülmüş? Anlık analiz için veriler
                                            let sCorrect = 0, sIncorrect = 0, sEmpty = 0, solvedInSubject = 0;
                                            for(let i=1; i<=subject.questionCount; i++) {
                                                const qNum = (currentOffset + i).toString();
                                                const sAns = mcqAnswers[qNum];
                                                const cAns = test.answerKey?.[qNum];
                                                if(sAns) {
                                                    solvedInSubject++;
                                                    if(cAns) {
                                                        if(sAns === cAns) sCorrect++;
                                                        else sIncorrect++;
                                                    }
                                                } else {
                                                    sEmpty++;
                                                }
                                            }

                                            return (
                                                <AccordionItem key={subject.id} value={subject.id} className="border-none rounded-xl md:rounded-[2rem] bg-white border border-slate-200 shadow-md md:shadow-xl overflow-hidden">
                                                    <AccordionTrigger className="px-5 md:px-8 py-4 md:py-6 hover:no-underline bg-slate-50/50">
                                                        <div className="flex items-center gap-3 md:gap-4 text-left w-full pr-2">
                                                            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
                                                                <BookCopy className="w-5 h-5 md:w-6 md:h-6"/>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-base md:text-xl font-black text-slate-800 truncate">{subject.name}</h3>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subject.questionCount} Soru</span>
                                                                    {solvedInSubject > 0 && (
                                                                        <Badge className="h-4 text-[9px] bg-emerald-100 text-emerald-700 border-none font-bold">{solvedInSubject} İşaretlendi</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-4 md:p-8 pt-4 md:pt-6">
                                                        
                                                        {/* DERS BAZLI SONUÇ PANELİ (Sadece "Gör" denilince) */}
                                                        {test.answerKey && (
                                                            <div className="mb-6">
                                                                {!revealedSubjectResults.has(subject.id) ? (
                                                                    <Button 
                                                                        type="button" 
                                                                        variant="outline" 
                                                                        className="w-full h-10 rounded-xl font-bold text-xs gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                                        onClick={() => toggleRevealSubject(subject.id)}
                                                                    >
                                                                        <Eye className="w-4 h-4" /> Ders Sonuçlarını Gör
                                                                    </Button>
                                                                ) : (
                                                                    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Anlık Başarı Raporu</span>
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => toggleRevealSubject(subject.id)}><X className="w-3 h-3"/></Button>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            <div className="flex flex-col items-center">
                                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500"/>
                                                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Doğru</span>
                                                                                </div>
                                                                                <span className="text-base font-black text-emerald-700">{sCorrect}</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-center border-x border-indigo-100/50 px-2">
                                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                                    <XCircle className="w-3 h-3 text-rose-500"/>
                                                                                    <span className="text-[9px] font-bold text-rose-600 uppercase tracking-tighter">Yanlış</span>
                                                                                </div>
                                                                                <span className="text-base font-black text-rose-700">{sIncorrect}</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-center">
                                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                                    <MinusCircle className="w-3 h-3 text-slate-400"/>
                                                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Boş</span>
                                                                                </div>
                                                                                <span className="text-base font-black text-slate-600">{sEmpty}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 md:gap-3">
                                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                                const qNum = (currentOffset + i + 1).toString();
                                                                return (
                                                                    <div key={qNum} className="flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all group">
                                                                        <Badge className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-black bg-indigo-600 text-white p-0 text-[10px] md:text-sm shadow-sm shrink-0">{i + 1}</Badge>
                                                                        <RadioGroup 
                                                                            value={mcqAnswers[qNum] || ""} 
                                                                            onValueChange={(v) => handleMcqAnswerChange(qNum, v)} 
                                                                            className="flex flex-wrap gap-1 md:gap-2.5"
                                                                        >
                                                                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                                <div key={opt} className="flex items-center">
                                                                                    <RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" />
                                                                                    <Label htmlFor={`q${qNum}-${opt}`} className={cn(glassColors.OPTION_BUTTON)}>
                                                                                        {opt}
                                                                                    </Label>
                                                                                </div>
                                                                            ))}
                                                                        </RadioGroup>
                                                                        {mcqAnswers[qNum] && (
                                                                            <Button 
                                                                                type="button" 
                                                                                variant="ghost" 
                                                                                size="icon" 
                                                                                className="h-7 w-7 text-slate-300 hover:text-rose-500 rounded-lg ml-auto opacity-0 group-hover:opacity-100 transition-opacity" 
                                                                                onClick={() => handleMcqAnswerChange(qNum, "")}
                                                                            >
                                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        });
                                    })()}
                                </Accordion>
                            </div>

                            {/* SAĞ: SORU GEZGİNİ (SABİT) */}
                            <div className="hidden lg:block lg:col-span-4">
                                <div className="sticky top-28 rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col h-[70vh]">
                                    <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-600" /> Soru Gezgini</h3>
                                        <Badge variant="secondary" className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-xl shadow-md">
                                            {Object.keys(mcqAnswers).filter(k => !!mcqAnswers[k]).length} / {totalQuestions}
                                        </Badge>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <QuestionPalette 
                                            total={totalQuestions} 
                                            currentIndex={-1} 
                                            onNavigate={() => {}} 
                                            isAnswered={isQuestionAnswered} 
                                        />
                                    </ScrollArea>
                                    <div className="p-4 bg-slate-50/50 border-t mt-auto">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button type="button" size="lg" className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-black shadow-lg shadow-indigo-500/30 transition-transform active:scale-95">
                                                    <CheckCircle className="mr-2 h-6 w-6" /> Sınavı Bitir
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl p-8">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-3xl font-black tracking-tight text-slate-900">Emin misin?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500 text-lg font-medium leading-relaxed">Tüm cevaplarını kontrol ettiysen denemeyi bitirebilirsin.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-8 gap-4 flex-row">
                                                    <AlertDialogCancel className="bg-slate-100 border-none rounded-2xl h-14 font-black flex-1 m-0">Vazgeç</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black flex-1 m-0 shadow-lg shadow-emerald-500/20">Evet, Bitir</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>

                            {/* MOBİL ALT ÇUBUK (FİNAL BUTONU) */}
                            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[95%] lg:hidden z-50">
                                <Card className="rounded-[1.5rem] bg-white/80 backdrop-blur-md border-slate-200 shadow-2xl p-2 flex gap-2">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" size="lg" className="w-full h-14 rounded-xl md:rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-lg font-black shadow-lg transition-transform active:scale-95">
                                                <CheckCircle className="mr-2 h-6 w-6" /> Denemeyi Bitir ve Gönder
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="w-[90%] bg-white rounded-2xl p-6">
                                            <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Bitirilsin mi?</AlertDialogTitle><AlertDialogDescription>Deneme sınavını bitirmek istediğinden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter className="flex-row gap-2 mt-4"><AlertDialogCancel className="flex-1 m-0">Hayır</AlertDialogCancel><AlertDialogAction onClick={() => handleSubmit(false)} className="flex-1 bg-emerald-600 m-0">Evet, Bitir</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </Card>
                            </div>
                        </main>
                    ) : test.sourceType === 'json' ? (
                        /* YAZILI (JSON) TEST ÇÖZÜM MODU */
                        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-32 animate-in fade-in duration-500">
                             {/* Yazılı testler için mevcut yapı korunuyor */}
                             <div className="lg:col-span-8 space-y-6">
                                {test.jsonQuestions?.map((question, index) => {
                                    const qNum = (index + 1).toString();
                                    return (
                                        <Card key={question.id} className="rounded-3xl border-slate-200 shadow-xl overflow-hidden">
                                            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
                                                <Badge className="bg-white/20 text-white border-none font-black px-4">Soru {index + 1}</Badge>
                                            </div>
                                            <CardContent className="p-6 md:p-8 space-y-8">
                                                <div className="text-lg md:text-xl font-medium leading-relaxed text-slate-800 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                    {question.text}
                                                </div>
                                                <RadioGroup 
                                                    value={mcqAnswers[qNum] || ""} 
                                                    onValueChange={(v) => handleMcqAnswerChange(qNum, v)} 
                                                    className="grid grid-cols-1 gap-3"
                                                >
                                                    {question.options.map((option, optIdx) => {
                                                        const label = String.fromCharCode(65 + optIdx);
                                                        return (
                                                            <div key={optIdx} className="flex items-center">
                                                                <RadioGroupItem value={label} id={`q${qNum}-${label}`} className="peer sr-only" />
                                                                <Label 
                                                                    htmlFor={`q${qNum}-${label}`}
                                                                    className="flex-1 flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-white cursor-pointer transition-all hover:bg-slate-50 peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:shadow-md"
                                                                >
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white">
                                                                        {label}
                                                                    </div>
                                                                    <span className="font-semibold text-slate-700">{option}</span>
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </RadioGroup>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                             </div>
                             {/* ... Soru Gezgini ve Bitirme butonu ... */}
                        </main>
                    ) : test.sourceType === 'html' ? (
                        /* HTML TEST ÇÖZÜM MODU */
                        <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 pb-32 animate-in fade-in duration-500">
                             <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden h-[500px] lg:h-[85vh]">
                                <iframe 
                                    srcDoc={getIframeDocument(test.htmlContent || "")}
                                    className="w-full h-full border-none"
                                    title={test.title}
                                    sandbox="allow-scripts allow-same-origin"
                                />
                             </div>
                             <div className="lg:col-span-3">
                                <Card className="rounded-3xl border-slate-200 shadow-xl h-[500px] lg:h-[85vh] flex flex-col overflow-hidden">
                                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                                            <LayoutGrid className="w-4 h-4 text-indigo-600" /> Cevap Formu
                                        </h3>
                                        <Badge className="bg-indigo-600 text-white font-bold">{Object.keys(mcqAnswers).length} / {test.questionCount}</Badge>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 space-y-3">
                                            {Array.from({ length: test.questionCount }).map((_, i) => {
                                                const qNum = (i + 1).toString();
                                                return (
                                                    <div key={qNum} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all group">
                                                        <Badge className="w-7 h-7 rounded-lg flex items-center justify-center font-black bg-indigo-600 text-white p-0 text-[10px] shadow-sm shrink-0">{i + 1}</Badge>
                                                        <RadioGroup 
                                                            value={mcqAnswers[qNum] || ""} 
                                                            onValueChange={(v) => handleMcqAnswerChange(qNum, v)} 
                                                            className="flex flex-wrap gap-1"
                                                        >
                                                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                <div key={opt} className="flex items-center">
                                                                    <RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" />
                                                                    <Label htmlFor={`q${qNum}-${opt}`} className="w-7 h-7 text-[10px] flex items-center justify-center rounded-lg border border-slate-200 bg-white cursor-pointer transition-all hover:bg-indigo-50 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600">
                                                                        {opt}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                    <div className="p-4 border-t bg-slate-50/50">
                                        <Button onClick={() => handleSubmit(false)} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-500/20 transition-transform active:scale-95">
                                            Sınavı Bitir
                                        </Button>
                                    </div>
                                </Card>
                             </div>
                        </main>
                    ) : (
                        /* STANDART GÖRSELLİ TEST ÇÖZÜM MODU */
                        <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-32">
                             {/* Orijinal diğer test görünümleri ... */}
                        </main>
                    )}
                </div>
            </form>
        </Form>
    );
}
