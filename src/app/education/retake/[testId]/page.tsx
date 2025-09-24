
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Mistake, Test, Question, EvaluationStatus } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, UploadCloud, Camera } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTest } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RetakeAnswers = { [key: string]: string };

export default function RetakeTestPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user, familyMembers } = useAuth();

    const testId = params.testId as string;

    const [test, setTest] = React.useState<Test | null>(null);
    const [retakeAnswers, setRetakeAnswers] = React.useState<RetakeAnswers>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const isStudent = user?.uid === test?.studentId;

    const retakeQuestions: Question[] = React.useMemo(() => {
        if (!test) return [];

        if(test.gradingType === 'manual-text' && test.studentTextAnswersEvaluation) {
             const incorrectOrEmpty = Object.entries(test.studentTextAnswersEvaluation)
                .filter(([qId, status]) => status === 'incorrect' || status === 'empty')
                .map(([qId]) => qId);
            
            return (test.questions || [])
                .filter(q => incorrectOrEmpty.includes(q.questionNumber.toString()))
                .sort((a,b) => a.questionNumber - b.questionNumber);
        }
        
        if (test.gradingType === 'auto' && test.answerKey && test.studentAnswers) {
            const incorrectOrEmptyIds: string[] = [];
            for(let i=1; i<=test.questionCount; i++){
                const qId = i.toString();
                if(test.studentAnswers[qId] !== test.answerKey[qId]){
                    incorrectOrEmptyIds.push(qId);
                }
            }
             return (test.questions || [])
                .filter(q => incorrectOrEmptyIds.includes(q.questionNumber.toString()))
                .sort((a,b) => a.questionNumber - b.questionNumber);
        }
        
        return [];
    }, [test]);

    React.useEffect(() => {
        if (!testId) return;
        setIsLoading(true);
        const unsubscribe = onSnapshot(doc(db, 'tests', testId), (docSnap) => {
            if (docSnap.exists()) {
                const testData = { id: docSnap.id, ...docSnap.data() } as Test;
                setTest(testData);
                setRetakeAnswers(testData.retakeAnswers || {});
            } else {
                toast({ title: "Hata", description: "Test bulunamadı.", variant: "destructive" });
                router.push('/education');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [testId, router, toast]);

    const handleRetakeSubmit = async () => {
        if (!test || retakeQuestions.length === 0) return;

        try {
            await updateTest(test.id, {
                retakeAnswers,
                status: 'Değerlendirme Bekliyor', // Always set to be re-evaluated by parent
            });
            toast({ title: 'Cevapların Gönderildi!', description: 'Eksiklerin yakında öğretmen tarafından değerlendirilecek.' });
            router.push(`/education/${test.id}`);
        } catch (error) {
            toast({ title: 'Hata', description: 'Tekrar testi kaydedilemedi.', variant: 'destructive' });
        }
    };
    
    const handleImageUploadForQuestion = async (event: React.ChangeEvent<HTMLInputElement>, questionNumber: number) => {
        const file = event.target.files?.[0];
        if (!file || !test) return;

        toast({ title: "Görsel Yükleniyor..." });
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const imageDataUri = reader.result as string;
                const destinationPath = `test-questions/${test.id}-${questionNumber}-${Date.now()}.jpg`;
                const migrationResult = await migrateImage({ imageDataUri, destinationPath });

                if (!migrationResult.success || !migrationResult.newUrl) {
                    throw new Error(migrationResult.error || "Görsel yüklenemedi.");
                }

                const updatedQuestions = test.questions?.map(q => 
                    q.questionNumber === questionNumber ? { ...q, imageUrl: migrationResult.newUrl } : q
                );
                
                // If question doesn't exist, add it
                if (!updatedQuestions?.some(q => q.questionNumber === questionNumber)) {
                    updatedQuestions?.push({ questionNumber: questionNumber, imageUrl: migrationResult.newUrl });
                }

                await updateTest(test.id, { questions: updatedQuestions });
                toast({ title: "Görsel Güncellendi!" });
            };
        } catch (e: any) {
            toast({ title: "Hata", description: e.message, variant: "destructive" });
        } finally {
            if (event.target) event.target.value = ''; // Reset file input
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen w-screen items-center justify-center">Eksikler yükleniyor...</div>;
    }

    if (!test || retakeQuestions.length === 0) {
        return (
            <div className="flex flex-col h-screen w-screen items-center justify-center text-center p-4">
                <Card className="p-8">
                  <CardTitle>Harika İş!</CardTitle>
                  <CardDescription className="mt-2">Bu testteki tüm eksiklerini tamamladın.</CardDescription>
                  <Button asChild className="mt-6">
                    <Link href={`/education/${testId}`}>Sonuçlara Geri Dön</Link>
                  </Button>
                </Card>
            </div>
        );
    }

    const currentQuestion = retakeQuestions[currentQuestionIndex];
    const imageUrl = currentQuestion?.imageUrl;
    const originalQuestionNumber = currentQuestion?.questionNumber;
    const originalAnswer = test.studentAnswers?.[originalQuestionNumber] || test.studentTextAnswers?.[originalQuestionNumber];

    return (
        <div className="container mx-auto py-8">
            <header className="mb-4">
                <Button variant="ghost" onClick={() => router.push(`/education/${testId}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Sonuçlara Geri Dön
                </Button>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Eksikleri Tamamlama Testi</CardTitle>
                            <CardDescription>
                                {test?.title} - Soru {currentQuestionIndex + 1} / {retakeQuestions.length}
                                {originalQuestionNumber && ` (Orijinal Soru #${originalQuestionNumber})`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground relative">
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={`Soru ${originalQuestionNumber}`} layout="fill" objectFit="contain" className="rounded-lg" data-ai-hint="question paper" />
                                ) : (
                                    !isStudent && (
                                        <>
                                            <UploadCloud className="h-10 w-10 mb-2"/>
                                            <p>Soru görseli bulunamadı.</p>
                                            <p className="text-xs">Görsel yüklemek için tıklayın.</p>
                                        </>
                                    )
                                )}
                                {!isStudent && (
                                    <button className="absolute inset-0 cursor-pointer" onClick={() => fileInputRef.current?.click()} aria-label="Görsel Yükle" />
                                )}
                            </div>
                             <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => originalQuestionNumber && handleImageUploadForQuestion(e, originalQuestionNumber)}
                            />

                            <div className="space-y-2 my-2 p-3 rounded-lg border bg-muted">
                                <p className="font-semibold">Önceki Cevabınız:</p>
                                <p className="text-muted-foreground">{originalAnswer || "(Boş bırakılmış)"}</p>
                            </div>
                            
                            {isStudent && (
                                <div className="flex items-start sm:items-center gap-4 p-3 rounded-lg border mt-4">
                                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{currentQuestionIndex + 1}</div>
                                   <div className="flex-grow flex items-center gap-2">
                                        <Input
                                            placeholder="Yeni cevabınızı buraya yazın..."
                                            value={originalQuestionNumber ? retakeAnswers[originalQuestionNumber] || "" : ""}
                                            onChange={(e) => originalQuestionNumber && setRetakeAnswers(prev => ({...prev, [originalQuestionNumber]: e.target.value}))}
                                            className="flex-grow"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardContent className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={() => setCurrentQuestionIndex(q => q - 1)} disabled={currentQuestionIndex === 0}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Önceki
                            </Button>
                            <Button onClick={() => setCurrentQuestionIndex(q => q + 1)} disabled={currentQuestionIndex === retakeQuestions.length - 1}>
                                Sonraki <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                 <aside className="lg:sticky top-8 self-start">
                     <Card>
                        <CardHeader className="text-center"><CardTitle>Test Bilgisi</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                           {isStudent && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="w-full" size="lg">Testi Bitir</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Testi bitirmek istediğine emin misin?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={handleRetakeSubmit}>Onayla ve Bitir</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                           )}
                           {!isStudent && (
                            <p className="text-sm text-center text-muted-foreground">Öğrenci bu ekrandan yanlış yaptığı soruları tekrar çözecektir.</p>
                           )}
                        </CardContent>
                    </Card>
                </aside>
            </main>
        </div>
    );
}
