

"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PomodoroProject, PomodoroSession } from "@/lib/data";
import { onPomodoroProjectsUpdate, addPomodoroProject, deletePomodoroProject, addPomodoroSession, onPomodoroSessionsForUserUpdate } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Timer, Play, Pause, RefreshCw, Settings, Plus, Trash2, Check, Expand, Shrink, Music, Circle, Minus, Hourglass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { onAmbientSoundsUpdate } from "@/lib/dataService";
import { AmbientSound } from "@/lib/data";
import { Progress } from "@/components/ui/progress";


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

    return (
        <div className="h-full flex flex-col items-center justify-center gap-8 pb-24">
            <PageHeader title="Pomodoro Zamanlayıcı" className="mb-0" />
            
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
            
            <motion.div
              layout
              className={cn(
                "relative w-72 sm:w-80 rounded-full shadow-2xl bg-card",
                timerStyle === 'circle' && 'h-72 sm:h-80',
                timerStyle === 'bar' && 'w-full max-w-lg h-auto rounded-xl p-8',
                timerStyle === 'hourglass' && 'h-72 sm:h-80 w-auto aspect-[3/4] rounded-2xl bg-transparent shadow-none',
                isFullScreen && "fixed inset-0 w-screen h-screen max-w-none rounded-none p-0 flex flex-col items-center justify-center gap-8 z-50 bg-transparent"
              )}
               transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
             {timerStyle === 'circle' ? (
                <>
                    <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                                <stop offset="25%" stopColor="hsl(var(--chart-5))" />
                                <stop offset="50%" stopColor="hsl(var(--chart-3))" />
                                <stop offset="100%" stopColor="hsl(var(--primary))" />
                            </linearGradient>
                        </defs>
                         <motion.circle
                            cx="50" cy="50" r="45"
                            fill="transparent"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            opacity="0.2"
                        />
                        <motion.circle
                            cx="50" cy="50" r="45" stroke="url(#gradient)" strokeWidth="10" fill="transparent"
                            strokeLinecap="round" transform="rotate(-90 50 50)" pathLength="1"
                            strokeDasharray="1"
                            initial={{ strokeDashoffset: 1 }}
                            animate={{ strokeDashoffset: 1 - progress / 100 }}
                            transition={{ duration: 1, ease: 'linear' }}
                        />
                    </motion.svg>
                    <div className="relative text-center flex flex-col items-center justify-center h-full">
                        <Button variant="ghost" size="icon" className={cn("absolute -top-12 right-0", isFullScreen ? "text-white hover:text-white hover:bg-white/20" : "")} onClick={() => setIsFullScreen(f => !f)}>
                            {isFullScreen ? <Shrink/> : <Expand/>}
                        </Button>
                        <h2 className={cn("font-bold font-mono tracking-tighter", isFullScreen ? "text-9xl text-white" : "text-6xl sm:text-7xl")}>{formatTime(timeLeft)}</h2>
                        <p className={cn("text-muted-foreground", isFullScreen && "text-white/80")}>{activeProject?.title || "Proje Seçilmedi"}</p>
                    </div>
                </>
             ) : timerStyle === 'bar' ? (
                <div className="relative text-center flex flex-col items-center justify-center h-full gap-4">
                    <Button variant="ghost" size="icon" className={cn("absolute top-2 right-2", isFullScreen ? "text-white hover:text-white hover:bg-white/20" : "")} onClick={() => setIsFullScreen(f => !f)}>
                        {isFullScreen ? <Shrink/> : <Expand/>}
                    </Button>
                     <h2 className={cn("font-bold font-mono tracking-tighter", isFullScreen ? "text-9xl text-white" : "text-6xl sm:text-7xl")}>{formatTime(timeLeft)}</h2>
                    <Progress value={progress} className={cn("w-full h-4", isFullScreen && "bg-white/20")} indicatorClassName={cn(isFullScreen && "bg-white")} />
                     <p className={cn("text-muted-foreground", isFullScreen && "text-white/80")}>{activeProject?.title || "Proje Seçilmedi"}</p>
                </div>
             ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                    <Button variant="ghost" size="icon" className={cn("absolute -top-12 right-0", isFullScreen ? "text-white hover:text-white hover:bg-white/20" : "")} onClick={() => setIsFullScreen(f => !f)}>
                        {isFullScreen ? <Shrink/> : <Expand/>}
                    </Button>
                     <motion.svg viewBox="0 0 100 120" className="w-full h-full">
                        <defs>
                            <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#fde68a" />
                                <stop offset="100%" stopColor="#facc15" />
                            </linearGradient>
                        </defs>
                        {/* Hourglass shape */}
                        <path d="M20 10 H80 L50 50 L80 90 H20 L50 50 Z" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="3" fill="hsl(var(--background) / 0.5)"/>
                        {/* Top sand */}
                        <motion.rect
                            x="25"
                            y="15"
                            width="50"
                            fill="url(#sandGradient)"
                            initial={{ height: 30 }}
                            animate={{ height: 30 * (1 - progress / 100) }}
                        />
                        {/* Bottom sand */}
                        <motion.rect
                            x="25"
                            y="90"
                            width="50"
                            fill="url(#sandGradient)"
                            initial={{ height: 0, y: 90 }}
                            animate={{ height: 30 * (progress / 100), y: 90 - 30 * (progress / 100) }}
                        />
                         <path d="M20 110 H80" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="3" strokeLinecap="round" />
                    </motion.svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <h2 className={cn("font-bold font-mono tracking-tighter", isFullScreen ? "text-7xl text-white" : "text-5xl")}>{formatTime(timeLeft)}</h2>
                    </div>
                </div>
             )}
            </motion.div>

            <div className="flex flex-col items-center gap-6">
                 <div className="flex gap-2 p-1 rounded-full bg-muted">
                    <Button variant={mode === 'pomodoro' ? 'default' : 'ghost'} onClick={() => switchMode('pomodoro')} className="rounded-full">Pomodoro</Button>
                    <Button variant={mode === 'shortBreak' ? 'default' : 'ghost'} onClick={() => switchMode('shortBreak')} className="rounded-full">Kısa Mola</Button>
                    <Button variant={mode === 'longBreak' ? 'default' : 'ghost'} onClick={() => switchMode('longBreak')} className="rounded-full">Uzun Mola</Button>
                </div>
                <div className="flex items-center gap-4">
                     <Button size="icon" variant="outline" className="rounded-full w-16 h-16" onClick={resetTimer}>
                        <RefreshCw />
                    </Button>
                    <Button size="lg" className="rounded-full w-40 h-20 text-xl" onClick={() => setIsActive(!isActive)}>
                        {isActive ? <Pause className="mr-2 h-8 w-8"/> : <Play className="mr-2 h-8 w-8"/>}
                        {isActive ? 'Durdur' : 'Başlat'}
                    </Button>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button size="icon" variant="outline" className="rounded-full w-16 h-16">
                                <Settings className="h-7 w-7"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Ayarlar</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs font-normal">Zamanlayıcı Stili</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={timerStyle} onValueChange={(v) => setTimerStyle(v as TimerStyle)}>
                                <DropdownMenuRadioItem value="circle">Dairesel</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="bar">Çubuk</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="hourglass">Kum Saati</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                             <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs font-normal">Ambiyans Sesi</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={selectedSoundId || ''} onValueChange={setSelectedSoundId}>
                                {ambientSounds.map(sound => (
                                     <DropdownMenuRadioItem key={sound.id} value={sound.id}>{sound.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelectedSoundId(null)}>Sesi Kapat</DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => setIsProjectModalOpen(true)}>Projeleri Yönet</DropdownMenuMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Projeleri Yönet</DialogTitle>
                        <DialogDescription>Çalışma seanslarınızı organize etmek için projeler oluşturun.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                           {projects.map(project => {
                               const stats = projectStats.get(project.id);
                               return (
                               <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                                   <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 rounded-full" style={{backgroundColor: project.color}} />
                                       <div>
                                           <span className="font-medium">{project.title}</span>
                                           <div className="text-xs text-muted-foreground flex gap-3">
                                                <span>{stats?.sessionCount || 0} seans</span>
                                                <span>{formatTime(stats?.totalSeconds || 0)}</span>
                                           </div>
                                       </div>
                                   </div>
                                    <div className="flex items-center gap-2">
                                        {selectedProjectId === project.id ? (
                                             <Check className="h-5 w-5 text-primary"/>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedProjectId(project.id)}>Seç</Button>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>"{project.title}" projesini sil?</AlertDialogTitle>
                                                    <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                   </div>
                               </div>
                           )})}
                        </div>
                        <div className="flex gap-2">
                            <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Yeni proje adı..."/>
                            <Button onClick={handleAddProject}><Plus className="mr-2 h-4 w-4"/> Ekle</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    