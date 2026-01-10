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
  CalendarDays, Target, CalendarClock, ListTodo, ChevronDown
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

interface StudyPlan {
    videoId: string;
    targetDate: string; // YYYY-MM-DD
    targetCount: number; // Kaç video izlenecek
    completedToday: number; // Bugün kaç tane izlendi
}

// Tema tipi tanımı
type ThemeColor = {
    gradient: string;
    border: string;
    text: string;
    subtext: string;
    icon: string;
    iconBg: string;
    bar: string;
    barBg: string;
    hover: string;
    rowBg: string;
};

const themeColors = {
    PAGE_BG: "bg-slate-50",
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200",
    CARD_BG: "bg-white border border-slate-200 shadow-sm",
    TEXT_MAIN: "text-slate-900",
    TEXT_MUTED: "text-slate-500",
    ICON_BOX: "bg-gradient-to-br from-rose-500 to-pink-600 p-2 rounded-xl shadow-md text-white",
    BUTTON_GLASS: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm",
};

// Kategoriler için genişletilmiş renk paleti
const shelfColors: ThemeColor[] = [
    { 
        gradient: 'from-blue-50 to-indigo-50', 
        border: 'border-blue-200', 
        text: 'text-blue-900', 
        subtext: 'text-blue-600', 
        icon: 'text-blue-600', 
        iconBg: 'bg-blue-100',
        bar: 'bg-blue-500', 
        barBg: 'bg-blue-100',
        hover: 'hover:border-blue-300',
        rowBg: 'bg-blue-50/40'
    },
    { 
        gradient: 'from-emerald-50 to-teal-50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-900', 
        subtext: 'text-emerald-600', 
        icon: 'text-emerald-600', 
        iconBg: 'bg-emerald-100',
        bar: 'bg-emerald-500', 
        barBg: 'bg-emerald-100',
        hover: 'hover:border-emerald-300',
        rowBg: 'bg-emerald-50/40'
    },
    { 
        gradient: 'from-amber-50 to-orange-50', 
        border: 'border-amber-200', 
        text: 'text-amber-900', 
        subtext: 'text-amber-600', 
        icon: 'text-amber-600', 
        iconBg: 'bg-amber-100',
        bar: 'bg-amber-500', 
        barBg: 'bg-amber-100',
        hover: 'hover:border-amber-300',
        rowBg: 'bg-amber-50/40'
    },
    { 
        gradient: 'from-rose-50 to-pink-50', 
        border: 'border-rose-200', 
        text: 'text-rose-900', 
        subtext: 'text-rose-600', 
        icon: 'text-rose-600', 
        iconBg: 'bg-rose-100',
        bar: 'bg-rose-500', 
        barBg: 'bg-rose-100',
        hover: 'hover:border-rose-300',
        rowBg: 'bg-rose-50/40'
    },
    { 
        gradient: 'from-violet-50 to-purple-50', 
        border: 'border-violet-200', 
        text: 'text-violet-900', 
        subtext: 'text-violet-600', 
        icon: 'text-violet-600', 
        iconBg: 'bg-violet-100',
        bar: 'bg-violet-500', 
        barBg: 'bg-violet-100',
        hover: 'hover:border-violet-300',
        rowBg: 'bg-violet-50/40'
    },
    { 
        gradient: 'from-cyan-50 to-sky-50', 
        border: 'border-cyan-200', 
        text: 'text-cyan-900', 
        subtext: 'text-cyan-600', 
        icon: 'text-cyan-600', 
        iconBg: 'bg-cyan-100',
        bar: 'bg-cyan-500', 
        barBg: 'bg-cyan-100',
        hover: 'hover:border-cyan-300',
        rowBg: 'bg-cyan-50/40'
    },
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
                            ? "bg-rose-600 text-white border-rose-600 shadow-md scale-105 z-10" 
                            : current > num
                                ? "bg-rose-50 text-rose-300 border-rose-100 hover:bg-rose-100"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    )}
                >
                    {num}
                </button>
            ))}
        </div>
    );
};

