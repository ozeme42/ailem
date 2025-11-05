

"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { onBooksUpdate, addReadingSession, updateUserBookStatus, onAmbientSoundsUpdate, onSingleUserLibraryUpdate } from "@/lib/dataService";
import type { Book, ReadingSession, AmbientSound, UserLibrary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, BookCheck, StickyNote, ArrowLeft, Plus, X, Music, Edit, Expand, Shrink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

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
    const [userLibrary, setUserLibrary] = React.useState<UserLibrary | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [ambientSounds, setAmbientSounds] = React.useState<AmbientSound[]>([]);

    const [startTime, setStartTime] = React.useState(new Date());
    const [elapsedTime, setElapsedTime] = React.useState(0);
    const [timerRunning, setTimerRunning] = React.useState(true);
    const [notesList, setNotesList] = React.useState<string[]>([]);
    const [newNoteText, setNewNoteText] = React.useState("");
    const [pagesReadInput, setPagesReadInput] = React.useState(0);
    
    const [showExtras, setShowExtras] = React.useState(false);
    const [selectedSoundId, setSelectedSoundId] = React.useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = React.useState(false);

    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
    
    React.useEffect(() => {
        const unsubscribeBooks = onBooksUpdate((allBooks) => {
          const currentBook = allBooks.find(b => b.id === bookId);
          setBook(currentBook || null);
          setIsLoading(false);
        });
        const unsubscribeSounds = onAmbientSoundsUpdate(setAmbientSounds);
        let unsubscribeLibrary = () => {};
        if (user) {
            unsubscribeLibrary = onSingleUserLibraryUpdate(user.uid, setUserLibrary);
        }

        return () => {
            unsubscribeBooks();
            unsubscribeSounds();
            unsubscribeLibrary();
        };
    }, [bookId, user]);

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
        if (audioRef.current) {
            const sound = ambientSounds.find(s => s.id === selectedSoundId);
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            if (sound) {
                audioRef.current.src = sound.url;
                audioRef.current.loop = sound.loop;
                audioRef.current.play().catch(e => console.error("Error playing audio:", e));
            }
        }
    }, [selectedSoundId, ambientSounds]);

     React.useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.preload = 'auto';
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);
    
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
            pagesRead: pagesReadInput,
            notes: notesList.join('\n---\n'),
        };

        await addReadingSession(newSession);

        if (book.pageCount && pagesReadInput > 0) {
            const libraryBook = userLibrary?.books.find(b => b.bookId === book.id);
            const currentProgressPages = libraryBook?.progress ? (libraryBook.progress / 100 * book.pageCount) : 0;
            const newTotalPagesRead = currentProgressPages + pagesReadInput;
            const newProgressPercent = Math.min(Math.round((newTotalPagesRead / book.pageCount) * 100), 100);
            const newStatus = newProgressPercent >= 100 ? 'finished' : 'reading';
            await updateUserBookStatus(familyId, user.uid, book.id, newStatus, newProgressPercent);
        }
        
        toast({ title: "Okuma Oturumu Kaydedildi!", description: `${formatDuration(durationSeconds)} boyunca ${pagesReadInput} sayfa okudun.` });
        router.push('/library');
    };

    const handleProgressChange = async (newProgressPercent: number) => {
        if (!familyId || !user || !book) return;
        const newStatus = newProgressPercent >= 100 ? 'finished' : 'reading';
        await updateUserBookStatus(familyId, user.uid, book.id, newStatus, newProgressPercent);
    };

    if (isLoading) {
        return <div className="flex h-screen w-screen items-center justify-center">Yükleniyor...</div>;
    }

    if (!book) {
        return <div className="flex h-screen w-screen items-center justify-center">Kitap bulunamadı.</div>;
    }

    const libraryBook = userLibrary?.books.find(b => b.bookId === book.id);
    const currentProgressPercent = libraryBook?.progress || 0;
    const pagesRead = book.pageCount ? Math.round((currentProgressPercent / 100) * book.pageCount) : 0;


    return (
        <div className="relative overflow-y-auto pb-24">
            <AnimatePresence>
            {isFullScreen && (
                <motion.div 
                    className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />
            )}
            </AnimatePresence>
            <div
                className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
            />
            <div className={cn("relative w-full max-w-4xl mx-auto p-4 md:p-8 transition-all duration-300", isFullScreen && 'max-w-none px-4 h-screen flex flex-col')}>
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
                
                <main className={cn("flex-grow flex flex-col justify-center items-center gap-8 my-8", isFullScreen && 'h-full')}>
                     <motion.div 
                        layout 
                        className={cn(
                            "relative w-full max-w-lg p-1 overflow-hidden",
                            isFullScreen && "fixed inset-0 w-screen h-screen max-w-none rounded-none p-0 flex flex-col items-center justify-center gap-8 z-50"
                        )}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <motion.svg 
                            className="absolute inset-0 w-full h-full" 
                            width="100%" 
                            height="100%"
                        >
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
                                rx={isFullScreen ? 0 : 14} ry={isFullScreen ? 0 : 14}
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
                        </motion.svg>
                        <div className={cn(
                            "relative rounded-xl p-4 md:p-8 h-full flex flex-col justify-center items-center text-center",
                            isFullScreen ? "bg-transparent" : "bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
                        )}>
                            <Button variant="ghost" size="icon" className={cn("absolute top-2 right-2", isFullScreen && "text-white hover:text-white hover:bg-white/20")} onClick={() => setIsFullScreen(f => !f)}>
                                {isFullScreen ? <Shrink/> : <Expand/>}
                            </Button>
                            <p className={cn("text-lg text-muted-foreground", isFullScreen && "text-white/80")}>Okuma Süresi</p>
                            <p className={cn("font-bold font-mono tracking-tighter", isFullScreen ? "text-9xl text-white" : "text-7xl md:text-8xl")}>
                                {formatDuration(elapsedTime)}
                            </p>
                        </div>
                        <div className={cn("flex items-center gap-4 pt-8", !isFullScreen && "hidden")}>
                            <Button
                                size="lg"
                                className="rounded-full w-48 h-16 text-xl"
                                onClick={() => setTimerRunning(!timerRunning)}
                            >
                                {timerRunning ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
                                {timerRunning ? 'Durdur' : 'Devam Et'}
                            </Button>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                     <Button
                                        size="icon"
                                        variant={selectedSoundId ? "default" : "outline"}
                                        className="rounded-full w-16 h-16"
                                        aria-label="Toggle Sound"
                                    >
                                        <Music className="h-7 w-7"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Ambiyans Sesi</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={selectedSoundId || ''} onValueChange={setSelectedSoundId}>
                                        {ambientSounds.map(sound => (
                                             <DropdownMenuRadioItem key={sound.id} value={sound.id}>{sound.name}</DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSelectedSoundId(null)}>Sesi Kapat</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </motion.div>
                    
                     <div className={cn("flex items-center gap-4", isFullScreen && 'hidden')}>
                        <Button
                            size="lg"
                            className="rounded-full w-48 h-16 text-xl"
                            onClick={() => setTimerRunning(!timerRunning)}
                        >
                            {timerRunning ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
                            {timerRunning ? 'Durdur' : 'Devam Et'}
                        </Button>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                 <Button
                                    size="icon"
                                    variant={selectedSoundId ? "default" : "outline"}
                                    className="rounded-full w-16 h-16"
                                    aria-label="Toggle Sound"
                                >
                                    <Music className="h-7 w-7"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Ambiyans Sesi</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={selectedSoundId || ''} onValueChange={setSelectedSoundId}>
                                    {ambientSounds.map(sound => (
                                         <DropdownMenuRadioItem key={sound.id} value={sound.id}>{sound.name}</DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedSoundId(null)}>Sesi Kapat</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </main>
                
                 {book.pageCount && (
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between items-baseline">
                            <Label>İlerleme</Label>
                            <span className="text-sm font-medium text-muted-foreground">{pagesRead} / {book.pageCount} sayfa ({currentProgressPercent.toFixed(0)}%)</span>
                        </div>
                        <Slider
                            value={[currentProgressPercent]}
                            max={100}
                            step={1}
                            onValueChange={(value) => handleProgressChange(value[0])}
                        />
                    </div>
                )}

                <footer className="space-y-6 pb-4 mt-8">
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
                        <Label htmlFor="pagesRead">Bu Oturumda Okunan Sayfa Sayısı</Label>
                        <Input id="pagesRead" type="number" placeholder="0" value={pagesReadInput === 0 ? '' : pagesReadInput} onChange={(e) => setPagesReadInput(Number(e.target.value))} className="bg-background/50"/>
                     </div>
                </footer>
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
                    <div className="w-full md:w-auto flex justify-between md:justify-start gap-2">
                         <Button variant="outline" onClick={() => setShowExtras(!showExtras)}>
                            <StickyNote className="mr-2 h-5 w-5"/> Not Ekle
                        </Button>
                        <Button variant="ghost" onClick={() => router.push('/library')}>İptal Et</Button>
                    </div>
                    <Button onClick={handleSaveSession} className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
                        <BookCheck className="mr-2 h-5 w-5" />
                        Oturumu Kaydet
                    </Button>
                </div>
            </div>
        </div>
    );
}
