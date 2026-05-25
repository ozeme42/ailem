
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test as TestType, QuickTestQuestion, PracticeExam, EvaluationStatus } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, FileQuestion, ArrowRight, Play, Pause, Check, X, MinusCircle, LayoutGrid, BookOpen, ChevronRight, Home, Loader2, Sparkles, Trophy, ChevronLeft, CheckCircle2, XCircle, Eye, Send, MessageSquareText } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { tr } from "date-fns/locale";
import { format, parseISO, isBefore, startOfDay, isSameDay, isWithinInterval, getDate, getMonth, addMonths, addYears, setDate, compareAsc, differenceInDays, isAfter, isSameMonth } from "date-fns";

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
type TextFeedback = { [key: string]: string };

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
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user, familyId } = useAuth();
    
    const testId = params.testId as string;
    const isEvaluateMode = searchParams.get('mode') === 'evaluate';

    const [test, setTest] = React.useState<TestType | null>(null);
    const [practiceExam, setPracticeExam] = React.useState<PracticeExam | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [mcqAnswers, setMcqAnswers] = React.useState<McqAnswers>({});
    const [textAnswers, setTextAnswers] = React.useState<TextAnswers>({});
    const [manualEvaluation, setManualEvaluation] = React.useState<ManualEvaluation>({});
    const [textFeedback, setTextFeedback] = React.useState<TextFeedback>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [submittedSubjectIds, setSubmittedSubjectIds] = React.useState<string[]>([]);
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [viewingQuestionIndex, setViewingQuestionIndex] = React.useState<number | null>(null);
    
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
                
                if ((currentTest.sourceType === 'quick' || currentTest.sourceType === 'bank' || currentTest.sourceType === 'mistake' || currentTest.sourceType === 'trackedBook') && (!currentTest.questions || currentTest.questions.length === 0)) {
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
                    setTextFeedback(currentTest.studentTextAnswersFeedback || {});
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

    const handleFeedbackChange = (questionNumber: number, value: string) => {
        const updated = { ...textFeedback, [questionNumber.toString()]: value };
        setTextFeedback(updated);
    };

    const handleSaveEvaluationDraft = async () => {
        if (!test) return;
        try {
            await updateTest(test.id, {
                studentTextAnswersEvaluation: manualEvaluation,
                studentTextAnswersFeedback: textFeedback,
            });
            toast({ title: "Taslak Kaydedildi", description: "Değerlendirme ilerlemeniz kaydedildi." });
        } catch (e) {
            toast({ title: "Hata", variant: 'destructive' });
        }
    };

    const handleSubmitEvaluation = async () => {
        if (!test) return;
        setIsSubmitting(true);
        try {
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
            let correct = 0, incorrect = 0, empty = 0, partial = 0;
            let totalPoints = 0;
            
            for (let i = 1; i <= questionCount; i++) {
                const status = manualEvaluation[i.toString()];
                if (status === 'correct') {
                    correct++;
                    totalPoints += 1;
                } else if (status === 'partial') {
                    partial++;
                    totalPoints += 0.5;
                } else if (status === 'incorrect') {
                    incorrect++;
                } else {
                    empty++;
                }
            }

            const calculatedScore = (totalPoints / questionCount) * 100;

            await updateTest(test.id, {
                studentTextAnswersEvaluation: manualEvaluation,
                studentTextAnswersFeedback: textFeedback,
                status: 'Sonuçlandı',
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                emptyAnswers: empty,
                score: calculatedScore
            });

            toast({ title: "Değerlendirme Tamamlandı", description: `Başarı: %${calculatedScore.toFixed(0)}` });
            
            if (test.familyId && test.studentId) {
                await checkAndAwardBadges(test.studentId, test.familyId, { 
                    type: 'test_completed', 
                    test: { ...test, status: 'Sonuçlandı', correctAnswers: correct, incorrectAnswers: incorrect, emptyAnswers: empty, score: calculatedScore } 
                });
            }
        } catch (e) {
            toast({ title: "Hata", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = React.useCallback(async (isFinishedByTimer = false) => {
        if (!test || !user) return;
        
        const isMcqTest = !test.openEnded || test.sourceType === 'html' || test.sourceType === 'json';
        
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
                
                let answerKey = test.answerKey || {};
                if (test.sourceType === 'json' && test.jsonQuestions) {
                     answerKey = test.jsonQuestions.reduce((acc, q, i) => ({ ...acc, [(i+1).toString()]: q.answer }), {});
                }
                
                if (answerKey && Object.keys(answerKey).length > 0) {
                    let correct = 0, incorrect = 0, empty = 0;
                    for (let i = 1; i <= questionCount; i++) {
                        const qNumStr = i.toString();
                        const studentAns = allStudentMcqAnswers[qNumStr];
                        const correctAns = (answerKey as any)[qNumStr];
                        
                        if (!studentAns) {
                            empty++;
                        } else if (studentAns === correctAns) {
                            correct++;
                        } else {
                            incorrect++;
                        }
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
            
            if (updatedData.status === 'Sonuçlandı') {
                toast({ title: "Sınav Sonuçlandı!", description: `Başarı: %${updatedData.score?.toFixed(0)}`, className: "bg-indigo-600 border-none text-white" });
                if (test.familyId && test.studentId) {
                    await checkAndAwardBadges(test.studentId, test.familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
                }
            } else {
                toast({ title: isFinishedByTimer ? "Süre Doldu!" : "Ödev Gönderildi!", description: "Cevapların kaydedildi. Değerlendirme bekliyor.", className: "bg-emerald-600 border-none text-white" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata!", description: "Kaydedilirken bir sorun oluştu." });
        } finally {
            setIsSubmitting(false);
        }
    }, [test, mcqAnswers, textAnswers, toast, user]);

    const handleSubjectFinish = async (subjectId: string) => {
        await handleSavePartial(mcqAnswers, textAnswers);
        setSubmittedSubjectIds(prev => [...new Set([...prev, subjectId])]);
        toast({ title: "Ders Kaydedildi" });
    }

    const isQuestionAnswered = (index: number): boolean => {
        const qNumStr = (index + 1).toString();
        return test?.openEnded ? !!textAnswers[qNumStr] : !!mcqAnswers[qNumStr];
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-indigo-600 mr-4" /><p className="text-slate-500 font-medium animate-pulse">Test Yükleniyor...</p></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50"><h1 className="text-3xl font-black mb-2">Test Bulunamadı</h1><Link href="/education"><Button size="lg" className={glassColors.BUTTON_GLASS}>Geri Dön</Button></Link></div>;

    // --- EVALUATION MODE (For Teachers/Parents) ---
    if (test.status === 'Değerlendirme Bekliyor') {
        if (isEvaluateMode) {
            const questionCount = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
            const totalEvaluated = Object.keys(manualEvaluation).length;

            return (
                <div className={cn("min-h-screen text-slate-900 font-sans p-4 sm:p-8", glassColors.PAGE_BG)}>
                    <div className="max-w-4xl mx-auto w-full space-y-8 pb-32">
                        <header className="flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-200 sticky top-4 z-50">
                            <Button variant="ghost" onClick={() => router.push('/education/all-tests')} className="text-slate-500 hover:text-slate-900"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="sm" onClick={handleSaveEvaluationDraft} className="rounded-xl h-9 border-slate-300">Taslak Kaydet</Button>
                                <Badge className="bg-blue-600 text-white border-0 font-bold uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-lg shadow-blue-500/20">Değerlendirme Modu</Badge>
                            </div>
                        </header>

                        <div className="space-y-6">
                            {Array.from({ length: questionCount }).map((_, i) => {
                                const qNum = i + 1;
                                const studentAns = textAnswers[qNum.toString()] || mcqAnswers[qNum.toString()];
                                const status = manualEvaluation[qNum.toString()];

                                return (
                                    <Card key={qNum} className={cn("rounded-3xl border transition-all", status === 'correct' ? 'border-emerald-200 bg-emerald-50/30' : status === 'partial' ? 'border-amber-200 bg-amber-50/30' : status === 'incorrect' ? 'border-rose-200 bg-rose-50/30' : status === 'empty' ? 'border-slate-300 bg-slate-100/50' : 'border-slate-200 bg-white shadow-sm')}>
                                        <CardHeader className="pb-4 border-b flex flex-row justify-between items-center bg-slate-50/50 rounded-t-3xl gap-4">
                                            <Badge className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center p-0 text-base font-black shrink-0">{qNum}</Badge>
                                            <div className="flex flex-wrap justify-end gap-1.5 flex-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleEvaluate(qNum, 'correct')}
                                                    className={cn("h-8 rounded-lg gap-1.5 px-3 text-[11px] font-bold", status === 'correct' ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-white border-slate-200 text-slate-500")}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Doğru
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleEvaluate(qNum, 'partial')}
                                                    className={cn("h-8 rounded-lg gap-1.5 px-3 text-[11px] font-bold", status === 'partial' ? "bg-amber-500 text-white border-amber-500 shadow-md" : "bg-white border-slate-200 text-slate-500")}
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" /> Kısmi
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleEvaluate(qNum, 'incorrect')}
                                                    className={cn("h-8 rounded-lg gap-1.5 px-3 text-[11px] font-bold", status === 'incorrect' ? "bg-rose-600 text-white border-rose-600 shadow-md" : "bg-white border-slate-200 text-slate-500")}
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Yanlış
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleEvaluate(qNum, 'empty')}
                                                    className={cn("h-8 rounded-lg gap-1.5 px-3 text-[11px] font-bold", status === 'empty' ? "bg-slate-600 text-white border-slate-600 shadow-md" : "bg-white border-slate-200 text-slate-500")}
                                                >
                                                    <MinusCircle className="w-3.5 h-3.5" /> Boş
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Question Content */}
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soru Görseli / Metni</p>
                                                    {test.jsonQuestions && test.jsonQuestions[i] && (
                                                        <p className="text-lg font-bold text-slate-700 bg-white p-4 rounded-xl border">{test.jsonQuestions[i].text}</p>
                                                    )}
                                                    {test.questions && test.questions[i] && (
                                                        <div className="relative aspect-video bg-white rounded-xl overflow-hidden border border-slate-200 shadow-inner group">
                                                            <Image src={test.questions[i].imageUrl} alt="Soru" fill className="object-contain p-2" />
                                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 bg-black/5 opacity-0 group-hover:opacity-100" onClick={() => setViewingQuestionIndex(i)}>
                                                                <Maximize2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Student Answer */}
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Öğrenci Cevabı</p>
                                                    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-inner min-h-[120px]">
                                                        <p className="text-lg font-medium text-slate-700 leading-relaxed italic">{studentAns || "— Cevap verilmedi —"}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Teacher Feedback */}
                                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <MessageSquareText className="w-3.5 h-3.5 text-indigo-500" /> Öğretmen Geri Bildirimi
                                                </Label>
                                                <Textarea 
                                                    placeholder="Öğrenciye not bırakın..." 
                                                    value={textFeedback[qNum.toString()] || ""} 
                                                    onChange={(e) => handleFeedbackChange(qNum, e.target.value)}
                                                    className="bg-white border-slate-200 min-h-[80px] rounded-xl text-sm"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
                            <Card className="rounded-[2.5rem] bg-white border-slate-200 shadow-2xl p-2 flex gap-2">
                                <Button 
                                    size="lg" 
                                    disabled={totalEvaluated < questionCount || isSubmitting}
                                    onClick={handleSubmitEvaluation}
                                    className="flex-1 h-14 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white text-base font-black shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 disabled:grayscale"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Check className="mr-2 h-6 w-6"/>}
                                    {totalEvaluated < questionCount ? `${questionCount - totalEvaluated} Soru Daha Var` : "Değerlendirmeyi Bitir"}
                                </Button>
                            </Card>
                        </div>
                    </div>
                </div>
            )
        } else {
            return (
                <div className={cn("min-h-screen flex items-center justify-center p-4", glassColors.PAGE_BG)}>
                    <Card className="max-w-md w-full rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl border-none bg-white">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto text-indigo-600">
                            <Send className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Ödev Gönderildi!</h2>
                            <p className="text-slate-500 mt-2">Cevapların başarıyla kaydedildi. Değerlendirme bekliyor.</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border-none font-bold px-4 py-1.5 rounded-xl">Eğitmen Onayı Bekleniyor</Badge>
                        <div className="pt-4">
                            <Button onClick={() => router.push('/education')} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20">
                                Eğitim Sayfasına Dön
                            </Button>
                        </div>
                    </Card>
                </div>
            )
        }
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
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 px-4 py-1.5 font-black uppercase tracking-widest rounded-xl">Tamamlandı</Badge>
                    </header>
                    <Card className="flex flex-col items-center justify-center py-12 border-emerald-200 bg-emerald-50/50 backdrop-blur-md rounded-[3rem] shadow-xl">
                        <p className="text-sm text-emerald-700 font-black tracking-widest uppercase mb-2">Başarı Puanı</p>
                        <div className="text-9xl font-black text-emerald-700 tracking-tighter drop-shadow-sm">{(test.score || 0).toFixed(0)}</div>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                            <Badge className="bg-emerald-600 text-white border-0 text-base font-bold px-5 py-2 rounded-2xl shadow-md">{test.correctAnswers} Doğru</Badge>
                            <Badge className="bg-rose-600 text-white border-0 text-base font-bold px-5 py-2 rounded-2xl shadow-md">{test.incorrectAnswers} Yanlış</Badge>
                            <Badge className="bg-slate-500 text-white border-0 text-base font-bold px-5 py-2 rounded-2xl shadow-md">{test.emptyAnswers} Boş</Badge>
                        </div>
                    </Card>
                    <Card className={cn(glassColors.CARD_BG, "rounded-[3rem] overflow-hidden")}>
                        <CardHeader className="p-8 border-b bg-slate-50/50">
                            <CardTitle className="flex items-center justify-between text-2xl font-black">
                                <span>Cevap Özeti</span>
                                <span className="text-xs font-bold text-slate-400 font-sans">* Soru detayları için tıklayın.</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            {practiceExam ? (
                                subjectsWithRanges.map(subject => (
                                    <div key={subject.id} className="space-y-4">
                                        <h3 className="font-black text-slate-800 px-2 flex items-center gap-3 text-lg"><div className="w-2 h-6 bg-indigo-500 rounded-full" />{subject.name}</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {Array.from({ length: subject.questionCount }).map((_, i) => {
                                                const qNum = subject.range.start + i;
                                                const qNumStr = qNum.toString();
                                                const studentAns = studentAnswers[qNumStr];
                                                const correctAns = answerKey[qNumStr];
                                                const evalStatus = studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty');
                                                let statusColor = evalStatus === 'correct' ? "border-emerald-200 bg-emerald-50/50" : (evalStatus === 'incorrect' ? "border-rose-200 bg-rose-50/50" : "border-slate-100 bg-slate-50/30");
                                                return (
                                                    <button 
                                                        key={qNumStr} 
                                                        onClick={() => setViewingQuestionIndex(qNum - 1)}
                                                        className={cn("p-4 border rounded-2xl flex justify-between items-center transition-all hover:scale-[1.03] active:scale-95 group shadow-sm", statusColor)}
                                                    >
                                                        <span className="font-black text-slate-400 text-sm">{i + 1}</span>
                                                        <div className="flex gap-2 items-center">
                                                            <span className={cn("font-black text-base", evalStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns || '-'}</span>
                                                            {evalStatus === 'incorrect' && <span className="font-black text-emerald-600 text-base">{correctAns}</span>}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {Array.from({ length: questionCount }).map((_, index) => {
                                        const qNum = index + 1;
                                        const qNumStr = qNum.toString();
                                        const studentAns = studentAnswers[qNumStr] || test.studentTextAnswers?.[qNumStr];
                                        const correctAns = answerKey[qNumStr];
                                        
                                        const evalFromStatus = test.studentTextAnswersEvaluation?.[qNumStr] || (studentAns === correctAns ? 'correct' : (studentAns ? 'incorrect' : 'empty'));
                                        
                                        let statusColor = evalFromStatus === 'correct' ? "border-emerald-200 bg-emerald-50" : evalFromStatus === 'partial' ? "border-amber-200 bg-amber-50" : (evalFromStatus === 'incorrect' ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50");
                                        return (
                                            <button 
                                                key={qNumStr} 
                                                onClick={() => setViewingQuestionIndex(index)}
                                                className={cn("p-4 border rounded-2xl flex justify-between items-center transition-all hover:scale-[1.05] active:scale-95 group shadow-sm", statusColor)}
                                            >
                                                <span className="font-black text-slate-400 text-sm">{qNumStr}</span>
                                                <div className="flex gap-2">
                                                    <span className={cn("font-black text-base", evalFromStatus === 'incorrect' ? 'text-rose-600' : 'text-slate-800')}>{studentAns?.length && studentAns.length > 3 ? "..." : (studentAns || '-')}</span>
                                                    <Eye className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 ml-1" />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex justify-center pt-8"><Button size="lg" className="h-16 rounded-[2rem] bg-white text-slate-900 border border-slate-200 px-10 py-6 text-xl font-black shadow-xl transition-all active:scale-95" onClick={() => router.push('/education')}><Home className="mr-3 h-7 w-7 text-indigo-600" />Eğitim Sayfası</Button></div>
                </div>

                {/* Soru İnceleme Modalı */}
                <Dialog open={viewingQuestionIndex !== null} onOpenChange={(open) => !open && setViewingQuestionIndex(null)}>
                    <DialogContent className="sm:max-w-3xl bg-white border-slate-200 text-slate-900 rounded-[2.5rem] overflow-hidden p-0 shadow-2xl">
                        {viewingQuestionIndex !== null && (
                            <>
                                <DialogHeader className="p-8 border-b bg-slate-50/50">
                                    <DialogTitle className="flex items-center gap-4 text-2xl font-black">
                                        <Badge className="h-12 w-12 rounded-full flex items-center justify-center p-0 text-xl font-black bg-indigo-600">
                                            {viewingQuestionIndex + 1}
                                        </Badge>
                                        Soru İnceleme
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="p-0 max-h-[60vh] overflow-y-auto">
                                    {test.sourceType === 'json' && test.jsonQuestions ? (
                                        <div className="p-8 space-y-8">
                                            <p className="text-2xl font-bold text-slate-800 leading-tight">
                                                {test.jsonQuestions[viewingQuestionIndex].text}
                                            </p>
                                            <div className="space-y-4">
                                                {test.jsonQuestions[viewingQuestionIndex].options.map((opt, idx) => {
                                                    const letter = String.fromCharCode(65 + idx);
                                                    const isCorrect = opt === test.jsonQuestions![viewingQuestionIndex!].answer;
                                                    const studentAns = test.studentAnswers?.[(viewingQuestionIndex! + 1).toString()];
                                                    const isStudentAns = opt === studentAns;
                                                    
                                                    return (
                                                        <div key={idx} className={cn(
                                                            "p-5 rounded-2xl border-2 flex items-center gap-5 shadow-sm transition-all",
                                                            isCorrect ? "bg-emerald-50 border-emerald-500" : isStudentAns ? "bg-rose-50 border-rose-500" : "bg-white border-slate-100"
                                                        )}>
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-base",
                                                                isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : isStudentAns ? "bg-rose-500 border-rose-500 text-white" : "border-slate-200 text-slate-400"
                                                            )}>
                                                                {letter}
                                                            </div>
                                                            <span className={cn("font-bold text-lg", isCorrect ? "text-emerald-700" : isStudentAns ? "text-rose-700" : "text-slate-600")}>
                                                                {opt}
                                                            </span>
                                                            {isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500 ml-auto" />}
                                                            {isStudentAns && !isCorrect && <XCircle className="w-6 h-6 text-rose-500 ml-auto" />}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <div className="relative w-full aspect-video bg-slate-100 border-b">
                                                {test.questions && test.questions[viewingQuestionIndex] && (
                                                    <Image 
                                                        src={test.questions[viewingQuestionIndex].imageUrl} 
                                                        alt={`Soru ${viewingQuestionIndex + 1}`} 
                                                        fill 
                                                        className="object-contain p-4"
                                                    />
                                                )}
                                            </div>
                                            <div className="p-8 bg-white space-y-6">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 shadow-sm">
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Doğru Cevap</p>
                                                        <p className="text-3xl font-black text-emerald-700">
                                                            {answerKey[(viewingQuestionIndex + 1).toString()] || '-'}
                                                        </p>
                                                    </div>
                                                    <div className={cn(
                                                        "p-6 rounded-3xl border shadow-sm",
                                                        (studentAnswers[(viewingQuestionIndex + 1).toString()] === answerKey[(viewingQuestionIndex + 1).toString()])
                                                            ? "bg-emerald-50 border-emerald-100"
                                                            : "bg-rose-50 border-rose-100"
                                                    )}>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Öğrenci Cevabı</p>
                                                        <p className={cn(
                                                            "text-3xl font-black",
                                                            (studentAnswers[(viewingQuestionIndex + 1).toString()] === answerKey[(viewingQuestionIndex + 1).toString()])
                                                                ? "text-emerald-700"
                                                                : "text-rose-700"
                                                        )}>
                                                            {studentAnswers[(viewingQuestionIndex + 1).toString()] || '-'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {test.studentTextAnswersFeedback?.[(viewingQuestionIndex + 1).toString()] && (
                                                    <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <MessageSquareText className="w-3.5 h-3.5" /> Öğretmen Notu
                                                        </p>
                                                        <p className="text-sm font-bold text-indigo-900 leading-relaxed italic">
                                                            {test.studentTextAnswersFeedback[(viewingQuestionIndex + 1).toString()]}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter className="p-8 bg-slate-50">
                                    <Button onClick={() => setViewingQuestionIndex(null)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-lg">Kapat</Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    const totalQuestions = test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount;
    const isSingleQuestionView = test.sourceType === 'json' || test.sourceType === 'bank' || test.sourceType === 'mistake' || test.sourceType === 'quick' || test.sourceType === 'trackedBook';
    const isHtmlTest = test.sourceType === 'html';
    
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

    const HtmlOpticalForm = () => (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-indigo-600" /> Optik Form
                </h3>
                <Badge variant="secondary" className="bg-white border-slate-200 text-indigo-600 font-bold">
                    {Object.keys(mcqAnswers).length}/{totalQuestions}
                </Badge>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                    {Array.from({ length: totalQuestions }).map((_, i) => {
                        const qNum = (i + 1).toString();
                        return (
                            <div key={qNum} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="w-6 font-bold text-slate-400 text-xs">{i + 1}</div>
                                <RadioGroup 
                                    value={mcqAnswers[qNum] || ""} 
                                    onValueChange={(v) => handleMcqAnswerChange(qNum, v)}
                                    className="flex-1 flex justify-between gap-1"
                                >
                                    {options.map(option => (
                                        <div key={option} className="flex flex-col items-center gap-1">
                                            <RadioGroupItem value={option} id={`q${qNum}-${option}`} className="peer sr-only" />
                                            <Label htmlFor={`q${qNum}-${option}`} className={cn(glassColors.OPTION_BUTTON, "w-8 h-8 text-[10px] rounded-lg")}>{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-slate-50/50 shrink-0">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" size="lg" className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4"/> : "Sınavı Bitir"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white rounded-3xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Bitirmek İstediğine Emin Misin?</AlertDialogTitle>
                            <AlertDialogDescription>Tüm cevapların kaydedilecek ve puanın hesaplanacak.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Vazgeç</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 rounded-xl">Bitir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => handleSubmit(false))} className="h-full flex flex-col">
                <div className={cn("min-h-screen text-slate-900 font-sans flex flex-col p-4 sm:p-8", glassColors.PAGE_BG)}>
                    <header className="max-w-7xl mx-auto w-full mb-8 flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
                        <Button type="button" variant="ghost" onClick={() => router.push('/education')} className="text-slate-500 hover:text-slate-900 rounded-2xl"><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Button>
                        <div className="text-center hidden sm:block">
                            <h1 className="text-lg font-black text-slate-900 tracking-tight">{test.title}</h1>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{test.subject}</p>
                        </div>
                        <Timer durationMinutes={testDurationMinutes} onTimeUp={() => handleSubmit(true)} />
                    </header>

                    {isHtmlTest ? (
                        <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px] mb-20 lg:mb-0">
                            <div className="lg:col-span-9 h-full bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl relative min-h-[500px]">
                                 {test.htmlContent ? (
                                    <iframe 
                                        srcDoc={`<!DOCTYPE html><html><head><style>body { font-family: sans-serif; padding: 20px; line-height: 1.6; } img { max-width: 100%; height: auto; border-radius: 8px; }</style></head><body>${test.htmlContent}</body></html>`}
                                        className="w-full h-full border-none"
                                        title={test.title}
                                    />
                                 ) : (
                                     <div className="h-full flex items-center justify-center text-slate-400">İçerik yüklenemedi.</div>
                                 )}
                            </div>
                            
                            <div className="hidden lg:flex lg:col-span-3 h-full flex-col sticky top-28 max-h-[70vh]">
                                <HtmlOpticalForm />
                            </div>
                        </main>
                    ) : (
                        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
                            
                            <div className="lg:col-span-8 space-y-6">
                                <AnimatePresence mode="wait">
                                    {isSingleQuestionView ? (
                                        <motion.div 
                                            key={currentQuestionIndex}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.02 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {test.sourceType === 'json' && test.jsonQuestions ? (
                                                <Card className="overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-[2.5rem]">
                                                    <CardHeader className="bg-slate-50/50 border-b p-8">
                                                        <div className="flex gap-6">
                                                            <Badge className="h-14 w-14 rounded-3xl flex items-center justify-center p-0 text-2xl font-black bg-indigo-600 shrink-0 shadow-lg shadow-indigo-500/30">
                                                                {currentQuestionIndex + 1}
                                                            </Badge>
                                                            <p className="text-2xl font-bold text-slate-800 leading-snug pt-1">
                                                                {test.jsonQuestions[currentQuestionIndex].text}
                                                            </p>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-8">
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
                                                                            "relative flex items-center space-x-3 p-6 rounded-3xl border-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]",
                                                                            isSelected 
                                                                                ? "bg-indigo-50 border-indigo-600 ring-4 ring-indigo-500/10" 
                                                                                : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                                                                        )}
                                                                    >
                                                                        <RadioGroupItem value={opt} id={itemId} className="peer sr-only" />
                                                                        <Label 
                                                                            htmlFor={itemId} 
                                                                            className="flex flex-1 items-center gap-5 cursor-pointer"
                                                                        >
                                                                            <div className={cn(
                                                                                "w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-lg shrink-0 transition-colors",
                                                                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-400"
                                                                            )}>
                                                                                {letter}
                                                                            </div>
                                                                            <span className="text-xl font-bold text-slate-700">{opt}</span>
                                                                        </Label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </RadioGroup>
                                                    </CardContent>
                                                </Card>
                                            ) : (
                                                <Card className="overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-[3rem]">
                                                    <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <Badge className="h-14 w-14 rounded-3xl flex items-center justify-center p-0 text-2xl font-black bg-indigo-600 shrink-0 shadow-lg shadow-indigo-500/20">
                                                                {currentQuestionIndex + 1}
                                                            </Badge>
                                                            <div className="hidden sm:block">
                                                                <h2 className="text-lg font-black text-slate-800">Soru İçeriği</h2>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Görseli inceleyerek cevabınızı verin.</p>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-0">
                                                        <div className="relative w-full aspect-video bg-slate-50 border-b">
                                                            {test.questions && test.questions[currentQuestionIndex] && (
                                                                <Image 
                                                                    src={test.questions[currentQuestionIndex].imageUrl} 
                                                                    alt={`Soru ${currentQuestionIndex + 1}`} 
                                                                    fill 
                                                                    className="object-contain p-6"
                                                                    data-ai-hint="exam question"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="p-8 md:p-10 bg-white">
                                                            <p className="text-xs font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">Sizin Cevabınız</p>
                                                            {test.openEnded ? (
                                                                <Textarea 
                                                                    placeholder="Cevabınızı detaylıca buraya yazın..." 
                                                                    value={textAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                                    onChange={(e) => handleTextAnswerChange(currentQuestionIndex + 1, e.target.value)} 
                                                                    className={cn("min-h-[220px] rounded-3xl text-xl p-8 bg-slate-50 border-slate-200 focus:bg-white shadow-inner leading-relaxed transition-all", glassColors.INPUT_BG)}
                                                                />
                                                            ) : (
                                                                <RadioGroup 
                                                                    value={mcqAnswers[(currentQuestionIndex + 1).toString()] || ""} 
                                                                    onValueChange={(v) => handleMcqAnswerChange((currentQuestionIndex + 1).toString(), v)}
                                                                    className="flex flex-wrap gap-5 justify-center sm:justify-start"
                                                                >
                                                                    {options.slice(0, 5).map(opt => (
                                                                        <div key={opt} className="flex items-center">
                                                                            <RadioGroupItem value={opt} id={`opt-${opt}`} className="peer sr-only" />
                                                                            <Label htmlFor={`opt-${opt}`} className={cn(glassColors.OPTION_BUTTON, "w-16 h-16 text-2xl rounded-2xl shadow-sm")}>{opt}</Label>
                                                                        </div>
                                                                    ))}
                                                                </RadioGroup>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            <div className="flex justify-between items-center mt-10 gap-6">
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="lg"
                                                    onClick={handlePrev} 
                                                    disabled={currentQuestionIndex === 0}
                                                    className="h-16 rounded-[2rem] px-10 font-black border-slate-200 bg-white shadow-md active:scale-95 transition-all text-slate-600 disabled:opacity-30"
                                                >
                                                    <ChevronLeft className="mr-3 h-8 w-8" /> Önceki
                                                </Button>

                                                {currentQuestionIndex === totalQuestions - 1 ? (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button type="button" size="lg" className="h-16 rounded-[2rem] px-12 font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white active:scale-95 transition-all" disabled={isSubmitting}>
                                                                {isSubmitting ? <Loader2 className="animate-spin h-7 w-7"/> : "Ödevi Bitir"} <CheckCircle className="ml-3 h-7 w-7" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl p-8">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-3xl font-black tracking-tight">Emin misiniz?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-500 text-lg font-medium leading-relaxed">Cevaplarını kaydedip ödevi eğitmenine göndermek üzeresin.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="mt-8 gap-4 flex-row">
                                                                <AlertDialogCancel className="bg-slate-100 border-none rounded-2xl h-14 font-black flex-1 m-0">Vazgeç</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black flex-1 m-0 shadow-lg">Evet, Bitir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                ) : (
                                                    <Button 
                                                        type="button" 
                                                        size="lg"
                                                        onClick={handleNext} 
                                                        className="h-16 rounded-[2rem] px-12 font-black bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 text-white active:scale-95 transition-all"
                                                    >
                                                        Sonraki <ChevronRight className="ml-3 h-8 w-8" />
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <Accordion type="multiple" className="w-full space-y-4">
                                            {practiceExam?.subjects.map(subject => {
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
                                                        <AlertDialogFooter>
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

                            <div className="hidden lg:block lg:col-span-4">
                                <div className={cn("sticky top-28 rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white shadow-2xl")}>
                                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                                            <LayoutGrid className="w-5 h-5 text-indigo-600" /> Soru Gezgini
                                        </h3>
                                        <Badge variant="secondary" className="bg-white border-slate-200 text-indigo-600 font-bold px-3 py-1 rounded-xl shadow-sm">
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
                    )}
                    
                    <div className="lg:hidden fixed bottom-24 right-6 z-50">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button type="button" size="icon" className="h-16 w-16 rounded-[2rem] bg-indigo-600 text-white shadow-2xl border-4 border-white active:scale-95 transition-all">
                                    <LayoutGrid className="w-8 h-8" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-[3rem] bg-white p-8 h-[80vh] flex flex-col">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="flex items-center justify-center gap-4 font-black text-2xl tracking-tight">Soru Listesi</SheetTitle>
                                </SheetHeader>
                                <div className="flex-1 overflow-hidden">
                                    {isHtmlTest ? (
                                        <div className="h-full">
                                            <HtmlOpticalForm />
                                        </div>
                                    ) : (
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
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </form>
        </Form>
    );
}
