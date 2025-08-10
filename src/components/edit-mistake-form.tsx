
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { updateMistake } from '@/lib/dataService';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud, Camera, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import type { Mistake } from '@/lib/data';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  correctAnswer: z.string().optional(),
  feedback: z.string().optional(),
  correctImageUrl: z.string().optional(),
  newImageDataUri: z.string().optional(), // For new image uploads
});

type EditMistakeFormProps = {
  mistake: Mistake;
  onFormSubmit: () => void;
};

export function EditMistakeForm({ mistake, onFormSubmit }: EditMistakeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      correctAnswer: mistake.correctAnswer || "",
      feedback: mistake.feedback || "",
      correctImageUrl: mistake.correctImageUrl || "",
      newImageDataUri: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('newImageDataUri', reader.result as string, { shouldValidate: true });
        form.setValue('correctImageUrl', reader.result as string, { shouldValidate: true });
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

    let finalImageUrl = mistake.correctImageUrl || "";

    try {
      if (values.newImageDataUri) {
        toast({ title: "Görsel Yükleniyor...", description: "Çözüm görseli depolama alanına kaydediliyor." });
        const destinationPath = `mistake-solutions/${user.uid}-${mistake.id}-${Date.now()}.jpg`;
        const migrationResult = await migrateImage({ imageDataUri: values.newImageDataUri, destinationPath });

        if (migrationResult.success && migrationResult.newUrl) {
          finalImageUrl = migrationResult.newUrl;
        } else {
          throw new Error(migrationResult.error || 'Bilinmeyen bir görsel yükleme hatası.');
        }
      }

      const mistakeData: Partial<Mistake> = {
        correctAnswer: values.correctAnswer,
        feedback: values.feedback,
        correctImageUrl: finalImageUrl,
      };

      await updateMistake(mistake.id, mistakeData);

      toast({ title: 'Başarılı!', description: 'Geri bildirim kaydedildi.' });
      onFormSubmit();
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const watchedImageUrl = form.watch('correctImageUrl');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Geri Bildirim Ekle</DialogTitle>
          <DialogDescription>
            Bu soru için doğru cevabı ve çözüm görselini ekleyin.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <p className="font-semibold text-sm">Öğrencinin Sorusu</p>
                    <Image src={mistake.imageUrl || "https://placehold.co/400x300.png"} alt="Yanlış Soru" width={400} height={300} className="rounded-md border" data-ai-hint="question paper"/>
                </div>
                 <div className="space-y-2">
                    <p className="font-semibold text-sm">Öğrencinin Cevabı</p>
                    <div className="p-3 rounded-md bg-muted text-muted-foreground">{mistake.studentAnswer || "(Boş bırakılmış)"}</div>
                </div>

                <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Doğru Cevap</FormLabel>
                        <FormControl><Input placeholder="Doğru cevabı girin" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="feedback"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notlar / Geri Bildirim</FormLabel>
                        <FormControl><Textarea placeholder="Öğrenciye notlar..." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormItem>
                    <FormLabel>Çözüm Görseli</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </FormControl>
                    <div
                        className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {watchedImageUrl ? (
                            <Image src={watchedImageUrl} alt="Önizleme" width={200} height={150} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="solution image"/>
                        ) : (
                            <div className="text-center">
                                <UploadCloud className="mx-auto h-8 w-8" />
                                <p className="mt-2 text-sm">Çözüm Görseli Yükle</p>
                            </div>
                        )}
                    </div>
                </FormItem>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onFormSubmit}>İptal</Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