// --- ALT BİLEŞEN: ARŞİV LİSTE SATIRI ---
function VideoRow({ video, onEdit, onDelete, theme }: { video: Video, onEdit: (video: Video) => void, onDelete: (id: string) => void, theme: ThemeColor }) {
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
            "group relative flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 pl-4 rounded-xl transition-all duration-300 shadow-sm border",
            isCompleted 
                ? "bg-emerald-50/80 border-emerald-200" 
                : cn("hover:shadow-md", theme.rowBg, theme.border, theme.hover)
        )}>
            {/* İlerleme Çizgisi: Tamamlandıysa Yeşil, Değilse Temanın Gradienti */}
            <div 
                className={cn("absolute bottom-0 left-0 h-[3px] transition-all duration-700 rounded-b-xl", 
                    isCompleted ? "bg-emerald-500" : cn("bg-gradient-to-r", theme.gradient.replace("from-", "from-").replace("to-", "to-").replace("50", "500"))) // Basitçe gradienti koyulaştırıyoruz veya manuel class kullanıyoruz
                }
                style={{ width: `${progress}%` }} 
            >
                {/* Gradient düzeltmesi: Tailwind classlarını string manipülasyonu yerine doğrudan theme üzerinden alalım. 
                    Daha temiz çözüm: Progress bar rengini theme'den al.
                */}
                 <div className={cn("w-full h-full", isCompleted ? "bg-emerald-500" : theme.bar)} />
            </div>

            <div className="flex items-center gap-4 flex-1 min-w-0 w-full pb-2 sm:pb-0">
                {/* İkon Kutusu */}
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                    isCompleted 
                        ? "bg-emerald-100 border-emerald-200 text-emerald-600" 
                        : cn(theme.iconBg, theme.border, theme.icon)
                )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                </div>
                
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className={cn("text-sm font-semibold truncate", isCompleted ? "text-emerald-700 line-through decoration-emerald-300" : "text-slate-800")}>
                            {video.title}
                        </h4>
                        {video.url && (
                            <a href={video.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 p-1">
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    <div className="flex gap-2 mt-1">
                        {video.tags?.map(tag => (
                            <span key={tag} className="text-[10px] text-slate-500 font-mono bg-white/50 px-1.5 py-0.5 rounded border border-slate-200/50">#{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-3 pl-2 sm:border-l sm:border-slate-200/50">
                <div className="flex items-center gap-0.5 bg-white/50 rounded-lg p-0.5 border border-slate-200/50">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleDecrement}
                        disabled={completed === 0}
                        className="h-8 w-8 rounded-md hover:bg-rose-100 hover:text-rose-600 text-slate-500 disabled:opacity-20"
                    >
                        -
                    </Button>

                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className="h-8 min-w-[70px] px-1 flex flex-col items-center justify-center cursor-pointer hover:bg-white/80 rounded transition-colors group/counter border border-transparent hover:border-slate-200">
                                <span className={cn("font-mono text-base font-bold leading-none mt-0.5", isCompleted ? "text-emerald-600" : theme.text)}>
                                    {completed} <span className="text-slate-400 text-[10px] font-normal">/ {video.totalVideos}</span>
                                </span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 bg-white border-slate-200 text-slate-800 p-3 shadow-xl">
                            <div className="flex justify-between items-center mb-3 px-1 border-b border-slate-100 pb-2">
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
                            isCompleted ? "text-emerald-300" : "hover:bg-rose-100 hover:text-rose-600"
                        )}
                    >
                        +
                    </Button>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-full">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-40 p-1 bg-white border-slate-200 shadow-lg">
                        <button onClick={() => onEdit(video)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md hover:text-slate-900 transition-colors text-left">
                            <Edit className="w-3.5 h-3.5 text-blue-500" /> Düzenle
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-rose-50 rounded-md hover:text-rose-600 transition-colors text-left">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Listeyi Sil
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white border-slate-200 text-slate-900">
                                <AlertDialogHeader><AlertDialogTitle>Listeyi Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-500">"{video.title}" silinsin mi?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel className="bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(video.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}

// --- YENİ BİLEŞEN: AÇILIR KAPANIR RAF (CollapsibleShelf) ---
function CollapsibleShelf({ name, videos, onEdit, onDelete, colorIndex }: { name: string, videos: Video[], onEdit: (v: Video) => void, onDelete: (id: string) => void, colorIndex: number }) {
    // Varsayılan olarak kapalı (isOpen: false)
    const [isOpen, setIsOpen] = useState(false);

    const theme = shelfColors[colorIndex % shelfColors.length];

    const totalVids = videos.reduce((acc, v) => acc + v.totalVideos, 0);
    const completedVids = videos.reduce((acc, v) => acc + (v.completedVideos || 0), 0);
    const shelfProgress = totalVids > 0 ? Math.round((completedVids / totalVids) * 100) : 0;
    const isAllDone = shelfProgress === 100 && totalVids > 0;

    return (
        <div className={cn("border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md bg-gradient-to-br", theme.gradient, theme.border, theme.hover)}>
            {/* Header Kısmı - Tıklanabilir */}
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="p-4 cursor-pointer flex flex-col gap-3 select-none"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Ok İkonu */}
                        <div className={cn("transition-transform duration-300", isOpen && "rotate-180", theme.subtext)}>
                            <ChevronDown className="w-5 h-5" />
                        </div>

                        <FolderOpen className={cn("h-6 w-6 transition-colors", isAllDone ? "text-emerald-600" : theme.icon)} />
                        
                        <div>
                            <h3 className={cn("text-lg font-bold tracking-tight leading-none", theme.text)}>{name}</h3>
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest opacity-80", theme.subtext)}>
                                {videos.length} Dosya • {totalVids} Video
                            </span>
                        </div>
                    </div>
                    
                    <div className="text-right">
                         <span className={cn("text-base font-mono font-bold", isAllDone ? "text-emerald-600" : theme.icon)}>
                            %{shelfProgress}
                         </span>
                    </div>
                </div>

                {/* Header içindeki ilerleme çubuğu */}
                <div className="w-full flex items-center gap-3">
                     <Progress value={shelfProgress} className={cn("h-2 flex-1", theme.barBg)} indicatorClassName={isAllDone ? "bg-emerald-500" : theme.bar} />
                     <span className={cn("text-xs font-medium whitespace-nowrap", theme.subtext)}>{completedVids} / {totalVids}</span>
                </div>
            </div>

            {/* İçerik Kısmı - Sadece açıksa göster */}
            {isOpen && (
                <div className="bg-white/40 p-3 border-t border-white/20 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                     {videos.map((video) => (
                        <VideoRow key={video.id} video={video} onEdit={onEdit} onDelete={onDelete} theme={theme} />
                     ))}
                </div>
            )}
        </div>
    );
}

