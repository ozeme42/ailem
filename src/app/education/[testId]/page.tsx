
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Test as TestType, QuickTestQuestion, PracticeExam, EvaluationStatus } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, ArrowRight, Play, Pause, Check, X, MinusCircle, LayoutGrid, BookOpen, ChevronRight, Home, Loader2, Sparkles, Trophy, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { useForm } from "react-hook-form";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- DESIGN SYSTEM ---
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
      if (timeLeft <= 0) onTimeUp();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
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
    practiceExam,
    submittedSubjects = []
}: { 
    total: number; 
    currentIndex: number; 
    onNavigate: (index: number) => void;
    isAnswered: (index: number) => boolean;
    practiceExam?: PracticeExam | null;
    submittedSubjects?: string[];
}) => {
    if (practiceExam && practiceExam.subjects) {
        let currentOffset = 0;
        return (
            <div className="space-y-4 p-4">
                {practiceExam.subjects.map(subject => {
                    const rangeStart = currentOffset;
                    currentOffset += subject.questionCount;
                    const isSubjectSubmitted = submittedSubjects.includes(subject.id);
                    
                    return (
                        <div key={subject.id} className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{subject.name}</p>
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: subject.questionCount }).map((_, i) => {
                                    const actualIndex = rangeStart + i;
                                    const answered = isAnswered(actualIndex) || isSubjectSubmitted;
                                    const active = currentIndex === actualIndex;
                                    
                                    return (
                                        <Button
                                            key={actualIndex}
                                            type="button"
                                            variant={active ? "default" : answered ? "secondary" : "outline"}
                                            className={cn(
                                                "h-8 w-8 p-0 font-bold rounded-lg text-xs transition-all",
                                                active && "bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300 ring-offset-1",
                                                answered && !active && "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                            )}
                                            onClick={() => onNavigate(actualIndex)}
                                        >
                                            {i + 1}
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
                        type="button"
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
    const [manualEvaluation, setManualEvaluation] = React.useState<ManualEvaluation>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [submittedSubjectIds, setSubmittedSubjectIds] = React.useState<string[]>([]);
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const isInitializedRef = React.useRef(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const form = useForm();

    const fetchQuestions = React.useCallback(async (id: string) => {
        const questionsColRef = collection(db, 'tests', id, 'questions');
        const questionsQuery = query(questionsColRef, orderBy("questionNumber"));
        const questionsSnap = await getDocs(questionsQuery);
        return questionsSnap.docs.map(d => d.data() as QuickTestQuestion);
    }, []);

    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubTest = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const currentTest = { id: docSnap.id, ...docSnap.data() } as TestType;
                
                if ((currentTest.sourceType === 'quick' || currentTest.sourceType === 'bank' || currentTest.sourceType === 'mistake') && (!currentTest.questions || currentTest.questions.length === 0)) {
                  currentTest.questions = await fetchQuestions(testId);
                }
                
                if (currentTest.sourceType === 'exam' && currentTest.sourceId) {
                    const examDoc = await getDoc(doc(db, 'practiceExams', currentTest.sourceId));
                    if (examDoc.exists()) setPracticeExam({ id: examDoc.id, ...examDoc.data() } as PracticeExam);
                }
                
                setTest(currentTest);
                
                if (!isInitializedRef.current) {
                    setMcqAnswers(currentTest.studentAnswers || {});
                    setTextAnswers(currentTest.studentTextAnswers || {});
                    setManualEvaluation(currentTest.studentTextAnswersEvaluation || {});
                    isInitializedRef.current = true;
                }
            } else {
                setTest(null);
            }
            setIsLoading(false);
        });
        
        return () => unsubTest();
    }, [testId, fetchQuestions]);

    const handleSavePartial = React.useCallback(async (latestMcq: McqAnswers, latestText: TextAnswers) => {
        if (!test) return;
        try {
            await updateTest(test.id, {
                studentAnswers: test.openEnded ? undefined : latestMcq,
                studentTextAnswers: test.openEnded ? latestText : undefined,
            });
        } catch (e) {
            console.error("Partial save error:", e);
        }
    }, [test]);

    const debouncedSave = (newMcq: McqAnswers, newText: TextAnswers) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSavePartial(newMcq, newText);
        }, 1000);
    };

    const handleMcqAnswerChange = (questionNumber: string, value: string) => {
        const updated = { ...mcqAnswers, [questionNumber]: value };
        setMcqAnswers(updated);
        debouncedSave(updated, textAnswers);
    };

    const handleTextAnswerChange = (questionNumber: number, value: string) => {
        const qNumStr = questionNumber.toString();
        const updated = { ...textAnswers, [qNumStr]: value };
        setTextAnswers(updated);
        debouncedSave(mcqAnswers, updated);
    };

    const handleEvaluate = (questionNumber: number, status: EvaluationStatus) => {
        const updated = { ...manualEvaluation, [questionNumber.toString()]: status };
        setManualEvaluation(updated);
    };

    const handleSubmitEvaluation = async () => {
        if (!test) return;
        setIsSubmitting(true);
        try {
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
            let correct = 0, incorrect = 0, empty = 0;
            
            for (let i = 1; i <= questionCount; i++) {
                const status = manualEvaluation[i.toString()];
                if (status === 'correct') correct++;
                else if (status === 'incorrect') incorrect++;
                else empty++;
            }

            await updateTest(test.id, {
                studentTextAnswersEvaluation: manualEvaluation,
                status: 'Sonuçlandı',
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                emptyAnswers: empty,
                score: (correct / questionCount) * 100
            });

            toast({ title: "Değerlendirme Tamamlandı", description: "Sonuçlar kaydedildi." });
        } catch (e) {
            toast({ title: "Hata", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user) return;
        const isMcqTest = !test.openEnded;
        setIsSubmitting(true);
        try {
            let updatedData: Partial<TestType> = { timerStatus: 'finished' };
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;

            if (isMcqTest) {
                let allStudentMcqAnswers: McqAnswers = {};
                for (let i = 1; i <= questionCount; i++) {
                    const qNumStr = i.toString();
                    allStudentMcqAnswers[qNumStr] = mcqAnswers[qNumStr] || null;
                }
                updatedData.studentAnswers = allStudentMcqAnswers;
                const answerKey = test.sourceType === 'json' 
                    ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {})
                    : test.answerKey;
                
                if (answerKey && Object.keys(answerKey).length > 0) {
                    let correct = 0, incorrect = 0, empty = 0;
                    for (let i = 1; i <= questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = allStudentMcqAnswers[qNumStr];
                        if (!studentAns) empty++;
                        else if (studentAns === (answerKey as any)[qNumStr]) correct++;
                        else incorrect++;
                    }
                    updatedData.status = 'Sonuçlandı';
                    updatedData.correctAnswers = correct;
                    updatedData.incorrectAnswers = incorrect;
                    updatedData.emptyAnswers = empty;
                    updatedData.score = (correct / questionCount) * 100;
                } else {
                    updatedData.status = 'Değerlendirme Bekliyor';
                }
            } else { 
                updatedData.studentTextAnswers = textAnswers;
                updatedData.status = 'Değerlendirme Bekliyor';
            }

            await updateTest(test.id, updatedData);
            toast({ title: isFinishedByTimer ? "⏳ Süre Doldu!" : "✅ Test Tamamlandı!", description: "Cevapların başarıyla kaydedildi.", className: "bg-emerald-600 border-none text-white" });
            
            if (updatedData.status === 'Sonuçlandı' && test.familyId && test.studentId) {
                await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "❌ Hata!", description: "Test sonuçları kaydedilirken bir sorun oluştu." });
        } finally {
            setIsSubmitting(false);
        }
    }, [test, mcqAnswers, textAnswers, toast, user]);

    const handleSubjectFinish = async (subjectId: string) => {
        await handleSavePartial(mcqAnswers, textAnswers);
        setSubmittedSubjectIds(prev => [...new Set([...prev, subjectId])]);
        toast({ title: "Ders Kaydedildi", description: "Bu ders için sonuçları görebilirsiniz." });
    }

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        return test?.openEnded ? !!textAnswers[qNumStr] : !!mcqAnswers[qNumStr];
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" /><p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1><Link href="/education"><Button size="lg" className={glassColors.BUTTON_GLASS}>Geri Dön</Button></Link></div>;

    // --- EVALUATION MODE (For Teachers/Parents) ---
    if (test.status === 'Değerlendirme Bekliyor') {
        const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
        const totalEvaluated = Object.keys(manualEvaluation).length;

        return (
            <div className={cn("min-h-screen text-slate-900 font-sans p-4 sm:p-8", glassColors.PAGE_BG)}>
                <div className="max-w-4xl mx-auto w-full space-y-8">
                    <header className="flex justify-between items-center">
                         <Button variant="ghost" onClick={() => router.push('/education/all-tests')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                         <Badge className="bg-blue-600 text-white border-0 font-bold uppercase tracking-widest px-4 py-1">Değerlendirme Modu</Badge>
                    </header>

                    <div className="space-y-6">
                        {Array.from({ length: questionCount }).map((_, i) => {
                            const qNum = i + 1;
                            const studentAns = textAnswers[qNum.toString()] || mcqAnswers[qNum.toString()];
                            const status = manualEvaluation[qNum.toString()];

                            return (
                                <Card key={qNum} className={cn("rounded-3xl border transition-all", status === 'correct' ? 'border-emerald-200 bg-emerald-50/30' : status === 'incorrect' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white')}>
                                    <CardHeader className="pb-2 border-b flex flex-row justify-between items-center bg-slate-50/50 rounded-t-3xl">
                                        <Badge className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center p-0 text-sm font-bold">{qNum}</Badge>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleEvaluate(qNum, 'correct')}
                                                className={cn("h-9 rounded-xl gap-2", status === 'correct' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-500")}
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Doğru
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleEvaluate(qNum, 'incorrect')}
                                                className={cn("h-9 rounded-xl gap-2", status === 'incorrect' ? "bg-rose-600 text-white border-rose-600" : "bg-white border-slate-200 text-slate-500")}
                                            >
                                                <XCircle className="w-4 h-4" /> Yanlış
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            {test.jsonQuestions && test.jsonQuestions[i] && (
                                                <p className="text-lg font-bold text-slate-700">{test.jsonQuestions[i].text}</p>
                                            )}
                                            {test.questions && test.questions[i] && (
                                                <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden mb-4 border border-slate-200">
                                                    <Image src={test.questions[i].imageUrl} alt="Soru" fill className="object-contain p-4" />
                                                </div>
                                            )}
                                            <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Öğrenci Cevabı:</p>
                                                <p className="text-lg font-medium text-slate-700 leading-relaxed italic">{studentAns || "— Cevap verilmedi —"}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    <div className="sticky bottom-8 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-0">
                         <Button 
                            size="lg" 
                            disabled={totalEvaluated < questionCount || isSubmitting}
                            onClick={handleSubmitEvaluation}
                            className="w-full h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black shadow-2xl shadow-indigo-500/40"
                         >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Check className="mr-2 h-6 w-6"/>}
                            Değerlendirmeyi Bitir ve Yayınla
                         </Button>
                         {totalEvaluated < questionCount && (
                             <p className="text-center text-xs text-rose-500 font-bold mt-2 bg-white/50 backdrop-blur-sm py-1 rounded-full">{questionCount - totalEvaluated} soru daha değerlendirilmeli.</p>
                         )}
                    </div>
                </div>
            </div>
        )
    }

    // --- RESULTS SCREEN (Finalized) ---
    if (test.status === 'Sonuçlandı' || test.status === 'Tekrar Çözülüyor') {
        const studentAnswers = test.studentAnswers || {};
        const answerKey = test.sourceType === 'json' ? test.jsonQuestions!.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {}) : test.answerKey || {};
        const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
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
                        <Button variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 px-3 py-1 font-bold">Tamamlandı</Badge>
                    </header>
                    <Card className="flex flex-col items-center justify-center py-10 border-emerald-200 bg-emerald-50/50 backdrop-blur-md">
                        <p className="text-sm text-emerald-700 font-bold tracking-widest uppercase mb-2">Toplam Puan</p>
                        <div className="text-8xl font-black text-emerald-700 tracking-tighter">{(test.score || 0).toFixed(0)}</div>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <Badge className="bg-emerald-600 text-white border-0 text-lg px-4 py-1">{test.correctAnswers} Doğru</Badge>
                            <Badge className="bg-rose-600 text-white border-0 text-lg px-4 py-1">{test.incorrectAnswers} Yanlış</Badge>
                            <Badge className="bg-slate-500 text-white border-0 text-lg px-4 py-1">{test.emptyAnswers} Boş</Badge>
                        </div>
                    </Card>
                    <Card className={glassColors.CARD_BG}>
                        <CardHeader><CardTitle>Cevap Anahtarı</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {practiceExam ? (
                                subjectsWithRanges.map(subject => (
                                    <div key={subject.id} className="space-y-3">
                                        <h3 className="font-bold text-slate-700 px-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full" />{subject.name}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                const qNum = subject.range.start + i;
                                                const qNumStr = qNum.toString();
                                                const studentAns = studentAnswers[qNumStr];
                                                const correctAns = answerKey[qNumStr];
                                                const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                                let statusColor = evalStatus === 'correct' ? "border-emerald-200 bg-emerald-50" : (evalStatus === 'incorrect' ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50");
                                                return (
                                                    <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                                        <span className="font-bold text-slate-400 w-8">{i + 1}</span>
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
                                        
                                        // Manual evaluation handling for text answers if finalized
                                        const evalFromStatus = test.studentTextAnswersEvaluation?.[qNumStr] || (studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty'));
                                        
                                        let statusColor = evalFromStatus === 'correct' ? "border-emerald-200 bg-emerald-50" : (evalFromStatus === 'incorrect' ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50");
                                        return (
                                            <div key={qNumStr} className={cn("p-3 border rounded-xl flex justify-between items-center", statusColor)}>
                                                <span className="font-bold text-slate-400 w-8">{qNumStr}</span>
                                                <div className="flex gap-3">
                                                    <span className={cn("font-bold", evalFromStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                    {evalFromStatus === 'incorrect' && correctAns && <span className="font-bold text-emerald-600">{correctAns}</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex justify-center"><Button size="lg" className="bg-white text-slate-900 border border-slate-200 px-8 py-6 text-lg font-bold" onClick={() => router.push('/education')}><Home className="mr-3 h-6 w-6 text-indigo-600" />Eğitim Sayfası</Button></div>
                </div>
            </div>
        );
    }

    const totalQuestions = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
    const isSingleQuestionView = test.sourceType === 'json' || test.sourceType === 'bank' || test.sourceType === 'mistake' || test.sourceType === 'quick';
    
    // --- NAVIGATION ---
    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }

    const options = ['A', 'B', 'C', 'D', 'E'];
    const testDurationMinutes = test.durationMinutes || totalQuestions * 1.5;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))}>
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-4xl mx-auto w-full mb-8 flex justify-between items-center">
                        <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <div className="text-center hidden sm:block">
                            <h1 className="text-xl font-bold text-slate-900">{test.title}</h1>
                            <p className="text-sm text-slate-500">{test.subject}</p>
                        </div>
                        <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                    </header>

                    <main className="flex-1 max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
                        
                        {/* LEFT COLUMN: QUESTION AREA */}
                        <div className="lg:col-span-8 space-y-6">
                            <AnimatePresence mode="wait">
                                {isSingleQuestionView ? (
                                    <motion.div 
                                        key={currentQuestionIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {test.sourceType === 'json' && test.jsonQuestions ? (
                                            /* JSON SINGLE QUESTION */
                                            <Card className="overflow-hidden bg-white border border-slate-200 shadow-lg rounded-3xl">
                                                <CardHeader className="bg-slate-50/50 border-b p-6">
                                                    <div className="flex gap-4">
                                                        <Badge className="h-10 w-10 rounded-full flex items-center justify-center p-0 text-lg font-black bg-indigo-600 shrink-0">
                                                            {currentQuestionIndex + 1}
                                                        </Badge>
                                                        <p className="text-xl font-bold text-slate-800 leading-tight pt-1">
                                                            {test.jsonQuestions[currentQuestionIndex].text}
                                                        </p>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-6">
                                                    <RadioGroup 
                                                        value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                        onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)}
                                                        className="space-y-4"
                                                    >
                                                        {test.jsonQuestions[currentQuestionIndex].options.map((opt, optIdx) => {
                                                            const letter = String.fromCharCode(65 + optIdx);
                                                            const isSelected = mcqAnswers[(currentQuestionIndex + 1).toString()] === opt;
                                                            const itemId = `q${currentQuestionIndex}-${optIdx}`;
                                                            return (
                                                                <div 
                                                                    key={optIdx} 
                                                                    className={cn(
                                                                        "relative flex items-center space-x-3 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                                                                        isSelected 
                                                                            ? "bg-indigo-50 border-indigo-600 shadow-sm" 
                                                                            : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    <RadioGroupItem value={opt} id={itemId} className="peer sr-only" />
                                                                    <Label 
                                                                        htmlFor={itemId} 
                                                                        className="flex flex-1 items-center gap-4 cursor-pointer"
                                                                    >
                                                                        <div className={cn(
                                                                            "w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-base shrink-0",
                                                                            isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-400"
                                                                        )}>
                                                                            {letter}
                                                                        </div>
                                                                        <span className="text-lg font-medium text-slate-700">{opt}</span>
                                                                    </Label>
                                                                </div>
                                                            );
                                                        })}
                                                    </RadioGroup>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            /* BANK / MISTAKE SINGLE QUESTION */
                                            <Card className="overflow-hidden bg-white border border-slate-200 shadow-lg rounded-3xl">
                                                <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
                                                    <Badge className="h-10 w-10 rounded-full flex items-center justify-center p-0 text-lg font-black bg-indigo-600 shrink-0">
                                                        {currentQuestionIndex + 1}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Soru Görseli</span>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <div className="relative w-full aspect-video bg-slate-50">
                                                        {test.questions && test.questions[currentQuestionIndex] && (
                                                            <Image 
                                                                src={test.questions[currentQuestionIndex].imageUrl} 
                                                                alt={`Soru ${currentQuestionIndex + 1}`} 
                                                                fill 
                                                                className="object-contain p-4"
                                                                data-ai-hint="exam question"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="p-8 border-t bg-white">
                                                        <p className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider">Cevabınız:</p>
                                                        {test.openEnded ? (
                                                            <Textarea 
                                                                placeholder="Cevabınızı buraya yazın..." 
                                                                value={textAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                                onChange={(e) => handleTextAnswerChange(currentQuestionIndex + 1, e.target.value)} 
                                                                className={cn("min-h-[150px] rounded-2xl text-lg", glassColors.INPUT_BG)}
                                                            />
                                                        ) : (
                                                            <RadioGroup 
                                                                value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                                onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)}
                                                                className="flex flex-wrap gap-4"
                                                            >
                                                                {options.slice(0, 5).map(opt => (
                                                                    <div key={opt} className="flex items-center">
                                                                        <RadioGroupItem value={opt} id={`opt-${opt}`} className="peer sr-only" />
                                                                        <Label htmlFor={`opt-${opt}`} className={cn(glassColors.OPTION_BUTTON, "w-14 h-14 text-xl")}>{opt}</Label>
                                                                    </div>
                                                                ))}
                                                            </RadioGroup>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Navigation Buttons */}
                                        <div className="flex justify-between items-center mt-8 gap-4">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="lg"
                                                onClick={handlePrev} 
                                                disabled={currentQuestionIndex === 0}
                                                className="h-14 rounded-2xl px-8 font-bold border-slate-200"
                                            >
                                                <ChevronLeft className="mr-2 h-6 w-6" /> Önceki
                                            </Button>

                                            {currentQuestionIndex === totalQuestions - 1 ? (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" size="lg" className="h-14 rounded-2xl px-8 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" disabled={isSubmitting}>
                                                            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6"/> : "Sınavı Bitir"} <CheckCircle className="ml-2 h-6 w-6" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white border-slate-200 rounded-3xl shadow-2xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-2xl font-black">Emin misiniz?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-500 text-base">Cevaplarını kaydedip sınavı bitirmek üzeresin.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-6">
                                                            <AlertDialogCancel className="bg-slate-100 border-slate-200 rounded-xl h-12 font-bold">Vazgeç</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">Evet, Bitir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            ) : (
                                                <Button 
                                                    type="button" 
                                                    size="lg"
                                                    onClick={handleNext} 
                                                    className="h-14 rounded-2xl px-8 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                                >
                                                    Sonraki <ChevronRight className="ml-2 h-6 w-6" />
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* PRACTICE EXAM (ACCORDION VIEW) */
                                    <Accordion type="multiple" className="w-full space-y-4">
                                        {practiceExam?.subjects.map(subject => {
                                            // Subject range mapping
                                            let currentOffset = 0;
                                            const sub = practiceExam.subjects.find(s => s.id === subject.id)!;
                                            const idx = practiceExam.subjects.indexOf(sub);
                                            for(let i=0; i<idx; i++) currentOffset += practiceExam.subjects[i].questionCount;
                                            const range = { start: currentOffset + 1, end: currentOffset + sub.questionCount };

                                            const isSubjectSubmitted = submittedSubjectIds.includes(subject.id);
                                            const subjectAnswers = Array.from({ length: subject.questionCount }).map((_, i) => mcqAnswers[(range.start + i).toString()]);
                                            const answeredCount = subjectAnswers.filter(Boolean).length;
                                            const correctCount = isSubjectSubmitted ? subjectAnswers.filter((ans, i) => ans === (test.answerKey || {})[(range.start + i).toString()]).length : 0;
                                            const incorrectCount = isSubjectSubmitted ? subjectAnswers.filter((ans, i) => ans && ans !== (test.answerKey || {})[(range.start + i).toString()]).length : 0;

                                            return (
                                                <AccordionItem key={subject.id} value={subject.id} className="border rounded-2xl bg-white overflow-hidden shadow-sm">
                                                    <AccordionTrigger className="bg-slate-50 hover:bg-slate-100 px-6 py-4 no-underline hover:no-underline">
                                                        <div className="flex items-center justify-between w-full pr-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-indigo-600 p-2 rounded-lg text-white"><BookOpen className="w-4 h-4" /></div>
                                                                <h3 className="font-bold text-slate-800 text-lg">{subject.name}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isSubjectSubmitted ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                                        {correctCount}D - {incorrectCount}Y
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1 shadow-sm">
                                                                        {answeredCount}/{subject.questionCount} Soru
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-0 border-t">
                                                        <div className="divide-y divide-slate-100 bg-white">
                                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                                const qNum = range.start + i;
                                                                const qNumStr = qNum.toString();
                                                                const studentAns = mcqAnswers[qNumStr];
                                                                const correctAns = (test.answerKey || {})[qNumStr];
                                                                
                                                                return (
                                                                    <div key={qNum} className="flex items-center p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                                                                        <div className="w-12 text-center font-bold text-slate-400 text-lg">{i + 1}</div>
                                                                        
                                                                        {isSubjectSubmitted ? (
                                                                            <div className="flex-1 flex gap-4 ml-4">
                                                                                <span className={cn("font-bold text-lg", studentAns === correctAns ? "text-emerald-600" : "text-rose-600")}>
                                                                                    {studentAns || "Boş"}
                                                                                </span>
                                                                                {studentAns !== correctAns && <span className="text-emerald-600 font-bold text-lg">Doğru: {correctAns}</span>}
                                                                            </div>
                                                                        ) : (
                                                                            <RadioGroup 
                                                                                value={studentAns || ""} 
                                                                                onValueChange={(v) => handleMcqAnswerChange(qNumStr, v)}
                                                                                className="flex-1 flex justify-center sm:justify-start gap-2.5 sm:gap-6 ml-4"
                                                                            >
                                                                                {options.slice(0,4).map(option => (
                                                                                    <div key={option}>
                                                                                        <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                                                                        <Label htmlFor={`q${qNum}-${option}`} className={glassColors.OPTION_BUTTON}>{option}</Label>
                                                                                    </div>
                                                                                ))}
                                                                            </RadioGroup>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        {!isSubjectSubmitted && (
                                                            <div className="p-6 bg-slate-50 border-t flex justify-center">
                                                                <Button type="button" className="bg-indigo-600 text-white font-bold px-8 rounded-xl h-11" onClick={() => handleSubjectFinish(subject.id)}>
                                                                    Dersi Bitir ve Sonuçları Gör
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                        <div className="pt-6">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-14 shadow-2xl rounded-2xl text-lg transition-transform active:scale-95" disabled={isSubmitting}>
                                                        {isSubmitting ? <Loader2 className="animate-spin h-6 w-6"/> : "Tüm Testi Bitir ve Genel Sonucu Gör"} <Check className="ml-3 h-6 w-6" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-white border-slate-200 rounded-3xl shadow-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-2xl font-black">Sınavı Bitir?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-500 text-base">Genel sonucunuz hesaplanacaktır.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-6">
                                                        <AlertDialogCancel className="bg-slate-100 border-slate-200 rounded-xl h-12 font-bold">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold">Bitir</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Accordion>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* RIGHT COLUMN: QUESTION PALETTE (DESKTOP) */}
                        <div className="hidden lg:block lg:col-span-4">
                            <div className={cn("sticky top-28 rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl")}>
                                <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-indigo-600" /> Soru Gezgini
                                    </h3>
                                    <Badge variant="secondary" className="bg-white border-slate-200 text-indigo-600 font-bold">
                                        {Object.keys(mcqAnswers).length + Object.keys(textAnswers).length}/{totalQuestions}
                                    </Badge>
                                </div>
                                <ScrollArea className="h-[500px]">
                                    <QuestionPalette 
                                        total={totalQuestions} 
                                        currentIndex={currentQuestionIndex} 
                                        onNavigate={setCurrentQuestionIndex} 
                                        isAnswered={isQuestionAnswered} 
                                        practiceExam={practiceExam} 
                                        submittedSubjects={submittedSubjectIds}
                                    />
                                </ScrollArea>
                            </div>
                        </div>
                    </main>
                    
                    {/* MOBILE: PALETTE BUTTON & SHEET */}
                    <div className="lg:hidden fixed bottom-24 left-6 z-50">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button type="button" size="icon" className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl border-2 border-white ring-4 ring-indigo-500/20 active:scale-95 transition-all">
                                    <LayoutGrid className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-white p-6 h-[70vh]">
                                <SheetHeader className="mb-4">
                                    <SheetTitle className="flex items-center justify-center gap-3 font-black text-xl">Soru Gezgini</SheetTitle>
                                </SheetHeader>
                                <ScrollArea className="h-full">
                                    <div className="pb-24">
                                        <QuestionPalette 
                                            total={totalQuestions} 
                                            currentIndex={currentQuestionIndex} 
                                            onNavigate={(idx) => {
                                                setCurrentQuestionIndex(idx);
                                                setIsSheetOpen(false);
                                            }} 
                                            isAnswered={isQuestionAnswered} 
                                            practiceExam={practiceExam} 
                                            submittedSubjects={submittedSubjectIds}
                                        />
                                    </div>
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </form>
        </Form>
    );
}
