
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Test, QuickTestQuestion, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, BookOpen, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { doc, getDocs, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest, checkAndAwardBadges } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

// --- MODÜLER BİLEŞENLER (Dosyalar Tamamen Ayrıldı) ---
import { MCQSolver } from "@/components/education/test-solver/mcq-solver";
import { OpenEndedSolver } from "@/components/education/test-solver/open-ended-solver";
import { JSONSolver } from "@/components/education/test-solver/json-solver";
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
    
    // Geçici form durumları
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
                
                // Cevapları eşitle
                setStudentAnswers(data.studentAnswers || {});
                setStudentTextAnswers(data.studentTextAnswers || {});
                setEvaluations(data.studentTextAnswersEvaluation || {});
                setFeedbacks(data.studentTextAnswersFeedback || {});

                // Soru kaynağına göre soruları çek
                if (data.sourceType === 'json' && data.jsonQuestions) {
                    setQuestions(data.jsonQuestions);
                } else {
                    const qCol = collection(db, 'tests', testId, 'questions');
                    const qSnap = await getDocs(query(qCol, orderBy("questionNumber")));
                    setQuestions(qSnap.docs.map(d => d.data() as QuickTestQuestion));
                }
            }
            setIsLoading(false);
        });
        
        return () => unsubTest();
    }, [testId]);

    // --- ANLIK KAYIT (DERS KESİLİRSE DİYE) ---
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

    // --- ÖDEVİ BİTİR (ÖĞRENCİ) ---
    const handleFinishTest = async () => {
        if (!test || !familyId) return;
        setIsSubmitting(true);
        try {
            // Yazılı (JSON) ve normal Çoktan Seçmeli testler her zaman otomatik puanlanır.
            // Sadece Soru Bankası'ndan "Açık Uçlu" seçilenler manuel değerlendirmeye gider.
            const isManual = test.openEnded && test.sourceType !== 'json';
            let status: Test['status'] = isManual ? 'Değerlendirme Bekliyor' : 'Sonuçlandı';
            
            let updatedData: Partial<Test> = { 
                studentAnswers,
                studentTextAnswers,
                status: status
            };

            // OTOMATİK PUANLAMA MANTIĞI
            if (!isManual) {
                let correct = 0, incorrect = 0, empty = 0;
                
                // Cevap Anahtarını Hazırla
                const finalAnswerKey: Record<string, string> = { ...test.answerKey };
                if (test.sourceType === 'json' && test.jsonQuestions) {
                    test.jsonQuestions.forEach((q, i) => {
                        finalAnswerKey[(i+1).toString()] = q.answer;
                    });
                }

                questions.forEach((_, i) => {
                    const qNum = (i + 1).toString();
                    const sAns = studentAnswers[qNum];
                    const cAns = finalAnswerKey[qNum];
                    
                    if (!sAns) empty++;
                    else if (sAns === cAns) correct++;
                    else incorrect++;
                });

                updatedData.correctAnswers = correct;
                updatedData.incorrectAnswers = incorrect;
                updatedData.emptyAnswers = empty;
                updatedData.score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
                updatedData.answerKey = finalAnswerKey; 
                
                await checkAndAwardBadges(test.studentId, familyId, { type: 'test_completed', test: { ...test, ...updatedData } });
            }

            await updateTest(test.id, updatedData);
            toast({ 
                title: status === 'Sonuçlandı' ? "Sınav Bitti! 🎉" : "Cevaplar Gönderildi! ✅",
                description: status === 'Sonuçlandı' ? "Sonuçlarını hemen inceleyebilirsin." : "Ebeveynin puanlayınca göreceksin."
            });
            router.push('/education');
        } catch (e) { 
            console.error(e);
            toast({ title: "Hata", variant: "destructive" }); 
        } finally { setIsSubmitting(false); }
    };

    // --- DEĞERLENDİRMEYİ KAYDET (EBEVEYN) ---
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
            
            toast({ title: "Değerlendirme Kaydedildi! ✨", description: "Öğrenci artık sonuçlarını görebilir." });
            router.push('/education');
        } catch (e) { toast({ title: "Hata", variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
    if (!test) return <div className="flex flex-col items-center justify-center h-screen space-y-4"><h1>Ödev Bulunamadı</h1><Link href="/education"><Button>Geri Dön</Button></Link></div>;

    // --- RENDER ROUTER ---
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 md:p-8">
            <header className="max-w-7xl mx-auto w-full mb-8 flex justify-between items-center bg-white dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/education')} className="rounded-full hover:bg-slate-100"><ArrowLeft/></Button>
                    <div>
                        <h1 className="text-lg font-black leading-none text-slate-800 dark:text-slate-100">{test.title}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{test.subject}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {test.status === 'Atandı' && test.durationMinutes && <TestTimer durationMinutes={test.durationMinutes} onTimeUp={handleFinishTest} />}
                    {test.status === 'Sonuçlandı' && <Badge className="bg-emerald-600 px-4 py-1 rounded-full font-black text-white">BİTTİ</Badge>}
                    {test.status === 'Değerlendirme Bekliyor' && <Badge className="bg-amber-600 px-4 py-1 rounded-full font-black text-white">DEĞERLENDİRİLİYOR</Badge>}
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full flex-1">
                {/* 1. MOD: SONUÇ (Analiz) - Her zaman en üstte kontrol edilmeli */}
                {test.status === 'Sonuçlandı' && (
                    <ResultScreen test={test} questions={questions} />
                )}

                {/* 2. MOD: ÇÖZME (Öğrenci) */}
                {test.status === 'Atandı' && (
                    test.sourceType === 'json' ? (
                        <JSONSolver 
                            test={test} 
                            questions={questions} 
                            studentAnswers={studentAnswers} 
                            onAnswer={(q, a) => handleAnswerUpdate(q, a, false)} 
                            onFinish={handleFinishTest} 
                        />
                    ) : test.openEnded ? (
                        <OpenEndedSolver 
                            test={test} 
                            questions={questions} 
                            studentTextAnswers={studentTextAnswers} 
                            onAnswer={(q, a) => handleAnswerUpdate(q, a, true)} 
                            onFinish={handleFinishTest} 
                        />
                    ) : (
                        <MCQSolver 
                            test={test} 
                            questions={questions} 
                            studentAnswers={studentAnswers} 
                            onAnswer={(q, a) => handleAnswerUpdate(q, a, false)} 
                            onFinish={handleFinishTest} 
                        />
                    )
                )}

                {/* 3. MOD: DEĞERLENDİRME (Ebeveyn) */}
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
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center shadow-inner">
                                <GraduationCap className="w-10 h-10 text-amber-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Ödevin Değerlendirilmeyi Bekliyor!</h2>
                                <p className="text-slate-500 max-w-sm">Cevapların ebeveynine ulaştı. Onlar kontrol edip onaylayınca sonucunu görebileceksin.</p>
                            </div>
                            <Link href="/education"><Button variant="outline" className="rounded-xl px-8 h-12 font-bold">Geri Dön</Button></Link>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}
