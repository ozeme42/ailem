
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { tests, questionBanks, practiceExams, Test as TestType, PracticeExam, QuestionBank } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, HelpCircle } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Answers = { [key: number]: string | null };

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const testId = Number(params.testId);

    const [test, setTest] = React.useState<TestType | null | undefined>(undefined);
    const [hasAnswerKey, setHasAnswerKey] = React.useState<boolean>(false);

    const [answers, setAnswers] = React.useState<Answers>({});
    const [timeLeft, setTimeLeft] = React.useState(0);

    React.useEffect(() => {
        const storedTests = JSON.parse(localStorage.getItem('tests') || '[]');
        const currentTest = storedTests.find((t: TestType) => t.id === testId);
        setTest(currentTest);

        if (currentTest) {
             setTimeLeft(currentTest.questionCount * 1.5 * 60);
             const initialAnswers: Answers = {};
             for (let i = 1; i <= currentTest.questionCount; i++) {
                 initialAnswers[i] = null;
             }
             setAnswers(initialAnswers);
             
             // Check for answer key
             let keyExists = false;
             if (currentTest.sourceType === 'bank' && currentTest.sourceId && currentTest.topicId) {
                const storedBanks: QuestionBank[] = JSON.parse(localStorage.getItem('questionBanks') || '[]');
                const bank = storedBanks.find(b => b.id === currentTest.sourceId);
                const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id === currentTest.topicId);
                if (topic?.answerKey && Object.keys(topic.answerKey).length > 0) {
                    keyExists = true;
                }
            } else if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                const storedExams: PracticeExam[] = JSON.parse(localStorage.getItem('practiceExams') || '[]');
                const exam = storedExams.find(e => e.id === currentTest.sourceId);
                if (exam?.answerKey && Object.keys(exam.answerKey).length > 0) {
                    keyExists = true;
                }
            } else if (currentTest.sourceType === 'quick') {
                if (currentTest.answerKey && Object.keys(currentTest.answerKey).length > 0) {
                    keyExists = true;
                }
            }
            setHasAnswerKey(keyExists);
        }
    }, [testId]);


    React.useEffect(() => {
        if (timeLeft <= 0 && test) {
            handleSubmit();
            return;
        };

        if (!test) return;

        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, test]);

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

    const handleAnswerChange = (questionNumber: number, value: string) => {
        setAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };
    
    const handleSubmit = () => {
        try {
            const storedTests: TestType[] = JSON.parse(localStorage.getItem('tests') || '[]');
            const testIndex = storedTests.findIndex((t: any) => t.id === test.id);
            
            if (testIndex > -1) {
                const currentTest = storedTests[testIndex];
                currentTest.studentAnswers = answers;

                let answerKey: { [key: number]: string } | undefined = undefined;
                
                if (hasAnswerKey) {
                    if (currentTest.sourceType === 'bank' && currentTest.sourceId && currentTest.topicId) {
                        const storedBanks: QuestionBank[] = JSON.parse(localStorage.getItem('questionBanks') || '[]');
                        const bank = storedBanks.find(b => b.id === currentTest.sourceId);
                        const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id === currentTest.topicId);
                        answerKey = topic?.answerKey;
                    } else if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                        const storedExams: PracticeExam[] = JSON.parse(localStorage.getItem('practiceExams') || '[]');
                        const exam = storedExams.find(e => e.id === currentTest.sourceId);
                        answerKey = exam?.answerKey;
                    } else if (currentTest.sourceType === 'quick') {
                        answerKey = currentTest.answerKey;
                    }
                }


                // If there's an answer key, grade the test. Otherwise, just mark as solved.
                if (answerKey && Object.keys(answerKey).length > 0) {
                    let correct = 0;
                    let incorrect = 0;
                    let empty = 0;

                    for (let i = 1; i <= currentTest.questionCount; i++) {
                        if (!answers[i]) {
                            empty++;
                        } else if (answers[i] === (answerKey as any)[i]) {
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
                } else {
                    currentTest.status = 'Çözüldü';
                    // No grading information if no answer key
                    currentTest.correctAnswers = undefined;
                    currentTest.incorrectAnswers = undefined;
                    currentTest.emptyAnswers = undefined;
                    currentTest.score = undefined;
                }
                
                storedTests[testIndex] = currentTest;
                localStorage.setItem('tests', JSON.stringify(storedTests));
                 toast({
                    title: "✅ Test Tamamlandı!",
                    description: answerKey ? "Cevapların başarıyla kaydedildi ve testin değerlendirildi." : "Cevapların başarıyla kaydedildi.",
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "❌ Hata!",
                    description: "Test veritabanında bulunamadı.",
                });
            }

           
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
                            {!hasAnswerKey && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg mt-2">
                                    <HelpCircle className="w-5 h-5"/>
                                    Bu test için cevap girişi gerekli değildir. "Testi Bitir" butonuna basarak tamamlayabilirsiniz.
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {Array.from({ length: test.questionCount }, (_, i) => i + 1).map(questionNumber => (
                                    <div key={questionNumber} className="flex items-center gap-4 sm:gap-8 p-3 rounded-lg border">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">{questionNumber}</div>
                                        {hasAnswerKey ? (
                                            <RadioGroup 
                                                defaultValue={answers[questionNumber] || ""}
                                                onValueChange={(value) => handleAnswerChange(questionNumber, value)}
                                                className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6"
                                            >
                                                {['A', 'B', 'C'].map(option => (
                                                    <div key={option} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={option} id={`q${questionNumber}-${option}`} />
                                                        <Label htmlFor={`q${questionNumber}-${option}`}>{option}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Cevap girişi gerekmiyor.</p>
                                        )}
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
                           {hasAnswerKey && (
                                <div className="text-center">
                                 <p className="text-muted-foreground">İşaretlenen Soru</p>
                                 <p className="text-4xl font-bold text-foreground">
                                    <CheckCircle className="inline-block h-8 w-8 mr-2 text-green-500 align-text-bottom"/>
                                    {answeredQuestions} / {test.questionCount}
                                </p>
                               </div>
                           )}
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
