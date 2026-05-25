
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { addMemorizationItem, updateMemorizationItem } from '@/lib/dataService';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import type { MemorizationItem } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


const formSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır."),
  category: z.enum(['Sure', 'Dua'], { required_error: "Kategori seçmelisiniz." }),
  imageUrl: z.string().optional(),
  newImageDataUri: z.string().optional(), // For new image uploads
});

type NewMemorizationItemFormProps = {
  onFormSubmit: () => void;
  initialData?: MemorizationItem | null;
};

export function NewMemorizationItemForm({ onFormSubmit, initialData }: NewMemorizationItemFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "Sure",
      imageUrl: "",
      newImageDataUri: "",
    },
  });
  
  React.useEffect(() => {
    form.reset({
       title: initialData?.title || "",
       category: (initialData?.tags || [])[0] === 'Dua' ? 'Dua' : 'Sure',
       imageUrl: initialData?.imageUrl || "",
       newImageDataUri: "",
    })
  }, [initialData, form]);

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
             // Standardize path to users/{uid}/...
             const destinationPath = `users/${user.uid}/ezber-images/${Date.now()}.jpg`;
             const storageRef = ref(storage, destinationPath);
             await uploadString(storageRef, values.newImageDataUri, 'data_url');
             finalImageUrl = await getDownloadURL(storageRef);
        }

      const itemData: Omit<MemorizationItem, 'id' | 'familyId'> = {
        title: values.title,
        tags: [values.category],
        imageUrl: finalImageUrl,
      };

      if (initialData) {
        await updateMemorizationItem(initialData.id, itemData);
        toast({ title: 'Başarılı!', description: `"${values.title}" güncellendi.` });
      } else {
        await addMemorizationItem(itemData);
        toast({ title: 'Başarılı!', description: `"${values.title}" ezber listesine eklendi.` });
      }

      onFormSubmit();
    } catch (err: any) {
      console.error("Memorization save error:", err);
      let errorMessage = err.message || "Bir hata oluştu.";
      if (err.code === 'storage/unauthorized') {
          errorMessage = "Görsel yükleme yetkiniz yok. Lütfen Firebase Storage servisinin açık olduğundan emin olun.";
      }
      toast({ title: 'Hata', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const watchedImageUrl = form.watch('imageUrl');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
            <DialogTitle>{initialData ? 'Öğeyi Düzenle' : 'Yeni Öğe Ekle'}</DialogTitle>
        </DialogHeader>
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
        <DialogFooter className="pt-4 border-t">
            <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Değişiklikleri Kaydet' : 'Oluştur'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
