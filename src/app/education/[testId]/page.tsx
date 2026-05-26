
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test as TestType, QuickTestQuestion, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, BookOpen, GraduationCap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { doc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

// MODÜLER BİLEŞENLER
import { MCQSolver } from "@/components/education/test-solver/mcq-solver";
import { OpenEndedSolver } from "@/components/education/test-solver/open-ended-solver";
import { EvaluationScreen } from "@/components/education/test-solver/evaluation-screen";
import { ResultScreen } from "@/components/education/test-solver/result-screen";
import { TestTimer } from "@/components/education/test-solver/shared-components";

export default function GenericTestPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user, familyId } = useAuth();
    
    const testId = params.testId as string;
    const isEvaluationMode = searchParams.get('mode') === 'evaluate';

    const [test, setTest] = React.useState<TestType | null>(null);
    const [questions, setQuestions] = React.useState<QuickTestQuestion[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    // Geçici form durumları
    const [studentAnswers, setStudentAnswers] = React.useState<{ [key: string]: string | null }>({});
    const [studentTextAnswers, setStudentTextAnswers] = React.useState<{ [key: string]: string }>({});
    const [evaluations, setEvaluations] = React.useState<{ [key: string]: EvaluationStatus }>({});
    const [feedbacks, setFeedbacks] = React.useState<{ [key: string]: string }>({});
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Veri Yükleme
    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubTest = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as TestType;
                setTest(data);
                
                // İlk yüklemede cevapları senkronize et
                setStudentAnswers(data.studentAnswers || {});
                setStudentTextAnswers(data.studentTextAnswers || {});
                setEvaluations(data.studentTextAnswersEvaluation || {});
                setFeedbacks(data.studentTextAnswersFeedback || {});

                // Soruları çek (Subcollection)
                const qCol = collection(db, 'tests', testId, 'questions');
                const qSnap = await getDocs(query(qCol, orderBy("questionNumber")));
                setQuestions(qSnap.docs.map(d => d.data() as QuickTestQuestion));
            }
            setIsLoading(false);
        });
        
        return () => unsubTest();
    }, [testId]);

    // Anlık Kayıt (Debounced)
    const debouncedSave = React.useCallback(async (latestMcq: any, latestText: any) => {
        if (!test || test.status === 'Sonuçlandı') return;
        try {
            await updateTest(test.id, {
                studentAnswers: latestMcq,
                studentTextAnswers: latestText,
            });
        } catch (e) { console.error("Auto-save failed", e); }
    }, [test]);

    const handleMcqAnswer = (qNum: string, answer: string) => {
        const updated = { ...studentAnswers, [qNum]: answer };
        setStudentAnswers(updated);
        debouncedSave(updated, studentTextAnswers);
    };

    const handleTextAnswer = (qNum: string, answer: string) => {
        const updated = { ...studentTextAnswers, [qNum]: answer };
        setStudentTextAnswers(updated);
        debouncedSave(studentAnswers, updated);
    };

    // Sınavı Bitirme (Öğrenci)
    const handleFinishTest = async () => {
        if (!test || !familyId) return;
        setIsSubmitting(true);
        try {
            let updatedData: Partial<TestType> = { 
                studentAnswers,
                studentTextAnswers,
                status: test.openEnded ? 'Değerlendirme Bekliyor' : 'Sonuçlandı'
            };

            // Eğer çoktan seçmeli ise otomatik puanla
            if (!test.openEnded) {
                let correct = 0, incorrect = 0, empty = 0;
                questions.forEach((_, i) => {
                    const qNum = (i + 1).toString();
                    const sAns = studentAnswers[qNum];
                    const cAns = test.answerKey?.[qNum];
                    if (!sAns) empty++;
                    else if (sAns === cAns) correct++;
                    else incorrect++;
                });
                updatedData.correctAnswers = correct;
                updatedData.incorrectAnswers = incorrect;
                updatedData.emptyAnswers = empty;
                updatedData.score = (correct / questions.length) * 100;
                
                await checkAndAwardBadges(test.studentId, familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            }

            await updateTest(test.id, updatedData);
            toast({ title: updatedData.status === 'Sonuçlandı' ? "Sınav Bitti! 🎉" : "Cevaplar Gönderildi! ✅" });
            router.push('/education');
        } catch (e) { toast({ title: "Hata", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    // Değerlendirmeyi Kaydet (Öğretmen)
    const handleFinishEvaluation = async () => {
        if (!test || !familyId) return;
        setIsSubmitting(true);
        try {
            let correct = 0, incorrect = 0, empty = 0;
            questions.forEach((_, i) => {
                const status = evaluations[(i+1).toString()] || 'empty';
                if (status === 'correct') correct++;
                else if (status === 'incorrect') incorrect++;
                else empty++;
            });

            const score = (correct / questions.length) * 100;
            const updatedData: Partial<TestType> = {
                status: 'Sonuçlandı',
                correctAnswers: correct,
                incorrectAnswers: incorrect,
                emptyAnswers: empty,
                score,
                studentTextAnswersEvaluation: evaluations,
                studentTextAnswersFeedback: feedbacks
            };

            await updateTest(test.id, updatedData);
            await checkAndAwardBadges(test.studentId, familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            
            toast({ title: "Değerlendirme Kaydedildi! ✨" });
            router.push('/education');
        } catch (e) { toast({ title: "Hata", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen space-y-4"><h1>Test Bulunamadı</h1><Link href="/education"><Button>Geri Dön</Button></Link></div>;

    // RENDER MANTIĞI
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 md:p-8">
            <header className="max-w-7xl mx-auto w-full mb-8 flex justify-between items-center bg-white dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/education')} className="rounded-full"><ArrowLeft/></Button>
                    <div>
                        <h1 className="text-lg font-black leading-none">{test.title}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{test.subject}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {test.status === 'Atandı' && test.durationMinutes && <TestTimer durationMinutes={test.durationMinutes} onTimeUp={handleFinishTest} />}
                    {test.status === 'Sonuçlandı' && <Badge className="bg-emerald-600 px-4 py-1 rounded-full font-black">SONUÇLANDI</Badge>}
                    {test.status === 'Değerlendirme Bekliyor' && <Badge className="bg-amber-600 px-4 py-1 rounded-full font-black">DEĞERLENDİRME BEKLİYOR</Badge>}
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full flex-1">
                {/* 1. MOD: SINAV ÇÖZME */}
                {test.status === 'Atandı' && (
                    test.openEnded ? (
                        <OpenEndedSolver 
                            test={test} 
                            questions={questions} 
                            studentTextAnswers={studentTextAnswers} 
                            onAnswer={handleTextAnswer} 
                            onFinish={handleFinishTest} 
                        />
                    ) : (
                        <MCQSolver 
                            test={test} 
                            questions={questions} 
                            studentAnswers={studentAnswers} 
                            onAnswer={handleMcqAnswer} 
                            onFinish={handleFinishTest} 
                        />
                    )
                )}

                {/* 2. MOD: DEĞERLENDİRME (Ebeveyn/Öğretmen) */}
                {test.status === 'Değerlendirme Bekliyor' && (
                    isEvaluationMode ? (
                        <EvaluationScreen 
                            test={test} 
                            questions={questions} 
                            evaluations={evaluations} 
                            feedbacks={feedbacks} 
                            onEvaluate={(q, s) => setEvaluations(prev => ({...prev, [q]: s}))}
                            onFeedback={(q, f) => setFeedbacks(prev => ({...prev, [q]: f}))}
                            onFinish={handleFinishEvaluation}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <GraduationCap className="w-16 h-16 text-indigo-400" />
                            <h2 className="text-2xl font-bold">Ödevin Değerlendirilmeyi Bekliyor!</h2>
                            <p className="text-slate-500">Cevapların ebeveynine ulaştı. Puanlanınca burada görebileceksin.</p>
                            <Link href="/education"><Button variant="outline">Geri Dön</Button></Link>
                        </div>
                    )
                )}

                {/* 3. MOD: SONUÇ İNCELEME */}
                {test.status === 'Sonuçlandı' && (
                    <ResultScreen test={test} questions={questions} />
                )}
            </main>
        </div>
    );
}
