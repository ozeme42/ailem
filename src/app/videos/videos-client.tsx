
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Search, Trash2, Library, Edit, Settings, Youtube, ExternalLink } from 'lucide-react';
import { onVideosUpdate, onTagsUpdate, addVideo, updateVideo, deleteVideo, updateTags, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { NewVideoForm, VideoFormData } from '@/components/new-video-form';


const shelfFormSchema = z.object({
    name: z.string().min(1, "Kategori adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;


// VIDEOS CLIENT COMPONENT
export function VideosClient() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [view, setView] = useState<'videos' | 'management'>('videos');
  const [localSearchQuery, setLocalSearchQuery] = useState("");

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

  const handleOpenForm = useCallback((initialData: Video | null = null) => {
    setEditingVideo(initialData);
    setIsFormOpen(true);
  }, []);

  const handleAddOrUpdateVideo = async (formData: VideoFormData) => {
    setIsSubmitting(true);
    const videoData = {
        ...formData,
        platform: 'YouTube' as const,
    };
    
    try {
        const newTags = new Set([...allTags, ...(videoData.tags || [])]);
        await updateTags("videoTags", Array.from(newTags));
        
        if (editingVideo) {
            await updateVideo(editingVideo.id, videoData);
            toast({ title: "Video Güncellendi" });
        } else {
            await addVideo(videoData);
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
        if (editingShelf.isNew) { // Add new shelf
            await updateTags("videoTags", [...allTags, newShelfName]);
            toast({ title: "Kategori Eklendi"});
        } else { // Update existing shelf
            // Note: This does not automatically update the tags in all videos. A more complex migration would be needed.
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
    return videos.filter(video => {
      if (!localSearchQuery) return true;
      const q = localSearchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(q) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    });
  }, [videos, localSearchQuery]);

  return (
    <div className="flex flex-col h-full gap-6">
      <PageHeader title="Video Dersler">
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setView(view === 'videos' ? 'management' : 'videos')}>
              <Settings className="mr-2 h-4 w-4"/>
              {view === 'videos' ? 'Kategorileri Yönet' : 'Videoları Gör'}
          </Button>
          <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Video Ekle
          </Button>
      </PageHeader>
      
      {view === 'videos' ? (
        <div className="flex flex-col flex-grow min-h-0 gap-4">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Video veya kategori ara..."
                className="pl-10"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-grow overflow-y-auto">
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
                <DialogTitle>{editingVideo ? 'Videoyu Düzenle' : 'Yeni Video Ekle'}</DialogTitle>
            </DialogHeader>
            <NewVideoForm 
              onSubmit={handleAddOrUpdateVideo}
              initialData={editingVideo}
              existingTags={allTags}
            />
          </DialogContent>
      </Dialog>
      
      {/* Edit Shelf Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Kategori Ekle" : "Kategoriyi Düzenle"}</DialogTitle>
                </DialogHeader>
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
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingShelf(null)}>İptal</Button>
                    <Button type="submit" form="shelf-form">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
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
          <p className="mt-4 text-md font-medium">Bu kategoride gösterilecek video yok.</p>
          <p className="text-sm">Yeni bir video ekleyerek başlayabilirsiniz.</p>
        </div>
      </div>
     );
  }

  return (
    <div className="space-y-8">
      {shelves.map(([shelfName, shelfVideos]) => (
        <div key={shelfName}>
          <h2 className="text-xl font-bold mb-4">{shelfName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {shelfVideos.map(video => (
                   <Card key={video.id} className="group relative overflow-hidden flex flex-col cursor-pointer">
                      <div className="relative">
                        <Link href={video.url} target="_blank" rel="noopener noreferrer">
                           <Image 
                              src={video.thumbnail || `https://placehold.co/480x360.png`} 
                              alt={video.title} 
                              width={480} 
                              height={360} 
                              className="w-full h-auto object-cover aspect-video transition-transform duration-300 group-hover:scale-105"
                              data-ai-hint="youtube thumbnail" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                                <p className="font-bold text-sm text-white line-clamp-2" title={video.title}>{video.title}</p>
                           </div>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Youtube className="h-8 w-8 text-white"/>
                           </div>
                        </Link>
                      </div>
                       <CardFooter className="p-2 mt-auto border-t">
                             <div className="flex justify-end w-full gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(video)}><Edit className="h-4 w-4"/></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Videoyu Sil</AlertDialogTitle><AlertDialogDescription>"{video.title}" videosunu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(video.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                       </CardFooter>
                  </Card>
                ))}
          </div>
        </div>
      ))}
    </div>
  );
}

