
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Loader2, PlusCircle, Trash2, UploadCloud } from "lucide-react";
import { BankQuestion } from "@/lib/data";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { addBankQuestion } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Combobox } from "./ui/combobox";
import Image from 'next/image';

const formSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  imageDataUri: z.string().min(1, "Soru görseli yüklemek zorunludur."),
  correctAnswer: z.enum(['A', 'B', 'C', 'D'], { required_error: "Doğru cevabı işaretlemelisiniz." }),
});

type NewQuestionFormProps = {
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
  availableTopics: string[];
  onTopicCreated: (topic: string) => void;
  onQuestionAdded: () => void;
};

export function NewQuestionBankForm({ 
  availableSubjects,
  onSubjectCreated,
  availableTopics,
  onTopicCreated,
  onQuestionAdded
}: NewQuestionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      topic: "",
      imageDataUri: "",
      correctAnswer: undefined,
    },
  });
  
  const watchedImageDataUri = form.watch("imageDataUri");

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
      const destinationPath = `bank-questions/${user.uid}-${Date.now()}.jpg`;
      const migrationResult = await migrateImage({
        imageDataUri: values.imageDataUri,
        destinationPath,
      });

      if (!migrationResult.success || !migrationResult.newUrl) {
        throw new Error(migrationResult.error || "Görsel yüklenemedi.");
      }

      const questionData: Omit<BankQuestion, 'id' | 'familyId' | 'createdAt'> = {
        subject: values.subject,
        topic: values.topic,
        imageUrl: migrationResult.newUrl,
        correctAnswer: values.correctAnswer,
      };

      await addBankQuestion(questionData);
      toast({ title: "Soru Eklendi!", description: "Yeni soru başarıyla bankaya eklendi." });
      form.reset();
      onQuestionAdded();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                >
                  {['A', 'B', 'C', 'D'].map(option => (
                    <FormItem key={option}>
                      <FormControl>
                        <RadioGroupItem value={option} id={`option-${option}`} className="sr-only" />
                      </FormControl>
                      <FormLabel
                        htmlFor={`option-${option}`}
                        className="flex items-center justify-center w-12 h-12 text-xl font-bold rounded-lg border-2 cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                      >
                        {option}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Soruyu Bankaya Ekle
        </Button>
      </form>
    </Form>
  );
}
