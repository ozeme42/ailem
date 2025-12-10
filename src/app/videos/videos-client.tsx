"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video, FamilyMember } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Search, Trash2, Library, Edit, Settings, Youtube, ExternalLink, Folder, Plus, List, ArrowLeft, PlayCircle, FolderOpen } from 'lucide-react';
import { onVideosUpdate, onTagsUpdate, addVideo, updateVideo, deleteVideo, updateTags, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { NewVideoForm, VideoFormData } from '@/components/new-video-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-rose-500 to-pink-600 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ACCENT_GRADIENT: "bg-gradient-to-r from-rose-600 to-pink-600",
};

const brightColors = [
    { id: 'blue-indigo', name: 'Mavi', gradient: 'from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-200' },
    { id: 'teal-green', name: 'Açık Yeşil', gradient: 'from-teal-400/20 to-green-500/20 border-teal-400/30 text-teal-200' },
    { id: 'amber-orange', name: 'Turuncu', gradient: 'from-amber-400/20 to-orange-500/20 border-amber-400/30 text-amber-200' },
    { id: 'rose-red', name: 'Gül Kurusu', gradient: 'from-rose-400/20 to-red-500/20 border-rose-400/30 text-rose-200' },
    { id: 'cyan-sky', name: 'Camgöbeği', gradient: 'from-cyan-400/20 to-sky-500/20 border-cyan-400/30 text-cyan-200' },
    { id: 'violet-purple', name: 'Menekşe', gradient: 'from-violet-500/20 to-purple-600/20 border-violet-500/30 text-violet-200' },
    { id: 'pink-fuchsia', name: 'Pembe', gradient: 'from-pink-500/20 to-fuchsia-500/20 border-pink-500/30 text-pink-200' },
    { id: 'lime-emerald', name: 'Fıstık Yeşili', gradient: 'from-lime-400/20 to-emerald-500/20 border-lime-400/30 text-lime-200'},
];

