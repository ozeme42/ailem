
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PomodoroProject, PomodoroSession } from "@/lib/data";
import { onPomodoroProjectsUpdate, addPomodoroProject, deletePomodoroProject, addPomodoroSession } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Timer, Play, Pause, RefreshCw, Settings, Plus, Trash2, Check, Expand, Shrink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


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

export function PomodoroClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [mode, setMode] = React.useState<TimerMode>('pomodoro');
    const [timeLeft, setTimeLeft] = React.useState(defaultDurations.pomodoro);
    const [isActive, setIsActive] = React.useState(false);
    const [projects, setProjects] = React.useState<PomodoroProject[]>([]);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [sessionsToday, setSessionsToday] = React.useState(0);
    const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
    const [newProjectName, setNewProjectName] = React.useState("");
    const [isFullScreen, setIsFullScreen] = React.useState(false);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onPomodoroProjectsUpdate(user.uid, setProjects);
        return () => unsubscribe();
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

        if (mode === 'pomodoro' && user) {
            const newSessionCount = sessionsToday + 1;
            setSessionsToday(newSessionCount);
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
    }, [mode, selectedProjectId, sessionsToday, toast, user, switchMode]);


    React.useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            handleTimerEnd();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, handleTimerEnd]);
    
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
    
    const totalDuration = defaultDurations[mode];
    const progress = (1 - timeLeft / totalDuration) * 100;
    
    const activeProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 gap-8 pb-24">
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
                "relative w-72 h-72 sm:w-80 sm:h-80 rounded-full flex items-center justify-center shadow-2xl bg-card",
                isFullScreen && "fixed inset-0 w-screen h-screen max-w-none rounded-none p-0 flex flex-col items-center justify-center gap-8 z-50 bg-transparent"
              )}
               transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                 <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                        <stop offset="25%" stopColor="hsl(var(--chart-5))" />
                        <stop offset="50%" stopColor="hsl(var(--chart-3))" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  strokeDasharray="282.74"
                  strokeDashoffset={282.74 * (1 - progress / 100)}
                  transition={{ duration: 0.5 }}
                />
              </motion.svg>
              <div className="relative text-center">
                <Button variant="ghost" size="icon" className={cn("absolute -top-12 right-0", isFullScreen ? "text-white hover:text-white hover:bg-white/20" : "")} onClick={() => setIsFullScreen(f => !f)}>
                    {isFullScreen ? <Shrink/> : <Expand/>}
                </Button>
                <h2 className={cn("font-bold font-mono tracking-tighter", isFullScreen ? "text-9xl text-white" : "text-6xl sm:text-7xl")}>{formatTime(timeLeft)}</h2>
                <p className={cn("text-muted-foreground", isFullScreen && "text-white/80")}>{activeProject?.title || "Proje Seçilmedi"}</p>
              </div>
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
                     <Button size="icon" variant="outline" className="rounded-full w-16 h-16" onClick={() => setIsProjectModalOpen(true)}>
                        <Settings />
                    </Button>
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
                           {projects.map(project => (
                               <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                                   <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 rounded-full" style={{backgroundColor: project.color}} />
                                       <span className="font-medium">{project.title}</span>
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
                           ))}
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
