

"use client";

import * as React from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Youtube, X } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { Combobox } from "./ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAuth } from "./auth-provider";

// SCHEMAS & TYPES
const formSchema = z.object({
  title: z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  url: z.string().url("Geçerli bir YouTube URL'si girin.").optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  totalVideos: z.coerce.number().min(1, "Video sayısı en az 1 olmalıdır."),
});
export type VideoFormData = z.infer<typeof formSchema>;

type NewVideoListFormProps = {
  onSubmit: (data: Omit<Video, 'id' | 'familyId' | 'platform' | 'createdAt' | 'completedVideos' | 'assigneeId' | 'thumbnail'>) => void;
  initialData?: Video | null;
  existingTags: string[];
};

export function NewVideoForm({ onSubmit, initialData, existingTags }: NewVideoListFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const formMethods = useForm<VideoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      tags: [],
      description: "",
      totalVideos: 10,
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      formMethods.reset({
          ...initialData,
          tags: initialData.tags || [],
      });
    }
  }, [initialData, formMethods]);

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

  const handleFormSubmit = async (data: VideoFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ ...data });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const watchedUrl = formMethods.watch('url');
  const thumbnail = getYouTubeThumbnail(watchedUrl || '');

  return (
    <Form {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col min-h-0 h-full">
        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-6 py-4 space-y-4">
             <FormField control={formMethods.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Liste/Ders Adı</FormLabel><FormControl><Input placeholder="Ders başlığını girin..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={formMethods.control} name="totalVideos" render={({ field }) => (
                <FormItem><FormLabel>Toplam Video Sayısı</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={formMethods.control} name="url" render={({ field }) => (
                <FormItem>
                    <FormLabel>YouTube URL (Opsiyonel)</FormLabel>
                    <div className="relative">
                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="https://www.youtube.com/playlist?list=..." {...field} className="pl-10" />
                    </div>
                    <FormMessage />
                    {thumbnail && <Image src={thumbnail} alt="Video thumbnail" width={480} height={360} className="mt-2 rounded-md aspect-video object-cover w-full" data-ai-hint="youtube thumbnail"/>}
                </FormItem>
            )} />
             <FormField control={formMethods.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Açıklama (Opsiyonel)</FormLabel><FormControl><Textarea placeholder="Video listesi hakkında kısa bilgi..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
             <FormField
                control={formMethods.control}
                name="tags"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <Combobox
                            options={existingTags.map(t => ({ label: t, value: t }))}
                            value={field.value?.[0] || ""}
                            onChange={(val) => field.onChange(val ? [val] : [])}
                            placeholder="Bir konu seçin veya oluşturun..."
                            notfoundText="Konu bulunamadı"
                            createText="Yeni konu oluştur:"
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </ScrollArea>
        <div className="pt-4 border-t flex-shrink-0">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Kaydet' : 'Video Listesi Ekle'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