const shelfFormSchema = z.object({
    name: z.string().min(1, "Kategori adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;

// VIDEOS CLIENT COMPONENT
export function VideosClient() {
  const router = useRouter();
  const { user, familyMembers } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [view, setView] = useState<'videos' | 'management'>('videos');
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { toast } = useToast();
  const shelfFormMethods = useForm<ShelfFormData>({ resolver: zodResolver(shelfFormSchema) });
  
  useEffect(() => {
    const unsubVideos = onVideosUpdate(setVideos);
    const unsubTags = onTagsUpdate("videoTags", setAllTags);
    
    return () => {
        unsubVideos();
        unsubTags();
    };
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
      } catch(e) {
          return null;
      }
  
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
        console.error(e);
        toast({ title: "❌ Hata", description: e.message || "İşlem sırasında bir hata oluştu.", variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
        await deleteVideo(videoId);
        toast({ title: "Video Silindi", variant: 'destructive' });
    } catch(e) {
        toast({ title: "❌ Hata", description: "Video silinirken bir hata oluştu.", variant: 'destructive'});
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
          toast({ title: "Hata", description: "Bu kategori adı zaten mevcut.", variant: "destructive" });
          return;
      }
      
      try {
        if (editingShelf.isNew) {
            await updateTags("videoTags", [...allTags, newShelfName]);
            toast({ title: "Kategori Eklendi"});
        } else {
            const newAllTags = allTags.map(tag => tag === editingShelf.originalName ? newShelfName : tag);
            await updateTags("videoTags", newAllTags);
            toast({ title: "Kategori Güncellendi" });
        }
      } catch (e) {
          toast({ title: "❌ Hata", description: "Kategori güncellenirken bir hata oluştu.", variant: 'destructive'});
      }

      setEditingShelf(null);
  };

  const handleDeleteShelf = async (shelfName: string) => {
    try {
        await deleteTag("videoTags", shelfName, "video");
        toast({ title: "Kategori Silindi", variant: 'destructive'});
    } catch(e) {
        toast({ title: "❌ Hata", description: "Kategori silinirken bir hata oluştu.", variant: 'destructive'});
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

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-900/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-pink-900/20 rounded-full blur-[100px]" />
      </div>

      {/* HEADER (Dynamic Glass) */}
      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 text-slate-400 hover:text-white hover:bg-white/10")}>
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className={glassColors.ICON_BOX}>
                      <Youtube className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Eğitim</p>
                      <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>Video Dersler</h1>
                  </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                      <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                      <Input 
                        placeholder="Ders veya video ara..." 
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className={cn("pl-9 rounded-xl border-white/10", glassColors.CARD_BG, glassColors.TEXT_MAIN, "placeholder:text-slate-500")} 
                      />
                  </div>
                  <Button variant="outline" size="icon" className={cn("rounded-full", glassColors.BUTTON_GLASS)} onClick={() => setView(view === 'videos' ? 'management' : 'videos')}>
                      <Settings className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => handleOpenForm(null)} className={cn("hidden md:flex rounded-full px-6 font-bold shadow-lg shadow-rose-900/20", glassColors.BUTTON_GLASS, "bg-rose-600 hover:bg-rose-500 border-rose-500/50")}>
                       <PlusCircle className="w-4 h-4 mr-2" /> Yeni Ekle
                   </Button>
              </div>
          </div>
      </div>
      
      <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-6">
      
      {view === 'videos' ? (
        <div className="flex flex-col gap-6">
             {/* Member Tabs */}
             <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2 min-w-max">
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

            <div className="space-y-4">
               <VideoShelf videos={filteredVideos} onEdit={handleOpenForm} onDelete={handleDeleteVideo} />
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            <Card className={cn(glassColors.CARD_BG)}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                    <div>
                        <CardTitle className={cn("text-xl font-bold", glassColors.TEXT_MAIN)}>Kategori Yönetimi</CardTitle>
                        <CardDescription className={glassColors.TEXT_MUTED}>Video kategorilerini düzenleyin veya silin.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenShelfDialog(null)} className={cn("rounded-full", glassColors.BUTTON_GLASS)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Kategori
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allTags.map((tag, index) => {
                             const color = brightColors[index % brightColors.length];
                             return (
                                <div key={tag} className={cn("flex items-center justify-between p-4 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.02]", color.gradient)}>
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
                                                    <AlertDialogDescription className="text-slate-400">
                                                        "{tag}" kategorisini silmek üzeresiniz.
                                                    </AlertDialogDescription>
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

      {/* FAB (Mobile) */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-50 md:hidden">
            <Button 
                className="rounded-full w-14 h-14 bg-rose-600 text-white shadow-2xl shadow-rose-900/50 hover:bg-rose-500 transition-transform hover:scale-105 active:scale-95 border-2 border-rose-400"
                onClick={() => handleOpenForm(null)}
            >
                <Plus className="h-6 w-6" />
            </Button>
       </div>

      {/* Add/Edit Video Dialog */}
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg rounded-[2rem] bg-slate-900 border-white/10 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {editingVideo ? <Edit className="w-5 h-5 text-blue-400" /> : <Youtube className="w-5 h-5 text-rose-500" />}
                    {editingVideo ? 'Video Listesini Düzenle' : 'Yeni Video Listesi Ekle'}
                </DialogTitle>
            </DialogHeader>
            {/* Form Wrapper for Dark Mode */}
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
      
      {/* Edit Shelf Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent className="sm:max-w-md rounded-[2rem] bg-slate-900 border-white/10 text-slate-100">
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Kategori Ekle" : "Kategoriyi Düzenle"}</DialogTitle>
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
                                        <Input {...field} placeholder="örn: Matematik Dersleri" className="bg-white/5 border-white/10 text-slate-100 rounded-xl h-12 focus:border-rose-500 transition-all"/>
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

function VideoList({ video, onEdit, onDelete, colorClass }: { video: Video, onEdit: (video: Video) => void, onDelete: (id: string) => void, colorClass: string }) {
    const [completed, setCompleted] = useState(video.completedVideos || 0);
    const progress = video.totalVideos > 0 ? (completed / video.totalVideos) * 100 : 0;

    const handleProgressChange = (increment: number) => {
        const newCompleted = Math.max(0, Math.min(video.totalVideos, completed + increment));
        setCompleted(newCompleted);
    };

    const handleBlur = async () => {
        if (completed !== video.completedVideos) {
            await updateVideo(video.id, { completedVideos: completed });
        }
    };

    return (
        <div className={cn("p-4 rounded-2xl border backdrop-blur-sm shadow-sm transition-all hover:shadow-md bg-gradient-to-br", colorClass)}>
            <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex gap-3 items-center min-w-0">
                     <div className="p-2 bg-white/10 rounded-xl shrink-0 backdrop-blur-md border border-white/10">
                        <PlayCircle className="w-5 h-5 opacity-90" />
                     </div>
                     <div className="min-w-0">
                        <h4 className="text-sm font-bold truncate pr-2">{video.title}</h4>
                        <div className="flex gap-1 mt-0.5">
                            {video.tags?.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded-md font-medium border border-white/10 truncate max-w-[100px]">{tag}</span>
                            ))}
                        </div>
                     </div>
                </div>
                 <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/20 text-white/70 hover:text-white" onClick={() => onEdit(video)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-rose-500/20 text-white/50 hover:text-rose-200"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                            <AlertDialogHeader><AlertDialogTitle>Listeyi Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">"{video.title}" listesini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(video.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            
            <div className="space-y-2 bg-black/10 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-xs font-bold opacity-80 mb-1">
                    <span>İlerleme</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-black/20" indicatorClassName="bg-white/90" />
                <div className="flex justify-between items-center text-xs pt-2">
                    <span className="font-medium opacity-70">{completed} / {video.totalVideos} video</span>
                     <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleProgressChange(-1)} onBlur={handleBlur} className="h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 p-0">-</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleProgressChange(1)} onBlur={handleBlur} className="h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 p-0">+</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// VideoShelf COMPONENT
function VideoShelf({ videos, onEdit, onDelete }: { videos: Video[], onEdit: (video: Video) => void, onDelete: (id: string) => void }) {
  const shelves = useMemo(() => {
    const grouped: Record<string, Video[]> = {};
    videos.forEach(video => {
      const videoTags = video.tags && video.tags.length > 0 ? video.tags : ["Diğer"];
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
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-12 text-center">
        <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
             <Youtube className="mx-auto h-10 w-10 text-slate-500" />
        </div>
        <p className="text-lg font-bold text-slate-300">Video Bulunamadı</p>
        <p className="text-sm text-slate-500">Bu kişiye atanmış veya aramanıza uygun video yok.</p>
      </div>
     );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {shelves.map(([shelfName, shelfVideos], index) => {
          return (
             <div key={shelfName} className={cn("rounded-[1.5rem] overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-sm shadow-sm")}>
                <AccordionItem value={shelfName} className="border-0">
                    <AccordionTrigger className="flex items-center gap-3 p-5 text-left hover:no-underline hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
                                <Folder className="h-5 w-5" />
                             </div>
                             <span className="text-lg font-bold text-slate-200">{shelfName}</span>
                        </div>
                        <div className="ml-auto mr-2 bg-white/10 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-400 border border-white/10">
                            {shelfVideos.length}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-5 pt-0 bg-black/10 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             {shelfVideos.map((video, vIndex) => {
                                const color = brightColors[(index + vIndex) % brightColors.length];
                                return <VideoList key={video.id} video={video} onEdit={onEdit} onDelete={onDelete} colorClass={color.gradient} />
                             })}
                        </div>
                    </AccordionContent>
                 </AccordionItem>
            </div>
          )
      })}
    </Accordion>
  );
}