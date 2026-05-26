
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test as TestType, QuickTestQuestion, EvaluationStatus } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, ArrowRight, Play, Pause, Check, X, MinusCircle, LayoutGrid, Loader2, Sparkles, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Send, MessageSquareText, ImageIcon, RotateCcw, FileCode } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { doc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
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

// --- DESIGN SYSTEM ---
const glassColors = {
    PAGE_BG: "bg-slate-50", 
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200",
    CARD_BG: "bg-white border border-slate-200 shadow-sm", 
    OPTION_BUTTON: "flex items-center justify-center w-12 h-12 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-200 font-bold text-lg text-slate-600 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:scale-110",
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
    evaluationMap
}: { 
    total: number; 
    currentIndex: number; 
    onNavigate: (index: number) => void;
    isAnswered: (index: number) => boolean;
    evaluationMap?: { [key: string]: EvaluationStatus };
}) => {
    return (
        <div className="grid grid-cols-5 gap-2 p-4">
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
                            "h-10 w-10 p-0 font-bold rounded-lg text-xs transition-all relative",
                            active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                            answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
                            status === 'correct' && "border-emerald-500 bg-emerald-50 text-emerald-700",
                            status === 'incorrect' && "border-rose-500 bg-rose-50 text-rose-700",
                        )}
                        onClick={() => onNavigate(i)}
                    >
                        {i + 1}
                        {status === 'correct' && <Check className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 text-white rounded-full p-0.5" />}
                        {status === 'incorrect' && <X className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 text-white rounded-full p-0.5" />}
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
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<{ [key: string]: string | null }>({});
    const [textAnswers, setTextAnswers] = React.useState<{ [key: string]: string }>({});
    const [manualEvaluation, setManualEvaluation] = React.useState<{ [key: string]: EvaluationStatus }>({});
    const [textFeedback, setTextFeedback] = React.useState<{ [key: string]: string }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
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

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        const qNumStr = questionNumber.toString();
        const updated = { ...textAnswers, [qNumStr]: value };
        setTextAnswers(updated);
        debouncedSave(mcqAnswers, updated);
    };

    const handleEvaluate = (questionNumber: number, status: EvaluationStatus) => {
        const updated = { ...manualEvaluation, [questionNumber.toString()]: status };
        setManualEvaluation(updated);
    };

    const handleFeedbackChange = (questionNumber: number, value: string) => {
        const updated = { ...textFeedback, [questionNumber.toString()]: value };
        setTextFeedback(updated);
    };

    const handleSaveEvaluationDraft = async () => {
        if (!test) return;
        try {
            await updateTest(test.id, {
                studentTextAnswersEvaluation: manualEvaluation,
                studentTextAnswersFeedback: textFeedback,
            });
            toast({ title: "Taslak Kaydedildi", description: "Değerlendirme ilerlemeniz kaydedildi." });
        } catch (e) {
            toast({ title: "Hata", variant: 'destructive' });
        }
    };

    const handleSubmitEvaluation = async () => {
        if (!test) return;
        setIsSubmitting(true);
        try {
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
            let correct = 0, incorrect = 0, empty = 0;
            for (let i = 1; i <= questionCount; i++) {
                const status = manualEvaluation[i.toString()];
                if (status === 'correct') correct++;
                else if (status === 'incorrect') incorrect++;
                else empty++;
            }
            const calculatedScore = (correct / questionCount) * 100;
            await updateTest(test.id, {
                studentTextAnswersEvaluation: manualEvaluation,
                studentTextAnswersFeedback: textFeedback,
                status: 'Sonuçlandı',
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                emptyAnswers: empty,
                score: calculatedScore
            });
            toast({ title: "Değerlendirme Tamamlandı", description: `Başarı: %${calculatedScore.toFixed(0)}` });
            if (test.familyId && test.studentId) {
                await checkAndAwardBadges(test.studentId, test.familyId, { 
                    type: 'test_completed', 
                    test: { ...test, status: 'Sonuçlandı', correctAnswers: correct, incorrectAnswers: incorrect, emptyAnswers: empty, score: calculatedScore } 
                });
            }
            router.push('/education/all-tests');
        } catch (e) {
            toast({ title: "Hata", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
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

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" /><p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1><Link href="/education"><Button size="lg">Geri Dön</Button></Link></div>;

    const isBookTracked = test.sourceType === 'trackedBook';
    const totalQuestions = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
    const testDurationMinutes = test.durationMinutes || totalQuestions * 1.5;

    // --- SONUÇ İNCELEME GÖRÜNÜMÜ (Sonuçlandı Durumu) ---
    if (test.status === 'Sonuçlandı' && !isEvaluateMode) {
        return (
            <div className={cn("min-h-screen text-slate-900 font-sans p-4 sm:p-8", glassColors.PAGE_BG)}>
                <div className="max-w-7xl mx-auto w-full space-y-8 pb-32">
                    <header className="flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-200 sticky top-4 z-50 shadow-sm">
                        <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Geri</Button>
                        <div className="text-center">
                            <h1 className="text-lg font-black">{test.title}</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Sonuç İnceleme</p>
                        </div>
                        <Badge className="bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-xl">Başarı: %{test.score?.toFixed(0)}</Badge>
                    </header>

                    {test.sourceType === 'html' ? (
                        /* HTML TEST SONUÇ İNCELEME (9/3 Oranı) */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                             <div className="lg:col-span-9 h-[70vh] lg:h-[85vh] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                                <iframe srcDoc={getIframeDocument(test.htmlContent || '')} className="w-full h-full border-none" title={test.title} sandbox="allow-scripts allow-same-origin" />
                             </div>
                             <div className="lg:col-span-3 h-[70vh] lg:h-[85vh]">
                                <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl h-full flex flex-col overflow-hidden">
                                    <div className="p-4 border-b bg-slate-50 font-black flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-indigo-600" /> Analiz
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 space-y-2">
                                            {Array.from({ length: totalQuestions }).map((_, i) => {
                                                const qNum = (i + 1).toString();
                                                const sAns = mcqAnswers[qNum];
                                                const cAns = test.answerKey?.[qNum];
                                                const isCorrect = sAns === cAns;
                                                return (
                                                    <div key={qNum} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all", isCorrect ? "bg-emerald-50 border-emerald-100" : sAns ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100 opacity-60")}>
                                                        <span className="font-bold text-xs shrink-0">{qNum}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Sen: <span className={cn("text-sm", isCorrect ? "text-emerald-600" : sAns ? "text-rose-600" : "text-slate-400")}>{sAns || "B"}</span></div>
                                                            <div className="text-[9px] font-bold text-slate-500 uppercase">D: <span className="text-sm text-emerald-700">{cAns}</span></div>
                                                            {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0"/> : sAns ? <XCircle className="w-4 h-4 text-rose-600 shrink-0"/> : <MinusCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </Card>
                             </div>
                        </div>
                    ) : isBookTracked ? (
                        /* KİTAP TAKİBİ İNCELEME (LİSTE) */
                        <div className="space-y-6">
                            {Array.from({ length: totalQuestions }).map((_, i) => {
                                const qNum = (i + 1).toString();
                                const studentAns = textAnswers[qNum];
                                const status = manualEvaluation[qNum];
                                const feedback = textFeedback[qNum];

                                return (
                                    <Card key={qNum} className={cn("rounded-3xl border", status === 'correct' ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20')}>
                                        <CardHeader className="pb-4 border-b flex flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <Badge className={cn("h-10 w-10 rounded-full flex items-center justify-center p-0 text-base font-black", status === 'correct' ? "bg-emerald-600" : "bg-rose-600")}>{qNum}</Badge>
                                                <span className="font-bold text-slate-700">Soru Detayı</span>
                                            </div>
                                            {status === 'correct' ? <div className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="w-5 h-5"/> Doğru</div> : <div className="flex items-center gap-1.5 text-rose-600 font-bold"><XCircle className="w-5 h-5"/> Yanlış</div>}
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-6">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senin Cevabın</p>
                                                <div className="p-4 bg-white/60 rounded-2xl border border-slate-100 italic text-slate-700">{studentAns || "— Cevap verilmedi —"}</div>
                                            </div>
                                            {feedback && (
                                                <div className="space-y-2 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5"/> Öğretmen Notu</p>
                                                    <p className="text-sm font-medium text-indigo-800">{feedback}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        /* DİĞERLERİ İÇİN İNCELEME (SİHİRBAZ) */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                             <div className="lg:col-span-8 space-y-6">
                                <Card className="overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-[3rem]">
                                    <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center gap-4">
                                        <Badge className="h-14 w-14 rounded-3xl flex items-center justify-center p-0 text-2xl font-black bg-indigo-600 text-white shrink-0">{currentQuestionIndex + 1}</Badge>
                                        <div className="flex-grow">
                                            <h2 className="text-lg font-black text-slate-800">Soru İnceleme</h2>
                                            {test.sourceType === 'json' ? (
                                                mcqAnswers[(currentQuestionIndex + 1).toString()] === test.jsonQuestions?.[currentQuestionIndex]?.answer ? 
                                                <span className="text-xs font-bold text-emerald-600">✓ Doğru Bildin</span> : 
                                                <span className="text-xs font-bold text-rose-600">✗ Hatalı Cevap</span>
                                            ) : (
                                                manualEvaluation[(currentQuestionIndex + 1).toString()] === 'correct' ? <span className="text-xs font-bold text-emerald-600">✓ Doğru Bildin</span> : <span className="text-xs font-bold text-rose-600">✗ Hatalı Cevap</span>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {test.sourceType === 'json' ? (
                                            <div className="p-8 bg-slate-50 border-b">
                                                <p className="text-xl font-bold text-slate-800 leading-relaxed">
                                                    {test.jsonQuestions?.[currentQuestionIndex]?.text}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="relative w-full aspect-video bg-slate-50 border-b flex items-center justify-center">
                                                {test.questions?.[currentQuestionIndex] ? (
                                                    <Image src={test.questions[currentQuestionIndex].imageUrl} alt={`Soru ${currentQuestionIndex + 1}`} fill className="object-contain p-6" />
                                                ) : <ImageIcon className="w-12 h-12 text-slate-300" />}
                                            </div>
                                        )}
                                        <div className="p-8">
                                            <div className="space-y-4">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cevabın</p>
                                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium text-slate-700 italic">
                                                    {test.openEnded 
                                                        ? (textAnswers[(currentQuestionIndex + 1).toString()] || "— Boş Bırakıldı —")
                                                        : (mcqAnswers[(currentQuestionIndex + 1).toString()] || "— İşaretlenmedi —")
                                                    }
                                                </div>
                                                
                                                {test.sourceType === 'json' && !test.openEnded && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Doğru Cevap</p>
                                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-base font-bold text-emerald-700">
                                                            {test.jsonQuestions?.[currentQuestionIndex]?.answer}
                                                        </div>
                                                    </div>
                                                )}

                                                {textFeedback[(currentQuestionIndex + 1).toString()] && (
                                                    <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                         <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">ÖĞRETMEN NOTU</p>
                                                         <p className="text-sm font-bold text-indigo-800">{textFeedback[(currentQuestionIndex + 1).toString()]}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="flex justify-between gap-6">
                                    <Button variant="outline" size="lg" className="h-16 rounded-[2rem] px-10 font-black flex-1" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}><ChevronLeft className="mr-2 h-6 w-6"/> Önceki</Button>
                                    <Button variant="outline" size="lg" className="h-16 rounded-[2rem] px-10 font-black flex-1" onClick={() => setCurrentQuestionIndex(p => Math.min(totalQuestions - 1, p + 1))} disabled={currentQuestionIndex === totalQuestions - 1}>Sonraki <ChevronRight className="ml-2 h-6 w-6"/></Button>
                                </div>
                             </div>
                             <div className="hidden lg:block lg:col-span-4">
                                <div className="sticky top-28 rounded-[2.5rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                                    <div className="p-6 border-b bg-slate-50/50 font-black text-slate-800">Soru Navigasyonu</div>
                                    <ScrollArea className="h-[450px]">
                                        <QuestionPalette total={totalQuestions} currentIndex={currentQuestionIndex} onNavigate={setCurrentQuestionIndex} isAnswered={isQuestionAnswered} evaluationMap={manualEvaluation} />
                                    </ScrollArea>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- EVALUATION MODE (Teacher View) ---
    if (test.status === 'Değerlendirme Bekliyor' && isEvaluateMode) {
        return (
            <div className={cn("min-h-screen text-slate-900 font-sans p-4 sm:p-8", glassColors.PAGE_BG)}>
                <div className="max-w-7xl mx-auto w-full space-y-8 pb-32">
                    <header className="flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-200 sticky top-4 z-50 shadow-sm">
                        <Button variant="ghost" onClick={() => router.push('/education/all-tests')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="sm" onClick={handleSaveEvaluationDraft} className="rounded-xl h-9 border-slate-300">Taslak Kaydet</Button>
                            <Badge className="bg-blue-600 text-white border-0 font-bold uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-lg shadow-blue-500/20">Değerlendirme Modu</Badge>
                        </div>
                    </header>

                    <div className="space-y-6">
                        {Array.from({ length: totalQuestions }).map((_, i) => {
                            const qNum = (i + 1).toString();
                            const studentAns = textAnswers[qNum];
                            const status = manualEvaluation[qNum];
                            const questionImage = test.questions?.[i]?.imageUrl;
                            const jsonQuestion = test.jsonQuestions?.[i];

                            return (
                                <Card key={qNum} className={cn("rounded-3xl border transition-all", status === 'correct' ? 'border-emerald-200 bg-emerald-50/30' : status === 'incorrect' ? 'border-rose-200 bg-rose-50/30' : status === 'empty' ? 'border-slate-300 bg-slate-100/50' : 'border-slate-200 bg-white shadow-sm')}>
                                    <CardHeader className="pb-4 border-b flex flex-row justify-between items-center bg-slate-50/50 rounded-t-3xl gap-4">
                                        <Badge className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center p-0 text-base font-black shrink-0">{qNum}</Badge>
                                        <div className="flex flex-wrap justify-end gap-1.5 flex-1">
                                            <Button variant="outline" size="sm" onClick={() => handleEvaluate(parseInt(qNum), 'correct')} className={cn("h-8 rounded-lg gap-1.5 px-4 text-[11px] font-bold", status === 'correct' ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-white border-slate-200 text-slate-500")}><CheckCircle2 className="w-3.5 h-3.5" /> Doğru</Button>
                                            <Button variant="outline" size="sm" onClick={() => handleEvaluate(parseInt(qNum), 'incorrect')} className={cn("h-8 rounded-lg gap-1.5 px-4 text-[11px] font-bold", status === 'incorrect' ? "bg-rose-600 text-white border-rose-600 shadow-md" : "bg-white border-slate-200 text-slate-500")}><XCircle className="w-3.5 h-3.5" /> Yanlış</Button>
                                            <Button variant="outline" size="sm" onClick={() => handleEvaluate(parseInt(qNum), 'empty')} className={cn("h-8 rounded-lg gap-1.5 px-4 text-[11px] font-bold", status === 'empty' ? "bg-slate-600 text-white border-slate-600 shadow-md" : "bg-white border-slate-200 text-slate-500")}><MinusCircle className="w-3.5 h-3.5" /> Boş</Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {test.sourceType === 'json' ? (
                                            <div className="p-6 bg-slate-50 border-b">
                                                <p className="text-lg font-bold text-slate-800 leading-relaxed">
                                                    {jsonQuestion?.text}
                                                </p>
                                            </div>
                                        ) : (
                                            !isBookTracked && questionImage && (
                                                <div className="relative w-full aspect-video bg-slate-100 border-b flex items-center justify-center overflow-hidden">
                                                    <Image src={questionImage} alt={`Soru ${qNum}`} fill className="object-contain p-4" />
                                                </div>
                                            )
                                        )}
                                        <div className="p-6 space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Öğrenci Cevabı</p>
                                                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-inner min-h-[120px]">
                                                    <p className="text-lg font-medium text-slate-700 leading-relaxed italic">{studentAns || "— Cevap verilmedi —"}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquareText className="w-3.5 h-3.5 text-indigo-500" /> Geri Bildirim</Label>
                                                <div className="relative">
                                                  <Textarea placeholder="Not bırakın..." value={textFeedback[qNum] || ""} onChange={(e) => handleFeedbackChange(parseInt(qNum), e.target.value)} className="bg-white border-slate-200 min-h-[80px] rounded-xl text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
                        <Card className="rounded-[2.5rem] bg-white border-slate-200 shadow-2xl p-2 flex gap-2">
                            <Button size="lg" disabled={Object.keys(manualEvaluation).length < totalQuestions || isSubmitting} onClick={handleSubmitEvaluation} className="flex-1 h-14 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white text-base font-black shadow-lg shadow-indigo-500/20 transition-transform active:scale-95 disabled:grayscale">
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Check className="mr-2 h-6 w-6"/>}
                                {Object.keys(manualEvaluation).length < totalQuestions ? `${totalQuestions - Object.keys(manualEvaluation).length} Soru Daha Var` : "Değerlendirmeyi Bitir"}
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    // --- STUDENT VIEW (Solving Mode) ---
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))} className="h-full flex flex-col">
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-7xl mx-auto w-full mb-8 flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
                        <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900 rounded-2xl"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <div className="text-center hidden sm:block">
                            <h1 className="text-lg font-black text-slate-900 tracking-tight">{test.title}</h1>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{test.subject}</p>
                        </div>
                        <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                    </header>

                    {test.sourceType === 'html' ? (
                        /* HTML TEST ÇÖZÜM MODU (IFRAME + OPTİK - 9/3 Oranı) */
                        <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32 animate-in fade-in duration-500">
                             {/* SOL: HTML İÇERİĞİ (Genişletilmiş) */}
                             <div className="lg:col-span-9 flex flex-col h-[70vh] lg:h-[85vh] bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden relative group">
                                <div className="absolute top-4 left-4 z-10">
                                     <Badge className="bg-slate-950/80 backdrop-blur-md text-white font-bold px-3 py-1 border-white/20">Soru Kitapçığı</Badge>
                                </div>
                                <iframe 
                                    srcDoc={getIframeDocument(test.htmlContent || '')}
                                    className="w-full h-full border-none"
                                    title={test.title}
                                    sandbox="allow-scripts allow-same-origin"
                                />
                             </div>

                             {/* SAĞ: OPTİK FORM (Kompaktlaştırılmış) */}
                             <div className="lg:col-span-3 flex flex-col h-[70vh] lg:h-[85vh]">
                                <Card className="rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl flex-1 flex flex-col overflow-hidden">
                                    <div className="p-5 border-b bg-slate-50/50">
                                         <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                             <FileCode className="w-4 h-4 text-indigo-600" /> Cevap Anahtarı
                                         </h3>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Seçenekleri işaretleyin.</p>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 space-y-3">
                                            {Array.from({ length: totalQuestions }).map((_, i) => {
                                                const qNum = (i + 1).toString();
                                                return (
                                                    <div key={qNum} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-all">
                                                        <Badge className="w-8 h-8 rounded-lg flex items-center justify-center font-black bg-indigo-100 text-indigo-700 border-indigo-200 p-0 text-xs shrink-0">{qNum}</Badge>
                                                        <RadioGroup 
                                                            value={mcqAnswers[qNum] || ""} 
                                                            onValueChange={(v) => handleMcqAnswerChange(qNum, v)} 
                                                            className="flex gap-1"
                                                        >
                                                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                <div key={opt} className="flex items-center">
                                                                    <RadioGroupItem value={opt} id={`q${qNum}-${opt}`} className="peer sr-only" />
                                                                    <Label htmlFor={`q${qNum}-${opt}`} className="w-7 h-7 rounded-lg border-2 border-slate-200 flex items-center justify-center text-[10px] font-black cursor-pointer hover:border-indigo-400 hover:text-indigo-600 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600 transition-all">
                                                                        {opt}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </ScrollArea>
                                    <div className="p-4 bg-slate-50/50 border-t">
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button type="button" size="lg" className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black shadow-lg shadow-indigo-500/30 text-white transition-transform active:scale-95 text-sm">
                                                    Ödevi Gönder
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl p-8">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-3xl font-black tracking-tight text-slate-900">Bitiriyoruz?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500 text-lg font-medium leading-relaxed">Cevaplarını kontrol ettiysen ödevi gönderebilirsin.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-8 gap-4 flex-row">
                                                    <AlertDialogCancel className="bg-slate-100 border-none rounded-2xl h-14 font-black flex-1 m-0">Vazgeç</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black flex-1 m-0 shadow-lg shadow-emerald-500/20">Evet, Gönder</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </Card>
                             </div>
                        </main>
                    ) : isBookTracked && test.openEnded ? (
                        /* KİTAP TAKİBİ AÇIK UÇLU MODU */
                        <main className="flex-1 max-w-4xl mx-auto w-full space-y-8 pb-32 animate-in fade-in duration-500">
                            {Array.from({ length: totalQuestions }).map((_, i) => {
                                const qNum = i + 1;
                                return (
                                    <Card key={qNum} className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl overflow-hidden group">
                                        <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center gap-4">
                                            <Badge className="h-10 w-10 rounded-2xl flex items-center justify-center p-0 text-base font-black bg-indigo-600 text-white shrink-0 shadow-lg shadow-indigo-500/20">{qNum}</Badge>
                                            <h4 className="font-bold text-slate-800">Cevabınızı Girin</h4>
                                        </CardHeader>
                                        <CardContent className="p-6 md:p-8 space-y-4">
                                             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cevabınız</Label>
                                             <Textarea 
                                                placeholder="Buraya yazın..."
                                                value={textAnswers[qNum.toString()] || ""}
                                                onChange={(e) => handleTextAnswerChange(qNum, e.target.value)}
                                                className="min-h-[150px] rounded-3xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-lg p-6 shadow-inner leading-relaxed"
                                             />
                                        </CardContent>
                                    </Card>
                                )
                            })}
                            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
                                <Card className="rounded-[2.5rem] bg-white border-slate-200 shadow-2xl p-2">
                                    <Button type="submit" size="lg" className="w-full h-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black shadow-lg shadow-emerald-500/30 transition-transform active:scale-95" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-3 h-7 w-7" />} Ödevi Bitir ve Gönder
                                    </Button>
                                </Card>
                            </div>
                        </main>
                    ) : (
                        /* DİĞERLERİ (SORU BANKASI VB.) SİHİRBAZ GÖRÜNÜMÜ */
                        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
                            <div className="lg:col-span-8 space-y-6">
                                <AnimatePresence mode="wait">
                                    <motion.div key={currentQuestionIndex} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.2 }}>
                                        <Card className="overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-[3rem]">
                                            <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center gap-4">
                                                <Badge className="h-14 w-14 rounded-3xl flex items-center justify-center p-0 text-2xl font-black bg-indigo-600 shrink-0 shadow-lg shadow-indigo-500/20">{currentQuestionIndex + 1}</Badge>
                                                <div>
                                                    <h2 className="text-lg font-black text-slate-800">Soru İçeriği</h2>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{test.openEnded ? 'Cevabınızı metin olarak girin.' : 'Doğru şıkkı işaretleyin.'}</p>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {test.sourceType === 'json' ? (
                                                    <div className="p-8 bg-slate-50 border-b">
                                                        <p className="text-xl font-bold text-slate-800 leading-relaxed">
                                                            {test.jsonQuestions?.[currentQuestionIndex]?.text}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-full aspect-video bg-slate-50 border-b flex items-center justify-center">
                                                        {test.questions?.[currentQuestionIndex] ? (
                                                            <Image src={test.questions[currentQuestionIndex].imageUrl} alt={`Soru ${currentQuestionIndex + 1}`} fill className="object-contain p-6" />
                                                        ) : <ImageIcon className="w-12 h-12 text-slate-300" />}
                                                    </div>
                                                )}
                                                <div className="p-8 md:p-10 bg-white">
                                                    {test.openEnded ? (
                                                        <div className="space-y-4">
                                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Cevabınız</Label>
                                                            <Textarea 
                                                                placeholder="Buraya detaylıca yazın..." 
                                                                value={textAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                                onChange={(e) => handleTextAnswerChange(currentQuestionIndex + 1, e.target.value)}
                                                                className="min-h-[200px] rounded-2xl bg-slate-50 border-slate-200 focus:bg-white text-lg p-6 shadow-inner"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Seçeneğinizi İşaretleyin</p>
                                                            {test.sourceType === 'json' ? (
                                                                <RadioGroup 
                                                                    value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                                    onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)} 
                                                                    className="flex flex-col gap-3"
                                                                >
                                                                    {test.jsonQuestions?.[currentQuestionIndex]?.options.map((optText, idx) => {
                                                                        const optLabel = ['A', 'B', 'C', 'D', 'E'][idx];
                                                                        return (
                                                                            <div key={optLabel} className="flex items-center">
                                                                                <RadioGroupItem value={optLabel} id={`opt-${optLabel}`} className="peer sr-only" />
                                                                                <Label 
                                                                                    htmlFor={`opt-${optLabel}`} 
                                                                                    className="flex items-center w-full p-4 rounded-2xl border-2 border-slate-100 bg-white cursor-pointer transition-all peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:bg-indigo-50/50 hover:bg-slate-50"
                                                                                >
                                                                                    <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 mr-4 shrink-0 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white transition-colors">{optLabel}</span>
                                                                                    <span className="text-slate-700 font-medium">{optText}</span>
                                                                                </Label>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </RadioGroup>
                                                            ) : (
                                                                <RadioGroup value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)} className="flex flex-wrap gap-5 justify-center sm:justify-start">
                                                                    {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                        <div key={opt} className="flex items-center">
                                                                            <RadioGroupItem value={opt} id={`opt-${opt}`} className="peer sr-only" />
                                                                            <Label htmlFor={`opt-${opt}`} className={cn(glassColors.OPTION_BUTTON, "w-16 h-16 text-2xl rounded-2xl shadow-sm")}>{opt}</Label>
                                                                        </div>
                                                                    ))}
                                                                </RadioGroup>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="flex justify-between items-center mt-10 gap-6">
                                            <Button type="button" variant="outline" size="lg" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0} className="h-16 rounded-[2rem] px-10 font-black border-slate-200 bg-white shadow-md active:scale-95 transition-all text-slate-600 disabled:opacity-30">
                                                <ChevronLeft className="mr-3 h-8 w-8" /> Önceki
                                            </Button>

                                            {currentQuestionIndex === totalQuestions - 1 ? (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" size="lg" className="h-16 rounded-[2rem] px-12 font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white active:scale-95 transition-all" disabled={isSubmitting}>
                                                            {isSubmitting ? <Loader2 className="animate-spin h-7 w-7"/> : "Sınavı Bitir"} <CheckCircle className="ml-3 h-7 w-7" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl p-8">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-3xl font-black tracking-tight text-slate-900">Ödev Bitti?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-500 text-lg font-medium leading-relaxed">Tüm soruları kontrol ettiysen gönderebilirsin.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-8 gap-4 flex-row">
                                                            <AlertDialogCancel className="bg-slate-100 border-none rounded-2xl h-14 font-black flex-1 m-0">Vazgeç</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black flex-1 m-0 shadow-lg shadow-emerald-500/20">Evet, Bitir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            ) : (
                                                <Button type="button" size="lg" onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))} className="h-16 rounded-[2rem] px-12 font-black bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 text-white active:scale-95 transition-all">
                                                    Sonraki <ChevronRight className="ml-3 h-8 w-8" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="hidden lg:block lg:col-span-4">
                                <div className={cn("sticky top-28 rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white shadow-2xl")}>
                                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-600" /> Soru Gezgini</h3>
                                        <Badge variant="secondary" className="bg-white border-slate-200 text-indigo-600 font-bold px-3 py-1 rounded-xl shadow-sm">
                                            {isQuestionAnswered(currentQuestionIndex) ? 'Dolu' : 'Boş'}
                                        </Badge>
                                    </div>
                                    <ScrollArea className="h-[500px]">
                                        <QuestionPalette total={totalQuestions} currentIndex={currentQuestionIndex} onNavigate={setCurrentQuestionIndex} isAnswered={isQuestionAnswered} />
                                    </ScrollArea>
                                </div>
                            </div>
                        </main>
                    )}
                </div>
            </form>
        </Form>
    );
}
