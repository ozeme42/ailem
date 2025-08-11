
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { onSubjectsUpdate, updateSubjects, addMistake, onTopicsUpdate, updateTopics } from '@/lib/dataService';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, UploadCloud, Camera, ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';
import { ImageCropper } from '@/components/image-cropper';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  imageDataUris: z.array(z.string()).min(1, "Lütfen en az bir resim dosyası yükleyin."),
});

type NewMistakeFormProps = {
  onFormSubmit: () => void;
};

type FormStep = 'select_source' | 'capture_photo' | 'crop_image' | 'fill_details';

export function NewMistakeForm({ onFormSubmit }: NewMistakeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<FormStep>('select_source');
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);
  
  const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
  const [allTopics, setAllTopics] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      topic: "",
      imageDataUris: [],
    },
  });

  React.useEffect(() => {
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    const unsubTopics = onTopicsUpdate(setAllTopics);
    return () => {
        unsubSubjects();
        unsubTopics();
    };
  }, []);

  const handleCreateSubject = async (subjectName: string) => {
    const newSubjects = [...new Set([...allSubjects, subjectName])];
    await updateSubjects(newSubjects);
  };
  
  const handleCreateTopic = async (topicName: string) => {
    const newTopics = [...new Set([...allTopics, topicName])];
    await updateTopics(newTopics);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) { // Single file, allow cropping
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageToCrop(reader.result as string);
            setStep('crop_image');
        };
        reader.readAsDataURL(files[0]);
    } else { // Multiple files, skip cropping
        const filePromises = Array.from(files).map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });
        Promise.all(filePromises).then(dataUris => {
            form.setValue('imageDataUris', dataUris, { shouldValidate: true });
            setStep('fill_details');
        });
    }
  };

  const startCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
        setStep('capture_photo');
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Kamera Erişimi Başarısız',
            description: 'Lütfen tarayıcı ayarlarınızdan kamera izinlerini kontrol edin.',
        });
        console.error("Camera access error:", error);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            setImageToCrop(canvas.toDataURL('image/jpeg'));
            setStep('crop_image');

            // Stop camera stream
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  };

  const onCropComplete = (croppedImageUrl: string) => {
    form.setValue('imageDataUris', [croppedImageUrl], { shouldValidate: true });
    setStep('fill_details');
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ title: 'Hata', description: 'Giriş yapmanız gerekiyor.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      toast({ title: "Görseller Yükleniyor...", description: `${values.imageDataUris.length} adet soru havuza ekleniyor.` });

      for (const imageDataUri of values.imageDataUris) {
         const destinationPath = `mistake-pool/${user.uid}-${Date.now()}-${Math.random()}.jpg`;
         const migrationResult = await migrateImage({
            imageDataUri: imageDataUri,
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
      }

      toast({ title: 'Başarılı!', description: `${values.imageDataUris.length} yanlış soru havuza eklendi.` });
      onFormSubmit();
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const subjectOptions = allSubjects.map(s => ({ label: s, value: s }));
  const topicOptions = allTopics.map(t => ({ label: t, value: t }));

  if (step === 'select_source') {
    return (
      <div className="space-y-4 pt-4">
          <Button variant="outline" className="w-full h-24" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="mr-2 h-5 w-5"/> Dosya Yükle
          </Button>
          <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
          <Button variant="outline" className="w-full h-24" onClick={startCamera}>
              <Camera className="mr-2 h-5 w-5"/> Fotoğraf Çek
          </Button>
      </div>
    );
  }

  if (step === 'capture_photo') {
      return (
          <div className="space-y-4 pt-4">
              <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
              <Button className="w-full" onClick={handleCapture}>Çek</Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('select_source')}>Geri</Button>
          </div>
      );
  }

  if (step === 'crop_image' && imageToCrop) {
      return (
          <div className="pt-4">
            <div className="relative w-full h-96">
                <ImageCropper image={imageToCrop} onCropComplete={onCropComplete} />
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => setStep('select_source')}>Geri</Button>
          </div>
      )
  }
  
  const {imageDataUris} = form.getValues();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('select_source')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Resimleri Değiştir
        </Button>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border p-2 rounded-md">
            {imageDataUris.map((uri, index) => (
                <div key={index} className="relative">
                    <Image src={uri} alt={`Soru ${index + 1}`} width={100} height={100} className="w-full h-auto object-contain rounded-md" data-ai-hint="question paper" />
                </div>
            ))}
        </div>
        
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
          {imageDataUris.length} Soruyu Kaydet
        </Button>
      </form>
    </Form>
  );
}
