
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
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, BookCheck, StickyNote, BookText, ArrowLeft } from "lucide-react";

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
    
    const [showNotes, setShowNotes] = React.useState(false);
    const [showSummary, setShowSummary] = React.useState(false);

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
                className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                style={{
                    backgroundSize: '400% 400%',
                }}
            />
            <div className="relative flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8">
                <header className="flex items-start gap-4 mb-8">
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
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
                     <div className="relative w-full max-w-lg bg-background/80 backdrop-blur-sm rounded-2xl p-1 overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                            style={{ originX: 0 }}
                            animate={{ scaleX: [0, 1, 1, 0, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1] }}
                        />
                        <motion.div
                            className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"
                            style={{ originY: 0 }}
                            animate={{ scaleY: [0, 1, 1, 0, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1], delay: 1 }}
                        />
                        <motion.div
                            className="absolute bottom-0 right-0 h-1 w-full bg-gradient-to-l from-blue-500 via-purple-500 to-pink-500"
                            style={{ originX: 1 }}
                            animate={{ scaleX: [0, 1, 1, 0, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1], delay: 2 }}
                        />
                         <motion.div
                            className="absolute bottom-0 left-0 w-1 h-full bg-gradient-to-t from-blue-500 via-purple-500 to-pink-500"
                            style={{ originY: 1 }}
                            animate={{ scaleY: [0, 1, 1, 0, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear', times: [0, 0.25, 0.5, 0.75, 1], delay: 3 }}
                        />
                        
                        <div className="relative rounded-xl p-4 md:p-8 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 h-full flex flex-col justify-center items-center text-center">
                            <p className="text-lg text-muted-foreground">Okuma Süresi</p>
                            <p className="text-7xl md:text-8xl font-bold font-mono">{formatDuration(elapsedTime)}</p>
                        </div>
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
                     <AnimatePresence>
                        {showNotes && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Label htmlFor="notes">Notlar</Label>
                                <Textarea id="notes" placeholder="Okurken aklına gelenler, önemli alıntılar..." value={notes} onChange={(e) => setNotes(e.target.value)} className="h-24 bg-background/50"/>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showSummary && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Label htmlFor="summary">Özet</Label>
                                <Textarea id="summary" placeholder="Bu okuma seansında neler oldu?" value={summary} onChange={(e) => setSummary(e.target.value)} className="h-24 bg-background/50"/>
                            </motion.div>
                        )}
                    </AnimatePresence>
                     
                     <div className="md:col-span-2">
                        <Label htmlFor="pagesRead">Okunan Sayfa Sayısı</Label>
                        <Input id="pagesRead" type="number" placeholder="0" value={pagesRead === 0 ? '' : pagesRead} onChange={(e) => setPagesRead(Number(e.target.value))} className="bg-background/50"/>
                     </div>
                </footer>
                
                <div className="flex justify-between items-center gap-2">
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setShowNotes(!showNotes)}>
                            <StickyNote className="mr-2 h-5 w-5"/> Not Ekle
                        </Button>
                         <Button variant="outline" onClick={() => setShowSummary(!showSummary)}>
                            <BookText className="mr-2 h-5 w-5"/> Özet Ekle
                        </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => router.push('/library')}>İptal Et</Button>
                        <Button onClick={handleSaveSession} className="bg-green-600 hover:bg-green-700">
                            <BookCheck className="mr-2 h-5 w-5" />
                            Oturumu Kaydet
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
