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

    // --- GERÇEKÇİ KUM SAATİ (SVG HOURGLASS) ---
    const HourglassTimer = ({ className, isFocus = false }: { className?: string, isFocus?: boolean }) => {
        // timer modunda: üstteki kum (topSand) = fillPercent (azalır), alttaki kum (bottomSand) = 100 - fillPercent (artar)
        // stopwatch modunda: her dakika başı topSand sıfırlanır ve dolar
        const topSandPct = mode === 'timer' ? fillPercent : (100 - ((elapsedTime % 60) / 60) * 100);
        const bottomSandPct = mode === 'timer' ? (100 - fillPercent) : ((elapsedTime % 60) / 60) * 100;
        const sandColor = isOvertime ? "#ef4444" : (isFocus ? "#10b981" : "#6366f1");
        const sandColor2 = isOvertime ? "#f87171" : (isFocus ? "#34d399" : "#06b6d4");
        const isFlowing = timerRunning && !isOvertime;

        // SVG kum saati geometrisi
        const W = 160;  // genişlik
        const H = 300;  // yükseklik
        const midX = W / 2;
        const neckW = 8;   // boyun genişliği
        const rimH = 18;   // üst/alt kenar yüksekliği

        // Üst hazne: (rimH'dan neckY'ye kadar trapezoid)
        const neckY = H / 2;
        // Üst hazne iç alanı (rimH → neckY)
        const topInnerH = neckY - rimH;
        // topSandPct bazında üst kumun yüksekliği (alttan başlıyor)
        const topSandH = (topSandPct / 100) * topInnerH;
        // Kum yüzeyi Y koordinatı (üst hazne, alttan topSandH kadar dolu)
        const topSandTopY = neckY - topSandH;
        // O Y'de (üst hazne) iç genişlik: lineer interpolasyon
        const topWidthAtY = (y: number) => {
            // rimH'da (W - 16), neckY'de neckW
            const t = (y - rimH) / topInnerH;
            return (W - 16) * (1 - t) + neckW * t;
        };
        const topSandTopW = topWidthAtY(Math.max(rimH, topSandTopY));

        // Alt hazne iç alanı (neckY → H - rimH)
        const bottomInnerH = (H - rimH) - neckY;
        const bottomSandH = (bottomSandPct / 100) * bottomInnerH;
        // Alt kumun üst Y'si (alttan bottomSandH kadar dolu)
        const bottomSandTopY = (H - rimH) - bottomSandH;
        const bottomWidthAtY = (y: number) => {
            const t = (y - neckY) / bottomInnerH;
            return neckW * (1 - t) + (W - 16) * t;
        };
        const bottomSandTopW = bottomWidthAtY(Math.min(H - rimH, bottomSandTopY));

        return (
            <div className={cn("relative flex flex-col items-center justify-center select-none", className)}>
                {/* Dış parlama efekti */}
                <div
                    className="absolute inset-0 rounded-full blur-[60px] opacity-30 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${sandColor2}88, transparent 70%)` }}
                />

                {/* Ana SVG Kum Saati */}
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-full drop-shadow-2xl"
                    style={{ filter: "drop-shadow(0 8px 32px rgba(99,102,241,0.25))" }}
                >
                    <defs>
                        {/* Kum gradyanı */}
                        <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sandColor2} />
                            <stop offset="100%" stopColor={sandColor} />
                        </linearGradient>
                        {/* Cam gövde gradyanı */}
                        <linearGradient id="glassBody" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
                            <stop offset="40%" stopColor="white" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="white" stopOpacity="0.15" />
                        </linearGradient>
                        {/* Kenar metal gradyanı */}
                        <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="50%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        {/* Cam yansıması */}
                        <linearGradient id="glassShine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="topChamber">
                            <polygon points={`${8},${rimH} ${W - 8},${rimH} ${midX + neckW / 2},${neckY} ${midX - neckW / 2},${neckY}`} />
                        </clipPath>
                        <clipPath id="bottomChamber">
                            <polygon points={`${midX - neckW / 2},${neckY} ${midX + neckW / 2},${neckY} ${W - 8},${H - rimH} ${8},${H - rimH}`} />
                        </clipPath>
                    </defs>

                    {/* === ÜST HAZNE KUM === */}
                    {topSandPct > 0 && (
                        <polygon
                            clipPath="url(#topChamber)"
                            points={`
                                ${midX - topSandTopW / 2},${topSandTopY}
                                ${midX + topSandTopW / 2},${topSandTopY}
                                ${midX + neckW / 2},${neckY}
                                ${midX - neckW / 2},${neckY}
                            `}
                            fill="url(#sandGrad)"
                            opacity="0.92"
                        />
                    )}
                    {/* Üst kumun üst yüzey parlak çizgisi */}
                    {topSandPct > 1 && (
                        <line
                            x1={midX - topSandTopW / 2 + 2}
                            y1={topSandTopY + 1}
                            x2={midX + topSandTopW / 2 - 2}
                            y2={topSandTopY + 1}
                            stroke="white"
                            strokeWidth="2"
                            strokeOpacity="0.4"
                            strokeLinecap="round"
                        />
                    )}

                    {/* === ALT HAZNE KUM === */}
                    {bottomSandPct > 0 && (
                        <polygon
                            clipPath="url(#bottomChamber)"
                            points={`
                                ${midX - bottomSandTopW / 2},${bottomSandTopY}
                                ${midX + bottomSandTopW / 2},${bottomSandTopY}
                                ${W - 8},${H - rimH}
                                ${8},${H - rimH}
                            `}
                            fill="url(#sandGrad)"
                            opacity="0.92"
                        />
                    )}
                    {/* Alt kumun üst yüzey parlak çizgisi */}
                    {bottomSandPct > 1 && (
                        <line
                            x1={midX - bottomSandTopW / 2 + 2}
                            y1={bottomSandTopY + 1}
                            x2={midX + bottomSandTopW / 2 - 2}
                            y2={bottomSandTopY + 1}
                            stroke="white"
                            strokeWidth="2"
                            strokeOpacity="0.35"
                            strokeLinecap="round"
                        />
                    )}

                    {/* === CAM GÖVDE (üstte) === */}
                    <polygon
                        points={`${8},${rimH} ${W - 8},${rimH} ${midX + neckW / 2},${neckY} ${midX - neckW / 2},${neckY}`}
                        fill="url(#glassBody)"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                    />
                    {/* === CAM GÖVDE (altta) === */}
                    <polygon
                        points={`${midX - neckW / 2},${neckY} ${midX + neckW / 2},${neckY} ${W - 8},${H - rimH} ${8},${H - rimH}`}
                        fill="url(#glassBody)"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                    />

                    {/* Sol cam yansıma şeridi (üst) */}
                    <polygon
                        points={`${10},${rimH + 4} ${10 + 12},${rimH + 4} ${midX - neckW / 2 - 2},${neckY - 8} ${midX - neckW / 2 - 14},${neckY - 8}`}
                        fill="url(#glassShine)"
                        opacity="0.5"
                    />

                    {/* === BOYUN (Dar bağlantı) === */}
                    <rect
                        x={midX - neckW / 2}
                        y={neckY - 2}
                        width={neckW}
                        height={4}
                        fill={sandColor}
                        rx="2"
                        opacity="0.7"
                    />

                    {/* === KUM AKIŞ DAMLASI (boyundan dökülen kum) === */}
                    {isFlowing && (
                        <>
                            {/* Ana akış çizgisi */}
                            <motion.line
                                x1={midX}
                                y1={neckY + 2}
                                x2={midX}
                                y2={bottomSandTopY > neckY + 10 ? bottomSandTopY - 2 : neckY + 30}
                                stroke={sandColor2}
                                strokeWidth="3"
                                strokeLinecap="round"
                                opacity="0.85"
                                animate={{ opacity: [0.6, 1, 0.6], strokeWidth: [2, 3, 2] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            />
                            {/* Kum tanesi 1 */}
                            <motion.circle
                                cx={midX - 1}
                                cy={neckY + 10}
                                r={2.5}
                                fill={sandColor2}
                                animate={{ cy: [neckY + 10, neckY + 40, neckY + 10], opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            />
                            {/* Kum tanesi 2 */}
                            <motion.circle
                                cx={midX + 1.5}
                                cy={neckY + 25}
                                r={2}
                                fill={sandColor}
                                animate={{ cy: [neckY + 20, neckY + 50, neckY + 20], opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "linear", delay: 0.25 }}
                            />
                            {/* Kum tanesi 3 */}
                            <motion.circle
                                cx={midX - 0.5}
                                cy={neckY + 38}
                                r={1.5}
                                fill={sandColor2}
                                animate={{ cy: [neckY + 35, neckY + 60, neckY + 35], opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "linear", delay: 0.5 }}
                            />
                        </>
                    )}

                    {/* === ÜST METALİK KENAR === */}
                    <rect x="2" y="2" width={W - 4} height={rimH - 2} rx="8" fill="url(#rimGrad)" />
                    <rect x="4" y="3" width={W - 8} height={6} rx="4" fill="white" fillOpacity="0.5" />
                    {/* === ALT METALİK KENAR === */}
                    <rect x="2" y={H - rimH} width={W - 4} height={rimH - 2} rx="8" fill="url(#rimGrad)" />
                    <rect x="4" y={H - 10} width={W - 8} height={6} rx="4" fill="white" fillOpacity="0.3" />

                    {/* === ZAMAN METNİ === */}
                    <text
                        x={midX}
                        y={neckY - 16}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="36"
                        fontWeight="900"
                        fontFamily="monospace"
                        fill="white"
                        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
                    >
                        {formatDuration(displaySeconds)}
                    </text>
                    <text
                        x={midX}
                        y={neckY + 22}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="sans-serif"
                        letterSpacing="2"
                        fill="white"
                        fillOpacity="0.8"
                        style={{ textTransform: "uppercase" }}
                    >
                        {isOvertime ? "SÜRE DOLDU" : (timerRunning ? "AKIŞTA" : "DURAKLATILDI")}
                    </text>
                </svg>
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
                             <HourglassTimer className="w-[200px] h-[300px] sm:w-[250px] sm:h-[350px]" isFocus={true} />
                             
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
                     <HourglassTimer className="w-[180px] h-[280px] sm:w-[220px] sm:h-[320px] mb-8" />

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