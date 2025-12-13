
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuickTestQuestion, Mistake, JsonTestQuestion } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight, Play, Pause, Check, X, MinusCircle, ListX, Sparkles, Loader2, UploadCloud, XCircle, Expand, Shrink } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { doc, getDoc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges, addMistake } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";


// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    OPTION_BUTTON: "flex items-center justify-center w-12 h-12 rounded-xl border-2 cursor-pointer transition-all duration-200 font-bold text-lg hover:bg-white/10 hover:border-indigo-500/50 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:shadow-[0_0_15px_rgba(79,70,229,0.4)] peer-data-[state=checked]:scale-110",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

type McqAnswers = { [key: string]: string | null };
type TextAnswers = { [key: string]: string };
type AnswerKey = { [key: string]: string };
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
      if (timeLeft <= 0) {
          onTimeUp();
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, onTimeUp, isRunning]);

  return (
    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md p-2 pl-4 pr-2 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 font-mono text-xl font-bold text-white">
            <Clock className="h-5 w-5 text-indigo-400" />
            <span>{formatTime(timeLeft)}</span>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
    </div>
  );
}

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user, familyMembers } = useAuth();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<TestType | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<McqAnswers>({});
    const [textAnswers, setTextAnswers] = React.useState<TextAnswers>({});
    
    const [manualEvaluations, setManualEvaluations] = React.useState<ManualEvaluation>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [fullscreenImage, setFullscreenImage] = React.useState<string | null>(null);
    const [fullscreen, setFullscreen] = React.useState(false);
    
    const form = useForm();

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user) return;
        
        const isMcqTest = !test.openEnded;
        
        try {
            let updatedData: Partial<TestType> = {
                timerStatus: 'finished',
            };

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
                    let correct = 0;
                    let incorrect = 0;
                    let empty = 0;

                    for (let i = 1; i <= questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = allStudentMcqAnswers[qNumStr];
                        const question = test.sourceType === 'json' ? test.jsonQuestions![i-1] : test.questions?.find(q => q.questionNumber === i);
                        
                        if (!studentAns || studentAns === null) {
                            empty++;
                            if (question && 'imageUrl' in question && question.imageUrl) {
                                // Add mistake for image-based tests
                            }
                        } else if (studentAns === (answerKey as any)[qNumStr]) {
                            correct++;
                        } else {
                            incorrect++;
                             if (question && 'imageUrl' in question && question.imageUrl) {
                                // Add mistake for image-based tests
                            }
                        }
                    }
                    
                    const score = (correct / questionCount) * 100;
                    updatedData.status = 'Sonuçlandı';
                    updatedData.correctAnswers = correct;
                    updatedData.incorrectAnswers = incorrect;
                    updatedData.emptyAnswers = empty;
                    updatedData.score = score;
                } else {
                     updatedData.status = 'Değerlendirme Bekliyor';
                }

            } else { // Open-ended test
                updatedData.studentTextAnswers = textAnswers;
                updatedData.status = 'Değerlendirme Bekliyor';
            }
            
            await updateTest(test.id, updatedData);
            
            if (updatedData.status === 'Sonuçlandı') {
                 toast({
                    title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!",
                    description: "Cevapların başarıyla kaydedildi ve testin değerlendirildi.",
                    className: "bg-emerald-900 border-emerald-800 text-white"
                });
                if (test.familyId && test.studentId) {
                     await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
                }
                 router.push('/education');
            } else {
                 toast({
                    title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!",
                    description: "Cevapların kaydedildi. Testin yakında değerlendirilecek.",
                    className: "bg-indigo-900 border-indigo-800 text-white"
                });
                router.push('/education');
            }

        } catch (error) {
            console.error("Error saving test results:", error);
            toast({
                variant: "destructive",
                title: "❌ Hata!",
                description: "Test sonuçları kaydedilirken bir sorun oluştu.",
            });
        }
    }, [test, mcqAnswers, textAnswers, toast, router, user]);
    
     React.useEffect(() => {
        if (!testId) {
            setIsLoading(false);
            return;
        }

        const testDocRef = doc(db, 'tests', testId);
        
        const unsubTest = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                
                // Fetch questions subcollection if they are not already on the test doc
                if ((currentTest.sourceType === 'quick' || currentTest.sourceType === 'bank') && (!currentTest.questions || currentTest.questions.length === 0)) {
                  const questionsColRef = collection(db, 'tests', testId, 'questions');
                  const questionsQuery = query(questionsColRef, orderBy("questionNumber"));
                  const questionsSnap = await getDocs(questionsQuery);
                  currentTest.questions = questionsSnap.docs.map(d => d.data() as QuickTestQuestion);
                }

                setTest(currentTest);

                if (currentTest.openEnded) {
                    setTextAnswers(currentTest.studentTextAnswers || {});
                } else {
                    setMcqAnswers(currentTest.studentAnswers || {});
                }

                 if (currentTest.status === 'Değerlendirme Bekliyor') {
                    const initialEvals: ManualEvaluation = {};
                    const questionCount = currentTest.sourceType === 'json' ? currentTest.jsonQuestions!.length : currentTest.questionCount;
                     for (let i = 1; i <= questionCount; i++) {
                        const qNumStr = i.toString();
                        
                        if(currentTest.openEnded){
                            initialEvals[qNumStr] = currentTest.studentTextAnswersEvaluation?.[qNumStr] || 'unevaluated';
                        } else {
                            const studentAns = currentTest.studentAnswers?.[qNumStr];
                            const correctAns = currentTest.sourceType === 'json' 
                                ? currentTest.jsonQuestions![i-1].answer 
                                : currentTest.answerKey?.[qNumStr];

                            if (!studentAns || studentAns === null) {
                                initialEvals[qNumStr] = 'empty';
                            } else if (correctAns && studentAns === correctAns) {
                                initialEvals[qNumStr] = 'correct';
                            } else if (correctAns && studentAns !== correctAns) {
                                initialEvals[qNumStr] = 'incorrect';
                            } else {
                                initialEvals[qNumStr] = 'unevaluated';
                            }
                        }
                    }
                    setManualEvaluations(initialEvals);
                }
            } else {
                setTest(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching test document:", error);
            setIsLoading(false);
        });

        return () => {
            unsubTest();
        };
    }, [testId]);

    const handleEvaluationChange = (questionNumber: string, status: EvaluationStatus) => {
        setManualEvaluations(prev => ({ ...prev, [questionNumber]: status }));
    };

    const handleFinalizeEvaluation = async () => {
        if (!test || !user) return;

        let correct = 0;
        let incorrect = 0;
        let empty = 0;

        for(const [qNumStr, status] of Object.entries(manualEvaluations)) {
            const question = test.sourceType === 'json' ? test.jsonQuestions![parseInt(qNumStr)-1] : test.questions?.find(q => q.questionNumber.toString() === qNumStr);
            if (status === 'correct') {
                correct++;
            } else if (status === 'incorrect') {
                incorrect++;
                if (question && 'imageUrl' in question && question.imageUrl) {
                    // Add mistake logic here
                }
            } else if (status === 'empty' || status === 'unevaluated') {
                empty++;
                 if (question && 'imageUrl' in question && question.imageUrl) {
                    // Add mistake logic here
                }
            }
        }

        const unevaluatedCount = Object.values(manualEvaluations).filter(s => s === 'unevaluated').length;
        
        if (unevaluatedCount > 0 && (test.openEnded || test.sourceType === 'exam')) {
            toast({
                title: "Eksik Değerlendirme",
                description: `${unevaluatedCount} soru henüz değerlendirilmedi.`,
                variant: 'destructive',
            });
            return;
        }
        
        try {
            const questionCount = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;
            const score = (correct / questionCount) * 100;
            const updatedData: Partial<TestType> = {
                status: 'Sonuçlandı',
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                emptyAnswers: empty,
                score: score,
            };
             if (test.openEnded) {
                updatedData.studentTextAnswersEvaluation = manualEvaluations;
             }
            await updateTest(test.id, updatedData);
            toast({ title: "Değerlendirme Kaydedildi!", description: "Test sonuçları başarıyla güncellendi.", className: "bg-emerald-900 text-white" });
             if (test.familyId && test.studentId) {
                await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            }
        } catch (error) {
             toast({ title: "Hata!", description: "Değerlendirme kaydedilirken bir hata oluştu.", variant: 'destructive'});
        }
    };

    const currentUserIsStudent = React.useMemo(() => {
        if (!user || !test) return false;
        return user.uid === test.studentId;
    }, [user, test]);


    if (isLoading) {
         return (
             <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mr-4" />
                <p className="text-slate-400 font-medium animate-pulse">Test Yükleniyor...</p>
            </div>
        );
    }

    if (!test) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200">
                <div className="bg-rose-500/20 p-6 rounded-full mb-6 border border-rose-500/30">
                    <FileQuestion className="w-16 h-16 text-rose-500" />
                </div>
                <h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1>
                <p className="text-slate-400 mb-8 max-w-md text-center">Aradığınız test mevcut değil veya silinmiş olabilir.</p>
                <Link href="/education">
                    <Button size="lg" className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Eğitim Sayfasına Dön
                    </Button>
                </Link>
            </div>
        )
    }

    // --- VIEW: RESULTS SUMMARY ---
    if (test.status === 'Sonuçlandı' || test.status === 'Tekrar Çözülüyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.sourceType === 'json' 
            ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {})
            : test.answerKey || {};
        const questionCount = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;
        
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col p-4 sm:p-8">
                {/* Fixed Background */}
                <div className="fixed inset-0 bg-slate-950 -z-50" />
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10">
                    <header className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                        </Button>
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-3 py-1">Tamamlandı</Badge>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className={cn("col-span-1 md:col-span-3 flex flex-col items-center justify-center py-10 border-emerald-500/30 bg-emerald-900/10 backdrop-blur-md")}>
                            <p className="text-sm text-emerald-300 font-bold tracking-widest uppercase mb-2">Toplam Puan</p>
                            <div className="text-8xl font-black text-white tracking-tighter drop-shadow-lg">
                                {(test.score || 0).toFixed(0)}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-lg px-4 py-1">{test.correctAnswers} Doğru</Badge>
                                <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-0 text-lg px-4 py-1">{test.incorrectAnswers} Yanlış</Badge>
                            </div>
                        </Card>
                    </div>

                    <Card className={glassColors.CARD_BG}>
                        <CardHeader>
                            <CardTitle>Cevap Anahtarı</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                               {Array.from({ length: questionCount }).map((_, index) => {
                                    const qNumStr = (index + 1).toString();
                                    const studentAns = studentAnswers[qNumStr];
                                    const correctAns = answerKey[qNumStr];
                                    const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                    
                                    let statusColor = "border-white/10 bg-white/5";
                                    if (evalStatus === 'correct') statusColor = "border-emerald-500/50 bg-emerald-500/10";
                                    else if (evalStatus === 'incorrect') statusColor = "border-rose-500/50 bg-rose-500/10";

                                    return (
                                        <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                            <span className="font-bold text-slate-300 w-8">{qNumStr}</span>
                                            <div className="flex gap-3">
                                                <span className={cn("font-bold", evalStatus === 'incorrect' ? 'text-rose-400 line-through decoration-2' : 'text-white')}>{studentAns || '-'}</span>
                                                {evalStatus === 'incorrect' && <span className="font-bold text-emerald-400">{correctAns}</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }
    
    // --- VIEW: EVALUATION PENDING ---
    if (test.status === 'Değerlendirme Bekliyor') {
        if (currentUserIsStudent) {
            return (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-yellow-500/20 p-6 rounded-full mb-6 border border-yellow-500/30 animate-pulse">
                        <Clock className="w-16 h-16 text-yellow-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Değerlendirme Bekleniyor</h1>
                    <p className="text-slate-400 mb-8 max-w-md">Testini başarıyla tamamladın! Sonuçların öğretmen/ebeveyn değerlendirmesinden sonra açıklanacak.</p>
                    <Link href="/education">
                        <Button size="lg" className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Eğitim Sayfasına Dön
                        </Button>
                    </Link>
                </div>
            )
        }

        // Teacher/Parent grading view
        if (test.openEnded) {
             // Open Ended Test Grading UI here
        }
        
         // Optical Form grading fallback
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
                 <header className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                    </Button>
                </header>
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card className={glassColors.CARD_BG}>
                        <CardHeader>
                            <CardTitle>Optik Form Kontrolü</CardTitle>
                            <CardDescription>Cevap anahtarı eksik veya hatalı olabilir. Lütfen manuel kontrol edin.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {Array.from({ length: test.questionCount }).map((_, index) => {
                                const qNumStr = (index + 1).toString();
                                const studentAns = test.studentAnswers?.[qNumStr];
                                const correctAns = test.sourceType === 'json' 
                                    ? test.jsonQuestions![index].answer 
                                    : test.answerKey?.[qNumStr];
                                const evalStatus = manualEvaluations[qNumStr];

                                return (
                                    <div key={qNumStr} className="flex items-center gap-4 p-3 rounded-lg border border-white/5 bg-white/5">
                                        <div className="w-8 h-8 flex items-center justify-center font-bold bg-indigo-500/20 text-indigo-300 rounded-lg">{qNumStr}</div>
                                        <div className="flex gap-4 text-sm">
                                            <span>Cevap: <span className="font-bold text-white">{studentAns || '-'}</span></span>
                                            <span>Doğru: <span className="font-bold text-emerald-400">{correctAns || '?'}</span></span>
                                        </div>
                                        <div className="ml-auto flex gap-2">
                                            <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'correct')} className={cn("h-8", evalStatus === 'correct' ? "bg-emerald-600" : "bg-transparent border border-emerald-500/30 text-emerald-400")}>D</Button>
                                            <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'incorrect')} className={cn("h-8", evalStatus === 'incorrect' ? "bg-rose-600" : "bg-transparent border border-rose-500/30 text-rose-400")}>Y</Button>
                                            <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'empty')} className={cn("h-8", evalStatus === 'empty' ? "bg-slate-600" : "bg-transparent border border-slate-500/30 text-slate-400")}>B</Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                     <Button onClick={handleFinalizeEvaluation} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-14">Kaydet</Button>
                </div>
            </div>
        )
    }

    const handleMcqAnswerChange = (questionNumber: string, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        setTextAnswers(prev => ({...prev, [questionNumber]: value}));
    };
    
    const hasImages = test.sourceType === 'quick' || test.sourceType === 'bank';
    const isJsonTest = test.sourceType === 'json' && test.jsonQuestions && test.jsonQuestions.length > 0;
    const options = ['A', 'B', 'C', 'D', 'E']; // Allow E option just in case
    const testDurationMinutes = test.durationMinutes || (isJsonTest ? test.jsonQuestions!.length * 1.5 : test.questionCount * 2);
    
    const currentJsonQuestion = isJsonTest ? test.jsonQuestions![currentQuestionIndex] : null;

    // --- VIEW: JSON-BASED WRITTEN TEST ---
    if (isJsonTest && currentJsonQuestion) {
        return (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                    <motion.div
                        className={cn("min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col transition-all duration-300", fullscreen ? "fixed inset-0 z-50 p-8" : "relative p-4 sm:p-8")}
                        animate={{ backgroundColor: fullscreen ? "rgba(15, 23, 42, 1)" : "rgba(15, 23, 42, 0)" }}
                    >
                        {!fullscreen && (
                            <header className="max-w-4xl mx-auto w-full mb-8 flex justify-between items-center">
                                <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                                    <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                                </Button>
                                <div className="text-right">
                                    <h1 className="text-xl font-bold text-white">{test.title}</h1>
                                    <p className="text-sm text-slate-400">{test.subject}</p>
                                </div>
                            </header>
                        )}
                        
                        <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white" onClick={() => setFullscreen(!fullscreen)}>
                           {fullscreen ? <Shrink /> : <Expand />}
                        </Button>

                        <main className={cn("max-w-4xl mx-auto w-full flex-grow flex flex-col", fullscreen && "justify-center")}>
                            
                            {/* TIMER & PROGRESS */}
                            <Card className={cn("border-l-4 border-l-indigo-500 mb-8", glassColors.CARD_BG)}>
                                <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4">
                                     <div className="flex-grow w-full">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-lg text-slate-200">Soru {currentQuestionIndex + 1} / {test.jsonQuestions!.length}</h3>
                                            <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                                        </div>
                                        <Progress value={((currentQuestionIndex + 1) / test.jsonQuestions!.length) * 100} className="h-2 bg-slate-800" indicatorClassName="bg-indigo-500" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* QUESTION CARD */}
                            <Card className={cn("flex-grow flex flex-col overflow-hidden", glassColors.CARD_BG)}>
                                <CardHeader className="bg-white/5 border-b border-white/5 p-6">
                                    <CardTitle className="text-slate-100 text-2xl leading-relaxed whitespace-pre-wrap">{currentJsonQuestion.text}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 flex-grow">
                                    <RadioGroup 
                                        value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                        onValueChange={(value) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), value)}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        {currentJsonQuestion.options.map((option, optIndex) => (
                                            <FormItem key={optIndex} className="has-[:checked]:ring-2 has-[:checked]:ring-indigo-500 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                                <FormControl>
                                                    <Label className="flex items-center gap-4 p-5 cursor-pointer w-full">
                                                         <div className={cn(
                                                            "w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center font-bold text-slate-400 transition-all",
                                                            (mcqAnswers[(currentQuestionIndex + 1).toString()] === option) && "bg-indigo-600 border-indigo-500 text-white scale-110 shadow-lg"
                                                         )}>
                                                            {String.fromCharCode(65 + optIndex)}
                                                         </div>
                                                         <RadioGroupItem value={option} className="sr-only"/>
                                                         <span className="font-medium text-base text-slate-200">{option}</span>
                                                    </Label>
                                                </FormControl>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
                                </CardContent>
                                <CardFooter className="p-6 bg-black/20 border-t border-white/5 mt-auto">
                                    <div className="flex justify-between w-full">
                                        <Button 
                                            type="button"
                                            variant="outline" 
                                            className={glassColors.BUTTON_GLASS}
                                            onClick={() => setCurrentQuestionIndex(p => p - 1)} 
                                            disabled={currentQuestionIndex === 0}
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4"/> Önceki Soru
                                        </Button>
                                        {currentQuestionIndex === test.jsonQuestions!.length - 1 ? (
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 shadow-lg shadow-emerald-600/20">
                                                        Testi Tamamla <Check className="ml-2 h-5 w-5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400">
                                                            Testi bitirdikten sonra cevaplarınızda değişiklik yapamazsınız.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Evet, Bitir</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        ) : (
                                            <Button 
                                                type="button"
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11"
                                                onClick={() => setCurrentQuestionIndex(p => p + 1)} 
                                                disabled={currentQuestionIndex === test.jsonQuestions!.length - 1}
                                            >
                                                Sonraki Soru <ArrowRight className="ml-2 h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                </CardFooter>
                            </Card>
                        </main>
                    </motion.div>
                </form>
             </Form>
        )
    }
    
    // --- VIEW: ACTIVE TEST (Questions with Images) ---
    if (hasImages) {
        const currentQuestion = test.questions![currentQuestionIndex];
        return (
             <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col p-4 sm:p-8">
                {/* ... existing image-based test UI ... */}
             </div>
        )
    }

    // --- VIEW: ACTIVE TEST (Optical Form / Manual) ---
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col p-4 sm:p-8">
            <header className="max-w-3xl mx-auto w-full mb-8 flex justify-between items-center">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                </Button>
                <div className="text-right">
                    <h1 className="text-xl font-bold text-white">{test.title}</h1>
                    <p className="text-sm text-slate-400">{test.subject}</p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto w-full space-y-8">
                {/* Timer Card */}
                <Card className={cn("border-l-4 border-l-indigo-500", glassColors.CARD_BG)}>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <h3 className="font-bold text-lg text-slate-200">Süreniz İşliyor</h3>
                            <p className="text-slate-400 text-sm">Optik formu doldurmayı unutmayın.</p>
                        </div>
                        <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                    </CardContent>
                </Card>

                {/* Optical Form */}
                <Card className={cn("overflow-hidden", glassColors.CARD_BG)}>
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-center text-slate-200">Cevap Kağıdı</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {Array.from({ length: test.questionCount }).map((_, index) => {
                                const qNum = index + 1;
                                return (
                                    <div key={qNum} className="flex items-center p-3 sm:p-4 hover:bg-white/5 transition-colors group">
                                        <div className="w-12 text-center font-bold text-slate-400 text-lg">{qNum}</div>
                                        {test.openEnded ? (
                                            <Input 
                                                placeholder="Cevabınızı yazın..." 
                                                value={textAnswers[qNum] || ""}
                                                onChange={(e) => handleTextAnswerChange(qNum, e.target.value)}
                                                className={cn("flex-1", glassColors.INPUT_BG)}
                                            />
                                        ) : (
                                            <RadioGroup 
                                                value={mcqAnswers[qNum.toString()] || ""} 
                                                onValueChange={(value) => handleMcqAnswerChange(qNum.toString(), value)}
                                                className="flex-1 flex justify-center sm:justify-start gap-3 sm:gap-6 ml-4"
                                            >
                                                {options.slice(0,4).map(option => (
                                                    <div key={option} className="relative">
                                                        <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                                        <Label 
                                                            htmlFor={`q${qNum}-${option}`} 
                                                            className={glassColors.OPTION_BUTTON}
                                                        >
                                                            {option}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 bg-white/5 border-t border-white/5">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg shadow-emerald-600/20">
                                    Testi Tamamla <Check className="ml-2 h-5 w-5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        Testi bitirdikten sonra cevaplarınızda değişiklik yapamazsınız.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Evet, Bitir</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}



    

