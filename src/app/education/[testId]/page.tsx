
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { tests, questionBanks, practiceExams } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Answers = { [key: number]: string | null };

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const testId = Number(params.testId);
    const test = tests.find(t => t.id === testId);

    const [answers, setAnswers] = React.useState<Answers>({});
    const [timeLeft, setTimeLeft] = React.useState( (test?.questionCount || 0) * 1.5 * 60); // Dakikayı saniyeye çevir

    React.useEffect(() => {
        if (test) {
            const initialAnswers: Answers = {};
            for (let i = 1; i <= test.questionCount; i++) {
                initialAnswers[i] = null;
            }
            setAnswers(initialAnswers);
        }
    }, [test]);

    React.useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        };

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
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

    const handleAnswerChange = (questionNumber: number, value: string) => {
        setAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };
    
    const handleSubmit = () => {
        // In a real app, you'd send this to a server. Here, we'll use localStorage.
        try {
            const storedTests = JSON.parse(localStorage.getItem('tests') || JSON.stringify(tests));
            const testIndex = storedTests.findIndex((t: any) => t.id === test.id);
            
            if (testIndex > -1) {
                const currentTest = storedTests[testIndex];
                currentTest.studentAnswers = answers;
                
                // Automatic grading logic would go here.
                // For demonstration, we'll find the source and its answer key.
                let answerKey: { [key: number]: string } = {};

                if (currentTest.sourceType === 'bank' && currentTest.sourceId && currentTest.topicId) {
                    const bank = questionBanks.find(b => b.id === currentTest.sourceId);
                    const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id === currentTest.topicId);
                    answerKey = topic?.answerKey || {};
                } else if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                    const exam = practiceExams.find(e => e.id === currentTest.sourceId);
                    // This is simplified. A real exam would have keys per subject.
                    answerKey = exam?.answerKey || {};
                }
                
                let correct = 0;
                let incorrect = 0;
                let empty = 0;

                for (let i = 1; i <= currentTest.questionCount; i++) {
                    if (!answers[i]) {
                        empty++;
                    } else if (answers[i] === answerKey[i]) {
                        correct++;
                    } else {
                        incorrect++;
                    }
                }
                
                currentTest.status = 'Değerlendirildi';
                currentTest.correctAnswers = correct;
                currentTest.incorrectAnswers = incorrect;
                currentTest.emptyAnswers = empty;
                currentTest.score = (correct / currentTest.questionCount) * 100;
                
                storedTests[testIndex] = currentTest;
                localStorage.setItem('tests', JSON.stringify(storedTests));
            }

            toast({
                title: "✅ Test Tamamlandı!",
                description: "Cevapların başarıyla kaydedildi ve testin değerlendirildi.",
            });
            router.push('/education');

        } catch (error) {
            console.error("Error saving test results:", error);
            toast({
                variant: "destructive",
                title: "❌ Hata!",
                description: "Test sonuçları kaydedilirken bir sorun oluştu.",
            });
        }
    }


    const answeredQuestions = Object.values(answers).filter(a => a !== null).length;

    return (
        <div className="container mx-auto py-8">
            <header className="mb-8">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{test.title}</CardTitle>
                            <CardDescription>{test.subject} - {test.questionCount} Soru</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {Object.keys(answers).map(questionNumber => (
                                    <div key={questionNumber} className="flex items-center gap-4 sm:gap-8 p-3 rounded-lg border">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">{questionNumber}</div>
                                        <RadioGroup 
                                            defaultValue={answers[Number(questionNumber)] || ""}
                                            onValueChange={(value) => handleAnswerChange(Number(questionNumber), value)}
                                            className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6"
                                        >
                                            {['A', 'B', 'C', 'D', 'E'].map(option => (
                                                <div key={option} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={option} id={`q${questionNumber}-${option}`} />
                                                    <Label htmlFor={`q${questionNumber}-${option}`}>{option}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <aside className="lg:sticky top-8 self-start">
                     <Card>
                        <CardHeader className="text-center">
                            <CardTitle>Test Bilgisi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="text-center">
                             <p className="text-muted-foreground">Kalan Süre</p>
                             <p className={`text-4xl font-bold ${timeLeft < 300 ? 'text-destructive' : 'text-foreground'}`}>
                                <Clock className="inline-block h-8 w-8 mr-2 align-text-bottom"/> 
                                {formatTime(timeLeft)}
                             </p>
                           </div>
                            <div className="text-center">
                             <p className="text-muted-foreground">İşaretlenen Soru</p>
                             <p className="text-4xl font-bold text-foreground">
                                <CheckCircle className="inline-block h-8 w-8 mr-2 text-green-500 align-text-bottom"/>
                                {answeredQuestions} / {test.questionCount}
                            </p>
                           </div>
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full" size="lg" disabled={timeLeft <= 0}>
                                    Testi Bitir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Testi bitirmek istediğine emin misin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Testi bitirdikten sonra cevaplarını değiştiremezsin. Boş bıraktığın sorular yanlış sayılacaktır.
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
