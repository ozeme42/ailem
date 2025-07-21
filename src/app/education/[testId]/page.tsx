
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuestionBank, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type McqAnswers = { [key: number]: string | null };
type TextAnswers = { [key: number]: string };

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

    React.useEffect(() => {
        if (!testId) return;
        const storedTests: TestType[] = JSON.parse(localStorage.getItem('tests') || '[]');
        const currentTest = storedTests.find((t: TestType) => t.id === testId);
        setTest(currentTest);

        if (currentTest) {
             setTimeLeft(currentTest.questionCount * 1.5 * 60);
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

    const handleMcqAnswerChange = (questionNumber: number, value: string) => {
        setMcqAnswers(prev => ({ ...prev, [questionNumber]: value }));
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        setTextAnswers(prev => ({ ...prev, [questionNumber]: value }));
        setDirtyTextAnswers(prev => new Set(prev.add(questionNumber)));
    };
    
    const handleSaveSingleAnswer = (questionNumber: number) => {
        try {
            const storedTests: TestType[] = JSON.parse(localStorage.getItem('tests') || '[]');
            const testIndex = storedTests.findIndex((t: any) => t.id === test.id);
            if(testIndex > -1) {
                const updatedAnswers = { ...storedTests[testIndex].studentTextAnswers, [questionNumber]: textAnswers[questionNumber] };
                storedTests[testIndex].studentTextAnswers = updatedAnswers;
                localStorage.setItem('tests', JSON.stringify(storedTests));
                toast({
                    title: `✅ ${questionNumber}. Soru Kaydedildi!`,
                    description: "Cevabın başarıyla kaydedildi.",
                });
                setDirtyTextAnswers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(questionNumber);
                    return newSet;
                });
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "❌ Kaydetme Hatası!",
                description: "Cevabın kaydedilirken bir sorun oluştu.",
            });
        }
    };


    const handleSubmit = () => {
        try {
            const storedTests: TestType[] = JSON.parse(localStorage.getItem('tests') || '[]');
            const testIndex = storedTests.findIndex((t: any) => t.id === test.id);
            
            if (testIndex > -1) {
                const currentTest = storedTests[testIndex];

                if(currentTest.gradingType === 'auto') {
                    currentTest.studentAnswers = mcqAnswers;
                    let answerKey: { [key: number]: string } | undefined = undefined;
                    
                    if (currentTest.sourceType === 'bank' && currentTest.sourceId && currentTest.topicId) {
                        const storedBanks: QuestionBank[] = JSON.parse(localStorage.getItem('questionBanks') || '[]');
                        const bank = storedBanks.find(b => b.id === currentTest.sourceId);
                        const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id.toString() === currentTest.topicId);
                        answerKey = topic?.answerKey;
                    } else if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                        const storedExams: PracticeExam[] = JSON.parse(localStorage.getItem('practiceExams') || '[]');
                        const exam = storedExams.find(e => e.id === currentTest.sourceId);
                        answerKey = exam?.answerKey;
                    } else if (currentTest.sourceType === 'quick') {
                        answerKey = currentTest.answerKey;
                    }

                    if (answerKey && Object.keys(answerKey).length > 0) {
                        let correct = 0;
                        let incorrect = 0;
                        let empty = 0;

                        for (let i = 1; i <= currentTest.questionCount; i++) {
                            if (!mcqAnswers[i]) {
                                empty++;
                            } else if (mcqAnswers[i] === (answerKey as any)[i]) {
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
                         // Fallback for auto grading without answer key, should be rare
                        currentTest.status = 'Çözüldü';
                    }
                    
                } else { // Manual grading (text or no-answer)
                    if (currentTest.gradingType === 'manual-text') {
                        currentTest.studentTextAnswers = textAnswers;
                    }
                    currentTest.status = 'Çözüldü';
                    currentTest.correctAnswers = undefined;
                    currentTest.incorrectAnswers = undefined;
                    currentTest.emptyAnswers = undefined;
                    currentTest.score = undefined;
                }
                
                storedTests[testIndex] = currentTest;
                localStorage.setItem('tests', JSON.stringify(storedTests));
                 toast({
                    title: "✅ Test Tamamlandı!",
                    description: currentTest.gradingType === 'auto' ? "Cevapların başarıyla kaydedildi ve testin değerlendirildi." : "Cevapların başarıyla kaydedildi. Testin yakında değerlendirilecek.",
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

    const answeredQuestions = test.gradingType === 'auto'
        ? Object.values(mcqAnswers).filter(a => a !== null).length
        : (test.gradingType === 'manual-text' ? Object.values(textAnswers).filter(a => a.trim() !== "").length : 0);

    const isInteractive = test.gradingType === 'auto' || test.gradingType === 'manual-text';

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
                                {Array.from({ length: test.questionCount }, (_, i) => i + 1).map(questionNumber => (
                                    <div key={questionNumber} className="flex items-start sm:items-center gap-4 p-3 rounded-lg border">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{questionNumber}</div>
                                        {test.gradingType === 'auto' ? (
                                            <RadioGroup 
                                                defaultValue={mcqAnswers[questionNumber] || ""}
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

    