
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { onSubjectsUpdate, updateSubjects, addMistake } from '@/lib/dataService';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  imageDataUri: z.string().refine(val => val.startsWith('data:image/'), {
    message: "Lütfen bir resim dosyası yükleyin.",
  }),
});

type NewMistakeFormProps = {
  onFormSubmit: () => void;
};

export function NewMistakeForm({ onFormSubmit }: NewMistakeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
  // We'll manage topics locally based on the selected subject, but for simplicity, we use one list for all topics.
  const [allTopics, setAllTopics] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      topic: "",
      imageDataUri: "",
    },
  });

  React.useEffect(() => {
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    // In a more complex app, topics would be fetched based on the selected subject.
    // For now, we'll just use a generic list or allow creating new ones.
    return () => unsubSubjects();
  }, []);

  const handleCreateSubject = async (subjectName: string) => {
    const newSubjects = [...new Set([...allSubjects, subjectName])];
    await updateSubjects(newSubjects);
  };
  
  const handleCreateTopic = async (topicName: string) => {
    // In a real app, you would likely save topics under a specific subject.
    // For this implementation, we just add it to a local/general list for the combobox.
    setAllTopics(prev => [...new Set([...prev, topicName])]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('imageDataUri', reader.result as string, { shouldValidate: true });
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
    try {
      const destinationPath = `mistake-pool/${user.uid}-${Date.now()}.jpg`;
      const migrationResult = await migrateImage({
        imageDataUri: values.imageDataUri,
        destinationPath,
      });

      if (!migrationResult.success || !migrationResult.newUrl) {
        throw new Error(migrationResult.error || 'Resim yüklenemedi.');
      }

      const mistakeData = {
        creatorId: user.uid,
        imageUrl: migrationResult.newUrl,
        subject: values.subject,
        topic: values.topic,
        createdAt: new Date().toISOString(),
      };

      await addMistake(mistakeData);

      toast({ title: 'Başarılı!', description: 'Yanlış soru havuza eklendi.' });
      onFormSubmit();
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const subjectOptions = allSubjects.map(s => ({ label: s, value: s }));
  const topicOptions = allTopics.map(t => ({ label: t, value: t }));
  const imageValue = form.watch('imageDataUri');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        
         <FormField
          control={form.control}
          name="imageDataUri"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soru Fotoğrafı</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </FormControl>
              <div
                className="aspect-video w-full border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer rounded-md"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageValue ? (
                  <Image src={imageValue} alt="Soru önizlemesi" layout="fill" className="object-contain rounded-md p-2" data-ai-hint="question paper" />
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10" />
                    <p className="mt-2 text-sm">Resim Yükle</p>
                    <p className="text-xs">Tıkla veya sürükle bırak</p>
                  </>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ders</FormLabel>
              <Combobox
                options={subjectOptions}
                value={field.value}
                onChange={field.onChange}
                onCreate={handleCreateSubject}
                placeholder="Ders seç veya oluştur..."
                notfoundText="Ders bulunamadı."
                createText="Yeni ders oluştur:"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konu</FormLabel>
               <Combobox
                options={topicOptions}
                value={field.value}
                onChange={field.onChange}
                onCreate={handleCreateTopic}
                placeholder="Konu seç veya oluştur..."
                notfoundText="Konu bulunamadı."
                createText="Yeni konu oluştur:"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Soruyu Kaydet
        </Button>
      </form>
    </Form>
  );
}
