
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, TrackedBookTest, BankQuestion } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight, Play, Pause, Check, X, MinusCircle, ListX, Sparkles, Loader2, UploadCloud, XCircle } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

type McqAnswers = { [key: string]: string | null };
type AnswerKey = { [key: string]: string };
type EvaluationStatus = "correct" | "incorrect" | "unevaluated" | "empty";
type ManualEvaluation = { [key: string]: EvaluationStatus };

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<TestType | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<McqAnswers>({});
    
    // State for manual evaluation
    const [manualEvaluations, setManualEvaluations] = React.useState<ManualEvaluation>({});
    
    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test) return;
        
        let allStudentMcqAnswers: McqAnswers = {};
        for (let i = 1; i <= test.questionCount; i++) {
            const qNumStr = i.toString();
            allStudentMcqAnswers[qNumStr] = mcqAnswers[qNumStr] || null;
        }

        try {
            let updatedData: Partial<TestType> = {
                timerStatus: 'finished',
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
    }, [test, mcqAnswers, toast]);
    

    React.useEffect(() => {
        if (!testId) {
            setIsLoading(false);
            return;
        };
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubscribe = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                setTest(currentTest);
                setMcqAnswers(currentTest.studentAnswers || {});

                if (currentTest.status === 'Değerlendirme Bekliyor') {
                    const initialEvals: ManualEvaluation = {};
                    for (let i = 1; i <= currentTest.questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = currentTest.studentAnswers?.[qNumStr];
                        const correctAns = currentTest.answerKey?.[qNumStr];

                        if (!studentAns) {
                            initialEvals[qNumStr] = 'empty';
                        } else if (correctAns && studentAns === correctAns) {
                            initialEvals[qNumStr] = 'correct';
                        } else if (correctAns && studentAns !== correctAns) {
                            initialEvals[qNumStr] = 'incorrect';
                        } else {
                            initialEvals[qNumStr] = 'unevaluated';
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
            setTest(null);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [testId]);

    const handleEvaluationChange = (questionNumber: string, status: EvaluationStatus) => {
        setManualEvaluations(prev => ({ ...prev, [questionNumber]: status }));
    };

    const handleFinalizeEvaluation = async () => {
        if (!test) return;

        let correct = 0;
        let incorrect = 0;
        let empty = 0;

        Object.values(manualEvaluations).forEach(status => {
            if (status === 'correct') correct++;
            else if (status === 'incorrect') incorrect++;
            else if (status === 'empty') empty++;
        });

        const unevaluatedCount = test.questionCount - (correct + incorrect + empty);
        if (unevaluatedCount > 0) {
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
            await updateTest(test.id, updatedData);
            toast({ title: "Değerlendirme Kaydedildi!", description: "Test sonuçları başarıyla güncellendi." });
             if (test.familyId && test.studentId) {
                await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            }
        } catch (error) {
             toast({ title: "Hata!", description: "Değerlendirme kaydedilirken bir hata oluştu.", variant: 'destructive'});
        }
    };


    if (isLoading) {
         return (
             <div className="flex flex-col items-center justify-center h-screen bg-background">
                <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
                <p>Test yükleniyor...</p>
            </div>
        );
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
                        {Array.from({ length: test.questionCount }).map((_, i) => {
                            const qNumStr = (i + 1).toString();
                            const studentAns = studentAnswers[qNumStr];
                            const correctAns = answerKey[qNumStr];
                            const isCorrect = studentAns === correctAns;
                            const isIncorrect = studentAns !== null && studentAns !== undefined && studentAns !== correctAns;

                            let statusIcon;
                            if (isCorrect) statusIcon = <CheckCircle className="h-6 w-6 text-green-500"/>
                            else if (isIncorrect) statusIcon = <XCircle className="h-6 w-6 text-red-500"/>
                            else statusIcon = <MinusCircle className="h-6 w-6 text-gray-500"/>;

                            return (
                                <div key={i} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold">Soru {qNumStr}</h4>
                                        {statusIcon}
                                    </div>
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
                        <CardDescription>{test.subject}</CardDescription>
                    </CardHeader>
                </Card>

                 <div className="space-y-4">
                    {Array.from({ length: test.questionCount }).map((_, i) => {
                        const qNumStr = (i + 1).toString();
                        const studentAns = test.studentAnswers?.[qNumStr];
                        const correctAns = test.answerKey?.[qNumStr];
                        const evalStatus = manualEvaluations[qNumStr];
                        const questionImage = test.questions?.find(q => q.questionNumber === i + 1)?.imageUrl;

                        return (
                            <Card key={qNumStr} className="p-4">
                                <h4 className="font-bold mb-2">Soru {qNumStr}</h4>
                                {questionImage && (
                                     <div className="mb-4 border rounded-md overflow-hidden">
                                        <Image src={questionImage} alt={`Soru ${qNumStr}`} width={800} height={400} className="w-full h-auto object-contain" data-ai-hint="question paper"/>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div>Öğrenci Cevabı: <Badge variant={evalStatus === 'correct' ? 'default' : evalStatus === 'incorrect' ? 'destructive' : 'secondary'}>{studentAns || 'BOŞ'}</Badge></div>
                                    <div>Doğru Cevap: <Badge variant="default" className="bg-green-600">{correctAns || 'Belirtilmemiş'}</Badge></div>
                                    <div className="flex gap-2 justify-self-end">
                                        <Button size="sm" variant={evalStatus === 'correct' ? 'default' : 'outline'} className="bg-green-100 text-green-800 data-[state=active]:bg-green-600" onClick={() => handleEvaluationChange(qNumStr, 'correct')}>Doğru</Button>
                                        <Button size="sm" variant={evalStatus === 'incorrect' ? 'destructive' : 'outline'} onClick={() => handleEvaluationChange(qNumStr, 'incorrect')}>Yanlış</Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
                <Button onClick={handleFinalizeEvaluation} size="lg" className="w-full">Değerlendirmeyi Tamamla ve Kaydet</Button>
            </div>
        )
    }

    const handleMcqAnswerChange = (questionNumber: number, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const answeredQuestions = Object.values(mcqAnswers).filter(a => a !== null).length

    return (
        <div className="container mx-auto py-8">
            <header className="mb-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </header>
            
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{test.title}</CardTitle>
                            <CardDescription>{test.subject}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                {Array.from({ length: test.questionCount }).map((_, i) => {
                                    const qNum = i + 1;
                                    return (
                                        <div key={qNum} className="flex items-start sm:items-center gap-4 p-3 rounded-lg border">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{qNum}</div>
                                            <RadioGroup value={mcqAnswers[qNum] || ""} onValueChange={(value) => handleMcqAnswerChange(qNum, value)} className="flex flex-wrap gap-4">
                                                {['A', 'B', 'C', 'D'].map(option => (
                                                    <div key={option}><RadioGroupItem value={option} id={`q${qNum}-${option}`} className="sr-only" /><Label htmlFor={`q${qNum}-${option}`} className={cn("flex items-center justify-center w-12 h-12 text-xl font-bold rounded-lg border-2 cursor-pointer transition-colors", "hover:bg-accent hover:text-accent-foreground", mcqAnswers[qNum] === option ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input")}>{option}</Label></div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    )
                                })}
                            </div>
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
                            <AlertDialogTrigger asChild><Button className="w-full" size="lg">Testi Bitir</Button></AlertDialogTrigger>
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
