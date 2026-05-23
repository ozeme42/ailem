
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuickTestQuestion, Mistake, JsonTestQuestion, PracticeExam } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, Save, ArrowRight, Play, Pause, Check, X, MinusCircle, ListX, Sparkles, Loader2, UploadCloud, XCircle, Expand, Shrink, Home, LayoutGrid, ChevronRight, BookOpen } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- DESIGN SYSTEM: Fixed Light Theme for Test Solving ---
const glassColors = {
    PAGE_BG: "bg-slate-50", 
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200",
    CARD_BG: "bg-white border border-slate-200 shadow-sm", 
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg text-white",
    BUTTON_GLASS: "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm",
    OPTION_BUTTON: "flex items-center justify-center w-12 h-12 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all duration-200 font-bold text-lg text-slate-600 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 peer-data-[state=checked]:bg-indigo-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:scale-110",
    INPUT_BG: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500",
};

type McqAnswers = { [key: string]: string | null };
type TextAnswers = { [key: string]: string };
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
    practiceExam 
}: { 
    total: number; 
    currentIndex: number; 
    onNavigate: (index: number) => void;
    isAnswered: (index: number) => boolean;
    practiceExam?: PracticeExam | null;
}) => {
    // If it's a practice exam, we group by subjects in the palette too
    if (practiceExam && practiceExam.subjects) {
        let currentOffset = 0;
        return (
            <div className="space-y-4 p-4">
                {practiceExam.subjects.map(subject => {
                    const rangeStart = currentOffset;
                    const rangeEnd = currentOffset + subject.questionCount;
                    currentOffset += subject.questionCount;
                    
                    return (
                        <div key={subject.id} className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{subject.name}</p>
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: subject.questionCount }).map((_, i) => {
                                    const actualIndex = rangeStart + i;
                                    const answered = isAnswered(actualIndex);
                                    const active = currentIndex === actualIndex;
                                    
                                    return (
                                        <Button
                                            key={actualIndex}
                                            variant={active ? "default" : answered ? "secondary" : "outline"}
                                            className={cn(
                                                "h-8 w-8 p-0 font-bold rounded-lg text-xs transition-all",
                                                active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                                                answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                            )}
                                            onClick={() => onNavigate(actualIndex)}
                                        >
                                            {actualIndex + 1}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-5 gap-2 p-4">
            {Array.from({ length: total }).map((_, i) => {
                const answered = isAnswered(i);
                const active = currentIndex === i;
                
                return (
                    <Button
                        key={i}
                        variant={active ? "default" : answered ? "secondary" : "outline"}
                        className={cn(
                            "h-10 w-10 p-0 font-bold rounded-lg text-xs transition-all",
                            active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                            answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                        )}
                        onClick={() => onNavigate(i)}
                    >
                        {i + 1}
                    </Button>
                );
            })}
        </div>
    );
};

export default function OpticalFormPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useAuth();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<TestType | null>(null);
    const [practiceExam, setPracticeExam] = React.useState<PracticeExam | null>(null);
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
                        
                        if (!studentAns || studentAns === null) {
                            empty++;
                        } else if (studentAns === (answerKey as any)[qNumStr]) {
                            correct++;
                        } else {
                            incorrect++;
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
                    className: "bg-emerald-600 border-none text-white"
                });
                if (test.familyId && test.studentId) {
                     await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
                }
            } else {
                 toast({
                    title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!",
                    description: "Cevapların kaydedildi. Testin yakında değerlendirilecek.",
                    className: "bg-indigo-600 border-none text-white"
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
                
                if ((currentTest.sourceType === 'quick' || currentTest.sourceType === 'bank' || currentTest.sourceType === 'mistake') && (!currentTest.questions || currentTest.questions.length === 0)) {
                  const questionsColRef = collection(db, 'tests', testId, 'questions');
                  const questionsQuery = query(questionsColRef, orderBy("questionNumber"));
                  const questionsSnap = await getDocs(questionsQuery);
                  currentTest.questions = questionsSnap.docs.map(d => d.data() as QuickTestQuestion);
                }

                // If it's an exam, fetch the original practice exam template to get subject metadata
                if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                    const examDoc = await getDoc(doc(db, 'practiceExams', currentTest.sourceId));
                    if (examDoc.exists()) {
                        setPracticeExam({ id: examDoc.id, ...examDoc.data() } as PracticeExam);
                    }
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
            if (status === 'correct') {
                correct++;
            } else if (status === 'incorrect') {
                incorrect++;
            } else if (status === 'empty' || status === 'unevaluated') {
                empty++;
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
            toast({ title: "Değerlendirme Kaydedildi!", description: "Test sonuçları başarıyla güncellendi.", className: "bg-emerald-600 text-white" });
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
             <div className={cn("flex h-screen items-center justify-center", glassColors.PAGE_BG)}>
                <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" />
                <p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p>
            </div>
        );
    }

    if (!test) {
        return (
             <div className={cn("flex flex-col items-center justify-center h-screen text-slate-900", glassColors.PAGE_BG)}>
                <div className="bg-rose-100 p-6 rounded-full mb-6 border border-rose-200">
                    <FileQuestion className="w-16 h-16 text-rose-600" />
                </div>
                <h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1>
                <p className="text-slate-500 mb-8 max-w-md text-center">Aradığınız test mevcut değil veya silinmiş olabilir.</p>
                <Link href="/education">
                    <Button size="lg" className={glassColors.BUTTON_GLASS}>
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Eğitim Sayfasına Dön
                    </Button>
                </Link>
            </div>
        )
    }

    // --- VIEW: RESULTS SUMMARY (SONUÇ EKRANI) ---
    if (test.status === 'Sonuçlandı' || test.status === 'Tekrar Çözülüyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.sourceType === 'json' 
            ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {})
            : test.answerKey || {};
        const questionCount = test.sourceType === 'json' ? test.jsonQuestions!.length : test.questionCount;
        
        let currentOffset = 0;
        const subjectsWithRanges = practiceExam?.subjects.map(s => {
            const range = { start: currentOffset + 1, end: currentOffset + s.questionCount };
            currentOffset += s.questionCount;
            return { ...s, range };
        }) || [];

        return (
            <div className={cn("min-h-screen text-slate-900 font-sans relative overflow-hidden flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10 pb-20">
                    <header className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                        </Button>
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 px-3 py-1 font-bold">Tamamlandı</Badge>
                    </header>

                    <Card className={cn("flex flex-col items-center justify-center py-10 border-emerald-200 bg-emerald-50/50 backdrop-blur-md")}>
                        <p className="text-sm text-emerald-700 font-bold tracking-widest uppercase mb-2">Toplam Puan</p>
                        <div className="text-8xl font-black text-emerald-700 tracking-tighter drop-shadow-sm">
                            {(test.score || 0).toFixed(0)}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-lg px-4 py-1">{test.correctAnswers} Doğru</Badge>
                            <Badge className="bg-rose-600 hover:bg-rose-700 text-white border-0 text-lg px-4 py-1">{test.incorrectAnswers} Yanlış</Badge>
                            <Badge className="bg-slate-500 hover:bg-slate-600 text-white border-0 text-lg px-4 py-1">{test.emptyAnswers} Boş</Badge>
                        </div>
                    </Card>

                    <Card className={glassColors.CARD_BG}>
                        <CardHeader>
                            <CardTitle className="text-slate-800">Cevap Anahtarı</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {practiceExam ? (
                                subjectsWithRanges.map(subject => (
                                    <div key={subject.id} className="space-y-3">
                                        <h3 className="font-bold text-slate-700 px-2 flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                            {subject.name}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                const qNum = subject.range.start + i;
                                                const qNumStr = qNum.toString();
                                                const studentAns = studentAnswers[qNumStr];
                                                const correctAns = answerKey[qNumStr];
                                                const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                                
                                                let statusColor = "border-slate-100 bg-slate-50";
                                                if (evalStatus === 'correct') statusColor = "border-emerald-200 bg-emerald-50";
                                                else if (evalStatus === 'incorrect') statusColor = "border-rose-200 bg-rose-50";

                                                return (
                                                    <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                                        <span className="font-bold text-slate-400 w-8">{qNum}</span>
                                                        <div className="flex gap-2">
                                                            <span className={cn("font-bold", evalStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                            {evalStatus === 'incorrect' && <span className="font-bold text-emerald-600">{correctAns}</span>}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Array.from({ length: questionCount }).map((_, index) => {
                                        const qNumStr = (index + 1).toString();
                                        const studentAns = studentAnswers[qNumStr];
                                        const correctAns = answerKey[qNumStr];
                                        const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                        
                                        let statusColor = "border-slate-100 bg-slate-50";
                                        if (evalStatus === 'correct') statusColor = "border-emerald-200 bg-emerald-50";
                                        else if (evalStatus === 'incorrect') statusColor = "border-rose-200 bg-rose-50";

                                        return (
                                            <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                                <span className="font-bold text-slate-400 w-8">{qNumStr}</span>
                                                <div className="flex gap-3">
                                                    <span className={cn("font-bold", evalStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                    {evalStatus === 'incorrect' && <span className="font-bold text-emerald-600">{correctAns}</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                      <div className="flex justify-center mt-8">
                        <Button 
                            size="lg" 
                            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-6 text-lg font-bold shadow-md"
                            onClick={() => router.push('/education')}
                        >
                            <Home className="mr-3 h-6 w-6 text-indigo-600" />
                            Eğitim Sayfasına Dön
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    
    // --- VIEW: EVALUATION PENDING ---
    if (test.status === 'Değerlendirme Bekliyor') {
        if (currentUserIsStudent) {
            return (
                <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 text-center", glassColors.PAGE_BG)}>
                    <div className="bg-yellow-100 p-6 rounded-full mb-6 border border-yellow-200 animate-pulse">
                        <Clock className="w-16 h-16 text-yellow-600" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Değerlendirme Bekleniyor</h1>
                    <p className="text-slate-500 mb-8 max-w-md">Testini başarıyla tamamladın! Sonuçların öğretmen/ebeveyn değerlendirmesinden sonra açıklanacak.</p>
                    <Link href="/education">
                        <Button size="lg" className={glassColors.BUTTON_GLASS}>
                            <ArrowLeft className="mr-2 h-5 w-5" /> Eğitim Sayfasına Dön
                        </Button>
                    </Link>
                </div>
            )
        }

        // Teacher/Parent grading view
        if (test.openEnded && test.questions) {
            return (
                <div className={cn("min-h-screen text-slate-900 p-4 sm:p-8", glassColors.PAGE_BG)}>
                      <header className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                        </Button>
                        <h1 className="text-xl font-bold">{test.title} - Değerlendirme</h1>
                        <Button type="button" onClick={handleFinalizeEvaluation} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
                            Değerlendirmeyi Tamamla
                        </Button>
                    </header>
                    <div className="max-w-4xl mx-auto space-y-6">
                        {test.questions.map((q, index) => {
                            const qNumStr = (index + 1).toString();
                            const studentAnswer = test.studentTextAnswers?.[qNumStr] || "Cevap verilmemiş";
                            const evalStatus = manualEvaluations[qNumStr];
                            return (
                                <Card key={q.questionId} className={cn("overflow-hidden", glassColors.CARD_BG)}>
                                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row justify-between items-center">
                                        <CardTitle className="text-lg text-slate-800">Soru {qNumStr}</CardTitle>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'correct')} className={cn("h-8 font-bold", evalStatus === 'correct' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-transparent border border-emerald-200 text-emerald-600 hover:bg-emerald-50")}>Doğru</Button>
                                            <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'incorrect')} className={cn("h-8 font-bold", evalStatus === 'incorrect' ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-transparent border border-rose-200 text-rose-600 hover:bg-rose-50")}>Yanlış</Button>
                                            <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'empty')} className={cn("h-8 font-bold", evalStatus === 'empty' ? "bg-slate-600 hover:bg-slate-700 text-white" : "bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50")}>Boş</Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="relative aspect-video bg-white border border-slate-100 rounded-lg overflow-hidden cursor-pointer shadow-sm">
                                                        <Image src={q.imageUrl} alt={`Soru ${qNumStr}`} layout="fill" objectFit="contain" unoptimized />
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-[90vw] max-h-[90vh] h-auto w-auto bg-transparent border-none shadow-none flex items-center justify-center p-0">
                                                    <Image src={q.imageUrl || ""} alt="Tam Ekran Soru" layout="intrinsic" width={1000} height={800} objectFit="contain" />
                                                </DialogContent>
                                            </Dialog>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Öğrenci Cevabı</Label>
                                                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 min-h-[120px] text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                                    {studentAnswer}
                                                </div>
                                            </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            );
        }
        
         // Optical Form grading fallback
        return (
            <div className={cn("min-h-screen text-slate-900 p-4 sm:p-8", glassColors.PAGE_BG)}>
                 <header className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                    </Button>
                </header>
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card className={glassColors.CARD_BG}>
                        <CardHeader>
                            <CardTitle className="text-slate-800">Optik Form Kontrolü</CardTitle>
                            <CardDescription className="text-slate-500">Cevap anahtarı eksik veya hatalı olabilir. Lütfen manuel kontrol edin.</CardDescription>
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
                                    <div key={qNumStr} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50">
                                            <div className="w-8 h-8 flex items-center justify-center font-bold bg-indigo-100 text-indigo-700 rounded-lg">{qNumStr}</div>
                                            <div className="flex gap-4 text-sm font-medium">
                                                <span>Cevap: <span className="font-bold text-slate-900">{studentAns || '-'}</span></span>
                                                <span>Doğru: <span className="font-bold text-emerald-600">{correctAns || '?'}</span></span>
                                            </div>
                                            <div className="ml-auto flex gap-2">
                                                <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'correct')} className={cn("h-8 w-8 p-0 font-bold", evalStatus === 'correct' ? "bg-emerald-600 text-white" : "bg-transparent border border-emerald-200 text-emerald-600")}>D</Button>
                                                <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'incorrect')} className={cn("h-8 w-8 p-0 font-bold", evalStatus === 'incorrect' ? "bg-rose-600 text-white" : "bg-transparent border border-rose-200 text-rose-600")}>Y</Button>
                                                <Button size="sm" onClick={() => handleEvaluationChange(qNumStr, 'empty')} className={cn("h-8 w-8 p-0 font-bold", evalStatus === 'empty' ? "bg-slate-600 text-white" : "bg-transparent border border-slate-200 text-slate-600")}>B</Button>
                                            </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                    <Button onClick={handleFinalizeEvaluation} size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-14 shadow-lg shadow-indigo-500/20">Değerlendirmeyi Kaydet</Button>
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
    
    const hasImages = (test.sourceType === 'quick' || test.sourceType === 'bank' || test.sourceType === 'mistake' || test.sourceType === 'trackedBook') && test.questions && test.questions.length > 0;
    const isJsonTest = test.sourceType === 'json' && test.jsonQuestions && test.jsonQuestions.length > 0;
    const currentJsonQuestion = isJsonTest ? test.jsonQuestions![currentQuestionIndex] : null;
    const options = ['A', 'B', 'C', 'D', 'E'];
    const testDurationMinutes = test.durationMinutes || (isJsonTest ? test.jsonQuestions!.length * 1.5 : test.questionCount * 2);

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        if (test.openEnded) {
            return !!textAnswers[qNumStr];
        } else {
            return !!mcqAnswers[qNumStr];
        }
    };
    
    // --- VIEW: IMAGE-BASED TEST (MCQ or Open-Ended) ---
    if (hasImages) {
        const currentQuestion = test.questions![currentQuestionIndex];
        const totalQuestions = test.questions!.length;
        const currentQNumStr = (currentQuestionIndex + 1).toString();

        return (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                    <motion.div
                        className={cn("min-h-screen text-slate-900 font-sans flex flex-col transition-all duration-300", fullscreen ? "fixed inset-0 z-50 p-8" : "relative p-4 sm:p-8", glassColors.PAGE_BG)}
                        animate={{ backgroundColor: fullscreen ? "rgba(248, 250, 252, 1)" : "" }}
                    >
                         {!fullscreen && (
                            <header className="max-w-4xl mx-auto w-full mb-8 flex justify-between items-center">
                                <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                                    <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                                </Button>
                                <div className="text-right">
                                    <h1 className="text-xl font-bold text-slate-900">{test.title}</h1>
                                    <p className="text-sm text-slate-500">{test.subject}</p>
                                </div>
                            </header>
                         )}

                         <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4 z-50 text-slate-400 hover:text-indigo-600" onClick={() => setFullscreen(!fullscreen)}>
                           {fullscreen ? <Shrink /> : <Expand />}
                        </Button>
                        
                        <main className={cn("max-w-4xl mx-auto w-full flex-grow flex flex-col lg:flex-row gap-8", fullscreen && "justify-center")}>
                            
                            {/* Question Navigator (Desktop) */}
                            <div className="hidden lg:block w-72 shrink-0">
                                <Card className={glassColors.CARD_BG}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                            <LayoutGrid className="w-4 h-4" /> Sorular
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[60vh]">
                                            <QuestionPalette 
                                                total={totalQuestions} 
                                                currentIndex={currentQuestionIndex} 
                                                onNavigate={setCurrentQuestionIndex}
                                                isAnswered={isQuestionAnswered}
                                                practiceExam={practiceExam}
                                            />
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex-grow flex flex-col">
                                <Card className={cn("border-l-4 border-l-indigo-600 mb-8", glassColors.CARD_BG)}>
                                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4">
                                                <div className="flex-grow w-full">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="font-bold text-lg text-slate-800">Soru {currentQuestionIndex + 1} / {totalQuestions}</h3>
                                                    <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                                                </div>
                                                <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="h-2 bg-slate-100" indicatorClassName="bg-indigo-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className={cn("flex-grow flex flex-col overflow-hidden", glassColors.CARD_BG)}>
                                    <CardContent className="p-4 flex-grow flex items-center justify-center bg-slate-50/50">
                                        <div className="w-full relative aspect-[4/3] bg-white rounded-lg shadow-inner flex items-center justify-center p-2">
                                        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
                                                <DialogTrigger asChild>
                                                    <Image 
                                                            src={currentQuestion.imageUrl}
                                                            alt={`Soru ${currentQuestionIndex + 1}`}
                                                            layout="fill"
                                                            objectFit="contain"
                                                            className="cursor-pointer"
                                                            unoptimized
                                                    />
                                                </DialogTrigger>
                                                <DialogContent className="max-w-[90vw] max-h-[90vh] h-auto w-auto bg-transparent border-none shadow-none flex items-center justify-center p-0">
                                                    <Image src={watchedImageUrl || ""} alt="Tam Ekran Soru" layout="intrinsic" width={1000} height={800} objectFit="contain" />
                                                </DialogContent>
                                        </Dialog>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-6 bg-slate-50 border-t border-slate-200 mt-auto">
                                        <div className="w-full flex flex-col gap-6">
                                                {test.openEnded ? (
                                                    <Textarea 
                                                        placeholder="Cevabınızı buraya yazın..."
                                                        value={textAnswers[currentQNumStr] || ""}
                                                        onChange={(e) => handleTextAnswerChange(parseInt(currentQNumStr), e.target.value)}
                                                        className={cn("h-24 text-base", glassColors.INPUT_BG)}
                                                    />
                                                ) : (
                                                    <RadioGroup 
                                                        value={mcqAnswers[currentQNumStr] || ""} 
                                                        onValueChange={(value) => handleMcqAnswerChange(currentQNumStr, value)}
                                                        className="flex justify-center gap-4"
                                                    >
                                                        {options.slice(0, 5).map(option => (
                                                            <div key={option}>
                                                                <RadioGroupItem value={option} id={`q${currentQNumStr}-${option}`} className="peer sr-only" />
                                                                <Label htmlFor={`q${currentQNumStr}-${option}`} className={glassColors.OPTION_BUTTON}>{option}</Label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                )}
                                                <div className="flex justify-between w-full">
                                                    <Button type="button" variant="outline" className={glassColors.BUTTON_GLASS} onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={currentQuestionIndex === 0}>
                                                        <ArrowLeft className="mr-2 h-4 w-4"/> Önceki
                                                    </Button>
                                                    {currentQuestionIndex === totalQuestions - 1 ? (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button type="button" size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-500/20">
                                                                    Testi Tamamla <Check className="ml-2 h-5 w-5" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-slate-500">Testi bitirdikten sonra cevaplarınızda değişiklik yapamazsınız.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700">İptal</AlertDialogCancel>
                                                                    <AlertDialogAction type="button" onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Evet, Bitir</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    ) : (
                                                        <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-md" onClick={() => setCurrentQuestionIndex(p => p + 1)}>
                                                            Sonraki <ArrowRight className="ml-2 h-4 w-4"/>
                                                        </Button>
                                                    )}
                                                </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                        </main>
                        
                        {/* Mobile Navigator (Sheet) */}
                        <div className="lg:hidden fixed bottom-6 left-6 z-50">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button size="icon" className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 border-2 border-white">
                                        <LayoutGrid className="w-6 h-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-white p-6 pt-10 border-t-4 border-t-indigo-500 h-[60vh] max-h-[500px]">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="text-xl font-black text-slate-900 flex items-center justify-center gap-3">
                                            <LayoutGrid className="w-6 h-6 text-indigo-500" />
                                            Soru Gezgini
                                        </SheetTitle>
                                    </SheetHeader>
                                    <ScrollArea className="h-full">
                                        <div className="pb-20">
                                            <QuestionPalette 
                                                total={totalQuestions} 
                                                currentIndex={currentQuestionIndex} 
                                                onNavigate={(idx) => { setCurrentQuestionIndex(idx); }}
                                                isAnswered={isQuestionAnswered}
                                                practiceExam={practiceExam}
                                            />
                                        </div>
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </motion.div>
                </form>
             </Form>
        )
    }

    // --- VIEW: JSON-BASED TEST (MCQ) ---
    if (isJsonTest && !test.openEnded && currentJsonQuestion) {
        const totalQuestions = test.jsonQuestions!.length;

        return (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                    <motion.div
                        className={cn("min-h-screen text-slate-900 font-sans flex flex-col transition-all duration-300", fullscreen ? "fixed inset-0 z-50 p-8" : "relative p-4 sm:p-8", glassColors.PAGE_BG)}
                        animate={{ backgroundColor: fullscreen ? "rgba(248, 250, 252, 1)" : "" }}
                    >
                        {!fullscreen && (
                            <header className="max-w-4xl mx-auto w-full mb-8 flex justify-between items-center">
                                <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                                    <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                                </Button>
                                <div className="text-right">
                                    <h1 className="text-xl font-bold text-slate-900">{test.title}</h1>
                                    <p className="text-sm text-slate-500">{test.subject}</p>
                                </div>
                            </header>
                        )}
                        
                        <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4 z-50 text-slate-400 hover:text-indigo-600" onClick={() => setFullscreen(!fullscreen)}>
                           {fullscreen ? <Shrink /> : <Expand />}
                        </Button>

                        <main className={cn("max-w-4xl mx-auto w-full flex-grow flex flex-col lg:flex-row gap-8", fullscreen && "justify-center")}>
                            
                             {/* Question Navigator (Desktop) */}
                             <div className="hidden lg:block w-72 shrink-0">
                                <Card className={glassColors.CARD_BG}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                            <LayoutGrid className="w-4 h-4" /> Sorular
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[60vh]">
                                            <QuestionPalette 
                                                total={totalQuestions} 
                                                currentIndex={currentQuestionIndex} 
                                                onNavigate={setCurrentQuestionIndex}
                                                isAnswered={isQuestionAnswered}
                                                practiceExam={practiceExam}
                                            />
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex-grow flex flex-col">
                                {/* TIMER & PROGRESS */}
                                <Card className={cn("border-l-4 border-l-indigo-600 mb-8", glassColors.CARD_BG)}>
                                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4">
                                         <div className="flex-grow w-full">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-bold text-lg text-slate-800">Soru {currentQuestionIndex + 1} / {totalQuestions}</h3>
                                                <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                                            </div>
                                            <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="h-2 bg-slate-100" indicatorClassName="bg-indigo-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* QUESTION CARD */}
                                <Card className={cn("flex-grow flex flex-col overflow-hidden", glassColors.CARD_BG)}>
                                    <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
                                        <CardTitle className="text-slate-900 text-2xl leading-relaxed whitespace-pre-wrap">{currentJsonQuestion.text}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4 flex-grow">
                                        <RadioGroup 
                                            value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                            onValueChange={(value) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), value)}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            {currentJsonQuestion.options.map((option, optIndex) => (
                                                <FormItem key={optIndex} className="flex items-center space-x-3 space-y-0 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500 shadow-sm">
                                                    <FormControl>
                                                        <RadioGroupItem value={option} className="text-indigo-600 border-indigo-600"/>
                                                    </FormControl>
                                                    <FormLabel className="font-bold text-base text-slate-700 cursor-pointer w-full leading-tight">
                                                        {option}
                                                    </FormLabel>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </CardContent>
                                    <CardFooter className="p-6 bg-slate-50 border-t border-slate-200 mt-auto">
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
                                            {currentQuestionIndex === totalQuestions - 1 ? (
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-500/20">
                                                            Testi Tamamla <Check className="ml-2 h-5 w-5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-500">
                                                                Testi bitirdikten sonra cevaplarınızda değişiklik yapamazsınız.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700">İptal</AlertDialogCancel>
                                                            <AlertDialogAction type="button" onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Evet, Bitir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            ) : (
                                                <Button 
                                                    type="button"
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-md"
                                                    onClick={() => setCurrentQuestionIndex(p => p + 1)}
                                                >
                                                    Sonraki Soru <ArrowRight className="ml-2 h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                        </main>
                        
                        {/* Mobile Navigator (Sheet) */}
                        <div className="lg:hidden fixed bottom-6 left-6 z-50">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button size="icon" className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 border-2 border-white">
                                        <LayoutGrid className="w-6 h-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-white p-6 pt-10 border-t-4 border-t-indigo-500 h-[60vh] max-h-[500px]">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="text-xl font-black text-slate-900 flex items-center justify-center gap-3">
                                            <LayoutGrid className="w-6 h-6 text-indigo-500" />
                                            Soru Gezgini
                                        </SheetTitle>
                                    </SheetHeader>
                                    <ScrollArea className="h-full">
                                        <div className="pb-20">
                                            <QuestionPalette 
                                                total={totalQuestions} 
                                                currentIndex={currentQuestionIndex} 
                                                onNavigate={(idx) => { setCurrentQuestionIndex(idx); }}
                                                isAnswered={isQuestionAnswered}
                                                practiceExam={practiceExam}
                                            />
                                        </div>
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </motion.div>
                </form>
             </Form>
        )
    }
    
    // --- VIEW: Fallback (Manual Optical Form) ---
    let currentOffset = 0;
    const subjectsWithRanges = practiceExam?.subjects.map(s => {
        const range = { start: currentOffset + 1, end: currentOffset + s.questionCount };
        currentOffset += s.questionCount;
        return { ...s, range };
    }) || [];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-3xl mx-auto w-full mb-8 flex justify-between items-center">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Çıkış
                        </Button>
                        <div className="text-right">
                            <h1 className="text-xl font-bold text-slate-900">{test.title}</h1>
                            <p className="text-sm text-slate-500">{test.subject}</p>
                        </div>
                    </header>

                    <main className="max-w-3xl mx-auto w-full space-y-8">
                        {/* Timer Card */}
                        <Card className={cn("border-l-4 border-l-indigo-600", glassColors.CARD_BG)}>
                            <CardContent className="flex items-center justify-between p-6">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">Süreniz İşliyor</h3>
                                </div>
                                <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                            </CardContent>
                        </Card>

                        {/* Optical Form */}
                        <Card className={cn("overflow-hidden", glassColors.CARD_BG)}>
                            <CardHeader className="bg-slate-50 border-b border-slate-200">
                                <CardTitle className="text-center text-slate-800">Cevap Kağıdı</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {practiceExam ? (
                                    subjectsWithRanges.map(subject => (
                                        <div key={subject.id} className="mb-0">
                                            <div className="sticky top-0 z-10 bg-indigo-50 p-3 px-6 border-y border-indigo-100 flex items-center justify-between shadow-sm">
                                                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4" />
                                                    {subject.name}
                                                </h3>
                                                <Badge variant="secondary" className="bg-white border-indigo-200 text-indigo-700 font-bold">{subject.questionCount} Soru</Badge>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                    const qNum = subject.range.start + i;
                                                    return (
                                                        <div key={qNum} className="flex items-center p-3 sm:p-4 hover:bg-slate-50 transition-colors group">
                                                            <div className="w-12 text-center font-bold text-slate-400 text-lg">{qNum}</div>
                                                            <RadioGroup 
                                                                value={mcqAnswers[qNum.toString()] || ""} 
                                                                onValueChange={(value) => handleMcqAnswerChange(qNum.toString(), value)}
                                                                className="flex-1 flex justify-center sm:justify-start gap-2.5 sm:gap-6 ml-4"
                                                            >
                                                                {options.slice(0,4).map(option => (
                                                                    <div key={option} className="relative">
                                                                        <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                                                        <Label htmlFor={`q${qNum}-${option}`} className={glassColors.OPTION_BUTTON}>{option}</Label>
                                                                    </div>
                                                                ))}
                                                            </RadioGroup>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {Array.from({ length: test.questionCount }).map((_, index) => {
                                            const qNum = index + 1;
                                            return (
                                                <div key={qNum} className="flex items-center p-3 sm:p-4 hover:bg-slate-50 transition-colors group">
                                                    <div className="w-12 text-center font-bold text-slate-400 text-lg">{qNum}</div>
                                                    {test.openEnded ? (
                                                        <Textarea 
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
                                )}
                            </CardContent>
                            <CardFooter className="p-6 bg-slate-50 border-t border-slate-200">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg shadow-emerald-500/20">
                                            Testi Tamamla <Check className="ml-2 h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-500">
                                                Testi bitirdikten sonra cevaplarınızda değişiklik yapamazsınız.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700">İptal</AlertDialogCancel>
                                            <AlertDialogAction 
                                                type="button" 
                                                onClick={() => handleSubmit(false)} 
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                Evet, Bitir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    </main>
                </div>
            </form>
        </Form>
    );
}

