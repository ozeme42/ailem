"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PomodoroProject, PomodoroSession } from "@/lib/data";
import { onPomodoroProjectsUpdate, addPomodoroProject, deletePomodoroProject, addPomodoroSession, onPomodoroSessionsForUserUpdate } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RefreshCw, Settings, Plus, Trash2, Check, Expand, Shrink, Music, Timer as TimerIcon, Volume2, LayoutGrid, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { onAmbientSoundsUpdate } from "@/lib/dataService";
import { AmbientSound } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- DESIGN SYSTEM ---
const appColors = {
    bg: "bg-slate-50 dark:bg-slate-950",
    headerBg: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5",
    cardBg: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm",
    buttonGlass: "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white",
    activeModeFocus: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30",
    activeModeShortBreak: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30",
    activeModeLongBreak: "bg-blue-600 text-white shadow-lg shadow-blue-500/30",
    inactiveMode: "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5",
    textMain: "text-slate-900 dark:text-white",
    textMuted: "text-slate-500 dark:text-slate-400",
};

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

const defaultDurations = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';
type TimerStyle = 'circle' | 'bar' | 'hourglass';

export function PomodoroClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    const [mode, setMode] = React.useState<TimerMode>('pomodoro');
    const [timeLeft, setTimeLeft] = React.useState(defaultDurations.pomodoro);
    const [isActive, setIsActive] = React.useState(false);
    const [projects, setProjects] = React.useState<PomodoroProject[]>([]);
    const [allSessions, setAllSessions] = React.useState<PomodoroSession[]>([]);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
    const [newProjectName, setNewProjectName] = React.useState("");
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [ambientSounds, setAmbientSounds] = React.useState<AmbientSound[]>([]);
    const [selectedSoundId, setSelectedSoundId] = React.useState<string | null>(null);
    const [timerStyle, setTimerStyle] = React.useState<TimerStyle>('circle');
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribeProjects = onPomodoroProjectsUpdate(user.uid, setProjects);
        const unsubscribeSounds = onAmbientSoundsUpdate(setAmbientSounds);
        const unsubscribeSessions = onPomodoroSessionsForUserUpdate(user.uid, setAllSessions);

        return () => {
            unsubscribeProjects();
            unsubscribeSounds();
            unsubscribeSessions();
        };
    }, [user]);
    
    React.useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const switchMode = React.useCallback((newMode: TimerMode) => {
        setMode(newMode);
        setTimeLeft(defaultDurations[newMode]);
        setIsActive(false);
    }, []);

    const handleTimerEnd = React.useCallback(() => {
        setIsActive(false);
        toast({
            title: "🎉 Süre Doldu!",
            description: mode === 'pomodoro' ? "Harika iş, şimdi kısa bir mola zamanı!" : "Mola bitti, tekrar iş başına!",
        });
        
        const completedSessionsToday = allSessions.filter(s => {
            const sessionDate = new Date(s.startTime);
            const today = new Date();
            return sessionDate.getDate() === today.getDate() &&
                   sessionDate.getMonth() === today.getMonth() &&
                   sessionDate.getFullYear() === today.getFullYear();
        }).length;

        if (mode === 'pomodoro' && user) {
            const newSessionCount = completedSessionsToday + 1;
            if (selectedProjectId) {
                 addPomodoroSession({
                    projectId: selectedProjectId,
                    memberId: user.uid,
                    startTime: new Date(Date.now() - defaultDurations.pomodoro * 1000).toISOString(),
                    endTime: new Date().toISOString(),
                    durationSeconds: defaultDurations.pomodoro
                });
            }
            if (newSessionCount % 4 === 0) {
                switchMode('longBreak');
            } else {
                switchMode('shortBreak');
            }
        } else {
            switchMode('pomodoro');
        }
    }, [mode, selectedProjectId, allSessions, toast, user, switchMode]);

    React.useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (isActive && timeLeft <= 0) {
            handleTimerEnd();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, handleTimerEnd]);
    
      React.useEffect(() => {
        if (audioRef.current) {
            const sound = ambientSounds.find(s => s.id === selectedSoundId);
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            if (sound && isActive) {
                audioRef.current.src = sound.url;
                audioRef.current.loop = sound.loop;
                audioRef.current.play().catch(e => console.error("Error playing audio:", e));
            }
        }
    }, [selectedSoundId, ambientSounds, isActive]);

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
    
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(defaultDurations[mode]);
    }
    
    const handleAddProject = async () => {
        if (!newProjectName.trim() || !user) return;
        try {
            await addPomodoroProject({
                memberId: user.uid,
                title: newProjectName,
                color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
                targetTimeSeconds: 0,
                trackedTimeSeconds: 0,
            });
            setNewProjectName("");
            setIsProjectModalOpen(false);
            toast({title: "Proje Eklendi"});
        } catch(e) {
            toast({title: "Hata", variant: 'destructive'});
        }
    };
    
    const handleDeleteProject = async (projectId: string) => {
        try {
            await deletePomodoroProject(projectId);
            if (selectedProjectId === projectId) {
                setSelectedProjectId(projects.length > 1 ? projects.find(p => p.id !== projectId)!.id : null);
            }
            toast({title: "Proje Silindi", variant: 'destructive'});
        } catch (e) {
            toast({title: "Hata", variant: 'destructive'});
        }
    };
    
    const projectStats = React.useMemo(() => {
        const stats = new Map<string, { sessionCount: number, totalSeconds: number }>();
        allSessions.forEach(session => {
            const current = stats.get(session.projectId) || { sessionCount: 0, totalSeconds: 0 };
            current.sessionCount++;
            current.totalSeconds += session.durationSeconds;
            stats.set(session.projectId, current);
        });
        return stats;
    }, [allSessions]);
    
    const totalDuration = defaultDurations[mode];
    const progress = (1 - timeLeft / totalDuration) * 100;
    
    const activeProject = projects.find(p => p.id === selectedProjectId);

    const TimerComponent = ({ fullScreen = false }: { fullScreen?: boolean }) => {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full">
                 <motion.div
                    layout
                    className={cn(
                        "relative flex items-center justify-center",
                        timerStyle === 'circle' && (fullScreen ? "w-96 h-96 sm:w-[500px] sm:h-[500px]" : "w-80 h-80 sm:w-96 sm:h-96"),
                        timerStyle === 'bar' && "w-full max-w-2xl py-12 px-6",
                        timerStyle === 'hourglass' && (fullScreen ? "w-80 h-96" : "w-64 h-80")
                    )}
                >
                    {timerStyle === 'circle' && (
                        <>
                            {/* Outer Glow */}
                            <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
                            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                                <motion.circle
                                    cx="50" cy="50" r="45" stroke="url(#gradient)" strokeWidth="6" fill="transparent"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 1 }}
                                    animate={{ pathLength: 1 - progress / 100 }}
                                    transition={{ duration: 1, ease: "linear" }}
                                    className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor={mode === 'pomodoro' ? "#ec4899" : mode === 'shortBreak' ? "#10b981" : "#3b82f6"} />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className={cn("font-black font-mono tracking-tighter drop-shadow-lg", fullScreen ? "text-8xl sm:text-[140px]" : "text-7xl sm:text-8xl", appColors.textMain)}>
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProject?.color || '#94a3b8' }} />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
                                        {activeProject?.title || "Proje Seçilmedi"}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {timerStyle === 'bar' && (
                        <div className="w-full space-y-8">
                            <div className={cn("font-black font-mono tracking-tighter text-center", fullScreen ? "text-[150px] leading-none" : "text-9xl", appColors.textMain)}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className="relative h-6 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-white/10 shadow-inner">
                                <motion.div 
                                    className={cn("h-full", mode === 'pomodoro' ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" : mode === 'shortBreak' ? "bg-emerald-500" : "bg-blue-500")}
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${100 - progress}%` }}
                                    transition={{ duration: 1, ease: "linear" }}
                                />
                            </div>
                            <div className="text-center font-bold text-lg text-slate-500 dark:text-slate-400">
                                {activeProject?.title || "Proje Seçilmedi"}
                            </div>
                        </div>
                    )}

                    {timerStyle === 'hourglass' && (
                        <div className="relative w-full h-full">
                            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xl">
                                <defs>
                                    <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#fbbf24" />
                                        <stop offset="100%" stopColor="#d97706" />
                                    </linearGradient>
                                </defs>
                                {/* Glass Container */}
                                <path d="M20 10 H80 L50 50 L80 90 H20 L50 50 Z" stroke="currentColor" strokeWidth="4" fill="transparent" strokeLinejoin="round" className="text-slate-300 dark:text-white/20" />
                                
                                {/* Top Sand */}
                                <mask id="topSandMask">
                                    <path d="M20 10 H80 L50 50 Z" fill="white"/>
                                </mask>
                                <motion.rect
                                    x="0" y="0" width="100" height="60"
                                    fill="url(#sandGradient)"
                                    mask="url(#topSandMask)"
                                    initial={{ y: 0 }}
                                    animate={{ y: 50 * (progress / 100) }}
                                    transition={{ duration: 1, ease: 'linear' }}
                                />

                                {/* Bottom Sand */}
                                <mask id="bottomSandMask">
                                    <path d="M50 50 L80 90 H20 Z" fill="white"/>
                                </mask>
                                <motion.rect
                                    x="0" y="50" width="100" height="50"
                                    fill="url(#sandGradient)"
                                    mask="url(#bottomSandMask)"
                                    initial={{ height: 0, y: 100 }}
                                    animate={{ height: 40 * (progress / 100), y: 100 - (40 * (progress / 100)) }}
                                    transition={{ duration: 1, ease: 'linear' }}
                                />
                            </svg>
                            <div className={cn("absolute -bottom-16 w-full text-center font-mono font-black", fullScreen ? "text-6xl" : "text-5xl", appColors.textMain)}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Controls */}
                <div className={cn("flex items-center gap-6", fullScreen ? "mt-24" : "mt-16")}>
                    <Button 
                        size="icon" 
                        variant="outline" 
                        className={cn("rounded-full transition-colors", fullScreen ? "h-20 w-20" : "h-14 w-14", "border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10")} 
                        onClick={resetTimer}
                    >
                        <RefreshCw className={fullScreen ? "w-8 h-8" : "w-6 h-6"} />
                    </Button>
                    
                    <Button 
                        size="lg" 
                        className={cn(
                            "rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95",
                            fullScreen ? "h-28 w-28" : "h-20 w-20",
                            isActive 
                                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/30" 
                                : mode === 'pomodoro' ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30" : mode === 'shortBreak' ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/30"
                        )} 
                        onClick={() => setIsActive(!isActive)}
                    >
                        {isActive ? <Pause className={cn("fill-current", fullScreen ? "w-12 h-12" : "w-8 h-8")} /> : <Play className={cn("fill-current ml-1", fullScreen ? "w-12 h-12" : "w-8 h-8")} />}
                    </Button>

                    <Button 
                        size="icon" 
                        variant="outline" 
                        className={cn("rounded-full transition-colors", fullScreen ? "h-20 w-20" : "h-14 w-14", selectedSoundId ? "text-indigo-600 border-indigo-500/50 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10" : "border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10")}
                        onClick={() => setSelectedSoundId(selectedSoundId ? null : (ambientSounds[0]?.id || null))}
                    >
                        {selectedSoundId ? <Volume2 className={fullScreen ? "w-8 h-8" : "w-6 h-6"} /> : <Music className={fullScreen ? "w-8 h-8" : "w-6 h-6"} />}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("min-h-screen font-sans relative overflow-hidden flex flex-col", appColors.bg)}>
            
            {/* FIXED BACKGROUND */}
            <div className={cn("fixed inset-0 -z-50", appColors.bg)} />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-100 transition-opacity duration-1000">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-900/10 dark:bg-red-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-orange-900/10 dark:bg-orange-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", appColors.headerBg)}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => router.push('/')} 
                            variant="ghost" 
                            size="icon"
                            className="rounded-full bg-slate-100/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0 mr-1"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                            <TimerIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 hidden md:block">Pomodoro</h1>
                    </div>

                    {/* Mode Switcher - Header Center */}
                    <div className="flex bg-slate-100/80 dark:bg-slate-900/50 p-1 rounded-full border border-slate-200 dark:border-white/5 backdrop-blur-md">
                        <button onClick={() => switchMode('pomodoro')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", mode === 'pomodoro' ? appColors.activeModeFocus : appColors.inactiveMode)}>Odaklan</button>
                        <button onClick={() => switchMode('shortBreak')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", mode === 'shortBreak' ? appColors.activeModeShortBreak : appColors.inactiveMode)}>Kısa Mola</button>
                        <button onClick={() => switchMode('longBreak')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", mode === 'longBreak' ? appColors.activeModeLongBreak : appColors.inactiveMode)}>Uzun Mola</button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onClick={() => setIsFullScreen(true)}>
                            <Expand className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onClick={() => setIsProjectModalOpen(true)}>
                            <LayoutGrid className="w-5 h-5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 w-56 rounded-2xl shadow-xl">
                                <DropdownMenuLabel className="font-bold">Görünüm</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                                <DropdownMenuRadioGroup value={timerStyle} onValueChange={(v) => setTimerStyle(v as TimerStyle)}>
                                    <DropdownMenuRadioItem value="circle" className="font-medium cursor-pointer rounded-lg m-1 hover:bg-slate-100 dark:hover:bg-white/10">Dairesel</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="bar" className="font-medium cursor-pointer rounded-lg m-1 hover:bg-slate-100 dark:hover:bg-white/10">Çubuk</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="hourglass" className="font-medium cursor-pointer rounded-lg m-1 hover:bg-slate-100 dark:hover:bg-white/10">Kum Saati</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                                <DropdownMenuLabel className="font-bold">Sesler</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={selectedSoundId || ''} onValueChange={setSelectedSoundId}>
                                    {ambientSounds.map(sound => (
                                        <DropdownMenuRadioItem key={sound.id} value={sound.id} className="font-medium cursor-pointer rounded-lg m-1 hover:bg-slate-100 dark:hover:bg-white/10">{sound.name}</DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                                <DropdownMenuItem onClick={() => setSelectedSoundId(null)} className="font-medium cursor-pointer rounded-lg m-1 hover:bg-slate-100 dark:hover:bg-white/10 text-rose-600 dark:text-rose-400">Sesi Kapat</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* FULL SCREEN OVERLAY */}
            <AnimatePresence>
                {isFullScreen && (
                    <motion.div 
                        className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center", appColors.bg)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* AMBIENT BACKGROUND (Again for fullscreen) */}
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-100 transition-opacity duration-1000">
                            <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/10 dark:bg-indigo-900/20 rounded-full blur-[150px]" />
                            <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 dark:bg-purple-900/20 rounded-full blur-[150px]" />
                        </div>
                        
                        <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 z-50 rounded-full h-12 w-12" onClick={() => setIsFullScreen(false)}>
                            <Shrink className="w-6 h-6"/>
                        </Button>
                        
                        <div className="z-10 w-full h-full flex flex-col items-center justify-center">
                            <TimerComponent fullScreen={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10 w-full max-w-6xl mx-auto">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
                    
                    {/* LEFT: TIMER */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center w-full">
                        <div className="relative group w-full flex justify-center">
                            <TimerComponent />
                        </div>
                    </div>

                    {/* RIGHT: PROJECT STATS */}
                    <div className="lg:col-span-5 h-[450px] lg:h-[550px] flex flex-col w-full">
                        <div className={cn("flex-1 rounded-[2.5rem] p-6 md:p-8 overflow-hidden flex flex-col relative", appColors.cardBg)}>
                            {/* Gradient Line Top */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                            
                            <div className="flex items-center justify-between mb-6 pt-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <LayoutGrid className="w-6 h-6 text-indigo-500" />
                                    Projeler
                                </h3>
                                <Button size="sm" onClick={() => setIsProjectModalOpen(true)} className={cn("rounded-xl h-10 font-bold", appColors.buttonGlass)}>
                                    <Plus className="w-4 h-4 mr-1.5" /> Yeni Proje
                                </Button>
                            </div>
                            
                            <ScrollArea className="flex-1 pr-4 -mr-4">
                                <div className="space-y-3 pb-4">
                                    {projects.map(project => {
                                        const stats = projectStats.get(project.id);
                                        const isSelected = selectedProjectId === project.id;
                                        return (
                                            <div 
                                                key={project.id} 
                                                onClick={() => setSelectedProjectId(project.id)}
                                                className={cn(
                                                    "group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                                                    isSelected 
                                                        ? "bg-indigo-50 border-indigo-200 dark:bg-white/10 dark:border-white/20 shadow-sm" 
                                                        : "bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:border-white/5"
                                                )}
                                            >
                                                {isSelected && <div className="absolute left-0 top-0 w-1.5 h-full bg-indigo-500 rounded-l-2xl" />}
                                                
                                                <div className="flex justify-between items-center pl-2">
                                                    <div className="flex items-center gap-4">
                                                        <div 
                                                            className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-base font-black text-white/95", isSelected ? "ring-2 ring-offset-2 ring-indigo-500/50 dark:ring-white/20 dark:ring-offset-slate-900" : "")}
                                                            style={{ backgroundColor: project.color }}
                                                        >
                                                            {project.title.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className={cn("font-bold text-base transition-colors", isSelected ? "text-indigo-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>{project.title}</h4>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-200/50 dark:bg-black/20 px-2 py-1 rounded-md">
                                                                    {stats?.sessionCount || 0} Seans
                                                                </span>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                                                                    {formatTime(stats?.totalSeconds || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {isSelected && (
                                                        <div className="flex-shrink-0">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-emerald-500/20 flex items-center justify-center border border-indigo-200 dark:border-emerald-500/30">
                                                                <Check className="w-4 h-4 text-indigo-600 dark:text-emerald-400" strokeWidth={3} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    
                                    {projects.length === 0 && (
                                        <div className="text-center py-16 text-slate-500 dark:text-slate-400 font-medium">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <LayoutGrid className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p>Henüz proje yok.</p>
                                            <p className="text-sm mt-1">Yeni bir proje ekleyerek başla.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>

            {/* PROJECT DIALOG */}
            <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-none sm:border sm:border-slate-200 dark:sm:border-white/10 sm:max-w-md w-full rounded-t-[2rem] sm:rounded-[2rem] p-0 overflow-hidden flex flex-col mt-auto sm:mt-0 h-auto shadow-2xl">
                    <div className="p-6 border-b border-slate-100 dark:border-white/5 relative">
                        <DialogClose className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors">
                            <X className="w-5 h-5" />
                        </DialogClose>
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">Projeleri Yönet</DialogTitle>
                        <DialogDescription className="text-slate-500 mt-2 font-medium">
                            Çalışma seanslarınızı organize etmek için projeler oluşturun.
                        </DialogDescription>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex gap-3">
                            <Input 
                                value={newProjectName} 
                                onChange={e => setNewProjectName(e.target.value)} 
                                placeholder="Yeni proje adı..." 
                                className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium placeholder:text-slate-400 h-14 rounded-2xl focus:border-indigo-500/50"
                            />
                            <Button onClick={handleAddProject} className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 w-14 rounded-2xl shrink-0 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
                                <Plus className="w-6 h-6"/>
                            </Button>
                        </div>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Mevcut Projeler</h4>
                           {projects.map(project => (
                               <div key={project.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                   <div className="flex items-center gap-3">
                                       <div className="w-4 h-4 rounded-full shadow-[0_0_8px_currentColor]" style={{backgroundColor: project.color, color: project.color}} />
                                       <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{project.title}</span>
                                   </div>
                                   <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white">Projeyi Sil?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-500 font-medium mt-2">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">"{project.title}"</span> projesi ve istatistikleri silinecek. Bu işlem geri alınamaz.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-6 gap-3">
                                                <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border-none dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 h-12 rounded-xl font-bold flex-1 sm:flex-none">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl font-bold flex-1 sm:flex-none">Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                   </AlertDialog>
                               </div>
                           ))}
                           {projects.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Liste boş.</p>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}