// --- DOSYA RAFI (Video Shelf Wrapper) ---
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
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center mt-8">
        <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
             <FileText className="mx-auto h-8 w-8 text-slate-400" />
        </div>
        <p className="text-lg font-bold text-slate-600">Dosya Bulunamadı</p>
      </div>
     );
  }

  return (
    <div className="space-y-4 pb-10">
      {shelves.map(([shelfName, shelfVideos], index) => (
          <CollapsibleShelf 
            key={shelfName} 
            name={shelfName} 
            videos={shelfVideos} 
            onEdit={onEdit} 
            onDelete={onDelete}
            colorIndex={index}
          />
      ))}
    </div>
  );
}

// --- YENİ BİLEŞEN: PLANLAMA MODÜLÜ (Study Planner) ---
function PlanningModule({ videos }: { videos: Video[] }) {
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
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-6 h-6 text-rose-500" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Planlanan Dersler</h2>
                            <p className="text-xs text-slate-500">
                                {format(new Date(selectedDate), 'd MMMM yyyy, EEEE', { locale: tr })}
                            </p>
                        </div>
                    </div>
                    <Input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-auto bg-slate-50 border-slate-200 text-slate-800"
                    />
                </div>

                {todaysPlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                        <CalendarClock className="w-12 h-12 text-slate-400 mb-3" />
                        <h3 className="text-slate-600 font-bold">Bugün için plan yok</h3>
                        <p className="text-slate-400 text-sm mb-4">Sağ taraftan ders seçerek bugüne hedef ekleyin.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {todaysPlans.map(plan => {
                            const video = videos.find(v => v.id === plan.videoId);
                            if (!video) return null;
                            const progress = (plan.completedToday / plan.targetCount) * 100;
                            
                            return (
                                <div key={plan.videoId} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{video.title}</h4>
                                                <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                                    <span>Hedef: {plan.targetCount} Video</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span>Genel Durum: {video.completedVideos}/{video.totalVideos}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.videoId)} className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-slate-500">
                                            <span>Günlük İlerleme</span>
                                            <span className={cn(progress >= 100 ? "text-emerald-500" : "text-rose-500")}>%{Math.round(progress)}</span>
                                        </div>
                                        <Progress value={progress} className="h-3 bg-slate-100" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-rose-500")} />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                         <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-600" 
                                            onClick={() => {
                                                const newCount = Math.min(plan.targetCount, plan.completedToday + 1);
                                                const updatedPlans = plans.map(p => p.videoId === plan.videoId && p.targetDate === selectedDate ? {...p, completedToday: newCount} : p);
                                                setPlans(updatedPlans);
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
            <div className="bg-white border-l border-slate-200 p-6 h-full lg:min-h-screen -my-6 -mr-6 lg:fixed lg:right-0 lg:w-[350px] lg:overflow-y-auto shadow-xl">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-600" />
                    Ders Listesi
                </h3>
                <p className="text-xs text-slate-500 mb-6">Planlanacak dersi seçin.</p>
                
                <div className="space-y-2">
                    {remainingVideos.map(video => {
                        const isPlanned = todaysPlans.some(p => p.videoId === video.id);
                        return (
                            <div key={video.id} className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate pr-2">{video.title}</p>
                                    <p className="text-[10px] text-slate-400">{video.totalVideos - (video.completedVideos||0)} video kaldı</p>
                                </div>
                                {isPlanned ? (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 font-bold">Eklendi</span>
                                ) : (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 w-7 rounded-full bg-white border border-slate-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 p-0 text-slate-500"
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
                <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-xs rounded-3xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle>Günlük Hedef</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Kaç Video İzlenecek?</label>
                            <Input 
                                type="number" 
                                min={1} 
                                value={targetCountInput} 
                                onChange={(e) => setTargetCountInput(parseInt(e.target.value))}
                                className="bg-slate-50 border-slate-200 text-center text-2xl font-bold h-16 rounded-2xl focus:border-rose-500 focus:ring-rose-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreatePlan} className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 shadow-md">Planı Kaydet</Button>
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

  const brightColors = [
    { id: 'blue', gradient: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-700' },
    { id: 'teal', gradient: 'from-teal-50 to-green-50 border-teal-200 text-teal-700' },
    { id: 'amber', gradient: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700' },
    { id: 'rose', gradient: 'from-rose-50 to-red-50 border-rose-200 text-rose-700' },
  ];

  return (
    <div className={cn("min-h-screen font-sans pb-24 relative overflow-hidden selection:bg-rose-100", themeColors.PAGE_BG, themeColors.TEXT_MAIN)}>
      {/* Light Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-200/60 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-200/60 rounded-full blur-[100px]" />
      </div>

      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", themeColors.HEADER_BG)}>
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 hover:bg-slate-100 text-slate-500", themeColors.BUTTON_GLASS)}>
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className={themeColors.ICON_BOX}>
                      <Youtube className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", themeColors.TEXT_MUTED)}>Eğitim Modülü</p>
                      <h1 className={cn("text-lg font-bold leading-none tracking-tight", themeColors.TEXT_MAIN)}>
                        {view === 'planning' ? 'İzleme Planı' : 'Ders Arşivi'}
                      </h1>
                  </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    {view === 'videos' && (
                        <div className="relative flex-1 md:w-56">
                            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400")} />
                            <Input 
                                placeholder="Arşivde ara..." 
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className={cn("pl-9 rounded-xl border-slate-200 h-10 bg-white focus:ring-rose-500", themeColors.TEXT_MAIN)} 
                            />
                        </div>
                    )}
                    
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setView('videos')}
                            className={cn("rounded-lg text-xs font-bold transition-all", view === 'videos' ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50")}
                        >
                            Arşiv
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setView('planning')}
                            className={cn("rounded-lg text-xs font-bold transition-all", view === 'planning' ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50")}
                        >
                            Planlama
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setView('management')}
                            className={cn("rounded-lg w-8 h-8", view === 'management' ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:bg-slate-50")}
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
              </div>
          </div>
      </div>
      
      <div className="max-w-6xl mx-auto md:p-6 p-4 relative z-10 space-y-8">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max mx-auto justify-start md:justify-center">
                {familyMembers.map((member) => (
                <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={cn(
                    "flex items-center gap-2 pl-2 pr-4 py-2 rounded-full transition-all duration-300 border font-bold text-sm",
                    selectedMemberId === member.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
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
                <div className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Genel Başarı</div>
                            <div className="text-3xl font-bold text-slate-800 mt-1 flex items-baseline gap-2">
                                %{stats.percentage}
                                <span className="text-sm font-medium text-slate-400">Tamamlandı</span>
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-1">
                                <span className="text-emerald-600 font-bold">{stats.totalCompleted}</span>
                                <span className="mx-1">/</span>
                                <span className="text-slate-900 font-bold">{stats.totalAssigned}</span> Video
                            </div>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="text-sm text-slate-500">{stats.totalCompleted} / {stats.totalAssigned} Video</div>
                        <Progress value={stats.percentage} className="w-32 h-2 mt-2 bg-slate-100" indicatorClassName="bg-emerald-500" />
                    </div>
                </div>
            )}
            <VideoShelf videos={filteredVideos} onEdit={handleOpenForm} onDelete={handleDeleteVideo} />
            <div className="fixed bottom-24 right-6 md:bottom-8 z-50">
                <Button 
                    className="rounded-full h-14 px-6 bg-rose-600 text-white shadow-2xl shadow-rose-900/30 hover:bg-rose-700 hover:scale-105 transition-all border-2 border-white font-bold"
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
            <Card className={cn(themeColors.CARD_BG)}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <CardTitle className={cn("text-xl font-bold", themeColors.TEXT_MAIN)}>Kategori Yönetimi</CardTitle>
                        <CardDescription className={themeColors.TEXT_MUTED}>Video dersler için kategori etiketlerini düzenleyin.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenShelfDialog(null)} className={cn("rounded-full", themeColors.BUTTON_GLASS)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Ekle
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allTags.map((tag, index) => {
                             const color = brightColors[index % brightColors.length];
                             return (
                                <div key={tag} className={cn("flex items-center justify-between p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.01] hover:shadow-sm", color.gradient)}>
                                    <div className="flex items-center gap-3">
                                        <FolderOpen className="h-5 w-5 opacity-70" />
                                        <p className="font-bold text-sm">{tag}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/50 text-slate-600 hover:text-slate-900 rounded-full" onClick={() => handleOpenShelfDialog(tag)}>
                                            <Edit className="w-4 h-4"/>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded-full">
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white border-slate-200 text-slate-900">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500">"{tag}" kategorisi silinecek. Emin misiniz?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600">İptal</AlertDialogCancel>
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

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg rounded-3xl bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {editingVideo ? <Edit className="w-5 h-5 text-blue-500" /> : <Youtube className="w-5 h-5 text-rose-500" />}
                    {editingVideo ? 'Video Kaydını Düzenle' : 'Yeni Video Listesi'}
                </DialogTitle>
            </DialogHeader>
             <div className="text-slate-900 [&_label]:text-slate-700 [&_input]:bg-slate-50 [&_input]:border-slate-200 [&_input]:text-slate-900 [&_select]:bg-slate-50 [&_select]:border-slate-200">
                <NewVideoForm 
                    onSubmit={handleAddOrUpdateVideo}
                    initialData={editingVideo}
                    existingTags={allTags}
                    familyMembers={familyMembers}
                />
            </div>
          </DialogContent>
      </Dialog>
      
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent className="sm:max-w-md rounded-3xl bg-white border-slate-200 text-slate-900 shadow-xl">
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
                                    <FormLabel className="text-slate-600 font-bold text-xs uppercase tracking-wider">Kategori Adı</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="örn: Matematik" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-12 focus:border-rose-500 transition-all"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setEditingShelf(null)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">İptal</Button>
                    <Button type="submit" form="shelf-form" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    </div>
  );
}