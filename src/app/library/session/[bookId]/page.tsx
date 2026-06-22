"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { onBooksUpdate, addReadingSession, updateUserBookStatus, onAmbientSoundsUpdate, onUserLibrariesUpdate } from "@/lib/dataService";
import type { Book, ReadingSession, AmbientSound, UserLibrary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Save, ArrowLeft, Music2, Maximize2, Minimize2, Sparkles, Clock, BookOpenCheck, Settings, MonitorCheck, RotateCcw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

function useWakeLock(enabled: boolean) {
    const wakeLockRef = React.useRef<WakeLockSentinel | null>(null);

    React.useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && enabled) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    console.log('Ekran uyanık modu aktif.');
                } catch (err) {
                    console.error('Wake Lock hatası:', err);
                }
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            }
        };

        if (enabled) {
            requestWakeLock();
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && enabled) requestWakeLock();
            });
        } else {
            releaseWakeLock();
        }

        return () => { releaseWakeLock(); };
    }, [enabled]);
}

function formatDuration(seconds: number) {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const h = Math.floor(absSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((absSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(absSeconds % 60).toString().padStart(2, '0');
    if (h === '00') return `${isNegative ? '-' : ''}${m}:${s}`;
    return `${isNegative ? '-' : ''}${h}:${m}:${s}`;
}

export default function ReadingSessionPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { familyId, user } = useAuth();
    const bookId = params.bookId as string;
    const memberId = searchParams.get('memberId') || user?.uid;

    const [book, setBook] = React.useState<Book | null>(null);
    const [userLibrary, setUserLibrary] = React.useState<UserLibrary | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [ambientSounds, setAmbientSounds] = React.useState<AmbientSound[]>([]);

    const [startTime] = React.useState(new Date());
    const [elapsedTime, setElapsedTime] = React.useState(0);
    const [timerRunning, setTimerRunning] = React.useState(true);
    
    const [mode, setMode] = React.useState<'stopwatch' | 'timer'>('stopwatch');
    const [targetDurationMinutes, setTargetDurationMinutes] = React.useState(30);
    const [preventSleep, setPreventSleep] = React.useState(true);

    useWakeLock(preventSleep && timerRunning);

    const [startPage, setStartPage] = React.useState(0);
    const [currentEndPage, setCurrentEndPage] = React.useState(0);
    const [isPageInitialized, setIsPageInitialized] = React.useState(false);
    
    const [selectedSoundId, setSelectedSoundId] = React.useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = React.useState(false);

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
        if (familyId && memberId) {
            unsubscribeLibrary = onUserLibrariesUpdate(familyId, (libs) => {
                const lib = libs.find(l => l.memberId === memberId);
                setUserLibrary(lib || null);
            });
        }
        return () => {
            unsubscribeBooks();
            unsubscribeSounds();
            unsubscribeLibrary();
        };
    }, [bookId, familyId, memberId]);

    React.useEffect(() => {
        if (book && userLibrary && book.pageCount) {
            const libBook = userLibrary.books.find(b => b.bookId === book.id);
            if (libBook) {
                const calculatedStartPage = Math.floor((libBook.progress / 100) * book.pageCount);
                setStartPage(calculatedStartPage);
                if (!isPageInitialized) {
                    setCurrentEndPage(calculatedStartPage);
                    setIsPageInitialized(true);
                }
            } else {
                setStartPage(0);
                if (!isPageInitialized) {
                    setCurrentEndPage(0);
                    setIsPageInitialized(true);
                }
            }
        }
    }, [book, userLibrary, isPageInitialized]);

    React.useEffect(() => {
        if (timerRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timerRunning]);

    React.useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = 'auto';
        }
        const sound = ambientSounds.find(s => s.id === selectedSoundId);
        if (sound) {
            audioRef.current.src = sound.url;
            audioRef.current.loop = sound.loop;
            if (timerRunning) {
                audioRef.current.play().catch(e => console.error("Ses oynatılamadı", e));
            } else {
                audioRef.current.pause();
            }
        } else {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [selectedSoundId, ambientSounds, timerRunning]);

    const handleSaveSession = async () => {
        if (!user || !familyId || !memberId || !book) {
            toast({ title: "Hata", description: "Kullanıcı bilgileri eksik.", variant: "destructive" });
            return;
        }
        const pagesReadInSession = Math.max(0, currentEndPage - startPage);
        const durationSeconds = elapsedTime;
        const newSession: Omit<ReadingSession, 'id' | 'familyId'> = {
            memberId: memberId,
            bookId: book.id,
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            durationSeconds: durationSeconds,
            pagesRead: pagesReadInSession,
            notes: "",
        };

        await addReadingSession(newSession);

        if (book.pageCount) {
            const newProgressPercent = Math.min(Math.round((currentEndPage / book.pageCount) * 100), 100);
            const newStatus = (newProgressPercent >= 100 && !book.isForChildren) ? 'finished' : 'reading';
            await updateUserBookStatus(familyId, memberId, book.id, newStatus, newProgressPercent);
        }
        
        toast({ 
            title: "Oturum Kaydedildi!", 
            description: `${pagesReadInSession} sayfa okudun.`,
            className: "bg-emerald-600 text-white border-none"
        });
        router.push('/library');
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && book?.pageCount) {
            const clamped = Math.min(Math.max(0, val), book.pageCount);
            setCurrentEndPage(clamped);
        } else if (e.target.value === "") {
            setCurrentEndPage(0);
        }
    };

    if (isLoading) return <div className="flex h-[100dvh] items-center justify-center">Yükleniyor...</div>;
    if (!book) return <div className="flex h-[100dvh] items-center justify-center">Kitap bulunamadı.</div>;

    const sessionDelta = Math.max(0, currentEndPage - startPage);
    const targetSeconds = targetDurationMinutes * 60;
    const displaySeconds = mode === 'timer' ? targetSeconds - elapsedTime : elapsedTime;
    const isOvertime = mode === 'timer' && displaySeconds < 0;

    let fillPercent = 50;
    if (mode === 'stopwatch') {
        fillPercent = ((elapsedTime % 60) / 60) * 100;
    } else {
        const remaining = Math.max(0, targetSeconds - elapsedTime);
        fillPercent = (remaining / targetSeconds) * 100;
    }

    // --- CAM KÜRE (GLASS ORB) SIVI ZAMANLAYICI ---
    const GlassOrbTimer = ({ className, isFocus = false }: { className?: string, isFocus?: boolean }) => {
        const bubbles = [1, 2, 3, 4, 5, 6, 7];

        return (
            <div className={cn("relative flex items-center justify-center rounded-full shadow-[0_0_50px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-500", 
                 isFocus ? "border-0 shadow-none" : "border-8 border-white/20 bg-white/10 backdrop-blur-md",
                 isOvertime && !isFocus ? "border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]" : "",
                 className)}>
                
                {/* Küre İçi Gölgelendirme (3D Efekti) */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_-20px_60px_rgba(0,0,0,0.2),inset_0_20px_40px_rgba(255,255,255,0.4)] z-20 pointer-events-none"></div>
                <div className="absolute top-[5%] left-[15%] w-[30%] h-[15%] bg-white/40 rounded-full blur-[4px] -rotate-12 z-20 pointer-events-none"></div>

                {/* Sıvı Arka Planı */}
                <motion.div 
                    className={cn(
                        "absolute bottom-0 left-0 right-0 opacity-90 transition-colors duration-1000 z-0",
                        isOvertime ? "bg-red-500" : (isFocus ? "bg-emerald-500/80" : "bg-gradient-to-t from-indigo-500 via-purple-500 to-cyan-400")
                    )}
                    initial={false}
                    animate={{ height: `${fillPercent}%` }}
                    transition={{ type: "spring", stiffness: 20, damping: 20, duration: 2 }}
                >
                    {/* Dalga Efekti */}
                    <div className="absolute -top-4 left-0 right-0 h-8 w-[200%] flex" style={{ transform: 'translateX(-50%)' }}>
                        <motion.div 
                            className="w-full h-full bg-[url('https://raw.githubusercontent.com/svg-backgrounds/svg-backgrounds.github.io/main/svg/wave.svg')] bg-repeat-x bg-cover"
                            animate={{ x: [0, -100] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            style={{ filter: "brightness(0) invert(1) opacity(0.3)" }}
                        />
                    </div>

                    {/* Kabarcıklar */}
                    {timerRunning && fillPercent > 5 && bubbles.map((b, i) => (
                        <motion.div
                            key={i}
                            className="absolute bg-white/40 rounded-full backdrop-blur-sm"
                            style={{
                                width: Math.random() * 8 + 4,
                                height: Math.random() * 8 + 4,
                                left: `${Math.random() * 80 + 10}%`,
                            }}
                            initial={{ bottom: -20, opacity: 0 }}
                            animate={{ bottom: "110%", opacity: [0, 1, 0], x: Math.sin(i) * 15 }}
                            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                        />
                    ))}
                </motion.div>

                {/* Metin İçeriği */}
                <div className="relative z-30 flex flex-col items-center gap-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                    <span className={cn("text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter tabular-nums text-white", isOvertime && "text-red-100 animate-pulse")}>
                        {formatDuration(displaySeconds)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                         {isFocus && <Clock className="w-4 h-4 text-white/80" />}
                         <Badge variant="outline" className={cn("text-[10px] sm:text-xs uppercase tracking-widest px-3 border-white/30 text-white", isFocus ? "bg-transparent border-0 opacity-80" : "bg-black/20")}>
                             {isOvertime ? "Süre Doldu" : (timerRunning ? "Akışta" : "Duraklatıldı")}
                         </Badge>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-[100dvh] w-full bg-slate-50 selection:bg-indigo-500/20 overflow-hidden flex flex-col">
            {/* Canlı Açık Arkaplan Animasyonu (Odak modunda gizlenir) */}
            <div className={cn("fixed inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000", isFocusMode ? "opacity-0" : "opacity-100")}>
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-400/30 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-400/30 rounded-full blur-[100px] animate-[pulse_12s_ease-in-out_infinite_1s]" />
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-amber-400/20 rounded-full blur-[80px]" />
            </div>

            {/* ODAK MODU ARAYÜZÜ */}
            <AnimatePresence>
                {isFocusMode && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden"
                    >
                         {/* Odak Modu Arka Plan Işıması */}
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="w-[80vw] h-[80vw] max-w-2xl max-h-2xl rounded-full bg-emerald-500/10 blur-[120px] animate-pulse"></div>
                         </div>

                         {/* Çıkış Butonu */}
                         <Button variant="ghost" size="icon" className="absolute top-6 right-6 z-50 hover:bg-white/10 text-slate-400 hover:text-white" onClick={() => setIsFocusMode(false)}>
                            <Minimize2 className="w-6 h-6" />
                        </Button>

                        {/* Odak Modu Kitap Bilgisi (Sade) */}
                        <div className="absolute top-12 flex flex-col items-center gap-2 z-40 opacity-60">
                             <h3 className="text-white text-lg font-medium tracking-wide">{book.title}</h3>
                             <p className="text-slate-400 text-sm">{book.author}</p>
                        </div>

                        {/* Dev Odak Küresi */}
                        <div className="relative flex flex-col items-center justify-center gap-12 w-full max-w-md z-40">
                             <GlassOrbTimer className="w-[280px] h-[280px] sm:w-[350px] sm:h-[350px]" isFocus={true} />
                             
                             {/* Oynat/Duraklat (Görünmezden parlayan buton) */}
                             <Button
                                size="lg"
                                variant="ghost"
                                className={cn(
                                    "h-20 w-20 rounded-full transition-all hover:scale-110", 
                                    timerRunning 
                                        ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                                        : "text-slate-100 bg-white/10 hover:bg-white/20"
                                )}
                                onClick={() => setTimerRunning(!timerRunning)}
                            >
                                {timerRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NORMAL ARAYÜZ (Mobile-First Vertical Stack) */}
            <div className={cn("relative z-10 flex flex-col h-[100dvh] w-full max-w-md mx-auto transition-opacity duration-300", isFocusMode && "opacity-0 pointer-events-none")}>
                
                {/* ÜST BİLGİ & HEADER */}
                <header className="flex-none p-4 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="icon" className="hover:bg-white/40 bg-white/20 backdrop-blur-sm rounded-full shadow-sm" onClick={() => router.back()}>
                            <ArrowLeft className="w-5 h-5 text-slate-700" />
                        </Button>
                        
                        <div className="flex flex-col items-center">
                            <Badge variant="outline" className="bg-white/40 backdrop-blur-md px-3 py-1 border-white/60 shadow-sm text-slate-700">
                                <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                                Okuma Modu
                            </Badge>
                            {preventSleep && (
                                <span className="text-[9px] font-bold text-emerald-600 mt-1 flex items-center gap-0.5"><MonitorCheck className="w-3 h-3"/> Ekran Açık</span>
                            )}
                        </div>

                        <div className="flex gap-2">
                             {/* AYARLAR */}
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-white/40 bg-white/20 backdrop-blur-sm rounded-full shadow-sm">
                                        <Settings className="w-5 h-5 text-slate-700" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-xl border-white/60 text-slate-900 rounded-3xl shadow-xl">
                                    <DialogHeader>
                                        <DialogTitle>Oturum Ayarları</DialogTitle>
                                        <DialogDescription className="text-slate-500">Okuma deneyiminizi kişiselleştirin.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-6 py-4">
                                        <div className="flex items-center justify-between bg-white/50 p-3 rounded-2xl border border-white/60">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Ekranı Açık Tut</Label>
                                                <p className="text-xs text-slate-500">Ekranın uykuya geçmesini engelle.</p>
                                            </div>
                                            <Switch checked={preventSleep} onCheckedChange={setPreventSleep} />
                                        </div>
                                        <div className="space-y-4 bg-white/50 p-4 rounded-2xl border border-white/60">
                                            <Label className="text-sm font-bold">Zamanlayıcı Modu</Label>
                                            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                                                <TabsList className="grid w-full grid-cols-2 bg-slate-100 border border-slate-200">
                                                    <TabsTrigger value="stopwatch" className="data-[state=active]:bg-white rounded-md text-xs">Kronometre (İleri)</TabsTrigger>
                                                    <TabsTrigger value="timer" className="data-[state=active]:bg-white rounded-md text-xs">Geri Sayım</TabsTrigger>
                                                </TabsList>
                                            </Tabs>
                                        </div>
                                        {mode === 'timer' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-white/50 p-4 rounded-2xl border border-white/60">
                                                <div className="flex justify-between">
                                                    <Label className="text-sm font-bold">Süre Hedefi</Label>
                                                    <span className="text-sm font-bold text-indigo-600">{targetDurationMinutes} dakika</span>
                                                </div>
                                                <Slider 
                                                    value={[targetDurationMinutes]} 
                                                    min={5} max={180} step={5} 
                                                    onValueChange={(val) => setTargetDurationMinutes(val[0])}
                                                    className="py-2"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Kitap Bilgisi Kompakt */}
                    <div className="flex items-center gap-4 bg-white/30 backdrop-blur-md border border-white/60 rounded-2xl p-3 shadow-[0_4px_15px_rgba(0,0,0,0.02)] mx-2">
                        <div className="relative w-12 h-16 rounded-md overflow-hidden shadow-sm shrink-0">
                            <Image src={book.image || 'https://placehold.co/100x150.png'} alt={book.title} fill className="object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="font-bold text-sm leading-tight text-slate-800 truncate">{book.title}</h2>
                            <p className="text-xs text-slate-500 truncate">{book.author}</p>
                            <span className="text-[10px] font-bold text-indigo-600 mt-1">Başlangıç: {startPage}. Sayfa</span>
                        </div>
                    </div>
                </header>

                {/* ORTA BÖLÜM: ZAMANLAYICI & KONTROLLER */}
                <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
                     {/* Cam Küre Zamanlayıcı */}
                     <GlassOrbTimer className="w-64 h-64 sm:w-72 sm:h-72 mb-8" />

                     {/* Orta Kontroller (Ses, Oynat, Genişlet, Sıfırla) */}
                     <div className="flex items-center gap-4 sm:gap-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-full px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                          {/* Ses Menüsü */}
                          <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className={cn("h-12 w-12 rounded-full hover:bg-white/60", selectedSoundId && "text-indigo-600")}>
                                        <Music2 className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-56 bg-white/90 backdrop-blur-xl border-white/60 rounded-2xl">
                                    <DropdownMenuLabel>Odak Sesi</DropdownMenuLabel>
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

                            {/* Oynat/Durdur */}
                            <Button
                                size="lg"
                                className={cn(
                                    "h-16 w-16 rounded-full shadow-lg transition-transform hover:scale-105 border-2",
                                    timerRunning ? "bg-white border-rose-200 text-rose-500 hover:bg-rose-50" : "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-transparent"
                                )}
                                onClick={() => setTimerRunning(!timerRunning)}
                            >
                                {timerRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                            </Button>

                            {/* Odak Modu / Sıfırla */}
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-white/60 text-slate-500" onClick={() => setIsFocusMode(true)} title="Odak Modu">
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-white/60 text-slate-500" onClick={() => setElapsedTime(0)} title="Sıfırla">
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                     </div>
                </main>

                {/* ALT PANEL: İLERLEME VE KAYDET (Bottom Sheet Tarzı Sabit) */}
                <footer className="flex-none w-full px-4 pb-6 pt-2">
                    <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] flex flex-col gap-5 relative overflow-hidden">
                         {/* Hafif İç Işıma */}
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-50 mb-4"></div>
                         
                         <div className="flex flex-col gap-3 mt-2">
                            <div className="flex justify-between items-center px-1">
                                <Label className="text-sm font-bold text-slate-700">Hangi sayfada kaldın?</Label>
                                {sessionDelta > 0 && (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        +{sessionDelta} sayfa
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    value={currentEndPage === 0 ? '' : currentEndPage}
                                    onChange={handlePageInputChange}
                                    className="w-20 text-base font-black text-center h-12 bg-white/80 border-slate-200 rounded-xl focus:ring-indigo-500 shadow-inner"
                                    placeholder={startPage.toString()}
                                />
                                <div className="flex-1 px-2">
                                    <Slider
                                        value={[currentEndPage]}
                                        min={0}
                                        max={book.pageCount || 500}
                                        step={1}
                                        onValueChange={(val) => setCurrentEndPage(val[0])}
                                        className="py-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-indigo-600 [&_[role=slider]]:border-0"
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-400 w-10 text-right">/ {book.pageCount}</span>
                            </div>
                         </div>

                         <Button 
                            onClick={handleSaveSession} 
                            size="lg" 
                            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-base shadow-xl flex items-center justify-center gap-2"
                        >
                             <Save className="w-5 h-5" /> Oturumu Kaydet
                         </Button>
                    </div>
                </footer>
            </div>
        </div>
    );
}