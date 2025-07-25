
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuestionBank, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { updateTest } from "@/lib/dataService";

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
    const [dirtyTextAnswers, setDirtyTextAnswers] = React.useState<Set<number>>(new Set());
    const [currentQuestion, setCurrentQuestion] = React.useState(1);

    const handleSubmit = React.useCallback(async () => {
        if (!test) return;
        try {
            let updatedData: Partial<TestType> = {};

            if (test.gradingType === 'auto') {
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
                        if (!mcqAnswers[i]) {
                            empty++;
                        } else if (mcqAnswers[i] === (answerKey as any)[i]) {
                            correct++;
                        } else {
                            incorrect++;
                        }
                    }

                    updatedData.status = 'Değerlendirildi';
                    updatedData.correctAnswers = correct;
                    updatedData.incorrectAnswers = incorrect;
                    updatedData.emptyAnswers = empty;
                    updatedData.score = (correct / test.questionCount) * 100;
                    toast({
                        title: "✅ Test Tamamlandı ve Değerlendirildi!",
                        description: "Cevapların başarıyla kaydedildi ve testin anında değerlendirildi.",
                    });
                } else {
                    updatedData.status = 'Çözüldü';
                    toast({
                        title: "✅ Test Tamamlandı!",
                        description: "Cevapların başarıyla kaydedildi. Testin yakında değerlendirilecek.",
                    });
                }
            } else { // Manual grading (text or no-answer)
                updatedData.status = 'Çözüldü';
                if (test.gradingType === 'manual-text') {
                    updatedData.studentTextAnswers = textAnswers;
                }
                 toast({
                    title: "✅ Test Tamamlandı!",
                    description: "Cevapların başarıyla kaydedildi. Testin yakında değerlendirilecek.",
                });
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
    }, [test, mcqAnswers, textAnswers, router, toast]);

    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubscribe = onSnapshot(testDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                setTest(currentTest);

                if (currentTest) {
                     setTimeLeft(currentTest.questionCount * 90);
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
            } else {
                setTest(null);
            }
        });

        return () => unsubscribe();
    }, [testId]);


    React.useEffect(() => {
        if (!test || test.status !== 'Atandı') return;
        
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        };

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, test, handleSubmit]);

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

    const handleMcqAnswerChange = (questionNumber: number, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        setTextAnswers(prev => ({ ...prev, [questionNumber]: value }));
        setDirtyTextAnswers(prev => new Set(prev.add(questionNumber)));
    };
    
    const handleSaveSingleAnswer = async (questionNumber: number) => {
        try {
            await updateTest(test.id, { studentTextAnswers: textAnswers });
            toast({
                title: `✅ ${questionNumber}. Soru Kaydedildi!`,
                description: "Cevabın başarıyla kaydedildi.",
            });
            setDirtyTextAnswers(prev => {
                const newSet = new Set(prev);
                newSet.delete(questionNumber);
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
        : (test.gradingType === 'manual-text' ? Object.values(textAnswers).filter(a => a.trim() !== "").length : 0);

    const isInteractive = test.gradingType === 'auto' || test.gradingType === 'manual-text';
    
    const questionNumber = currentQuestion;

    return (
        <div className="container mx-auto py-8">
            <header className="mb-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </header>
            
            <Card className="mb-8 bg-muted/30">
                <CardContent className="p-4 flex justify-center items-center">
                    <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">KALAN SÜRE</p>
                        <p className={`text-5xl font-bold tracking-tighter ${timeLeft < 300 ? 'text-destructive' : 'text-foreground'}`}>
                            <Clock className="inline-block h-10 w-10 mr-2 align-text-bottom"/> 
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{test.title}</CardTitle>
                            <CardDescription>{test.subject} - Soru {currentQuestion} / {test.questionCount}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-start sm:items-center gap-4 p-3 rounded-lg border">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{questionNumber}</div>
                                {test.gradingType === 'auto' ? (
                                    <RadioGroup 
                                        value={mcqAnswers[questionNumber] || ""}
                                        onValueChange={(value) => handleMcqAnswerChange(questionNumber, value)}
                                        className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6"
                                    >
                                        {['A', 'B', 'C', 'D', 'E'].map(option => (
                                            <div key={option} className="flex items-center space-x-2">
                                                <RadioGroupItem value={option} id={`q${questionNumber}-${option}`} />
                                                <Label htmlFor={`q${questionNumber}-${option}`}>{option}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                ) : test.gradingType === 'manual-text' ? (
                                   <div className="flex-grow flex items-center gap-2">
                                        <Input
                                            placeholder="Cevabınızı buraya yazın..."
                                            value={textAnswers[questionNumber] || ""}
                                            onChange={(e) => handleTextAnswerChange(questionNumber, e.target.value)}
                                            className="flex-grow"
                                        />
                                        <Button 
                                            size="icon" 
                                            variant="ghost"
                                            onClick={() => handleSaveSingleAnswer(questionNumber)}
                                            disabled={!dirtyTextAnswers.has(questionNumber)}
                                            aria-label="Cevabı Kaydet"
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground flex-grow">Bu soru için cevap girişi gerekmiyor.</p>
                                )}
                            </div>
                        </CardContent>
                         <CardContent className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={() => setCurrentQuestion(q => q - 1)} disabled={currentQuestion === 1}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Önceki Soru
                            </Button>
                             <Button onClick={() => setCurrentQuestion(q => q + 1)} disabled={currentQuestion === test.questionCount}>
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
                                <AlertDialogAction onClick={handleSubmit}>Onayla ve Bitir</AlertDialogAction>
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

    