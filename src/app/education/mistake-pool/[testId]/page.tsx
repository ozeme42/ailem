
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Mistake, Test } from "@/lib/data";
import { getDoc, doc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMistake } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UploadCloud } from 'lucide-react';
import { migrateImage } from "@/ai/flows/migrate-image-flow";


function FeedbackCard({ mistake, onUpdate }: { mistake: Mistake & { newImageUrl?: string, newCorrectAnswer?: string, newFeedback?: string }, onUpdate: (id: string, updates: Partial<Mistake & { newImageUrl?: string, newCorrectAnswer?: string, newFeedback?: string }>) => void }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                onUpdate(mistake.id, { newImageUrl: result });
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
                 <Image src={mistake.imageUrl || "https://placehold.co/400x300.png"} alt="Yanlış Soru" width={400} height={300} className="w-full h-auto rounded-md border" data-ai-hint="question paper"/>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <p className="text-sm">
                    <span className="font-semibold">Öğrenci Cevabı:</span>
                    <span className="text-muted-foreground ml-2">{mistake.studentAnswer || "(Boş bırakılmış)"}</span>
                </p>
                <div>
                    <Label htmlFor={`correct-answer-${mistake.id}`}>Doğru Cevap</Label>
                    <Input id={`correct-answer-${mistake.id}`} placeholder="Doğru cevabı yazın..." defaultValue={mistake.correctAnswer || ''} onChange={(e) => onUpdate(mistake.id, { newCorrectAnswer: e.target.value })} />
                </div>
                <div>
                    <Label>Çözüm Görseli (Opsiyonel)</Label>
                    <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div
                        className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {mistake.newImageUrl || mistake.correctImageUrl ? (
                          <Image src={mistake.newImageUrl || mistake.correctImageUrl!} alt="Çözüm Önizlemesi" width={200} height={150} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="solution explanation" />
                        ) : (
                          <div className="text-center">
                            <UploadCloud className="mx-auto h-8 w-8" />
                            <p className="mt-2 text-sm">Görsel Yükle</p>
                          </div>
                        )}
                    </div>
                </div>
                 <div>
                    <Label htmlFor={`feedback-${mistake.id}`}>Ek Notlar / Geri Bildirim (Opsiyonel)</Label>
                    <Textarea id={`feedback-${mistake.id}`} placeholder="Öğrenci için ek notlar..." defaultValue={mistake.feedback || ''} onChange={(e) => onUpdate(mistake.id, { newFeedback: e.target.value })}/>
                </div>
            </CardContent>
        </Card>
    );
}


export default function TestFeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<Test | null>(null);
    const [mistakes, setMistakes] = React.useState<(Mistake & { newImageUrl?: string, newCorrectAnswer?: string, newFeedback?: string })[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (!testId) return;

        const fetchTestAndMistakes = async () => {
            setLoading(true);
            const testDocRef = doc(db, "tests", testId);
            const testDoc = await getDoc(testDocRef);

            if (testDoc.exists()) {
                const testData = { id: testDoc.id, ...testDoc.data() } as Test;
                setTest(testData);

                const mistakesQuery = query(collection(db, "mistakes"), where("testId", "==", testId));
                const mistakesSnapshot = await getDocs(mistakesQuery);
                const fetchedMistakes = mistakesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Mistake));
                setMistakes(fetchedMistakes);
            } else {
                setTest(null);
                setMistakes([]);
            }
            setLoading(false);
        };

        fetchTestAndMistakes();
    }, [testId]);

    const handleMistakeUpdate = (id: string, updates: Partial<Mistake & { newImageUrl?: string }>) => {
        setMistakes(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            for (const mistake of mistakes) {
                let finalImageUrl = mistake.correctImageUrl;

                // Check if there is a new image to upload
                if (mistake.newImageUrl) {
                     toast({ title: `"${mistake.topic}" için görsel yükleniyor...`});
                     const destinationPath = `mistake-solutions/${user?.uid}-${Date.now()}.jpg`;
                     const migrationResult = await migrateImage({ imageDataUri: mistake.newImageUrl, destinationPath });
                     if (migrationResult.success && migrationResult.newUrl) {
                        finalImageUrl = migrationResult.newUrl;
                     } else {
                         throw new Error(`Görsel yüklenemedi: ${migrationResult.error}`);
                     }
                }
                
                const dataToUpdate: Partial<Mistake> = {
                    correctAnswer: mistake.newCorrectAnswer !== undefined ? mistake.newCorrectAnswer : mistake.correctAnswer,
                    feedback: mistake.newFeedback !== undefined ? mistake.newFeedback : mistake.feedback,
                    correctImageUrl: finalImageUrl,
                };
                
                await updateMistake(mistake.id, dataToUpdate);
            }
            toast({ title: "Başarılı!", description: "Tüm geri bildirimler kaydedildi."});
            router.push('/education/mistake-pool');
        } catch (error: any) {
            console.error(error);
            toast({ title: "Hata", description: error.message || "Değişiklikler kaydedilirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) {
        return <div>Yükleniyor...</div>;
    }

    if (!test) {
        return <PageHeader title="Test Bulunamadı" />;
    }

    return (
        <div className="space-y-6">
            <PageHeader title={`${test.title} - Geri Bildirim`}>
                <div className="flex justify-between items-center w-full">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                    </Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Tüm Değişiklikleri Kaydet
                    </Button>
                </div>
            </PageHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mistakes.map(mistake => (
                    <FeedbackCard key={mistake.id} mistake={mistake} onUpdate={handleMistakeUpdate} />
                ))}
                 {mistakes.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-10">Bu testte geri bildirim eklenecek soru bulunmuyor.</p>
                )}
            </div>
        </div>
    );
}

