
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Mistake, Test } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, UploadCloud } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getDoc, getDocs, collection, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateMistake } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import Image from "next/image";

type RetakeAnswers = { [key: string]: string };

export default function RetakeTestPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const testId = params.testId as string;
    const filter = searchParams.get('filter') || 'all';

    const [test, setTest] = React.useState<Test | null>(null);
    const [retakeQuestions, setRetakeQuestions] = React.useState<Mistake[]>([]);
    const [retakeAnswers, setRetakeAnswers] = React.useState<RetakeAnswers>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!testId) return;

        const fetchTestAndMistakes = async () => {
            setIsLoading(true);
            try {
                const testDoc = await getDoc(doc(db, 'tests', testId));
                if (!testDoc.exists()) {
                    toast({ title: "Hata", description: "Test bulunamadı.", variant: "destructive" });
                    router.push('/education');
                    return;
                }
                setTest(testDoc.data() as Test);

                let mistakesQuery = query(
                    collection(db, 'mistakes'),
                    where('testId', '==', testId),
                    where('status', '==', 'active')
                );

                if (filter === 'incorrect') {
                    mistakesQuery = query(mistakesQuery, where('studentAnswer', '!=', ''));
                } else if (filter === 'empty') {
                    mistakesQuery = query(mistakesQuery, where('studentAnswer', '==', ''));
                }

                const mistakesSnapshot = await getDocs(mistakesQuery);
                const allMistakes = mistakesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Mistake));
                
                // Only include questions that have an image URL
                const mistakesWithImages = allMistakes.filter(m => m.imageUrl);

                if (mistakesWithImages.length === 0) {
                    toast({ title: "Tebrikler!", description: "Bu kritere uygun tamamlanacak eksik soru bulunmuyor." });
                    router.push(`/education/${testId}`);
                    return;
                }
                
                setRetakeQuestions(mistakesWithImages);

            } catch (error) {
                console.error("Error fetching retake data:", error);
                toast({ title: "Hata", description: "Veriler alınırken bir sorun oluştu.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTestAndMistakes();
    }, [testId, filter, router, toast]);

    const handleRetakeSubmit = async () => {
        if (!test || retakeQuestions.length === 0) return;
    
        const updatedMistakePromises = retakeQuestions.map(mistake => {
            const studentAnswer = retakeAnswers[mistake.id] || "";
            if (studentAnswer.trim().toLowerCase() === (mistake.correctAnswer || "").trim().toLowerCase()) {
                return updateMistake(mistake.id, { status: 'corrected' });
            }
            return Promise.resolve(); // Do nothing if answer is wrong or empty
        });

        try {
            await Promise.all(updatedMistakePromises);
            toast({ title: 'Tebrikler!', description: 'Doğru cevapladığın eksikler tamamlandı.' });
            router.push(`/education/${test.id}`);
        } catch (error) {
            toast({ title: 'Hata', description: 'Tekrar testi kaydedilemedi.', variant: 'destructive' });
        }
    };

    const handleImageUploadForMistake = async (event: React.ChangeEvent<HTMLInputElement>, mistake: Mistake) => {
        const file = event.target.files?.[0];
        if (!file) return;

        toast({ title: "Görsel Yükleniyor..." });
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const imageDataUri = reader.result as string;
                const destinationPath = `mistake-pool/${test?.studentId || 'unknown'}-${mistake.id}-${Date.now()}.jpg`;
                const migrationResult = await migrateImage({ imageDataUri, destinationPath });

                if (!migrationResult.success || !migrationResult.newUrl) {
                    throw new Error(migrationResult.error || "Görsel yüklenemedi.");
                }

                await updateMistake(mistake.id, { imageUrl: migrationResult.newUrl });
                
                setRetakeQuestions(prev => prev.map(q => 
                    q.id === mistake.id ? { ...q, imageUrl: migrationResult.newUrl } : q
                ));

                toast({ title: "Görsel Güncellendi!" });
            };
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        } finally {
            if (event.target) event.target.value = ''; // Reset file input
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen w-screen items-center justify-center">Eksikler yükleniyor...</div>
    }

    if (retakeQuestions.length === 0) {
         return (
             <div className="flex h-screen w-screen items-center justify-center">
                 <p>Tekrar edilecek soru bulunamadı. Yönlendiriliyorsunuz...</p>
            </div>
         );
    }

    const currentMistakeQuestion = retakeQuestions[currentQuestionIndex];
    const imageUrl = currentMistakeQuestion?.imageUrl;
    const originalQuestionNumber = currentMistakeQuestion?.originalQuestionId;

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
                            <label className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary cursor-pointer relative" onClick={() => fileInputRef.current?.click()}>
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={`Soru ${originalQuestionNumber}`} layout="fill" objectFit="contain" className="rounded-lg" data-ai-hint="question paper" />
                                ) : (
                                    <>
                                        <UploadCloud className="h-10 w-10 mb-2"/>
                                        <p>Görsel bulunamadı.</p>
                                        <p className="text-xs">Görsel yüklemek için tıklayın.</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => handleImageUploadForMistake(e, currentMistakeQuestion)}
                                />
                            </label>
                            <div className="space-y-2 my-2 p-3 rounded-lg border bg-muted">
                                <p className="font-semibold">Önceki Cevabınız:</p>
                                <p className="text-muted-foreground">{currentMistakeQuestion?.studentAnswer || "(Boş bırakılmış)"}</p>
                            </div>
                            <div className="flex items-start sm:items-center gap-4 p-3 rounded-lg border mt-4">
                               <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-1 sm:mt-0">{currentQuestionIndex + 1}</div>
                               <div className="flex-grow flex items-center gap-2">
                                    <Input
                                        placeholder="Cevabınızı buraya yazın..."
                                        value={retakeAnswers[currentMistakeQuestion.id] || ""}
                                        onChange={(e) => setRetakeAnswers(prev => ({...prev, [currentMistakeQuestion.id]: e.target.value}))}
                                        className="flex-grow"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardContent className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={() => setCurrentQuestionIndex(q => q - 1)} disabled={currentQuestionIndex === 0}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Önceki Soru
                            </Button>
                            <Button onClick={() => setCurrentQuestionIndex(q => q + 1)} disabled={currentQuestionIndex === retakeQuestions.length - 1}>
                                Sonraki Soru <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                 <aside className="lg:sticky top-8 self-start">
                     <Card>
                        <CardHeader className="text-center"><CardTitle>Test Bilgisi</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="w-full" size="lg">Testi Bitir</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Testi bitirmek istediğine emin misin?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={handleRetakeSubmit}>Onayla ve Bitir</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </aside>
            </main>
        </div>
    );
}
