"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PomodoroProject, PomodoroSession } from "@/lib/data";
import { onPomodoroProjectsUpdate, addPomodoroProject, deletePomodoroProject, addPomodoroSession, onPomodoroSessionsForUserUpdate } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RefreshCw, Settings, Plus, Trash2, Check, Expand, Shrink, Music, Timer as TimerIcon, Volume2, MoreVertical, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { onAmbientSoundsUpdate } from "@/lib/dataService";
import { AmbientSound } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- DESIGN SYSTEM ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
    ACTIVE_MODE: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30",
    INACTIVE_MODE: "text-slate-400 hover:text-white hover:bg-white/5",
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
            className: "bg-indigo-950 border-indigo-500/50 text-indigo-100"
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
            toast({title: "Proje Eklendi", className: "bg-emerald-950 border-emerald-500/50 text-emerald-100"});
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-orange-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-red-500 to-orange-600 p-2 rounded-xl shadow-lg shadow-red-500/20">
                            <TimerIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-100 hidden md:block">Pomodoro</h1>
                    </div>

                    {/* Mode Switcher - Header Center */}
                    <div className="flex bg-slate-900/50 p-1 rounded-full border border-white/5 backdrop-blur-md">
                        <button onClick={() => switchMode('pomodoro')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", mode === 'pomodoro' ? glassColors.ACTIVE_MODE : glassColors.INACTIVE_MODE)}>Odaklan</button>
                        <button onClick={() => switchMode('shortBreak')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", mode === 'shortBreak' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" : glassColors.INACTIVE_MODE)}>Kısa Mola</button>
                        <button onClick={() => switchMode('longBreak')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", mode === 'longBreak' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : glassColors.INACTIVE_MODE)}>Uzun Mola</button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => setIsProjectModalOpen(true)}>
                            <LayoutGrid className="w-5 h-5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100 w-56">
                                <DropdownMenuLabel>Görünüm</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuRadioGroup value={timerStyle} onValueChange={(v) => setTimerStyle(v as TimerStyle)}>
                                    <DropdownMenuRadioItem value="circle">Dairesel</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="bar">Çubuk</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="hourglass">Kum Saati</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuLabel>Sesler</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={selectedSoundId || ''} onValueChange={setSelectedSoundId}>
                                    {ambientSounds.map(sound => (
                                        <DropdownMenuRadioItem key={sound.id} value={sound.id}>{sound.name}</DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => setSelectedSoundId(null)}>Sesi Kapat</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* FULL SCREEN OVERLAY */}
            <AnimatePresence>
                {isFullScreen && (
                    <motion.div 
                        className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setIsFullScreen(false)}>
                            <Shrink className="w-8 h-8"/>
                        </Button>
                        <div className="scale-150 transform">
                             {/* Re-render timer here simplified or same component */}
                             <h1 className="text-[12rem] font-black text-white font-mono leading-none tracking-tighter">
                                {formatTime(timeLeft)}
                             </h1>
                             <p className="text-center text-2xl text-slate-400 mt-4 font-medium">{activeProject?.title || "Odaklanma Zamanı"}</p>
                             <div className="flex justify-center gap-6 mt-12">
                                <Button size="lg" className="h-20 w-20 rounded-full bg-white/10 hover:bg-white/20 border-2 border-white/10" onClick={() => setIsActive(!isActive)}>
                                    {isActive ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                                </Button>
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-5xl mx-auto">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-center">
                    
                    {/* LEFT: TIMER */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center">
                        <div className="relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute -top-12 right-0 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => setIsFullScreen(true)}
                            >
                                <Expand className="w-5 h-5" />
                            </Button>

                            <motion.div
                                layout
                                className={cn(
                                    "relative flex items-center justify-center",
                                    timerStyle === 'circle' && "w-80 h-80 sm:w-96 sm:h-96",
                                    timerStyle === 'bar' && "w-full max-w-xl py-12",
                                    timerStyle === 'hourglass' && "w-64 h-80"
                                )}
                            >
                                {timerStyle === 'circle' && (
                                    <>
                                        {/* Outer Glow */}
                                        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
                                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
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
                                                    <stop offset="100%" stopColor="#ec4899" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-7xl sm:text-8xl font-black font-mono tracking-tighter text-white drop-shadow-2xl">
                                                {formatTime(timeLeft)}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProject?.color || '#94a3b8' }} />
                                                <span className="text-sm font-medium text-slate-300 max-w-[150px] truncate">
                                                    {activeProject?.title || "Proje Seçilmedi"}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {timerStyle === 'bar' && (
                                    <div className="w-full space-y-6">
                                        <div className="text-9xl font-black font-mono tracking-tighter text-center text-white">
                                            {formatTime(timeLeft)}
                                        </div>
                                        <div className="relative h-6 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                                                initial={{ width: "100%" }}
                                                animate={{ width: `${100 - progress}%` }}
                                                transition={{ duration: 1, ease: "linear" }}
                                            />
                                        </div>
                                        <div className="text-center text-slate-400 font-medium text-lg">
                                            {activeProject?.title || "Proje Seçilmedi"}
                                        </div>
                                    </div>
                                )}

                                {timerStyle === 'hourglass' && (
                                    <div className="relative w-full h-full">
                                        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-2xl">
                                            <defs>
                                                <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor="#fbbf24" />
                                                    <stop offset="100%" stopColor="#d97706" />
                                                </linearGradient>
                                            </defs>
                                            {/* Glass Container */}
                                            <path d="M20 10 H80 L50 50 L80 90 H20 L50 50 Z" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="rgba(255,255,255,0.05)" strokeLinejoin="round" />
                                            
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
                                        <div className="absolute -bottom-16 w-full text-center text-4xl font-mono font-bold text-white">
                                            {formatTime(timeLeft)}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Controls */}
                        <div className="mt-12 flex items-center gap-6">
                            <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-14 w-14 rounded-full border-white/10 hover:bg-white/10 text-slate-400 hover:text-white" 
                                onClick={resetTimer}
                            >
                                <RefreshCw className="w-6 h-6" />
                            </Button>
                            
                            <Button 
                                size="lg" 
                                className={cn(
                                    "h-20 w-20 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95",
                                    isActive 
                                        ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/30" 
                                        : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30"
                                )} 
                                onClick={() => setIsActive(!isActive)}
                            >
                                {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                            </Button>

                            <Button 
                                size="icon" 
                                variant="outline" 
                                className={cn("h-14 w-14 rounded-full border-white/10 hover:bg-white/10", selectedSoundId ? "text-indigo-400 border-indigo-500/50 bg-indigo-500/10" : "text-slate-400 hover:text-white")}
                                onClick={() => setSelectedSoundId(selectedSoundId ? null : (ambientSounds[0]?.id || null))}
                            >
                                {selectedSoundId ? <Volume2 className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT: PROJECT STATS */}
                    <div className="lg:col-span-5 h-full max-h-[500px] flex flex-col">
                        <div className={cn("flex-1 rounded-3xl p-6 overflow-hidden flex flex-col", glassColors.CARD_BG)}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-indigo-400" />
                                    Projeler
                                </h3>
                                <Button size="sm" onClick={() => setIsProjectModalOpen(true)} className={glassColors.BUTTON_GLASS}>
                                    <Plus className="w-4 h-4 mr-1" /> Yeni
                                </Button>
                            </div>
                            
                            <ScrollArea className="flex-1 pr-4 -mr-4">
                                <div className="space-y-3">
                                    {projects.map(project => {
                                        const stats = projectStats.get(project.id);
                                        const isSelected = selectedProjectId === project.id;
                                        return (
                                            <div 
                                                key={project.id} 
                                                onClick={() => setSelectedProjectId(project.id)}
                                                className={cn(
                                                    "group p-4 rounded-2xl border transition-all cursor-pointer",
                                                    isSelected 
                                                        ? "bg-white/10 border-white/20 shadow-lg" 
                                                        : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5"
                                                )}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner text-xs font-bold text-white/90", isSelected ? "ring-2 ring-white/20" : "")}
                                                            style={{ backgroundColor: project.color }}
                                                        >
                                                            {project.title.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className={cn("font-semibold text-sm", isSelected ? "text-white" : "text-slate-300")}>{project.title}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider bg-black/20 px-1.5 py-0.5 rounded">
                                                                    {stats?.sessionCount || 0} Seans
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-mono">
                                                                    {formatTime(stats?.totalSeconds || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {isSelected && (
                                                        <div className="flex gap-1">
                                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    
                                    {projects.length === 0 && (
                                        <div className="text-center py-10 text-slate-500">
                                            <p>Henüz proje yok.</p>
                                            <p className="text-sm">Yeni bir proje ekleyerek başla.</p>
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
                <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Projeleri Yönet</DialogTitle>
                        <DialogDescription className="text-slate-400">Çalışma seanslarınızı organize etmek için projeler oluşturun.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                            <Input 
                                value={newProjectName} 
                                onChange={e => setNewProjectName(e.target.value)} 
                                placeholder="Yeni proje adı..." 
                                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50"
                            />
                            <Button onClick={handleAddProject} className="bg-indigo-600 hover:bg-indigo-500 text-white"><Plus className="w-4 h-4"/></Button>
                        </div>
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                           {projects.map(project => (
                               <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                   <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{backgroundColor: project.color, color: project.color}} />
                                       <span className="text-sm font-medium text-slate-200">{project.title}</span>
                                   </div>
                                   <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Projeyi Sil?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-400">"{project.title}" projesi ve istatistikleri silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                   </AlertDialog>
                               </div>
                           ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}