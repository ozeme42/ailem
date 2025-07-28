
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
import { Play, Pause, BookCheck, StickyNote, BookText, ArrowLeft, Plus, X, Music } from "lucide-react";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const metronomeSoundUrl = "https://storage.googleapis.com/ailem-app.firebasestorage.app/mar-calmado-272997.mp3";

export default function ReadingSessionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { familyId, user } = useAuth();
    const bookId = params.bookId as string;

    const [book, setBook] = React.useState<Book | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const [startTime, setStartTime] = React.useState(new Date());
    const [elapsedTime, setElapsedTime] = React.useState(0);
    const [timerRunning, setTimerRunning] = React.useState(true);
    const [notesList, setNotesList] = React.useState<string[]>([]);
    const [newNoteText, setNewNoteText] = React.useState("");
    const [pagesRead, setPagesRead] = React.useState(0);
    
    const [showExtras, setShowExtras] = React.useState(false);
    const [isMetronomeOn, setIsMetronomeOn] = React.useState(false);
    
    const metronomeAudioRef = React.useRef<HTMLAudioElement | null>(null);
    const metronomeIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    
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

    React.useEffect(() => {
        // Initialize Audio on client
        if (typeof window !== 'undefined' && !metronomeAudioRef.current) {
             metronomeAudioRef.current = new Audio(metronomeSoundUrl);
             metronomeAudioRef.current.preload = 'auto';
        }

        if (isMetronomeOn) {
            const bpm = 60; // Standard 60 beats per minute
            const interval = (60 / bpm) * 1000;
            metronomeIntervalRef.current = setInterval(() => {
                if (metronomeAudioRef.current) {
                    metronomeAudioRef.current.currentTime = 0;
                    metronomeAudioRef.current.play().catch(e => console.error("Error playing audio:", e));
                }
            }, interval);
        } else {
            if (metronomeIntervalRef.current) {
                clearInterval(metronomeIntervalRef.current);
            }
        }
        
        // Cleanup on component unmount
        return () => {
             if (metronomeIntervalRef.current) {
                clearInterval(metronomeIntervalRef.current);
            }
        }

    }, [isMetronomeOn]);
    
    const handleAddNote = () => {
        if (newNoteText.trim()) {
            setNotesList(prev => [...prev, newNoteText.trim()]);
            setNewNoteText("");
        }
    };
    
    const handleDeleteNote = (indexToDelete: number) => {
        setNotesList(prev => prev.filter((_, index) => index !== indexToDelete));
    };

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
            notes: notesList.join('\n---\n'), // Join notes with a separator
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
        <div className="relative overflow-y-auto pb-24">
            <div
                className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
            />
            <div className="relative w-full max-w-4xl mx-auto p-4 md:p-8">
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
                
                <main className="flex-grow flex flex-col justify-center items-center gap-8 my-8">
                     <div className="relative w-full max-w-lg p-1 overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full" width="100%" height="100%">
                             <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                     <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                                     <stop offset="25%" stopColor="hsl(var(--chart-5))" />
                                     <stop offset="50%" stopColor="hsl(var(--chart-3))" />
                                     <stop offset="100%" stopColor="hsl(var(--primary))" />
                                </linearGradient>
                            </defs>
                             <motion.rect
                                x="4" y="4"
                                width="calc(100% - 8px)" height="calc(100% - 8px)"
                                rx="14"
                                ry="14"
                                fill="transparent"
                                stroke="url(#gradient)"
                                strokeWidth="8"
                                pathLength="1"
                                strokeDasharray="1"
                                strokeDashoffset={1}
                                initial={{ strokeDashoffset: 1 }}
                                animate={{ strokeDashoffset: 0 }}
                                transition={{
                                    duration: 60,
                                    ease: 'linear',
                                    repeat: Infinity,
                                }}
                            />
                        </svg>

                         <div className="relative rounded-xl p-4 md:p-8 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 h-full flex flex-col justify-center items-center text-center">
                            <p className="text-lg text-muted-foreground">Okuma Süresi</p>
                            <p className="text-7xl md:text-8xl font-bold font-mono tracking-tighter">
                                {formatDuration(elapsedTime)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button
                            size="lg"
                            className="rounded-full w-48 h-16 text-xl"
                            onClick={() => setTimerRunning(!timerRunning)}
                        >
                            {timerRunning ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
                            {timerRunning ? 'Durdur' : 'Devam Et'}
                        </Button>
                         <Button
                            size="icon"
                            variant={isMetronomeOn ? "default" : "outline"}
                            className="rounded-full w-16 h-16"
                            onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                            aria-label="Toggle Metronome"
                        >
                            <Music className="h-7 w-7"/>
                        </Button>
                    </div>
                </main>

                <footer className="space-y-6 pb-4">
                     <AnimatePresence>
                        {showExtras && (
                            <motion.div
                                className="space-y-4"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Label htmlFor="notes">Notlar</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="new-note"
                                        placeholder="Aklına gelen bir şeyi yaz..." 
                                        value={newNoteText} 
                                        onChange={(e) => setNewNoteText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); }}}
                                        className="bg-background/50"
                                    />
                                    <Button type="button" onClick={handleAddNote}>
                                        <Plus className="h-4 w-4 mr-1"/> Ekle
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {notesList.map((note, index) => (
                                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/50">
                                            <p className="flex-grow text-sm text-yellow-900 dark:text-yellow-200">{note}</p>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-yellow-700 dark:text-yellow-400 hover:bg-black/10" onClick={() => handleDeleteNote(index)}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                     
                     <div>
                        <Label htmlFor="pagesRead">Okunan Sayfa Sayısı</Label>
                        <Input id="pagesRead" type="number" placeholder="0" value={pagesRead === 0 ? '' : pagesRead} onChange={(e) => setPagesRead(Number(e.target.value))} className="bg-background/50"/>
                     </div>
                </footer>
                
                <div className="flex justify-between items-center gap-2 mt-4">
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setShowExtras(!showExtras)}>
                            <StickyNote className="mr-2 h-5 w-5"/> Not Ekle
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
