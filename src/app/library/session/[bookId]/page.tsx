
"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { onBooksUpdate, addReadingSession, updateUserBookStatus } from "@/lib/dataService";
import type { Book, ReadingSession } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Play, Pause, BookCheck } from "lucide-react";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export default function ReadingSessionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { familyId, user } = useAuth();
    const bookId = params.bookId as string;

    const [book, setBook] = React.useState<Book | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const [timerRunning, setTimerRunning] = React.useState(true);
    const [elapsedTime, setElapsedTime] = React.useState(0);
    const [startTime, setStartTime] = React.useState(new Date());

    const [notes, setNotes] = React.useState("");
    const [summary, setSummary] = React.useState("");
    const [pagesRead, setPagesRead] = React.useState(0);

    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
    
    React.useEffect(() => {
        const unsubscribeBooks = onBooksUpdate((allBooks) => {
          const currentBook = allBooks.find(b => b.id === bookId);
          setBook(currentBook || null);
          setIsLoading(false);
        });
        return () => unsubscribeBooks();
    }, [bookId]);

    React.useEffect(() => {
        if (timerRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedTime(Math.round((new Date().getTime() - startTime.getTime()) / 1000));
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timerRunning, startTime]);

    const handleSaveSession = async () => {
        if (!familyId || !user || !book) {
            toast({ title: "Hata", description: "Oturum kaydedilemedi. Kullanıcı bilgileri eksik.", variant: "destructive" });
            return;
        }

        const durationSeconds = elapsedTime;
        const newSession: Omit<ReadingSession, 'id' | 'familyId'> = {
            memberId: user.uid,
            bookId: book.id,
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            durationSeconds: durationSeconds,
            pagesRead: pagesRead,
            notes: notes,
            summary: summary,
        };

        await addReadingSession(newSession);

        if (book.pageCount && pagesRead > 0) {
            const currentProgressPages = ((book as any).progress || 0) / 100 * book.pageCount;
            const newTotalPagesRead = currentProgressPages + pagesRead;
            const newProgressPercent = Math.min(Math.round((newTotalPagesRead / book.pageCount) * 100), 100);
            await updateUserBookStatus(familyId, user.uid, book.id, newProgressPercent === 100 ? 'finished' : 'reading', newProgressPercent);
        }
        
        toast({ title: "Okuma Oturumu Kaydedildi!", description: `${formatDuration(durationSeconds)} boyunca ${pagesRead} sayfa okudun.` });
        router.push('/library');
    };

    if (isLoading) {
        return <div className="flex h-screen w-screen items-center justify-center">Yükleniyor...</div>;
    }

    if (!book) {
        return <div className="flex h-screen w-screen items-center justify-center">Kitap bulunamadı.</div>;
    }

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-y-auto">
            <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10"
                animate={{
                    backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                }}
                transition={{
                    duration: 20,
                    ease: "linear",
                    repeat: Infinity,
                }}
            />
            <div className="relative flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8">
                <header className="flex items-start gap-4 mb-8">
                    <Image
                        src={book.image || 'https://placehold.co/100x150.png'}
                        alt={book.title}
                        width={100}
                        height={150}
                        className="rounded-lg shadow-2xl aspect-[2/3] object-cover"
                        data-ai-hint="book cover"
                    />
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold">{book.title}</h1>
                        <p className="text-xl text-muted-foreground">{book.author}</p>
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col justify-center items-center gap-8">
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground">Okuma Süresi</p>
                        <p className="text-7xl md:text-9xl font-bold font-mono tracking-tighter">{formatDuration(elapsedTime)}</p>
                    </div>
                    
                    <Button
                        size="lg"
                        className="rounded-full w-48 h-16 text-xl"
                        onClick={() => setTimerRunning(!timerRunning)}
                    >
                        {timerRunning ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
                        {timerRunning ? 'Durdur' : 'Devam Et'}
                    </Button>
                </main>

                <footer className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                     <div>
                        <Label htmlFor="notes">Notlar</Label>
                        <Textarea id="notes" placeholder="Okurken aklına gelenler, önemli alıntılar..." value={notes} onChange={(e) => setNotes(e.target.value)} className="h-24 bg-background/50"/>
                     </div>
                     <div>
                        <Label htmlFor="summary">Özet</Label>
                        <Textarea id="summary" placeholder="Bu okuma seansında neler oldu?" value={summary} onChange={(e) => setSummary(e.target.value)} className="h-24 bg-background/50"/>
                     </div>
                     <div className="md:col-span-2">
                        <Label htmlFor="pagesRead">Okunan Sayfa Sayısı</Label>
                        <Input id="pagesRead" type="number" placeholder="0" value={pagesRead === 0 ? '' : pagesRead} onChange={(e) => setPagesRead(Number(e.target.value))} className="bg-background/50"/>
                     </div>
                </footer>
                
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => router.push('/library')}>İptal Et</Button>
                    <Button onClick={handleSaveSession} className="bg-green-600 hover:bg-green-700">
                        <BookCheck className="mr-2 h-5 w-5" />
                        Oturumu Kaydet
                    </Button>
                </div>
            </div>
        </div>
    );
}
