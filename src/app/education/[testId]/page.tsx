"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuickTestQuestion, Mistake } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight, Play, Pause, Check, X, MinusCircle, ListX, Sparkles, Loader2, UploadCloud, XCircle, Expand } from "lucide-react";
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
        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setIsRunning(!isRunning)}>
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
    
    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user) return;
        
        const isMcqTest = !test.openEnded;
        
        try {
            let updatedData: Partial<TestType> = {
                timerStatus: 'finished',
            };

            if (isMcqTest) {
                let allStudentMcqAnswers: McqAnswers = {};
                for (let i = 1; i <= test.questionCount; i++) {
                    const qNumStr = i.toString();
                    allStudentMcqAnswers[qNumStr] = mcqAnswers[qNumStr] || null;
                }
                updatedData.studentAnswers = allStudentMcqAnswers;

                const answerKey = test.answerKey;
                if (answerKey && Object.keys(answerKey).length > 0) {
                    let correct = 0;
                    let incorrect = 0;
                    let empty = 0;

                    for (let i = 1; i <= test.questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = allStudentMcqAnswers[qNumStr];
                        const question = test.questions?.find(q => q.questionNumber === i);
                        
                        if (!studentAns || studentAns === null) {
                            empty++;
                            if (question?.imageUrl) {
                                const newMistake: Omit<Mistake, 'id'|'familyId'|'status'> = {
                                    creatorId: user.uid,
                                    testId: test.id,
                                    originalQuestionId: question.questionId,
                                    imageUrl: question.imageUrl,
                                    studentAnswer: 'BOŞ',
                                    correctAnswer: (answerKey as any)[qNumStr] ?? null,
                                    subject: test.subject,
                                    topic: test.topicId || 'Genel',
                                    createdAt: new Date().toISOString(),
                                    type: 'mcq',
                                };
                                await addMistake(newMistake);
                            }
                        } else if (studentAns === (answerKey as any)[qNumStr]) {
                            correct++;
                        } else {
                            incorrect++;
                            if (question?.imageUrl) {
                                const newMistake: Omit<Mistake, 'id'|'familyId'|'status'> = {
                                    creatorId: user.uid,
                                    testId: test.id,
                                    originalQuestionId: question.questionId,
                                    imageUrl: question.imageUrl,
                                    studentAnswer: studentAns,
                                    correctAnswer: (answerKey as any)[qNumStr] ?? null,
                                    subject: test.subject,
                                    topic: test.topicId || 'Genel',
                                    createdAt: new Date().toISOString(),
                                    type: 'mcq'
                                };
                                await addMistake(newMistake);
                            }
                        }
                    }
                    
                    const score = (correct / test.questionCount) * 100;
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
                if (!currentTest.questions || currentTest.questions.length === 0) {
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
                     for (let i = 1; i <= currentTest.questionCount; i++) {
                        const qNumStr = i.toString();
                        
                        if(currentTest.openEnded){
                            initialEvals[qNumStr] = currentTest.studentTextAnswersEvaluation?.[qNumStr] || 'unevaluated';
                        } else {
                            const studentAns = currentTest.studentAnswers?.[qNumStr];
                            const correctAns = currentTest.answerKey?.[qNumStr];

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
            const question = test.questions?.find(q => q.questionNumber.toString() === qNumStr);
            if (status === 'correct') {
                correct++;
            } else if (status === 'incorrect') {
                incorrect++;
                if (question?.imageUrl) {
                    const newMistake: Omit<Mistake, 'id'|'familyId'|'status'> = {
                        creatorId: test.studentId,
                        testId: test.id,
                        originalQuestionId: question.questionId,
                        imageUrl: question.imageUrl,
                        studentAnswer: test.openEnded ? test.studentTextAnswers?.[qNumStr] : test.studentAnswers?.[qNumStr],
                        correctAnswer: test.answerKey?.[qNumStr] ?? null,
                        subject: test.subject,
                        topic: test.topicId || 'Genel',
                        createdAt: new Date().toISOString(),
                        type: test.openEnded ? 'open_ended' : 'mcq'
                    };
                    await addMistake(newMistake);
                }
            } else if (status === 'empty' || status === 'unevaluated') {
                empty++;
                 if (question?.imageUrl) {
                    const newMistake: Omit<Mistake, 'id'|'familyId'|'status'> = {
                        creatorId: test.studentId,
                        testId: test.id,
                        originalQuestionId: question.questionId,
                        imageUrl: question.imageUrl,
                        studentAnswer: 'BOŞ',
                        correctAnswer: test.answerKey?.[qNumStr] ?? null,
                        subject: test.subject,
                        topic: test.topicId || 'Genel',
                        createdAt: new Date().toISOString(),
                        type: test.openEnded ? 'open_ended' : 'mcq'
                    };
                    await addMistake(newMistake);
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
            const score = (correct / test.questionCount) * 100;
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
                <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
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
        const answerKey = test.answerKey || {};

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
                                {(test.questions && test.questions.length > 0) ? (
                                    test.questions.map((question) => {
                                        const qNumStr = question.questionNumber.toString();
                                        const studentAns = test.openEnded ? test.studentTextAnswers?.[qNumStr] : studentAnswers[qNumStr];
                                        const correctAns = test.openEnded ? undefined : answerKey[qNumStr];
                                        const evalStatus = test.openEnded ? test.studentTextAnswersEvaluation?.[qNumStr] : (studentAnswers[qNumStr] === answerKey[qNumStr] ? 'correct' : (studentAnswers[qNumStr] ? 'incorrect' : 'empty'));

                                        let statusColor = "border-white/10 bg-white/5";
                                        if (evalStatus === 'correct') statusColor = "border-emerald-500/50 bg-emerald-500/10";
                                        else if (evalStatus === 'incorrect') statusColor = "border-rose-500/50 bg-rose-500/10";

                                        return (
                                            <div key={question.questionId} className={cn("p-4 border rounded-xl flex flex-col gap-2", statusColor)}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-slate-300">Soru {qNumStr}</span>
                                                    {evalStatus === 'correct' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                                                    {evalStatus === 'incorrect' && <XCircle className="h-5 w-5 text-rose-400" />}
                                                    {evalStatus === 'empty' && <MinusCircle className="h-5 w-5 text-slate-500" />}
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-slate-400">Cevap:</span> <span className="font-bold text-white">{studentAns || '-'}</span>
                                                </div>
                                                {correctAns && (
                                                    <div className="text-sm text-emerald-400">
                                                        <span>Doğru:</span> <span className="font-bold">{correctAns}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                ) : (
                                    Array.from({ length: test.questionCount }).map((_, index) => {
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
                                    })
                                )}
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
            return (
                <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
                     <header className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                        <Button variant="ghost" onClick={() => router.back()} className="text-slate-400">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                        </Button>
                        <h1 className="text-xl font-bold text-white">Manuel Değerlendirme</h1>
                    </header>
                    
                    <div className="max-w-4xl mx-auto space-y-6">
                         <div className="space-y-4">
                            {(test.questions && test.questions.length > 0) ? (test.questions.map((question) => {
                                const qNumStr = question.questionNumber.toString();
                                const studentAns = test.studentTextAnswers?.[qNumStr];
                                const evalStatus = manualEvaluations[qNumStr];

                                return (
                                    <Card key={qNumStr} className={glassColors.CARD_BG}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="text-lg font-bold text-indigo-300">Soru {qNumStr}</h4>
                                                <Badge variant="outline" className={cn(
                                                    "capitalize",
                                                    evalStatus === 'correct' ? "text-emerald-400 border-emerald-500/50" : 
                                                    evalStatus === 'incorrect' ? "text-rose-400 border-rose-500/50" : "text-slate-500 border-slate-700"
                                                )}>{evalStatus === 'unevaluated' ? 'Değerlendirilmedi' : evalStatus}</Badge>
                                            </div>
                                            
                                            {question.imageUrl && (
                                                <div className="relative w-full h-64 mb-4 bg-black/40 rounded-lg overflow-hidden border border-white/5">
                                                    <Image src={question.imageUrl} alt={`Soru ${qNumStr}`} fill className="object-contain" />
                                                </div>
                                            )}
                                            
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Öğrenci Cevabı:</p>
                                                <p className="text-slate-200 whitespace-pre-wrap">{studentAns || "Cevap verilmemiş."}</p>
                                            </div>
                                            
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'correct')} className={cn("border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20", evalStatus === 'correct' && "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700")} variant="outline"><Check className="mr-1 h-4 w-4"/> Doğru</Button>
                                                <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'incorrect')} className={cn("border border-rose-500/50 text-rose-400 hover:bg-rose-500/20", evalStatus === 'incorrect' && "bg-rose-600 text-white border-rose-600 hover:bg-rose-700")} variant="outline"><X className="mr-1 h-4 w-4"/> Yanlış</Button>
                                                <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'empty')} className={cn("border border-slate-500/50 text-slate-400 hover:bg-slate-500/20", evalStatus === 'empty' && "bg-slate-600 text-white border-slate-600 hover:bg-slate-700")} variant="outline"><MinusCircle className="mr-1 h-4 w-4"/> Boş/Yarım</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })) : (
                                <Card className={glassColors.CARD_BG}><CardContent className="p-6 text-center text-slate-400">Görsel bulunamadı.</CardContent></Card>
                            )}
                        </div>
                        <Button onClick={handleFinalizeEvaluation} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-14 shadow-xl shadow-indigo-600/20 text-lg rounded-xl">
                            Değerlendirmeyi Kaydet
                        </Button>
                    </div>
                </div>
            )
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
                                const correctAns = test.answerKey?.[qNumStr];
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

    const handleMcqAnswerChange = (questionNumber: number, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        setTextAnswers(prev => ({...prev, [questionNumber]: value}));
    };
    
    const hasImages = test.questions && test.questions.length > 0;
    const options = ['A', 'B', 'C', 'D'];
    const testDurationMinutes = test.durationMinutes || test.questionCount * 2; // Default fallback

    // --- VIEW: ACTIVE TEST (Questions with Images) ---
    if (hasImages) {
        const handleNextQuestion = () => {
            setCurrentQuestionIndex(prev => Math.min(prev + 1, test.questionCount - 1));
        };

        const handlePrevQuestion = () => {
            setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
        };
        
        const handleJumpToQuestion = (index: number) => {
            setCurrentQuestionIndex(index);
        };

        const answeredQuestionsCount = test.openEnded
        ? Object.values(textAnswers).filter(a => a?.trim() !== '').length
        : Object.keys(mcqAnswers).length;
        
        const currentQuestion = test.questions?.[currentQuestionIndex];
        const qNum = currentQuestion?.questionNumber;

        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col p-4 sm:p-6 lg:p-8">
                {/* Backgrounds */}
                <div className="fixed inset-0 bg-slate-950 -z-50" />
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                </div>

                <header className="mb-6 flex justify-between items-center relative z-10">
                    <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <h2 className="text-lg font-bold text-white leading-tight">{test.title}</h2>
                            <p className="text-xs text-slate-400">{test.subject}</p>
                        </div>
                        <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                    </div>
                </header>
                
                <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 flex-1 min-h-0">
                    {/* Question Area */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <Card className={cn("flex-1 flex flex-col overflow-hidden border-0", glassColors.CARD_BG)}>
                            <CardContent className="p-0 flex-1 flex flex-col relative">
                                {currentQuestion && qNum && (
                                    <>
                                        <div className="absolute top-4 left-4 z-20 flex gap-2">
                                            <Badge className="bg-indigo-600 text-white border-0 text-sm px-3 py-1">Soru {qNum}</Badge>
                                        </div>
                                        
                                        {/* Image Container */}
                                        <div className="relative w-full flex-1 min-h-[300px] bg-black/40 flex items-center justify-center p-4">
                                            {currentQuestion.imageUrl ? (
                                                <div className="relative w-full h-full">
                                                    <Image 
                                                        src={currentQuestion.imageUrl} 
                                                        alt={`Soru ${qNum}`} 
                                                        fill 
                                                        className="object-contain" 
                                                        data-ai-hint="question paper"
                                                    />
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="secondary" size="icon" className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-full h-10 w-10">
                                                                <Expand className="h-5 w-5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] bg-slate-950/95 border-white/10 p-0 flex items-center justify-center">
                                                            <div className="relative w-full h-full p-4">
                                                                <Image src={currentQuestion.imageUrl} alt={`Soru ${qNum}`} fill className="object-contain" />
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            ) : (
                                                <div className="text-slate-500 flex flex-col items-center">
                                                    <FileQuestion className="h-12 w-12 mb-2 opacity-50" />
                                                    <p>Görsel yok</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Answer Area */}
                                        <div className="p-6 bg-white/5 border-t border-white/10 backdrop-blur-xl">
                                            {test.openEnded ? (
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Cevabınız</Label>
                                                    <Textarea 
                                                        placeholder="Cevabınızı buraya yazın..." 
                                                        value={textAnswers[qNum] || ""} 
                                                        onChange={(e) => handleTextAnswerChange(qNum, e.target.value)}
                                                        className={cn("min-h-[120px] text-lg", glassColors.INPUT_BG)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <Label className="text-slate-300 mb-2 block">Seçeneği İşaretleyin</Label>
                                                    <RadioGroup 
                                                        value={mcqAnswers[qNum] || ""} 
                                                        onValueChange={(value) => {
                                                            handleMcqAnswerChange(qNum, value);
                                                            // Optional: Auto advance after selection
                                                            // setTimeout(handleNextQuestion, 300);
                                                        }} 
                                                        className="flex justify-center gap-4 sm:gap-8"
                                                    >
                                                        {options.map(option => (
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
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Navigation */}
                        <div className="flex justify-between items-center">
                            <Button 
                                onClick={handlePrevQuestion} 
                                disabled={currentQuestionIndex === 0}
                                variant="outline"
                                className="border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Önceki
                            </Button>
                            
                            {currentQuestionIndex < test.questionCount - 1 ? (
                                <Button 
                                    onClick={handleNextQuestion}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
                                >
                                    Sonraki <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 font-bold shadow-lg shadow-emerald-600/20">
                                            Testi Bitir <Check className="ml-2 h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Testi bitiriyor musun?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-400">
                                                Toplam {test.questionCount} sorudan {answeredQuestionsCount} tanesini cevapladın.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Evet, Bitir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Question Palette */}
                    <aside className="lg:col-span-4 flex flex-col gap-6">
                        <Card className={cn("h-full flex flex-col", glassColors.CARD_BG)}>
                            <CardHeader className="pb-4 border-b border-white/5">
                                <CardTitle className="text-lg text-slate-200">Soru Listesi</CardTitle>
                                <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                                    <span>{answeredQuestionsCount} / {test.questionCount} Cevaplandı</span>
                                    <Progress value={(answeredQuestionsCount / test.questionCount) * 100} className="w-24 h-2" indicatorClassName="bg-emerald-500" />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="grid grid-cols-5 gap-2">
                                    {Array.from({length: test.questionCount}, (_, i) => {
                                        const qNum = i + 1;
                                        const isAnswered = test.openEnded ? !!textAnswers[qNum] : !!mcqAnswers[qNum];
                                        const isCurrent = currentQuestionIndex === i;
                                        
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleJumpToQuestion(i)}
                                                className={cn(
                                                    "aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border",
                                                    isCurrent ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30 scale-110 z-10" : 
                                                    isAnswered ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" : 
                                                    "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                {qNum}
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </main>
            </div>
        )
    }

    // --- VIEW: ACTIVE TEST (Optical Form / Manual) ---
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col p-4 sm:p-8">
            <header className="max-w-3xl mx-auto w-full mb-8 flex justify-between items-center">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
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
                                                value={mcqAnswers[qNum] || ""} 
                                                onValueChange={(value) => handleMcqAnswerChange(qNum, value)}
                                                className="flex-1 flex justify-center sm:justify-start gap-3 sm:gap-6 ml-4"
                                            >
                                                {options.map(option => (
                                                    <div key={option} className="relative">
                                                        <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                                        <Label 
                                                            htmlFor={`q${qNum}-${option}`} 
                                                            className={cn(
                                                                "flex items-center justify-center w-10 h-10 rounded-full border border-white/20 text-slate-400 font-bold cursor-pointer transition-all hover:bg-white/10 hover:text-white hover:border-white/40",
                                                                mcqAnswers[qNum] === option && "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)] scale-110"
                                                            )}
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
                                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg shadow-emerald-600/20">
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
