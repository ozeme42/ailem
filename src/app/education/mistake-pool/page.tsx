
"use client";

import * as React from "react";
import Link from 'next/link';
import { useAuth } from "@/components/auth-provider";
import { Mistake, Test, FamilyMember } from "@/lib/data";
import { onTestsUpdate } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Diğer': Gamepad2,
    'Genel Deneme Sınavları': Globe,
    'Yanlış Havuzu': Ruler,
};

export default function MistakePoolDashboardPage() {
    const { user } = useAuth();
    const [tests, setTests] = React.useState<Test[]>([]);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribeTests = onTestsUpdate(allTests => {
            const relevantTests = allTests.filter(t => 
                t.status === 'Sonuçlandı' &&
                ((t.incorrectAnswers || 0) > 0 || (t.emptyAnswers || 0) > 0)
            );
            setTests(relevantTests);
        });
        
        return () => unsubscribeTests();
    }, [user]);

    return (
        <div className="space-y-6">
            <PageHeader title="Geri Bildirim Merkezi">
                <p className="text-sm text-white/80 max-w-2xl">
                    Öğrencilerin yanlış veya boş bıraktığı soruları olan testler burada listelenir.
                    Bir teste tıklayarak her bir yanlış soru için doğru cevabı ve çözüm görselini ekleyebilirsiniz.
                </p>
            </PageHeader>
            
            {tests.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map(test => {
                        const Icon = categoryIcons[test.subject] || BookCopy;
                        const totalMistakes = (test.incorrectAnswers || 0) + (test.emptyAnswers || 0);
                        return (
                        <Link href={`/education/mistake-pool/${test.id}`} key={test.id} className="block group">
                            <Card className="hover:shadow-lg hover:-translate-y-1 transition-transform h-full flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <Icon className="w-8 h-8 text-muted-foreground" />
                                        <div className="text-right">
                                            <p className="font-bold text-xl text-destructive">{totalMistakes}</p>
                                            <p className="text-xs text-muted-foreground">yanlış/boş</p>
                                        </div>
                                    </div>
                                    <CardTitle>{test.title}</CardTitle>
                                    <CardDescription>{test.subject}</CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto flex justify-end">
                                    <Button variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Geri Bildirim Ekle <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                        )
                    })}
                </div>
            ) : (
                 <Card>
                    <CardContent className="p-8 text-center text-muted-foreground flex items-center justify-center gap-4">
                        <AlertCircle className="h-8 w-8 text-primary"/>
                        <div>
                            <p className="font-semibold">Geri bildirim bekleyen test bulunmuyor.</p>
                            <p className="text-sm">Tüm testler harika görünüyor!</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
