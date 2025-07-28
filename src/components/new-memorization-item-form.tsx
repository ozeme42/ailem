
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { addEzberItem, updateEzberItem } from '@/lib/dataService';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import type { EzberItem } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  category: z.enum(['Sure', 'Dua'], { required_error: "Kategori seçmelisiniz." }),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  newImageDataUri: z.string().optional(), // For new image uploads
});

type NewMemorizationItemFormProps = {
  onFormSubmit: () => void;
  initialData?: EzberItem | null;
};

export function NewMemorizationItemForm({ onFormSubmit, initialData }: NewMemorizationItemFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      category: initialData?.category || 'Sure',
      content: initialData?.content || "",
      imageUrl: initialData?.imageUrl || "",
      newImageDataUri: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('newImageDataUri', reader.result as string, { shouldValidate: true });
        form.setValue('imageUrl', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ title: 'Hata', description: 'Giriş yapmanız gerekiyor.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    
    let finalImageUrl = initialData?.imageUrl || "";

    try {
        if (values.newImageDataUri) {
             toast({ title: "Görsel Yükleniyor...", description: "Görsel depolama alanına kaydediliyor." });
             const destinationPath = `ezber-images/${user.uid}-${Date.now()}.jpg`;
             const migrationResult = await migrateImage({ imageDataUri: values.newImageDataUri, destinationPath });

             if (migrationResult.success && migrationResult.newUrl) {
                finalImageUrl = migrationResult.newUrl;
             } else {
                 throw new Error(migrationResult.error || 'Bilinmeyen bir görsel yükleme hatası.');
             }
        }

      const itemData = {
        title: values.title,
        category: values.category,
        content: values.content || "",
        imageUrl: finalImageUrl,
      };

      if (initialData) {
        await updateEzberItem(initialData.id, itemData);
        toast({ title: 'Başarılı!', description: `"${values.title}" güncellendi.` });
      } else {
        await addEzberItem(itemData);
        toast({ title: 'Başarılı!', description: `"${values.title}" ezber listesine eklendi.` });
      }

      onFormSubmit();
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const watchedImageUrl = form.watch('imageUrl');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl><Input placeholder="Fatiha Suresi" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="Sure">Sure</SelectItem>
                        <SelectItem value="Dua">Dua</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>İçerik (Opsiyonel)</FormLabel>
                    <FormControl><Textarea placeholder="Sure veya duanın metnini buraya yazabilirsiniz..." {...field} rows={6} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormItem>
                    <FormLabel>Görsel</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </FormControl>
                    <div
                        className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {watchedImageUrl ? (
                            <Image src={watchedImageUrl} alt="Önizleme" width={200} height={150} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="religious illustration" />
                        ) : (
                            <div className="text-center">
                                <UploadCloud className="mx-auto h-8 w-8" />
                                <p className="mt-2 text-sm">Görsel Yükle</p>
                            </div>
                        )}
                    </div>
                </FormItem>
            </div>
        </ScrollArea>
        <div className="pt-4 border-t">
            <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Değişiklikleri Kaydet' : 'Oluştur'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
