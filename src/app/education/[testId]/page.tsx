
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuestionBank, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight, Play, Pause, Check, X, MinusCircle } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Image from "next/image";

type McqAnswers = { [key: string]: string | null };
type TextAnswers = { [key: string]: string };

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<TestType | null | undefined>(undefined);
    const [mcqAnswers, setMcqAnswers] = React.useState<McqAnswers>({});
    const [textAnswers, setTextAnswers] = React.useState<TextAnswers>({});
    const [timeLeft, setTimeLeft] = React.useState(0);
    const [totalTime, setTotalTime] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);
    const [dirtyTextAnswers, setDirtyTextAnswers] = React.useState<Set<string>>(new Set());
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [mistakePoolQuestions, setMistakePoolQuestions] = React.useState<any[]>([]);

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test) return;

        // Stop the timer and save final time
        setIsPaused(true);
        const timeSpent = (test.timeSpentSeconds || 0) + (totalTime - timeLeft);

        try {
            let updatedData: Partial<TestType> = {
                timerStatus: 'finished',
                timeSpentSeconds: timeSpent
            };
            
            const gradingType = test.gradingType || 'manual';
            
            // If the test is NOT auto-graded, its status MUST become 'Değerlendirme Bekliyor'
            if (gradingType !== 'auto') {
                updatedData.status = 'Değerlendirme Bekliyor'; 
                if (test.sourceType === 'mistake') {
                    // For mistake pool tests, answers are saved differently
                    const mistakeAnswers: { [mistakeId: string]: string } = {};
                     mistakePoolQuestions.forEach(q => {
                        mistakeAnswers[q.id] = textAnswers[q.id] || "";
                    });
                    updatedData.studentTextAnswers = mistakeAnswers;
                } else if (gradingType === 'manual-text') {
                    updatedData.studentTextAnswers = textAnswers;
                } else { // For mcq with manual grading
                    updatedData.studentAnswers = mcqAnswers;
                }
                toast({
                    title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!",
                    description: "Cevapların kaydedildi. Testin yakında değerlendirilecek.",
                });
            } else { // This block ONLY runs if gradingType is 'auto'
                updatedData.studentAnswers = mcqAnswers;
                let answerKey: { [key: string]: string } | undefined = undefined;

                if (test.sourceType === 'bank' && test.sourceId && test.topicId) {
                    const bankDoc = await getDoc(doc(db, 'questionBanks', test.sourceId));
                    if (bankDoc.exists()) {
                        const bank = bankDoc.data() as QuestionBank;
                        const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id.toString() === test.topicId);
                        answerKey = topic?.answerKey;
                    }
                } else if (test.sourceType === 'exam' && test.sourceId) {
                    const examDoc = await getDoc(doc(db, 'practiceExams', test.sourceId));
                    if (examDoc.exists()) {
                        const exam = examDoc.data() as PracticeExam;
                        answerKey = exam?.answerKey;
                    }
                } else if (test.sourceType === 'quick') {
                    answerKey = test.answerKey;
                }

                if (answerKey && Object.keys(answerKey).length > 0) {
                    let correct = 0;
                    let incorrect = 0;
                    let empty = 0;

                    for (let i = 1; i <= test.questionCount; i++) {
                        if (!mcqAnswers[i] || mcqAnswers[i] === null) {
                            empty++;
                        } else if (mcqAnswers[i] === (answerKey as any)[i]) {
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
                    toast({
                        title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı ve Değerlendirildi!",
                        description: "Cevapların başarıyla kaydedildi ve testin anında değerlendirildi.",
                    });

                    // Award badges only after auto-grading is complete
                    if (test.familyId && test.studentId) {
                         await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
                    }
                } else {
                    // Answer key not found for an 'auto' test, mark as 'Değerlendirme Bekliyor' for manual check
                    updatedData.status = 'Değerlendirme Bekliyor';
                    toast({
                        title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!",
                        description: "Cevapların kaydedildi ama cevap anahtarı bulunamadı. Testin yakında manuel olarak değerlendirilecek.",
                    });
                }
            }
            
            await updateTest(test.id, updatedData);
            router.push('/education');

        } catch (error) {
            console.error("Error saving test results:", error);
            toast({
                variant: "destructive",
                title: "❌ Hata!",
                description: "Test sonuçları kaydedilirken bir sorun oluştu.",
            });
        }
    }, [test, mcqAnswers, textAnswers, router, toast, totalTime, timeLeft, mistakePoolQuestions]);
    
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

    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubscribe = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                setTest(currentTest);

                if (currentTest) {
                     const totalDuration = currentTest.questionCount * 90;
                     const timeAlreadySpent = currentTest.timeSpentSeconds || 0;
                     
                     setTotalTime(totalDuration);
                     setTimeLeft(totalDuration - timeAlreadySpent);
                     setIsPaused(currentTest.timerStatus === 'paused' || currentTest.status !== 'Atandı');

                     const type = currentTest.gradingType || 'manual';
                     if(type === 'auto') {
                        const initialAnswers: McqAnswers = currentTest.studentAnswers || {};
                        for (let i = 1; i <= currentTest.questionCount; i++) {
                            if(!initialAnswers[i]) initialAnswers[i] = null;
                        }
                        setMcqAnswers(initialAnswers);
                     } else if (type === 'manual-text') {
                        const initialAnswers: TextAnswers = currentTest.studentTextAnswers || {};
                         for (let i = 1; i <= currentTest.questionCount; i++) {
                            if(!initialAnswers[i]) initialAnswers[i] = "";
                        }
                        setTextAnswers(initialAnswers);
                     }
                }
                
                // If it's a mistake pool test, fetch the questions
                if (currentTest.sourceType === 'mistake' && currentTest.mistakeIds) {
                    const mistakeDocs = await Promise.all(currentTest.mistakeIds.map(id => getDoc(doc(db, 'mistakes', id))));
                    const mistakes = mistakeDocs.map(d => ({ id: d.id, ...d.data() }));
                    setMistakePoolQuestions(mistakes);
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

    if (test.status === 'Sonuçlandı') {
        return (
            <div className="container mx-auto py-8">
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
                            <Card className="p-4 bg-green-500/10">
                                <CardTitle className="flex items-center justify-center gap-2"><Check className="text-green-600"/> Doğru</CardTitle>
                                <p className="text-2xl font-bold text-green-600">{test.correctAnswers}</p>
                            </Card>
                            <Card className="p-4 bg-red-500/10">
                                <CardTitle className="flex items-center justify-center gap-2"><X className="text-red-600"/> Yanlış</CardTitle>
                                <p className="text-2xl font-bold text-red-600">{test.incorrectAnswers}</p>
                            </Card>
                             <Card className="p-4 bg-gray-500/10">
                                <CardTitle className="flex items-center justify-center gap-2"><MinusCircle className="text-gray-600"/> Boş</CardTitle>
                                <p className="text-2xl font-bold text-gray-600">{test.emptyAnswers}</p>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Test is 'Atandı' or 'Değerlendirme Bekliyor', so show the test-taking UI
    const handleMcqAnswerChange = (questionNumber: number, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const handleTextAnswerChange = (questionIdentifier: string, value: string) => {
        setTextAnswers(prev => ({ ...prev, [questionIdentifier]: value }));
        setDirtyTextAnswers(prev => new Set(prev.add(questionIdentifier)));
    };
    
    const handleSaveSingleAnswer = async (questionIdentifier: string) => {
        try {
            await updateTest(test.id, { studentTextAnswers: textAnswers });
            toast({
                title: `✅ Cevap Kaydedildi!`,
                description: "Cevabın başarıyla kaydedildi.",
            });
            setDirtyTextAnswers(prev => {
                const newSet = new Set(prev);
                newSet.delete(questionIdentifier);
                return newSet;
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "❌ Kaydetme Hatası!",
                description: "Cevabın kaydedilirken bir sorun oluştu.",
            });
        }
    };

    const answeredQuestions = test.gradingType === 'auto'
        ? Object.values(mcqAnswers).filter(a => a !== null).length
        : Object.values(textAnswers).filter(a => a.trim() !== "").length;

    const isInteractive = test.gradingType === 'auto' || test.gradingType === 'manual-text' || test.sourceType === 'mistake';
    const isMistakePoolTest = test.sourceType === 'mistake';
    const currentQuestionNumber = currentQuestionIndex + 1;
    
    const currentMistakeQuestion = isMistakePoolTest ? mistakePoolQuestions[currentQuestionIndex] : null;


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
                            <Clock className="inline-block h-10 w-10 mr-2 align-text-bottom"/> 
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                    {test.status === 'Atandı' && (
                         <Button variant="outline" size="icon" className="w-14 h-14 rounded-full" onClick={handlePauseToggle}>
                            {isPaused ? <Play className="h-6 w-6"/> : <Pause className="h-6 w-6"/>}
                         </Button>
                    )}
                </CardContent>
                <Progress 
                    value={timePercentage} 
                    className="h-2 rounded-t-none"
                    indicatorClassName={cn(timeLeft < totalTime * 0.2 ? 'bg-destructive' : 'bg-green-500')}
                />
            </Card>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{test.title}</CardTitle>
                            <CardDescription>{test.subject} - Soru {currentQuestionNumber} / {test.questionCount}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isMistakePoolTest ? (
                                currentMistakeQuestion && (
                                    <div className="space-y-4">
                                        <Image src={currentMistakeQuestion.imageUrl} alt={`Soru ${currentQuestionNumber}`} width={800} height={600} className="rounded-lg border object-contain w-full" data-ai-hint="question paper" />
                                        <div className="flex-grow flex items-center gap-2">
                                            <Input
                                                placeholder="Cevabınızı buraya yazın..."
                                                value={textAnswers[currentMistakeQuestion.id] || ""}
                                                onChange={(e) => handleTextAnswerChange(currentMistakeQuestion.id, e.target.value)}
                                                className="flex-grow"
                                            />
                                        </div>
                                    </div>
                                )
                            ) : test.gradingType === 'auto' ? (
                                 <div className="flex items-start sm:items-center gap-4 p-3 rounded-lg border">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{currentQuestionNumber}</div>
                                    <RadioGroup
                                        value={mcqAnswers[currentQuestionNumber] || ""}
                                        onValueChange={(value) => handleMcqAnswerChange(currentQuestionNumber, value)}
                                        className="flex flex-wrap gap-4"
                                    >
                                        {['A', 'B', 'C'].map(option => (
                                            <div key={option}>
                                                <RadioGroupItem value={option} id={`q${currentQuestionNumber}-${option}`} className="sr-only" />
                                                <Label
                                                    htmlFor={`q${currentQuestionNumber}-${option}`}
                                                    className={cn(
                                                        "flex items-center justify-center w-16 h-16 text-2xl font-bold rounded-lg border-2 cursor-pointer transition-colors",
                                                        "hover:bg-accent hover:text-accent-foreground",
                                                        mcqAnswers[currentQuestionNumber] === option
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-transparent border-input"
                                                    )}
                                                >
                                                    {option}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                 </div>
                            ) : test.gradingType === 'manual-text' ? (
                                <div className="flex items-start sm:items-center gap-4 p-3 rounded-lg border">
                                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{currentQuestionNumber}</div>
                                   <div className="flex-grow flex items-center gap-2">
                                        <Input
                                            placeholder="Cevabınızı buraya yazın..."
                                            value={textAnswers[currentQuestionNumber] || ""}
                                            onChange={(e) => handleTextAnswerChange(currentQuestionNumber.toString(), e.target.value)}
                                            className="flex-grow"
                                        />
                                        <Button 
                                            size="icon" 
                                            variant="ghost"
                                            onClick={() => handleSaveSingleAnswer(currentQuestionNumber.toString())}
                                            disabled={!dirtyTextAnswers.has(currentQuestionNumber.toString())}
                                            aria-label="Cevabı Kaydet"
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground p-3">Bu test için cevap girişi gerekmiyor. Sınav sonunda "Testi Bitir" butonuna tıklamanız yeterlidir.</p>
                            )}
                        </CardContent>
                         <CardContent className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={() => setCurrentQuestionIndex(q => q - 1)} disabled={currentQuestionIndex === 0}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Önceki Soru
                            </Button>
                             <Button onClick={() => setCurrentQuestionIndex(q => q + 1)} disabled={currentQuestionIndex === test.questionCount - 1}>
                                Sonraki Soru <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <aside className="lg:sticky top-8 self-start">
                     <Card>
                        <CardHeader className="text-center">
                            <CardTitle>Test Bilgisi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {isInteractive && (
                                <div className="text-center">
                                    <p className="text-muted-foreground">
                                        {test.gradingType === 'auto' ? 'İşaretlenen Soru' : 'Cevaplanan Soru'}
                                    </p>
                                    <p className="text-4xl font-bold text-foreground">
                                    <CheckCircle className="inline-block h-8 w-8 mr-2 text-green-500 align-text-bottom"/>
                                    {answeredQuestions} / {test.questionCount}
                                </p>
                                </div>
                           )}
                           
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full" size="lg" disabled={timeLeft <= 0 || test.status !== 'Atandı'}>
                                    Testi Bitir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Testi bitirmek istediğine emin misin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Testi bitirdikten sonra cevaplarını değiştiremezsin. Sonuçların kaydedilecek.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSubmit(false)}>Onayla ve Bitir</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </aside>
            </main>
        </div>
    )
}
