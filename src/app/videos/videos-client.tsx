"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  PlusCircle, Search, Trash2, Edit, Settings, Youtube, 
  Folder, Plus, ArrowLeft, PlayCircle, FolderOpen, 
  ExternalLink, CheckCircle2, Trophy, MoreVertical, FileText,
  CalendarDays, Target, CalendarClock, ListTodo
} from 'lucide-react';
import { onVideosUpdate, onTagsUpdate, addVideo, updateVideo, deleteVideo, updateTags, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { NewVideoForm, VideoFormData } from '@/components/new-video-form';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- TİPLER VE RENKLER ---

// Plan verisi için basit bir arayüz (Gerçek uygulamada DB'de saklanmalı)
interface StudyPlan {
    videoId: string;
    targetDate: string; // YYYY-MM-DD
    targetCount: number; // Kaç video izlenecek
    completedToday: number; // Bugün kaç tane izlendi
}

const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-rose-500 to-pink-600 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
};

const brightColors = [
    { id: 'blue', gradient: 'from-blue-500/10 to-indigo-600/10 border-blue-500/20 text-blue-200' },
    { id: 'teal', gradient: 'from-teal-400/10 to-green-500/10 border-teal-400/20 text-teal-200' },
    { id: 'amber', gradient: 'from-amber-400/10 to-orange-500/10 border-amber-400/20 text-amber-200' },
    { id: 'rose', gradient: 'from-rose-400/10 to-red-500/10 border-rose-400/20 text-rose-200' },
];

const shelfFormSchema = z.object({
    name: z.string().min(1, "Kategori adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;

// --- ALT BİLEŞEN: HIZLI SEÇİM IZGARASI ---
const QuickSelectGrid = ({ total, current, onSelect }: { total: number, current: number, onSelect: (val: number) => void }) => {
    const numbers = useMemo(() => Array.from({ length: total + 1 }, (_, i) => i), [total]);

    return (
        <div className="grid grid-cols-5 gap-1 p-1 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {numbers.map((num) => (
                <button
                    key={num}
                    onClick={() => onSelect(num)}
                    className={cn(
                        "text-xs font-mono font-bold p-2 rounded-md transition-all border",
                        current === num 
                            ? "bg-rose-600 text-white border-rose-500 shadow-md scale-105 z-10" 
                            : current > num
                                ? "bg-rose-900/10 text-rose-200/40 border-rose-500/5 hover:bg-rose-900/30"
                                : "bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700 hover:text-white"
                    )}
                >
                    {num}
                </button>
            ))}
        </div>
    );
};

