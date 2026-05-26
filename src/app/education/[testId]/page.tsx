"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test, QuickTestQuestion, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { doc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";

// --- MODÜLER BİLEŞENLER ---
import { MCQWizardSolver } from "@/components/education/test-solver/mcq-wizard-solver";
import { OpenEndedWizardSolver } from "@/components/education/test-solver/open-ended-wizard-solver";
import { JSONWizardSolver } from "@/components/education/test-solver/json-wizard-solver";
import { ExamOpticalSolver } from "@/components/education/test-solver/exam-optical-solver";
import { HTMLDocumentSolver } from "@/components/education/test-solver/html-document-solver";
import { EvaluationScreen } from "@/components/education/test-solver/evaluation-screen";
import { ResultScreen } from "@/components/education/test-solver/result-screen";
import { TestTimer } from "@/components/education/test-solver/shared-components";

export default function UnifiedTestPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { familyId } = useAuth();
    
    const testId = params.testId as string;
    const isEvaluationMode = searchParams.get('mode') === 'evaluate';

    const [test, setTest] = React.useState<Test | null>(null);
    const [questions, setQuestions] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    const [studentAnswers, setStudentAnswers] = React.useState<{ [key: string]: string | null }>({});
    const [studentTextAnswers, setStudentTextAnswers] = React.useState<{ [key: string]: string }>({});
    const [evaluations, setEvaluations] = React.useState<{ [key: string]: EvaluationStatus }>({});
    const [feedbacks, setFeedbacks] = React.useState<{ [key: string]: string }>({});
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // --- VERİ YÜKLEME ---
    React.useEffect(() => {
        if (!testId) return;
        const testDocRef = doc(db, 'tests', testId);
        
        const unsubTest = onSnapshot(testDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Test;
                setTest(data);
                
                setStudentAnswers(data.studentAnswers || {});
                setStudentTextAnswers(data.studentTextAnswers || {});
                setEvaluations(data.studentTextAnswersEvaluation || {});
                setFeedbacks(data.studentTextAnswersFeedback || {});

                if (data.sourceType === 'json' && data.jsonQuestions) {
                    setQuestions(data.jsonQuestions);
                } else if (data.sourceType !== 'exam' && data.sourceType !== 'html') {
                    const qCol = collection(db, 'tests', testId, 'questions');
                    const qSnap = await getDocs(query(qCol, orderBy("questionNumber")));
                    setQuestions(qSnap.docs.map(d => d.data() as QuickTestQuestion));
                }
            }
            setIsLoading(false);
        });
        
        return () => unsubTest();
    }, [testId]);

    // --- ANLIK KAYIT ---
    const debouncedSave = React.useCallback(async (latestMcq: any, latestText: any) => {
        if (!test || test.status === 'Sonuçlandı' || test.status === 'Değerlendirme Bekliyor') return;
        try {
            await updateTest(test.id, {
                studentAnswers: latestMcq,
                studentTextAnswers: latestText,
            });
        } catch (e) { console.error("Auto-save failed", e); }
    }, [test]);

    const handleAnswerUpdate = (qNum: string, answer: string, isText = false) => {
        if (isText) {
            const updated = { ...studentTextAnswers, [qNum]: answer };
            setStudentTextAnswers(updated);
            debouncedSave(studentAnswers, updated);
        } else {
            const updated = { ...studentAnswers, [qNum]: answer };
            setStudentAnswers(updated);
            debouncedSave(updated, studentTextAnswers);
        }
    };

    // --- ÖDEVİ BİTİR ---
    const handleFinishTest = async () => {
        if (!test || !familyId) return;
        setIsSubmitting(true);
        try {
            // Yazılı (JSON) ve MCQ testler her zaman otomatik puanlanır
            const isManualEvaluation = (test.sourceType === 'bank' || test.sourceType === 'trackedBook' || test.sourceType === 'mistake') && test.openEnded;
            let status: Test['status'] = isManualEvaluation ? 'Değerlendirme Bekliyor' : 'Sonuçlandı';
            
            let updatedData: Partial<Test> = { 
                studentAnswers,
                studentTextAnswers,
                status: status
            };

            // Otomatik puanlama (Deneme, Yazılı, Soru Bankası Optik)
            if (!isManualEvaluation) {
                let correct = 0, incorrect = 0, empty = 0;
                const finalAnswerKey: Record<string, string> = { ...test.answerKey };
                
                if (test.sourceType === 'json' && test.jsonQuestions) {
                    test.jsonQuestions.forEach((q, i) => {
                        finalAnswerKey[(i+1).toString()] = q.answer;
                    });
                }

                const totalQ = (test.sourceType === 'json' ? (test.jsonQuestions?.length || 0) : test.questionCount);
                for (let i = 1; i <= totalQ; i++) {
                    const qNum = i.toString();
                    const sAns = studentAnswers[qNum];
                    let cAns = finalAnswerKey[qNum];

                    // JSON Testi için harf eşleştirme
                    if (test.sourceType === 'json' && test.jsonQuestions?.[i-1]) {
                        const q = test.jsonQuestions[i-1];
                        const foundIdx = q.options.findIndex((o:string) => o.trim() === q.answer?.trim());
                        if (foundIdx !== -1) cAns = String.fromCharCode(65 + foundIdx);
                    }

                    if (!sAns) empty++;
                    else if (sAns === cAns) correct++;
                    else incorrect++;
                }

                updatedData.correctAnswers = correct;
                updatedData.incorrectAnswers = incorrect;
                updatedData.emptyAnswers = empty;
                updatedData.score = totalQ > 0 ? (correct / totalQ) * 100 : 0;
                updatedData.answerKey = finalAnswerKey; 
            }

            await updateTest(test.id, updatedData);
            if (!isManualEvaluation) await checkAndAwardBadges(test.studentId, familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            
            toast({ title: !isManualEvaluation ? "Ödev Bitti! 🎉" : "Cevaplar Gönderildi! ✅" });
            router.push('/education');
        } catch (e) { toast({ title: "Hata", variant: "destructive" }); } finally { setIsSubmitting(false); }
    };

    const handleFinishEvaluation = async () => {
        if (!test || !familyId) return;
        setIsSubmitting(true);
        try {
            let correct = 0, incorrect = 0, empty = 0;
            questions.forEach((_, i) => {
                const status = evaluations[(i+1).toString()] || 'unevaluated';
                if (status === 'correct') correct++;
                else if (status === 'incorrect') incorrect++;
                else empty++;
            });

            const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
            const updatedData: Partial<Test> = {
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
            toast({ title: "Değerlendirme Tamamlandı! ✨" });
            router.push('/education');
        } catch (e) { toast({ title: "Hata", variant: "destructive" }); } finally { setIsSubmitting(false); }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen space-y-4"><h1>Ödev Bulunamadı</h1><Link href="/education"><Button>Geri Dön</Button></Link></div>;

    // --- İNCELEME MODU (SONUÇLANANLAR) ---
    if (test.status === 'Sonuçlandı') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 md:p-8">
                <header className="max-w-7xl mx-auto w-full mb-8 flex justify-between items-center bg-white dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/education')} className="rounded-full hover:bg-slate-100"><ArrowLeft/></Button>
                        <div>
                            <h1 className="text-lg font-black leading-none text-slate-800 dark:text-slate-100">{test.title}</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Sınav Analizi</p>
                        </div>
                    </div>
                    <Badge className="bg-emerald-600 px-4 py-1 rounded-full font-black text-white">BİTTİ</Badge>
                </header>
                <main className="max-w-7xl mx-auto w-full flex-1">
                    {test.sourceType === 'exam' ? (
                        <ExamOpticalSolver 
                            test={test} 
                            studentAnswers={studentAnswers} 
                            onAnswer={() => {}} 
                            onFinish={() => {}} 
                            isReviewMode={true}
                        />
                    ) : (
                        <ResultScreen test={test} questions={questions} />
                    )}
                </main>
            </div>
        );
    }

    // --- DENEME SINAVI MODU ---
    if (test.sourceType === 'exam') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 md:p-8">
                <header className="max-w-5xl mx-auto w-full mb-8 flex justify-between items-center bg-white dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/education')} className="rounded-full hover:bg-slate-100"><ArrowLeft/></Button>
                        <div>
                            <h1 className="text-lg font-black leading-none text-slate-800 dark:text-slate-100">{test.title}</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">DENEME SINAVI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <TestTimer durationMinutes={test.durationMinutes || 120} onTimeUp={handleFinishTest} />
                    </div>
                </header>
                <main className="max-w-5xl mx-auto w-full flex-1">
                    <ExamOpticalSolver 
                        test={test} 
                        studentAnswers={studentAnswers} 
                        onAnswer={(q,a) => handleAnswerUpdate(q,a)} 
                        onFinish={handleFinishTest} 
                    />
                </main>
            </div>
        );
    }

    // --- DİĞER MODÜLLER ---
    const isAwaitingEvaluation = test.status === 'Değerlendirme Bekliyor';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 md:p-8">
            <header className="max-w-7xl mx-auto w-full mb-8 flex justify-between items-center bg-white dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/education')} className="rounded-full hover:bg-slate-100"><ArrowLeft/></Button>
                    <div>
                        <h1 className="text-lg font-black leading-none text-slate-800 dark:text-slate-100">{test.title}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{test.subject}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {test.status === 'Atandı' && test.durationMinutes && <TestTimer durationMinutes={test.durationMinutes} onTimeUp={handleFinishTest} />}
                    {test.status === 'Değerlendirme Bekliyor' && <Badge className="bg-amber-600 px-4 py-1 rounded-full font-black text-white">DEĞERLENDİRİLİYOR</Badge>}
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full flex-1">
                {isAwaitingEvaluation && (
                    isEvaluationMode ? (
                        <EvaluationScreen test={test} questions={questions} evaluations={evaluations} feedbacks={feedbacks} onEvaluate={(q, s) => setEvaluations(prev => ({...prev, [q]: s}))} onFeedback={(q, f) => setFeedbacks(prev => ({...prev, [q]: f}))} onFinish={handleFinishEvaluation} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center shadow-inner"><GraduationCap className="w-10 h-10 text-amber-600" /></div>
                            <div className="space-y-2"><h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Değerlendirme Bekliyor</h2><p className="text-slate-500 max-w-sm">Sonuçlarını ebeveynin puanlayınca görebileceksin.</p></div>
                            <Link href="/education"><Button variant="outline" className="rounded-xl px-8 h-12 font-bold">Geri Dön</Button></Link>
                        </div>
                    )
                )}
                {!isAwaitingEvaluation && (
                    <>
                        {test.sourceType === 'json' && <JSONWizardSolver test={test} questions={questions} studentAnswers={studentAnswers} onAnswer={(q,a) => handleAnswerUpdate(q,a)} onFinish={handleFinishTest} />}
                        {test.sourceType === 'html' && <HTMLDocumentSolver test={test} studentAnswers={studentAnswers} onAnswer={(q,a) => handleAnswerUpdate(q,a)} onFinish={handleFinishTest} />}
                        {(test.sourceType === 'bank' || test.sourceType === 'quick' || test.sourceType === 'mistake' || test.sourceType === 'trackedBook') && (
                            test.openEnded ? <OpenEndedWizardSolver test={test} questions={questions} studentTextAnswers={studentTextAnswers} onAnswer={(q,a) => handleAnswerUpdate(q,a,true)} onFinish={handleFinishTest} /> : <MCQWizardSolver test={test} questions={questions} studentAnswers={studentAnswers} onAnswer={(q,a) => handleAnswerUpdate(q,a)} onFinish={handleFinishTest} />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
