

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
import { Loader2, PlusCircle, Search, Trash2, Library, Edit, Settings, Youtube, ExternalLink, Folder, Plus, List } from 'lucide-react';
import { onVideosUpdate, onTagsUpdate, addVideo, updateVideo, deleteVideo, updateTags, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { NewVideoForm, VideoFormData } from '@/components/new-video-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


const shelfFormSchema = z.object({
    name: z.string().min(1, "Kategori adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;

const brightColors = [
    { id: 'blue-indigo', name: 'Mavi', gradient: 'from-blue-500 to-indigo-600' },
    { id: 'teal-green', name: 'Açık Yeşil', gradient: 'from-teal-400 to-green-500' },
    { id: 'amber-orange', name: 'Turuncu', gradient: 'from-amber-400 to-orange-500' },
    { id: 'rose-red', name: 'Gül Kurusu', gradient: 'from-rose-400 to-red-500' },
    { id: 'cyan-sky', name: 'Camgöbeği', gradient: 'from-cyan-400 to-sky-500' },
    { id: 'violet-purple', name: 'Menekşe', gradient: 'from-violet-500 to-purple-600' },
    { id: 'pink-fuchsia', name: 'Pembe', gradient: 'from-pink-500 to-fuchsia-500' },
    { id: 'lime-emerald', name: 'Fıstık Yeşili', gradient: 'from-lime-400 to-emerald-500'},
];


// VIDEOS CLIENT COMPONENT
export function VideosClient() {
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
    <div className="flex flex-col h-full gap-6">
      <PageHeader title="Video Dersler">
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setView(view === 'videos' ? 'management' : 'videos')}>
              <Settings className="mr-2 h-4 w-4"/>
              {view === 'videos' ? 'Kategorileri Yönet' : 'Videoları Gör'}
          </Button>
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Video Listesi Ekle
          </Button>
      </PageHeader>
      
      {view === 'videos' ? (
        <div className="flex flex-col flex-grow min-h-0 gap-4">
            <div className="flex items-center gap-4 border-b pb-4 overflow-x-auto">
              {familyMembers.map((member) => (
                <Button
                  key={member.id}
                  variant={selectedMemberId === member.id ? "default" : "outline"}
                  className="flex-shrink-0"
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  {member.name}
                </Button>
              ))}
            </div>
            <div className="flex-grow overflow-y-auto -mx-4 sm:-mx-6 lg:-mx-8">
              <VideoShelf videos={filteredVideos} onEdit={handleOpenForm} onDelete={handleDeleteVideo} />
            </div>
        </div>
      ) : (
        <Tabs defaultValue="shelves" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="shelves">Kategori Yönetimi</TabsTrigger>
            </TabsList>
            <TabsContent value="shelves" className="mt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Video Kategorileri</CardTitle>
                            <CardDescription>Mevcut tüm kategorileri buradan düzenleyebilir veya silebilirsiniz.</CardDescription>
                        </div>
                         <Button onClick={() => handleOpenShelfDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Kategori Ekle
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 pr-4">
                            {allTags.map(tag => (
                                <div key={tag} className="flex items-center justify-between p-3 border rounded-lg">
                                    <p className="font-medium">{tag}</p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenShelfDialog(tag)}>
                                            <Edit className="w-4 h-4"/>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        "{tag}" kategorisini silmek istediğinizden emin misiniz? Bu işlem, bu etiketi tüm videolardan kaldıracak ve kategori kalıcı olarak silinecektir.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteShelf(tag)}>Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
               </Card>
            </TabsContent>
        </Tabs>
      )}

      {/* Add/Edit Video Dialog */}
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>{editingVideo ? 'Video Listesini Düzenle' : 'Yeni Video Listesi Ekle'}</DialogTitle>
            </DialogHeader>
            <NewVideoForm 
              onSubmit={handleAddOrUpdateVideo}
              initialData={editingVideo}
              existingTags={allTags}
              familyMembers={familyMembers}
            />
          </DialogContent>
      </Dialog>
      
      {/* Edit Shelf Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Kategori Ekle" : "Kategoriyi Düzenle"}</DialogTitle>
                </DialogHeader>
                <Form {...shelfFormMethods}>
                    <form onSubmit={shelfFormMethods.handleSubmit(handleShelfFormSubmit)} id="shelf-form" className="space-y-4">
                         <FormField
                            control={shelfFormMethods.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategori Adı</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="örn: Matematik Dersleri"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingShelf(null)}>İptal</Button>
                    <Button type="submit" form="shelf-form">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
        <Card className="p-4 bg-white/50 dark:bg-black/20">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-grow">
                    <CardTitle className="text-base">{video.title}</CardTitle>
                    <CardDescription>{video.tags?.join(', ')}</CardDescription>
                </div>
                 <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(video)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Listeyi Sil</AlertDialogTitle><AlertDialogDescription>"{video.title}" listesini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(video.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <div className="mt-4 space-y-2">
                <Progress value={progress} />
                <div className="flex justify-between items-center text-sm">
                    <span>{completed} / {video.totalVideos} video</span>
                     <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleProgressChange(-1)} onBlur={handleBlur}>-</Button>
                        <Button size="sm" variant="outline" onClick={() => handleProgressChange(1)} onBlur={handleBlur}>+</Button>
                    </div>
                </div>
            </div>
        </Card>
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
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
        <div>
          <Youtube className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-md font-medium">Bu kişiye atanmış video yok.</p>
        </div>
      </div>
     );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {shelves.map(([shelfName, shelfVideos], index) => {
          const color = brightColors[index % brightColors.length];
          return (
             <div key={shelfName} className={cn("text-white border-0", `bg-gradient-to-br ${color.gradient}`)}>
                <AccordionItem value={shelfName} className="border-b-0">
                    <CardHeader className="p-0">
                        <AccordionTrigger className="flex items-center gap-3 p-4 text-left hover:no-underline">
                            <Folder className="h-6 w-6 text-white" />
                            <span className="text-lg font-semibold">{shelfName} ({shelfVideos.length})</span>
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent className="p-4 pt-0">
                        <div className="space-y-3">
                             {shelfVideos.map(video => (
                                <VideoList key={video.id} video={video} onEdit={onEdit} onDelete={onDelete} colorClass={color.gradient} />
                             ))}
                        </div>
                    </AccordionContent>
                 </AccordionItem>
            </div>
          )
      })}
    </Accordion>
  );
}