// --- ALT BİLEŞEN: ARŞİV LİSTE SATIRI ---
function VideoRow({ video, onEdit, onDelete }: { video: Video, onEdit: (video: Video) => void, onDelete: (id: string) => void }) {
    const [completed, setCompleted] = useState(video.completedVideos || 0);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    
    const progress = video.totalVideos > 0 ? (completed / video.totalVideos) * 100 : 0;
    const isCompleted = completed === video.totalVideos && video.totalVideos > 0;

    const updateDB = async (val: number) => {
        if (val !== video.completedVideos) {
            await updateVideo(video.id, { completedVideos: val });
        }
    };

    const handleIncrement = async () => {
        if (completed < video.totalVideos) {
            const newVal = completed + 1;
            setCompleted(newVal);
            await updateDB(newVal);
        }
    };

    const handleDecrement = async () => {
        if (completed > 0) {
            const newVal = completed - 1;
            setCompleted(newVal);
            await updateDB(newVal);
        }
    };

    const handleQuickSelect = async (val: number) => {
        setCompleted(val);
        setIsPopoverOpen(false);
        await updateDB(val);
    };

    return (
        <div className={cn(
            "group relative flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 pl-4 rounded-xl border transition-all duration-300",
            isCompleted 
                ? "bg-emerald-950/10 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]" 
                : "bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/10"
        )}>
            <div 
                className={cn("absolute bottom-0 left-0 h-[3px] transition-all duration-700 rounded-b-xl", isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-rose-600 to-pink-600")} 
                style={{ width: `${progress}%` }} 
            />

            <div className="flex items-center gap-4 flex-1 min-w-0 w-full pb-2 sm:pb-0">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                    isCompleted 
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                        : "bg-slate-800 border-white/5 text-slate-500 group-hover:text-slate-300"
                )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                </div>
                
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className={cn("text-sm font-semibold truncate", isCompleted ? "text-emerald-100 line-through decoration-emerald-500/50" : "text-slate-200")}>
                            {video.title}
                        </h4>
                        {video.url && (
                            <a href={video.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-1">
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    <div className="flex gap-2 mt-1">
                        {video.tags?.map(tag => (
                            <span key={tag} className="text-[10px] text-slate-500 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">#{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-3 pl-2 sm:border-l sm:border-white/5">
                <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5 border border-white/5">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleDecrement}
                        disabled={completed === 0}
                        className="h-8 w-8 rounded-md hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 disabled:opacity-20"
                    >
                        -
                    </Button>

                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className="h-8 min-w-[70px] px-1 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 rounded transition-colors group/counter">
                                <span className={cn("font-mono text-base font-bold leading-none mt-0.5", isCompleted ? "text-emerald-400" : "text-white")}>
                                    {completed} <span className="text-slate-600 text-[10px] font-normal">/ {video.totalVideos}</span>
                                </span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 bg-slate-900 border-white/10 text-slate-100 p-3 shadow-2xl">
                            <div className="flex justify-between items-center mb-3 px-1 border-b border-white/5 pb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hızlı Seçim</span>
                                <span className="text-xs font-mono text-slate-600">%{Math.round(progress)}</span>
                            </div>
                            <QuickSelectGrid total={video.totalVideos} current={completed} onSelect={handleQuickSelect} />
                        </PopoverContent>
                    </Popover>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleIncrement}
                        disabled={isCompleted}
                        className={cn(
                            "h-8 w-8 rounded-md text-slate-500 disabled:opacity-20",
                            isCompleted ? "text-emerald-500/50" : "hover:bg-rose-500/20 hover:text-rose-400"
                        )}
                    >
                        +
                    </Button>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-white hover:bg-white/10 rounded-full">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-40 p-1 bg-slate-900 border-white/10 shadow-xl">
                        <button onClick={() => onEdit(video)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 rounded-md hover:text-white transition-colors text-left">
                            <Edit className="w-3.5 h-3.5 text-blue-400" /> Düzenle
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-rose-900/20 rounded-md hover:text-rose-400 transition-colors text-left">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Listeyi Sil
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                <AlertDialogHeader><AlertDialogTitle>Listeyi Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">"{video.title}" silinsin mi?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 text-slate-300">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(video.id)} className="bg-rose-600">Sil</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}

// --- DOSYA RAFI (Video Shelf) ---
function VideoShelf({ videos, onEdit, onDelete }: { videos: Video[], onEdit: (video: Video) => void, onDelete: (id: string) => void }) {
  const shelves = useMemo(() => {
    const grouped: Record<string, Video[]> = {};
    videos.forEach(video => {
      const videoTags = video.tags && video.tags.length > 0 ? video.tags : ["Genel"];
      videoTags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        if(!grouped[tag].some(b => b.id === video.id)) {
            grouped[tag].push(video);
        }
      });
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));
  }, [videos]);

  if (videos.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center mt-8">
        <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
             <FileText className="mx-auto h-8 w-8 text-slate-500" />
        </div>
        <p className="text-lg font-bold text-slate-300">Dosya Bulunamadı</p>
      </div>
     );
  }

  return (
    <div className="space-y-10 pb-10">
      {shelves.map(([shelfName, shelfVideos]) => {
          const totalVids = shelfVideos.reduce((acc, v) => acc + v.totalVideos, 0);
          const completedVids = shelfVideos.reduce((acc, v) => acc + (v.completedVideos || 0), 0);
          const shelfProgress = totalVids > 0 ? Math.round((completedVids / totalVids) * 100) : 0;
          const isAllDone = shelfProgress === 100 && totalVids > 0;

          return (
             <div key={shelfName} className="space-y-4">
                <div className="flex items-end justify-between px-2 pb-2 border-b border-white/10 group">
                    <div className="flex items-center gap-3">
                        <FolderOpen className={cn("h-6 w-6 transition-colors", isAllDone ? "text-emerald-500" : "text-rose-500")} />
                        <div>
                            <h3 className="text-xl font-bold text-slate-100 tracking-tight leading-none">{shelfName}</h3>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {shelfVideos.length} Dosya • {totalVids} Video
                            </span>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                         <span className={cn("text-base font-mono font-bold", isAllDone ? "text-emerald-400" : "text-rose-400")}>
                            %{shelfProgress}
                         </span>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                     {shelfVideos.map((video) => (
                        <VideoRow key={video.id} video={video} onEdit={onEdit} onDelete={onDelete} />
                     ))}
                </div>
            </div>
          )
      })}
    </div>
  );
}

// --- YENİ BİLEŞEN: PLANLAMA MODÜLÜ (Study Planner) ---
function PlanningModule({ videos }: { videos: Video[] }) {
    // Demo amaçlı state - Gerçekte bu veriler DB'ye kaydedilmeli
    const [plans, setPlans] = useState<StudyPlan[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
    const [selectedVideoForPlan, setSelectedVideoForPlan] = useState<string | null>(null);
    const [targetCountInput, setTargetCountInput] = useState(1);

    const todaysPlans = plans.filter(p => p.targetDate === selectedDate);
    const remainingVideos = videos.filter(v => (v.completedVideos || 0) < v.totalVideos);

    const handleCreatePlan = () => {
        if (!selectedVideoForPlan) return;
        const newPlan: StudyPlan = {
            videoId: selectedVideoForPlan,
            targetDate: selectedDate,
            targetCount: targetCountInput,
            completedToday: 0
        };
        setPlans([...plans, newPlan]);
        setIsPlanDialogOpen(false);
        setSelectedVideoForPlan(null);
    };

    const handleDeletePlan = (videoId: string) => {
        setPlans(plans.filter(p => !(p.videoId === videoId && p.targetDate === selectedDate)));
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* SOL: GÜNLÜK PLAN LİSTESİ */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-6 h-6 text-rose-500" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Planlanan Dersler</h2>
                            <p className="text-xs text-slate-400">
                                {format(new Date(selectedDate), 'd MMMM yyyy, EEEE', { locale: tr })}
                            </p>
                        </div>
                    </div>
                    <Input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-auto bg-slate-800 border-white/10 text-slate-200"
                    />
                </div>

                {todaysPlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                        <CalendarClock className="w-12 h-12 text-slate-600 mb-3" />
                        <h3 className="text-slate-300 font-bold">Bugün için plan yok</h3>
                        <p className="text-slate-500 text-sm mb-4">Sağ taraftan ders seçerek bugüne hedef ekleyin.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {todaysPlans.map(plan => {
                            const video = videos.find(v => v.id === plan.videoId);
                            if (!video) return null;
                            const progress = (plan.completedToday / plan.targetCount) * 100;
                            
                            return (
                                <div key={plan.videoId} className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 p-5 rounded-2xl flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-100">{video.title}</h4>
                                                <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                                    <span>Hedef: {plan.targetCount} Video</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span>Genel Durum: {video.completedVideos}/{video.totalVideos}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.videoId)} className="h-8 w-8 text-slate-500 hover:text-rose-400">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-slate-400">
                                            <span>Günlük İlerleme</span>
                                            <span className={cn(progress >= 100 ? "text-emerald-400" : "text-rose-400")}>%{Math.round(progress)}</span>
                                        </div>
                                        <Progress value={progress} className="h-3 bg-slate-950" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-rose-500")} />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                         <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10" 
                                            onClick={() => {
                                                const newCount = Math.min(plan.targetCount, plan.completedToday + 1);
                                                const updatedPlans = plans.map(p => p.videoId === plan.videoId && p.targetDate === selectedDate ? {...p, completedToday: newCount} : p);
                                                setPlans(updatedPlans);
                                                // Burada gerçek video completed sayısını da artırabilirsiniz
                                            }}
                                            disabled={plan.completedToday >= plan.targetCount}
                                         >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> 1 Video Bitirdim
                                         </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* SAĞ: DERS EKLEME PANELİ */}
            <div className="bg-slate-900/50 border-l border-white/5 p-6 h-full lg:min-h-screen -my-6 -mr-6 lg:fixed lg:right-0 lg:w-[350px] lg:overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-400" />
                    Ders Listesi
                </h3>
                <p className="text-xs text-slate-400 mb-6">Planlanacak dersi seçin.</p>
                
                <div className="space-y-2">
                    {remainingVideos.map(video => {
                        const isPlanned = todaysPlans.some(p => p.videoId === video.id);
                        return (
                            <div key={video.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate pr-2">{video.title}</p>
                                    <p className="text-[10px] text-slate-500">{video.totalVideos - (video.completedVideos||0)} video kaldı</p>
                                </div>
                                {isPlanned ? (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Eklendi</span>
                                ) : (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 w-7 rounded-full bg-white/5 hover:bg-rose-600 hover:text-white p-0"
                                        onClick={() => {
                                            setSelectedVideoForPlan(video.id);
                                            setIsPlanDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* HEDEF BELİRLEME DIALOG */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-xs rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Günlük Hedef</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Kaç Video İzlenecek?</label>
                            <Input 
                                type="number" 
                                min={1} 
                                value={targetCountInput} 
                                onChange={(e) => setTargetCountInput(parseInt(e.target.value))}
                                className="bg-slate-800 border-white/10 text-center text-2xl font-bold h-16 rounded-2xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreatePlan} className="w-full bg-rose-600 hover:bg-rose-500 rounded-xl h-12">Planı Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// --- ANA BİLEŞEN: VIDEOS CLIENT ---
export function VideosClient() {
  const router = useRouter();
  const { user, familyMembers } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // View State artık 'planning' de içeriyor
  const [view, setView] = useState<'videos' | 'management' | 'planning'>('videos');
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { toast } = useToast();
  const shelfFormMethods = useForm<ShelfFormData>({ resolver: zodResolver(shelfFormSchema) });
  
  useEffect(() => {
    const unsubVideos = onVideosUpdate(setVideos);
    const unsubTags = onTagsUpdate("videoTags", setAllTags);
    return () => { unsubVideos(); unsubTags(); };
  }, [user]);

  useEffect(() => {
      if (familyMembers.length > 0 && !selectedMemberId) {
          setSelectedMemberId(familyMembers[0].id);
      }
  }, [familyMembers, selectedMemberId]);

  const handleOpenForm = useCallback((initialData: Video | null = null) => {
    setEditingVideo(initialData);
    setIsFormOpen(true);
  }, []);

  const handleAddOrUpdateVideo = async (formData: VideoFormData) => {
    setIsSubmitting(true);
    const getYouTubeThumbnail = (url: string) => {
      if (!url) return null;
      let videoId;
      try {
          const urlObj = new URL(url);
          if (urlObj.hostname === 'youtu.be') {
              videoId = urlObj.pathname.slice(1);
          } else if (urlObj.hostname.includes('youtube.com')) {
              videoId = urlObj.searchParams.get('v') || urlObj.searchParams.get('list');
          }
      } catch(e) { return null; }
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    }
    const thumbnail = getYouTubeThumbnail(formData.url || '');
    const videoData: Omit<Video, 'id' | 'familyId' | 'createdAt' | 'completedVideos'> = {
        ...formData,
        platform: 'YouTube',
        thumbnail: thumbnail,
    };
    try {
        const newTags = new Set([...allTags, ...(videoData.tags || [])]);
        await updateTags("videoTags", Array.from(newTags));
        if (editingVideo) {
            await updateVideo(editingVideo.id, videoData);
            toast({ title: "Video Güncellendi" });
        } else {
            await addVideo({ ...videoData, completedVideos: 0 });
            toast({ title: "Video Eklendi" });
        }
        setIsFormOpen(false);
    } catch(e: any) {
        toast({ title: "❌ Hata", description: "İşlem sırasında bir sorun oluştu.", variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
        await deleteVideo(videoId);
        toast({ title: "Video Silindi", variant: 'destructive' });
    } catch(e) {
        toast({ title: "❌ Hata", description: "Silme işlemi başarısız.", variant: 'destructive'});
    }
  };
  
  const handleOpenShelfDialog = (shelfName: string | null) => {
      const isNew = shelfName === null;
      shelfFormMethods.reset({ name: isNew ? '' : shelfName });
      setEditingShelf({ originalName: shelfName || '', isNew });
  }

  const handleShelfFormSubmit = async (data: ShelfFormData) => {
      if (!editingShelf) return;
      const newShelfName = data.name.trim();
      if (allTags.includes(newShelfName) && newShelfName !== editingShelf.originalName) {
          toast({ title: "Hata", description: "Bu isimde bir kategori zaten var.", variant: "destructive" });
          return;
      }
      try {
        if (editingShelf.isNew) {
            await updateTags("videoTags", [...allTags, newShelfName]);
            toast({ title: "Kategori Oluşturuldu"});
        } else {
            const newAllTags = allTags.map(tag => tag === editingShelf.originalName ? newShelfName : tag);
            await updateTags("videoTags", newAllTags);
            toast({ title: "Kategori Güncellendi" });
        }
      } catch (e) {
          toast({ title: "❌ Hata", variant: 'destructive'});
      }
      setEditingShelf(null);
  };

  const handleDeleteShelf = async (shelfName: string) => {
    try {
        await deleteTag("videoTags", shelfName, "video");
        toast({ title: "Kategori Silindi", variant: 'destructive'});
    } catch(e) {
        toast({ title: "❌ Hata", variant: 'destructive'});
    }
  };
  
  const filteredVideos = useMemo(() => {
    if (!selectedMemberId) return [];
    return videos.filter(video => {
      if(video.assigneeId !== selectedMemberId) return false;
      if (!localSearchQuery) return true;
      const q = localSearchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(q) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    });
  }, [videos, localSearchQuery, selectedMemberId]);

  const stats = useMemo(() => {
    let totalAssigned = 0;
    let totalCompleted = 0;
    filteredVideos.forEach(v => {
        totalAssigned += v.totalVideos;
        totalCompleted += v.completedVideos || 0;
    });
    const percentage = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    return { totalAssigned, totalCompleted, percentage };
  }, [filteredVideos]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden selection:bg-rose-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 text-slate-400 hover:text-white hover:bg-white/10")}>
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className={glassColors.ICON_BOX}>
                      <Youtube className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", glassColors.TEXT_MUTED)}>Eğitim Modülü</p>
                      <h1 className={cn("text-lg font-bold leading-none tracking-tight", glassColors.TEXT_MAIN)}>
                        {view === 'planning' ? 'İzleme Planı' : 'Ders Arşivi'}
                      </h1>
                  </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                   {view === 'videos' && (
                        <div className="relative flex-1 md:w-56">
                            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                            <Input 
                                placeholder="Arşivde ara..." 
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className={cn("pl-9 rounded-xl border-white/10 h-10", glassColors.CARD_BG, glassColors.TEXT_MAIN, "placeholder:text-slate-500")} 
                            />
                        </div>
                   )}
                   
                   <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setView('videos')}
                            className={cn("rounded-lg text-xs font-bold transition-all", view === 'videos' ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            Arşiv
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setView('planning')}
                            className={cn("rounded-lg text-xs font-bold transition-all", view === 'planning' ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            Planlama
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setView('management')}
                            className={cn("rounded-lg w-8 h-8", view === 'management' ? "bg-white/20 text-white" : "text-slate-400")}
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                   </div>
              </div>
          </div>
      </div>
      
      <div className="max-w-6xl mx-auto md:p-6 p-4 relative z-10 space-y-8">
        {/* Üye Filtresi (Her zaman görünür) */}
        <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max mx-auto justify-start md:justify-center">
                {familyMembers.map((member) => (
                <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={cn(
                    "flex items-center gap-2 pl-2 pr-4 py-2 rounded-full transition-all duration-300 border font-bold text-sm",
                    selectedMemberId === member.id
                        ? "bg-slate-100 text-slate-900 border-white shadow-lg scale-105"
                        : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200"
                    )}
                >
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                        style={{ backgroundColor: member.color }}
                    >
                        {member.name.charAt(0)}
                    </div>
                    {member.name}
                </button>
                ))}
            </div>
        </div>

      {view === 'videos' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {selectedMemberId && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Genel Başarı</div>
                            <div className="text-3xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
                                %{stats.percentage}
                                <span className="text-sm font-medium text-slate-500">Tamamlandı</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="text-sm text-slate-400">{stats.totalCompleted} / {stats.totalAssigned} Video</div>
                        <Progress value={stats.percentage} className="w-32 h-2 mt-2 bg-slate-950" indicatorClassName="bg-emerald-500" />
                    </div>
                </div>
            )}
            <VideoShelf videos={filteredVideos} onEdit={handleOpenForm} onDelete={handleDeleteVideo} />
            <div className="fixed bottom-8 right-6 z-50">
                <Button 
                    className="rounded-full h-14 px-6 bg-rose-600 text-white shadow-2xl shadow-rose-900/50 hover:bg-rose-500 hover:scale-105 transition-all border-2 border-rose-400 font-bold"
                    onClick={() => handleOpenForm(null)}
                >
                    <Plus className="h-5 w-5 mr-2" /> Yeni Liste
                </Button>
            </div>
        </div>
      )}

      {view === 'planning' && (
          <div className="animate-in slide-in-from-right-10 duration-500">
              <PlanningModule videos={filteredVideos} />
          </div>
      )}

      {view === 'management' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className={cn(glassColors.CARD_BG)}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                    <div>
                        <CardTitle className={cn("text-xl font-bold", glassColors.TEXT_MAIN)}>Kategori Yönetimi</CardTitle>
                        <CardDescription className={glassColors.TEXT_MUTED}>Video dersler için kategori etiketlerini düzenleyin.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenShelfDialog(null)} className={cn("rounded-full", glassColors.BUTTON_GLASS)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Ekle
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allTags.map((tag, index) => {
                             const color = brightColors[index % brightColors.length];
                             return (
                                <div key={tag} className={cn("flex items-center justify-between p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.01]", color.gradient)}>
                                    <div className="flex items-center gap-3">
                                        <FolderOpen className="h-5 w-5 opacity-70" />
                                        <p className="font-bold text-sm">{tag}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white/70 hover:text-white rounded-full" onClick={() => handleOpenShelfDialog(tag)}>
                                            <Edit className="w-4 h-4"/>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-500/20 text-rose-200 hover:text-rose-100 rounded-full">
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-400">"{tag}" kategorisi silinecek. Emin misiniz?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteShelf(tag)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      {/* Ekleme/Düzenleme Dialog */}
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg rounded-3xl bg-slate-900 border-white/10 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {editingVideo ? <Edit className="w-5 h-5 text-blue-400" /> : <Youtube className="w-5 h-5 text-rose-500" />}
                    {editingVideo ? 'Video Kaydını Düzenle' : 'Yeni Video Listesi'}
                </DialogTitle>
            </DialogHeader>
             <div className="text-slate-100 [&_label]:text-slate-300 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_select]:bg-slate-800 [&_select]:border-white/10">
                <NewVideoForm 
                    onSubmit={handleAddOrUpdateVideo}
                    initialData={editingVideo}
                    existingTags={allTags}
                    familyMembers={familyMembers}
                />
            </div>
          </DialogContent>
      </Dialog>
      
      {/* Kategori Düzenleme Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent className="sm:max-w-md rounded-3xl bg-slate-900 border-white/10 text-slate-100">
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Kategori" : "Kategoriyi Düzenle"}</DialogTitle>
                </DialogHeader>
                <Form {...shelfFormMethods}>
                    <form onSubmit={shelfFormMethods.handleSubmit(handleShelfFormSubmit)} id="shelf-form" className="space-y-4 pt-2">
                         <FormField
                            control={shelfFormMethods.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-400 font-bold text-xs uppercase tracking-wider">Kategori Adı</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="örn: Matematik" className="bg-white/5 border-white/10 text-slate-100 rounded-xl h-12 focus:border-rose-500 transition-all"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setEditingShelf(null)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button type="submit" form="shelf-form" className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    </div>
  );
}