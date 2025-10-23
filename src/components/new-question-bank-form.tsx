
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud } from "lucide-react";
import { BankQuestion } from "@/lib/data";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { addBankQuestion, updateBankQuestion } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Combobox } from "./ui/combobox";
import Image from 'next/image';
import { ScrollArea } from "./ui/scroll-area";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

const formSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  imageDataUri: z.string().min(1, "Soru görseli yüklemek zorunludur."),
  correctAnswer: z.string().min(1, { message: "Doğru cevabı girmelisiniz." }),
});

type NewQuestionFormProps = {
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
  availableTopics: string[];
  onTopicCreated: (topic: string) => void;
  onQuestionProcessed: () => void;
  initialData?: BankQuestion | null;
};

export function NewQuestionBankForm({ 
  availableSubjects,
  onSubjectCreated,
  availableTopics,
  onTopicCreated,
  onQuestionProcessed,
  initialData
}: NewQuestionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const watchedImageDataUri = form.watch("imageDataUri");

  React.useEffect(() => {
    if (initialData) {
        form.reset({
            subject: initialData.subject,
            topic: initialData.topic,
            correctAnswer: initialData.correctAnswer,
            imageDataUri: initialData.imageUrl, // For display
        });
    } else {
        form.reset({
            subject: "",
            topic: "",
            imageDataUri: "",
            correctAnswer: "",
        });
    }
  }, [initialData, form]);

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Giriş yapmalısınız.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let finalImageUrl = initialData?.imageUrl || "";

      if (values.imageDataUri && values.imageDataUri.startsWith('data:image')) {
          const destinationPath = `bank-questions/${user.uid}-${Date.now()}.jpg`;
          const migrationResult = await migrateImage({
            imageDataUri: values.imageDataUri,
            destinationPath,
          });
    
          if (!migrationResult.success || !migrationResult.newUrl) {
            throw new Error(migrationResult.error || "Görsel yüklenemedi.");
          }
          finalImageUrl = migrationResult.newUrl;
      }

      const questionData = {
        subject: values.subject,
        topic: values.topic,
        imageUrl: finalImageUrl,
        correctAnswer: values.correctAnswer,
      };

      if (initialData) {
        await updateBankQuestion(initialData.id, questionData);
        toast({ title: "Soru Güncellendi!", description: "Soru başarıyla güncellendi." });
      } else {
        await addBankQuestion(questionData);
        toast({ title: "Soru Eklendi!", description: "Yeni soru başarıyla bankaya eklendi." });
      }

      form.reset();
      onQuestionProcessed();
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));
  const topicOptions = availableTopics.map(t => ({ label: t, value: t }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <DialogHeader>
            <DialogTitle>{initialData ? 'Soruyu Düzenle' : 'Soru Bankasına Yeni Soru Ekle'}</DialogTitle>
            <DialogDescription>
                {initialData ? 'Mevcut sorunun detaylarını güncelleyin.' : 'Görsel ve doğru cevabıyla birlikte yeni bir soru oluşturun.'}
            </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-6 py-4">
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
                    onCreate={onSubjectCreated}
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
                    onCreate={onTopicCreated}
                    placeholder="Konu seç veya oluştur..."
                    notfoundText="Konu bulunamadı."
                    createText="Yeni konu oluştur:"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Soru Görseli</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </FormControl>
              <div
                className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {watchedImageDataUri ? (
                  <Image src={watchedImageDataUri} alt="Soru önizlemesi" width={400} height={225} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="question paper" />
                ) : (
                  <div className="text-center">
                    <UploadCloud className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">Görsel Yükle</p>
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
             <FormField
                control={form.control}
                name="correctAnswer"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Doğru Cevap</FormLabel>
                        <FormControl>
                            <Input placeholder="Örn: B, 15, x=2" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </ScrollArea>
        <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Soruyu Güncelle' : 'Soruyu Bankaya Ekle'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
