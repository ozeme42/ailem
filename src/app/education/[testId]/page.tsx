
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuestionBank, PracticeExam, Mistake } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight, Play, Pause, Check, X, MinusCircle, ListX, Sparkles, Loader2, UploadCloud, XCircle } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { updateTest, checkAndAwardBadges, updateMistake } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

type McqAnswers = { [key: string]: string | null };
type AnswerKey = { [key: string]: string };
type EvaluationStatus = 'correct' | 'incorrect' | 'empty' | 'unevaluated';
type ManualEvaluations = { [key: string]: EvaluationStatus };


export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<TestType | null | undefined>(undefined);
    const [mcqAnswers, setMcqAnswers] = React.useState<McqAnswers>({});
    const [manualEvaluations, setManualEvaluations] = React.useState<ManualEvaluations>({});

    const [timeLeft, setTimeLeft] = React.useState(0);
    const [totalTime, setTotalTime] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    
    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test) return;

        setIsPaused(true);
        const timeSpent = (test.timeSpentSeconds || 0) + (totalTime - timeLeft);
        
        let allStudentMcqAnswers: McqAnswers = {};
        
        for (let i = 1; i <= test.questionCount; i++) {
            const qNumStr = i.toString();
            allStudentMcqAnswers[qNumStr] = mcqAnswers[qNumStr] || null;
        }

        try {
            let updatedData: Partial<TestType> = {
                timerStatus: 'finished',
                timeSpentSeconds: timeSpent,
                studentAnswers: allStudentMcqAnswers
            };
            
            const answerKey = test.answerKey;

            if (answerKey && Object.keys(answerKey).length > 0) {
                let correct = 0;
                let incorrect = 0;
                let empty = 0;

                for (let i = 1; i <= test.questionCount; i++) {
                    const qNumStr = i.toString();
                    if (!allStudentMcqAnswers[qNumStr] || allStudentMcqAnswers[qNumStr] === null) {
                        empty++;
                    } else if (allStudentMcqAnswers[qNumStr] === (answerKey as any)[qNumStr]) {
                        correct++;
                    } else {
                        incorrect++;
                    }
                }
                
                const score = (correct / test.questionCount) * 100;
                updatedData.status = 'Sonuçlandı';
                updatedData.correctAnswers = correct;
                updatedData.incorrectAnswers = incorrect;
                updatedData.emptyAnswers = empty;
                updatedData.score = score;
                
                await updateTest(test.id, updatedData);
                
                toast({
                    title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı ve Değerlendirildi!",
                    description: "Cevapların başarıyla kaydedildi ve testin anında değerlendirildi.",
                });

                if (test.familyId && test.studentId) {
                     await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
                }
            } else {
                updatedData.status = 'Değerlendirme Bekliyor';
                await updateTest(test.id, updatedData);
                toast({
                    title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!",
                    description: "Cevapların kaydedildi ama cevap anahtarı bulunamadı. Testin yakında manuel olarak değerlendirilecek.",
                });
            }

        } catch (error) {
            console.error("Error saving test results:", error);
            toast({
                variant: "destructive",
                title: "❌ Hata!",
                description: "Test sonuçları kaydedilirken bir sorun oluştu.",
            });
        }
    }, [test, mcqAnswers, router, toast, totalTime, timeLeft]);
    
    const handlePauseToggle = async () => {
        if (!test) return;
        const newIsPaused = !isPaused;
        setIsPaused(newIsPaused);

        let timeSpent = test.timeSpentSeconds || 0;
        if (!newIsPaused) { // Resuming
             await updateTest(test.id, { timerStatus: 'running' });
        } else { // Pausing
            timeSpent += (totalTime - timeLeft);
            await updateTest(test.id, { timerStatus: 'paused', timeSpentSeconds: timeSpent });
        }
    };
    
    const handleSaveManualEvaluation = async () => {
        if (!test) return;
        let correct = 0;
        let incorrect = 0;
        let empty = 0;

        for (const qNumStr in manualEvaluations) {
            switch (manualEvaluations[qNumStr]) {
                case 'correct': correct++; break;
                case 'incorrect': incorrect++; break;
                case 'empty': empty++; break;
                default: empty++; // Or handle as error
            }
        }
        const score = (correct / test.questionCount) * 100;
        const updatedData: Partial<TestType> = {
            status: 'Sonuçlandı',
            correctAnswers: correct,
            incorrectAnswers: incorrect,
            emptyAnswers: empty,
            score: score,
        };
        try {
            await updateTest(test.id, updatedData);
            toast({ title: "✅ Değerlendirme Kaydedildi!", description: "Sonuçlar başarıyla güncellendi." });
        } catch (error) {
            toast({ variant: 'destructive', title: "❌ Hata!", description: "Sonuçlar kaydedilirken bir hata oluştu." });
        }
    };


    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubscribe = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                setTest(currentTest);

                const totalDuration = currentTest.questionCount * 90;
                const timeAlreadySpent = currentTest.timeSpentSeconds || 0;
                setTotalTime(totalDuration);
                setTimeLeft(totalDuration - timeAlreadySpent);
                setIsPaused(currentTest.timerStatus === 'paused');
                
                setMcqAnswers(currentTest.studentAnswers || {});

                // Initialize manual evaluations if test is pending
                if (currentTest.status === 'Değerlendirme Bekliyor') {
                    const initialEvals: ManualEvaluations = {};
                    const answerKey = currentTest.answerKey || {};
                    const studentAnswers = currentTest.studentAnswers || {};

                    for (let i = 1; i <= currentTest.questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = studentAnswers[qNumStr];
                        const correctAns = answerKey[qNumStr];

                        if (!studentAns) {
                            initialEvals[qNumStr] = 'empty';
                        } else if (studentAns === correctAns) {
                            initialEvals[qNumStr] = 'correct';
                        } else {
                            initialEvals[qNumStr] = 'incorrect';
                        }
                    }
                    setManualEvaluations(initialEvals);
                }
                
            } else {
                setTest(null);
            }
        });

        return () => unsubscribe();
    }, [testId]);

    React.useEffect(() => {
        if (!test || test.status !== 'Atandı' || isPaused) return;
        
        if (timeLeft <= 0) {
            handleSubmit(true);
            return;
        };

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, test, handleSubmit, isPaused]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }


    if (test === undefined) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-background">
                <p>Test yükleniyor...</p>
            </div>
        )
    }

    if (!test) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-background">
                <FileQuestion className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Test Bulunamadı</h1>
                <p className="text-muted-foreground mb-6">Aradığınız test mevcut değil veya kaldırılmış olabilir.</p>
                <Link href="/education">
                    <Button>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Eğitim Sayfasına Geri Dön
                    </Button>
                </Link>
            </div>
        )
    }

    if (test.status === 'Sonuçlandı' || test.status === 'Tekrar Çözülüyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.answerKey || {};

        return (
            <div className="container mx-auto py-8 space-y-6">
                <header className="mb-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                    </Button>
                </header>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{test.title} - Sonuç Raporu</CardTitle>
                        <CardDescription>{test.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-center">
                            <div className="text-center p-6 border-4 border-primary rounded-full aspect-square flex flex-col justify-center items-center">
                                <p className="text-sm text-muted-foreground">PUAN</p>
                                <p className="text-6xl font-bold text-primary">{(test.score || 0).toFixed(1)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <Card className="p-4 bg-green-500/10"><CardTitle className="flex items-center justify-center gap-2"><Check className="text-green-600"/> Doğru</CardTitle><p className="text-2xl font-bold text-green-600">{test.correctAnswers}</p></Card>
                             <Card className="p-4 bg-red-500/10"><CardTitle className="flex items-center justify-center gap-2"><X className="text-red-600"/> Yanlış</CardTitle><p className="text-2xl font-bold text-red-600">{test.incorrectAnswers}</p></Card>
                             <Card className="p-4 bg-gray-500/10"><CardTitle className="flex items-center justify-center gap-2"><MinusCircle className="text-gray-600"/> Boş</CardTitle><p className="text-2xl font-bold text-gray-600">{test.emptyAnswers}</p></Card>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Soru Analizi</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {(test.questions || []).map(q => {
                            const qNumStr = q.questionNumber.toString();
                            const studentAns = studentAnswers[qNumStr];
                            const correctAns = answerKey[qNumStr];
                            const isCorrect = studentAns === correctAns;
                            const isIncorrect = studentAns !== null && studentAns !== undefined && studentAns !== correctAns;

                            let statusIcon;
                            if (isCorrect) statusIcon = <CheckCircle className="h-6 w-6 text-green-500"/>
                            else if (isIncorrect) statusIcon = <XCircle className="h-6 w-6 text-red-500"/>
                            else statusIcon = <MinusCircle className="h-6 w-6 text-gray-500"/>;

                            return (
                                <div key={q.questionNumber} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold">Soru {q.questionNumber}</h4>
                                        {statusIcon}
                                    </div>
                                    {q.imageUrl && <Image src={q.imageUrl} alt={`Soru ${q.questionNumber}`} width={600} height={400} className="rounded-md border object-contain w-full" data-ai-hint="question paper" />}
                                    <div className="flex gap-4 mt-4">
                                        <p>Senin Cevabın: <Badge variant={isCorrect ? 'default' : isIncorrect ? 'destructive' : 'secondary'}>{studentAns || 'Boş'}</Badge></p>
                                        <p>Doğru Cevap: <Badge variant="default" className="bg-green-600">{correctAns}</Badge></p>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (test.status === 'Değerlendirme Bekliyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.answerKey || {};

        return (
             <div className="container mx-auto py-8 space-y-6">
                <header className="mb-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                    </Button>
                </header>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{test.title} - Manuel Değerlendirme</CardTitle>
                        <CardDescription>Öğrenci cevaplarını kontrol edin ve doğruluğunu onaylayın.</CardDescription>
                    </CardHeader>
                </Card>

                <div className="space-y-4">
                    {(test.questions || []).map(q => {
                        const qNumStr = q.questionNumber.toString();
                        const studentAns = studentAnswers[qNumStr] || null;
                        const correctAns = answerKey[qNumStr] || '-';
                        const evalStatus = manualEvaluations[qNumStr];
                        
                        return (
                             <Card key={q.questionNumber} className="p-4">
                                <CardTitle className="mb-4">Soru {q.questionNumber}</CardTitle>
                                {q.imageUrl && <Image src={q.imageUrl} alt={`Soru ${q.questionNumber}`} width={600} height={400} className="rounded-md border object-contain w-full" data-ai-hint="question paper" />}
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                                    <div className="flex gap-4 text-lg">
                                        <p>Öğrenci Cevabı: <Badge className="text-lg" variant={evalStatus === 'correct' ? 'default' : evalStatus === 'incorrect' ? 'destructive' : 'secondary'}>{studentAns || 'BOŞ'}</Badge></p>
                                        <p>Doğru Cevap: <Badge className="text-lg" variant="default" className="bg-green-600">{correctAns}</Badge></p>
                                    </div>
                                     <div className="flex gap-2">
                                        <Button size="sm" variant={evalStatus === 'correct' ? 'default' : 'outline'} onClick={() => setManualEvaluations(prev => ({...prev, [qNumStr]: 'correct'}))}><Check className="mr-2 h-4 w-4"/>Doğru</Button>
                                        <Button size="sm" variant={evalStatus === 'incorrect' ? 'destructive' : 'outline'} onClick={() => setManualEvaluations(prev => ({...prev, [qNumStr]: 'incorrect'}))}><X className="mr-2 h-4 w-4"/>Yanlış</Button>
                                        <Button size="sm" variant={evalStatus === 'empty' ? 'secondary' : 'outline'} onClick={() => setManualEvaluations(prev => ({...prev, [qNumStr]: 'empty'}))}><MinusCircle className="mr-2 h-4 w-4"/>Boş</Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
                 <Button onClick={handleSaveManualEvaluation} className="w-full" size="lg">Değerlendirmeyi Tamamla ve Kaydet</Button>
            </div>
        )
    }

    const handleMcqAnswerChange = (questionNumber: number, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const answeredQuestions = Object.values(mcqAnswers).filter(a => a !== null).length

    const hasImages = test.questions && test.questions.length > 0;
    
    const currentQuestionNumber = currentQuestionIndex + 1;
    const currentQuestion = hasImages ? test.questions?.find(q => q.questionNumber === currentQuestionNumber) : null;
    const timePercentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

    return (
        <div className="container mx-auto py-8">
            <header className="mb-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </header>
            
            <Card className="mb-8 overflow-hidden">
                <CardContent className="p-6 text-center bg-muted/30 flex items-center justify-center gap-4">
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">KALAN SÜRE</p>
                        <p className={cn(`text-5xl font-bold tracking-tighter`, timeLeft < totalTime * 0.2 ? 'text-destructive' : 'text-foreground')}>
                            <Clock className="inline-block h-10 w-10 mr-2 align-text-bottom"/> {formatTime(timeLeft)}
                        </p>
                    </div>
                    {test.status === 'Atandı' && (
                         <Button variant="outline" size="icon" className="w-14 h-14 rounded-full" onClick={handlePauseToggle}>
                            {isPaused ? <Play className="h-6 w-6"/> : <Pause className="h-6 w-6"/>}
                         </Button>
                    )}
                </CardContent>
                <Progress value={timePercentage} className="h-2 rounded-t-none" indicatorClassName={cn(timeLeft < totalTime * 0.2 ? 'bg-destructive' : 'bg-green-500')}/>
            </Card>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{test.title}</CardTitle>
                            <CardDescription>{test.subject} - Soru {currentQuestionNumber} / {test.questionCount}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {hasImages && currentQuestion?.imageUrl && (
                                <Image src={currentQuestion.imageUrl} alt={`Soru ${currentQuestionNumber}`} width={800} height={600} className="rounded-lg border object-contain w-full" data-ai-hint="question paper" />
                            )}

                             <div className="flex items-start sm:items-center gap-4 p-3 rounded-lg border mt-4">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{currentQuestionNumber}</div>
                                <RadioGroup value={mcqAnswers[currentQuestionNumber] || ""} onValueChange={(value) => handleMcqAnswerChange(currentQuestionNumber, value)} className="flex flex-wrap gap-4">
                                    {['A', 'B', 'C', 'D'].map(option => (
                                        <div key={option}><RadioGroupItem value={option} id={`q${currentQuestionNumber}-${option}`} className="sr-only" /><Label htmlFor={`q${currentQuestionNumber}-${option}`} className={cn("flex items-center justify-center w-16 h-16 text-2xl font-bold rounded-lg border-2 cursor-pointer transition-colors", "hover:bg-accent hover:text-accent-foreground", mcqAnswers[currentQuestionNumber] === option ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input")}>{option}</Label></div>
                                    ))}
                                </RadioGroup>
                             </div>
                        </CardContent>
                         <CardContent className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={() => setCurrentQuestionIndex(q => q - 1)} disabled={currentQuestionIndex === 0}><ArrowLeft className="mr-2 h-4 w-4"/> Önceki Soru</Button>
                            <Button onClick={() => setCurrentQuestionIndex(q => q + 1)} disabled={currentQuestionIndex === test.questionCount - 1}>Sonraki Soru <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardContent>
                    </Card>
                </div>
                <aside className="lg:sticky top-8 self-start">
                     <Card>
                        <CardHeader className="text-center"><CardTitle>Test Bilgisi</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-center">
                                <p className="text-muted-foreground">İşaretlenen Soru</p>
                                <p className="text-4xl font-bold text-foreground"><CheckCircle className="inline-block h-8 w-8 mr-2 text-green-500 align-text-bottom"/>{answeredQuestions} / {test.questionCount}</p>
                            </div>
                           <AlertDialog>
                            <AlertDialogTrigger asChild><Button className="w-full" size="lg" disabled={timeLeft <= 0 || test.status !== 'Atandı'}>Testi Bitir</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Testi bitirmek istediğine emin misin?</AlertDialogTitle><AlertDialogDescription>Testi bitirdikten sonra cevaplarını değiştiremezsin. Sonuçların kaydedilecek.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleSubmit(false)}>Onayla ve Bitir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </aside>
            </main>
        </div>
    )
}
