
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
import { updateMistake } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EditMistakeForm } from "@/components/edit-mistake-form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


export default function TestFeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const testId = params.testId as string;

    const [test, setTest] = React.useState<Test | null>(null);
    const [mistakes, setMistakes] = React.useState<Mistake[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editingMistake, setEditingMistake] = React.useState<Mistake | null>(null);

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
                const mistakesUnsubscribe = onSnapshot(mistakesQuery, (mistakesSnapshot) => {
                    const fetchedMistakes = mistakesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Mistake));
                    setMistakes(fetchedMistakes);
                    setLoading(false);
                });
                
                return () => mistakesUnsubscribe();

            } else {
                setTest(null);
                setMistakes([]);
                setLoading(false);
            }
        };

        const unsubscribe = fetchTestAndMistakes();
        return () => { unsubscribe.then(u => u && u()) };
    }, [testId]);

    const handleSaveMistake = async (id: string, data: Partial<Omit<Mistake, 'id'>>) => {
        try {
            await updateMistake(id, data);
            toast({ title: "Başarılı!", description: "Geri bildirim kaydedildi."});
            setEditingMistake(null);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Hata", description: error.message || "Değişiklikler kaydedilirken bir hata oluştu.", variant: "destructive" });
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
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
            </PageHeader>
            <Card>
                <CardContent className="p-4">
                     <div className="space-y-2">
                        {mistakes.length > 0 ? (
                            mistakes.map((mistake, index) => (
                            <div 
                                key={mistake.id} 
                                onClick={() => setEditingMistake(mistake)}
                                className={cn(
                                    "flex items-center justify-between gap-4 p-3 border rounded-lg cursor-pointer transition-colors",
                                    mistake.feedback || mistake.correctAnswer ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                                )}
                            >
                                <p className="font-semibold">{index + 1}. Soru Geri Bildirimi</p>
                                {mistake.feedback || mistake.correctAnswer ? (
                                    <span className="text-xs text-green-600">Tamamlandı</span>
                                ):(
                                     <span className="text-xs text-muted-foreground">Bekliyor</span>
                                )}
                            </div>
                            ))
                        ) : (
                            <p className="col-span-full text-center text-muted-foreground py-10">Bu testte geri bildirim eklenecek soru bulunmuyor.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editingMistake} onOpenChange={() => setEditingMistake(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Geri Bildirim Ekle</DialogTitle>
                        <DialogDescription>
                            Bu soru için doğru cevabı ve çözüm görselini ekleyin.
                        </DialogDescription>
                    </DialogHeader>
                    {editingMistake && (
                        <EditMistakeForm 
                            mistake={editingMistake}
                            onSave={handleSaveMistake}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
