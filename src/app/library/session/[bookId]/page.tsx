"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { onBooksUpdate, addReadingSession, updateUserBookStatus, onAmbientSoundsUpdate, onSingleUserLibraryUpdate } from "@/lib/dataService";
import type { Book, ReadingSession, AmbientSound, UserLibrary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Save, ArrowLeft, Music2, Maximize2, Minimize2, Sparkles, Clock, BookOpenCheck, Settings, MonitorOff, MonitorCheck, RotateCcw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// --- WAKE LOCK HOOK (EKRAN AÇIK TUTMA) ---
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
            // Sayfa görünürlüğü değişirse (örn: sekme değiştirme) tekrar iste
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
    return `${isNegative ? '-' : ''}${h}:${m}:${s}`;
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

    // --- ZAMANLAYICI STATE'LERİ ---
    const [startTime] = React.useState(new Date());
    const [elapsedTime, setElapsedTime] = React.useState(0); // Toplam geçen süre (her zaman artar)
    const [timerRunning, setTimerRunning] = React.useState(true);
    
    // Ayarlar State'leri
    const [mode, setMode] = React.useState<'stopwatch' | 'timer'>('stopwatch'); // Kronometre veya Geri Sayım
    const [targetDurationMinutes, setTargetDurationMinutes] = React.useState(30);
    const [preventSleep, setPreventSleep] = React.useState(true);

    // Ekranı açık tut
    useWakeLock(preventSleep && timerRunning);

    const [startPage, setStartPage] = React.useState(0);
    const [currentEndPage, setCurrentEndPage] = React.useState(0);
    const [isPageInitialized, setIsPageInitialized] = React.useState(false);
    
    const [selectedSoundId, setSelectedSoundId] = React.useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = React.useState(false);

    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // --- VERİ ÇEKME ---
    React.useEffect(() => {
        const unsubscribeBooks = onBooksUpdate((allBooks) => {
            const currentBook = allBooks.find(b => b.id === bookId);
            setBook(currentBook || null);
            setIsLoading(false);
        });
        const unsubscribeSounds = onAmbientSoundsUpdate(setAmbientSounds);
        let unsubscribeLibrary = () => {};
        if (user) {
            unsubscribeLibrary = onSingleUserLibraryUpdate(user.uid, (lib) => {
                setUserLibrary(lib);
            });
        }
        return () => {
            unsubscribeBooks();
            unsubscribeSounds();
            unsubscribeLibrary();
        };
    }, [bookId, user]);

    // --- SAYFA BAŞLANGICI ---
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

    // --- ZAMANLAYICI MANTIĞI ---
    React.useEffect(() => {
        if (timerRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timerRunning]);

    // --- SES MANTIĞI ---
    React.useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = 'auto';
        }
        const sound = ambientSounds.find(s => s.id === selectedSoundId);
        if (sound) {
            audioRef.current.src = sound.url;
            audioRef.current.loop = sound.loop;
            audioRef.current.play().catch(e => console.error("Ses çalma hatası:", e));
        } else {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [selectedSoundId, ambientSounds]);

    const handleSaveSession = async () => {
        if (!familyId || !user || !book) {
            toast({ title: "Hata", description: "Kullanıcı bilgileri eksik.", variant: "destructive" });
            return;
        }
        const pagesReadInSession = Math.max(0, currentEndPage - startPage);
        const durationSeconds = elapsedTime;
        const newSession: Omit<ReadingSession, 'id' | 'familyId'> = {
            memberId: user.uid,
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
            const newStatus = newProgressPercent >= 100 ? 'finished' : 'reading';
            await updateUserBookStatus(familyId, user.uid, book.id, newStatus, newProgressPercent);
        }
        
        toast({ 
            title: "Oturum Kaydedildi!", 
            description: `${pagesReadInSession} sayfa okudun.`,
            className: "bg-green-600 text-white border-none"
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

    if (isLoading) return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
    if (!book) return <div className="flex h-screen items-center justify-center">Kitap bulunamadı.</div>;

    const sessionDelta = Math.max(0, currentEndPage - startPage);

    // --- HESAPLAMALAR ---
    const targetSeconds = targetDurationMinutes * 60;
    const displaySeconds = mode === 'timer' ? targetSeconds - elapsedTime : elapsedTime;
    const isOvertime = mode === 'timer' && displaySeconds < 0;

    // Animasyon Yüzdesi
    let fillPercent = 50;
    if (mode === 'stopwatch') {
        fillPercent = ((elapsedTime % 60) / 60) * 100;
    } else {
        const remaining = Math.max(0, targetSeconds - elapsedTime);
        fillPercent = (remaining / targetSeconds) * 100;
    }

    // --- SIVI (LIQUID) ZAMANLAYICI BİLEŞENİ ---
    const LiquidTimer = ({ className }: { className?: string }) => {
        const bubbles = [1, 2, 3, 4, 5];

        return (
            <div className={cn("relative flex items-center justify-center rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-black/20 backdrop-blur-sm transition-all duration-500", isOvertime ? "border-red-500/50" : "border-white/20", className)}>
                
                {/* Sıvı Arka Planı */}
                <motion.div 
                    className={cn(
                        "absolute bottom-0 left-0 right-0 opacity-80 transition-colors duration-1000",
                        isOvertime ? "bg-red-600" : "bg-gradient-to-t from-blue-600 via-purple-600 to-pink-500"
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
                            style={{ filter: "brightness(0) invert(1) opacity(0.5)" }}
                        />
                    </div>

                    {/* Kabarcıklar */}
                    {timerRunning && fillPercent > 5 && bubbles.map((b, i) => (
                        <motion.div
                            key={i}
                            className="absolute bg-white/30 rounded-full"
                            style={{
                                width: Math.random() * 10 + 5,
                                height: Math.random() * 10 + 5,
                                left: `${Math.random() * 100}%`,
                            }}
                            initial={{ bottom: -20, opacity: 0 }}
                            animate={{ bottom: "110%", opacity: [0, 1, 0], x: Math.sin(i) * 20 }}
                            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                        />
                    ))}
                </motion.div>

                {/* Metin İçeriği */}
                <div className="relative z-10 flex flex-col items-center gap-2 drop-shadow-md">
                    <Clock className="w-8 h-8 text-white/90" />
                    <span className={cn("text-6xl md:text-7xl font-black tracking-tighter tabular-nums text-white", isOvertime && "text-red-200 animate-pulse")}>
                        {formatDuration(displaySeconds)}
                    </span>
                    <Badge variant="outline" className="text-xs uppercase tracking-widest px-3 py-1 border-white/40 text-white bg-black/20">
                        {isOvertime ? "Süre Doldu" : (timerRunning ? "Akışta" : "Duraklatıldı")}
                    </Badge>
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-screen w-full bg-background selection:bg-primary/20">
            {/* Arkaplan Animasyonu */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                 <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-purple-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-color animate-blob" />
                 <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-blue-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-color animate-blob animation-delay-2000" />
                 <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-pink-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-color animate-blob animation-delay-4000" />
            </div>

            {/* ODAK MODU ARAYÜZÜ (FIX: Arkaplan rengi sabit koyu yapıldı) */}
            <AnimatePresence>
                {isFocusMode && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        // DÜZELTME: bg-background yerine bg-slate-950/95 kullanıldı. Böylece beyaz tema da olsa burası koyu kalır.
                        className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
                    >
                         <Button variant="ghost" size="icon" className="absolute top-6 right-6 z-50 hover:bg-white/10 text-white" onClick={() => setIsFocusMode(false)}>
                            <Minimize2 className="w-8 h-8" />
                        </Button>
                        <div className="relative flex flex-col items-center justify-center gap-12 w-full max-w-md">
                             <LiquidTimer className="w-80 h-80 md:w-96 md:h-96 border-8" />
                             <Button
                                size="lg"
                                className={cn(
                                    "h-24 w-24 rounded-full shadow-2xl transition-all hover:scale-110 border-4 relative z-10", 
                                    timerRunning 
                                        ? "bg-white border-red-500 text-red-500 hover:bg-red-50" // Odak modu koyu olduğu için buton arka planı beyaz yapıldı
                                        : "bg-primary text-primary-foreground"
                                )}
                                onClick={() => setTimerRunning(!timerRunning)}
                            >
                                {timerRunning ? <Pause className="h-10 w-10 fill-current" /> : <Play className="h-10 w-10 fill-current ml-1" />}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NORMAL ARAYÜZ */}
            <div className={cn("relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8 pb-12 md:pb-12 gap-6 max-w-[1600px] mx-auto transition-opacity duration-300", isFocusMode && "opacity-0 pointer-events-none")}>
                
                <header className="flex items-center justify-between shrink-0">
                    <Button variant="ghost" size="icon" className="hover:bg-background/40 backdrop-blur-sm rounded-full" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                        {preventSleep && (
                             <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 gap-1 hidden sm:flex">
                                <MonitorCheck className="w-3 h-3" /> Ekran Açık
                             </Badge>
                        )}
                        <Badge variant="outline" className="bg-background/30 backdrop-blur-md px-3 py-1 border-white/20">
                            <Sparkles className="w-3 h-3 mr-1 text-yellow-500" />
                            Okuma Modu
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* AYARLAR DIALOG */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-background/40 backdrop-blur-sm rounded-full">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-white/90 dark:bg-black/90 backdrop-blur-xl">
                                <DialogHeader>
                                    <DialogTitle>Oturum Ayarları</DialogTitle>
                                    <DialogDescription>Okuma deneyiminizi kişiselleştirin.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Ekranı Açık Tut</Label>
                                            <p className="text-sm text-muted-foreground">Okuma sırasında ekranın kapanmasını engelle.</p>
                                        </div>
                                        <Switch checked={preventSleep} onCheckedChange={setPreventSleep} />
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="text-base">Zamanlayıcı Modu</Label>
                                        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="stopwatch">Kronometre (İleri)</TabsTrigger>
                                                <TabsTrigger value="timer">Geri Sayım</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                    {mode === 'timer' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex justify-between">
                                                <Label>Süre Hedefi</Label>
                                                <span className="text-sm font-bold text-primary">{targetDurationMinutes} dakika</span>
                                            </div>
                                            <Slider 
                                                value={[targetDurationMinutes]} 
                                                min={5} max={180} step={5} 
                                                onValueChange={(val) => setTargetDurationMinutes(val[0])}
                                            />
                                            <p className="text-xs text-muted-foreground text-right">
                                                Süre dolduğunda sayaç kırmızıya döner ama durmaz.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button variant="ghost" size="icon" className="hover:bg-background/40 backdrop-blur-sm rounded-full" onClick={() => setIsFocusMode(true)}>
                            <Maximize2 className="w-5 h-5" />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Sol Kolon (Kitap Bilgisi) */}
                    <div className="lg:col-span-4 flex flex-col gap-6 w-full">
                        <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-md border-white/20 shadow-xl overflow-hidden">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="relative w-24 aspect-[2/3] rounded-md overflow-hidden shadow-lg shrink-0">
                                    <Image src={book.image || 'https://placehold.co/100x150.png'} alt={book.title} fill className="object-cover" />
                                </div>
                                <div className="flex flex-col justify-center space-y-2 w-full">
                                    <h2 className="font-bold text-lg leading-tight">{book.title}</h2>
                                    <p className="text-sm text-muted-foreground">{book.author}</p>
                                    <div className="mt-2 flex items-center gap-2 bg-primary/10 p-2 rounded-lg border border-primary/20">
                                        <BookOpenCheck className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Başlangıç: <span className="font-bold text-primary">{startPage}. Sayfa</span></span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sağ Kolon (Zamanlayıcı ve Kontroller) */}
                    <div className="lg:col-span-8 flex flex-col gap-6 w-full">
                        <div className="relative w-full aspect-square md:aspect-video lg:aspect-auto lg:h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-3xl border border-white/10 flex flex-col items-center justify-center p-8 shadow-2xl overflow-hidden">
                            
                            {/* SIVI ZAMANLAYICI */}
                            <LiquidTimer className="w-72 h-72 mb-8" />

                            <div className="flex items-center gap-6 relative z-20">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="outline" className={cn("h-14 w-14 rounded-full border-2", selectedSoundId && "border-primary bg-primary/10 text-primary")}>
                                            <Music2 className="h-6 w-6" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
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

                                <Button
                                    size="lg"
                                    className={cn(
                                        "h-20 w-20 rounded-full shadow-lg transition-transform hover:scale-105",
                                        timerRunning ? "bg-background border-2 border-red-500 text-red-500 hover:bg-red-50" : "bg-primary text-primary-foreground"
                                    )}
                                    onClick={() => setTimerRunning(!timerRunning)}
                                >
                                    {timerRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                                </Button>

                                <Button size="icon" variant="outline" className="h-14 w-14 rounded-full border-2" onClick={() => setElapsedTime(0)}>
                                    <RotateCcw className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>

                        {/* Sayfa Girişi */}
                        <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-md border-white/20 p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="w-full md:w-1/2 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-base font-medium">Hangi sayfada kaldın?</Label>
                                        {sessionDelta > 0 && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                +{sessionDelta} sayfa
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            value={currentEndPage === 0 ? '' : currentEndPage}
                                            onChange={handlePageInputChange}
                                            className="w-24 text-lg font-bold text-center h-12 bg-background/50"
                                            placeholder={startPage.toString()}
                                        />
                                        <span className="text-muted-foreground text-sm font-medium">/ {book.pageCount}</span>
                                    </div>
                                    <Slider
                                        value={[currentEndPage]}
                                        min={0}
                                        max={book.pageCount || 500}
                                        step={1}
                                        onValueChange={(val) => setCurrentEndPage(val[0])}
                                        className="py-2"
                                    />
                                </div>
                                <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    <Button variant="ghost" size="lg" onClick={() => router.push('/library')} className="flex-1 md:flex-none">İptal</Button>
                                    <Button onClick={handleSaveSession} size="lg" className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20">
                                        <Save className="mr-2 h-5 w-5" /> Kaydet
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}