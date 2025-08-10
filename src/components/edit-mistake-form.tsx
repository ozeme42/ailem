
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import type { Mistake } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  correctAnswer: z.string().optional(),
  feedback: z.string().optional(),
  newImageDataUri: z.string().optional(),
});

type EditMistakeFormProps = {
  mistake: Mistake;
  onSave: (id: string, data: Partial<Omit<Mistake, 'id'>>) => void;
};

export function EditMistakeForm({ mistake, onSave }: EditMistakeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(mistake.correctImageUrl || null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      correctAnswer: mistake.correctAnswer || "",
      feedback: mistake.feedback || "",
      newImageDataUri: "",
    },
  });
  
  React.useEffect(() => {
    form.reset({
      correctAnswer: mistake.correctAnswer || "",
      feedback: mistake.feedback || "",
      newImageDataUri: "",
    });
    setImagePreview(mistake.correctImageUrl || null);
  }, [mistake, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue('newImageDataUri', result, { shouldValidate: true });
        setImagePreview(result);
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
    let finalImageUrl = mistake.correctImageUrl;

    try {
      if (values.newImageDataUri) {
        toast({ title: "Görsel Yükleniyor..." });
        const destinationPath = `mistake-solutions/${user.uid}-${Date.now()}.jpg`;
        const migrationResult = await migrateImage({
          imageDataUri: values.newImageDataUri,
          destinationPath,
        });

        if (!migrationResult.success || !migrationResult.newUrl) {
          throw new Error(migrationResult.error || 'Çözüm görseli yüklenemedi.');
        }
        finalImageUrl = migrationResult.newUrl;
      }

      const mistakeUpdateData = {
        correctAnswer: values.correctAnswer,
        feedback: values.feedback,
        correctImageUrl: finalImageUrl,
      };

      onSave(mistake.id, mistakeUpdateData);

    } catch (err: any) {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="space-y-2">
                <Label>Yanlış Yapılan Soru</Label>
                <Image src={mistake.imageUrl || 'https://placehold.co/400x300.png'} alt="Yanlış Soru" width={400} height={300} className="w-full h-auto rounded-md border" data-ai-hint="question paper" />
            </div>

            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doğru Cevap</FormLabel>
                  <FormControl>
                    <Input placeholder="Doğru cevabı yazın..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Çözüm Görseli (Opsiyonel)</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </FormControl>
              <div
                className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <Image src={imagePreview} alt="Çözüm Önizlemesi" width={200} height={150} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="solution explanation" />
                ) : (
                  <div className="text-center">
                    <UploadCloud className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">Görsel Yükle</p>
                  </div>
                )}
              </div>
            </FormItem>
            
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ek Notlar / Geri Bildirim (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Öğrenci için ek notlar..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Geri Bildirimi Kaydet
        </Button>
      </form>
    </Form>
  );
}
