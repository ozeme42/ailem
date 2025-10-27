
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, PlusCircle, Trash2, Plus, Minus } from "lucide-react";
import { BankQuestion } from "@/lib/data";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { addBankQuestion, updateBankQuestion } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Combobox } from "./ui/combobox";
import Image from 'next/image';
import { ScrollArea } from "./ui/scroll-area";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const optionSchema = z.object({
    id: z.string(),
    text: z.string(), // Allow empty string for initial state
});

const formSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  imageDataUri: z.string().min(1, "Soru görseli yüklemek zorunludur."),
  originalFilename: z.string().optional(),
  type: z.enum(['mcq', 'open_ended']).default('mcq'),
  options: z.record(z.string()).optional(), // Changed to a record object
  correctAnswer: z.string().optional(),
}).refine(data => data.type === 'open_ended' || (data.options && Object.keys(data.options).length >= 2), {
    message: "Çoktan seçmeli sorular için en az 2 seçenek gereklidir.",
    path: ["options"],
}).refine(data => data.type === 'open_ended' || (!!data.correctAnswer), {
    message: "Lütfen doğru seçeneği işaretleyin.",
    path: ["correctAnswer"],
});


type NewQuestionFormProps = {
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
  availableTopics: string[];
  onTopicCreated: (topic: string) => void;
  onQuestionProcessed: () => void;
  initialData?: BankQuestion | null;
  defaultType?: 'mcq' | 'open_ended';
};

export function NewQuestionBankForm({ 
  availableSubjects,
  onSubjectCreated,
  availableTopics,
  onTopicCreated,
  onQuestionProcessed,
  initialData,
  defaultType = 'mcq'
}: NewQuestionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [optionKeys, setOptionKeys] = React.useState(['A', 'B', 'C', 'D']);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        options: { 'A': '', 'B': '', 'C': '', 'D': '' },
        correctAnswer: 'A',
        type: defaultType,
    }
  });

  const watchedImageDataUri = form.watch("imageDataUri");
  const questionType = form.watch("type");

  React.useEffect(() => {
    let type = initialData?.type || defaultType;
    let initialOptions = { 'A': '', 'B': '', 'C': '', 'D': '' };

    if (initialData?.options && Object.keys(initialData.options).length > 0) {
        initialOptions = initialData.options;
        setOptionKeys(Object.keys(initialData.options));
    }
    
    form.reset({
        subject: initialData?.subject || "",
        topic: initialData?.topic || "",
        imageDataUri: initialData?.imageUrl || "",
        originalFilename: initialData?.originalFilename || "",
        correctAnswer: initialData?.type !== 'open_ended' ? initialData?.correctAnswer : 'A',
        options: initialOptions,
        type: type,
    });
  }, [initialData, form, defaultType]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('originalFilename', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('imageDataUri', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionCountChange = (newCount: number) => {
      const currentKeys = [...optionKeys];
      if (newCount > currentKeys.length) {
          for (let i = currentKeys.length; i < newCount; i++) {
              currentKeys.push(String.fromCharCode(65 + i));
          }
      } else if (newCount < currentKeys.length) {
          currentKeys.length = newCount;
      }
      setOptionKeys(currentKeys);
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
      
      const optionsObject = values.type === 'mcq' ? (values.options || {}) : undefined;

      const questionData: Partial<Omit<BankQuestion, 'id' | 'familyId' | 'createdAt'>> = {
        title: values.originalFilename || values.topic, // Use filename as title, fallback to topic
        subject: values.subject,
        topic: values.topic,
        imageUrl: finalImageUrl,
        originalFilename: values.originalFilename,
        type: values.type,
        options: optionsObject,
        correctAnswer: values.type === 'mcq' ? values.correctAnswer : undefined,
      };

      if (initialData) {
        await updateBankQuestion(initialData.id, questionData);
        toast({ title: "Soru Güncellendi!", description: "Soru başarıyla güncellendi." });
      } else {
        await addBankQuestion(questionData as any);
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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
            <DialogTitle>{initialData ? 'Soruyu Düzenle' : 'Soru Bankasına Yeni Soru Ekle'}</DialogTitle>
            <DialogDescription>
                {initialData ? 'Mevcut sorunun detaylarını güncelleyin.' : 'Görsel ve doğru cevabıyla birlikte yeni bir soru oluşturun.'}
            </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh]">
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
            
            <FormField control={form.control} name="type" render={({field}) => (
                <FormItem>
                    <FormLabel>Soru Tipi</FormLabel>
                     <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4" disabled={!!initialData}>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="mcq" /></FormControl>
                          <FormLabel>Çoktan Seçmeli</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="open_ended" /></FormControl>
                          <FormLabel>Açık Uçlu</FormLabel>
                        </FormItem>
                      </RadioGroup>
                </FormItem>
            )}/>
            
            {questionType === 'mcq' && (
                <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>Seçenekler ve Doğru Cevap</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleOptionCountChange(optionKeys.length - 1)} disabled={optionKeys.length <= 2}><Minus className="h-4 w-4"/></Button>
                                    <span className="text-sm font-medium">{optionKeys.length} Şık</span>
                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleOptionCountChange(optionKeys.length + 1)} disabled={optionKeys.length >= 5}><Plus className="h-4 w-4"/></Button>
                                </div>
                            </div>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                {optionKeys.map((key) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <FormControl>
                                            <RadioGroupItem value={key} id={key} />
                                        </FormControl>
                                        <label htmlFor={key} className="font-bold w-4 text-center">{key}</label>
                                        <FormField
                                            control={form.control}
                                            name={`options.${key}`}
                                            render={({ field: optionField }) => (
                                                <Input {...optionField} placeholder={`${key} seçeneğinin metni...`} />
                                            )}
                                        />
                                    </div>
                                ))}
                            </RadioGroup>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
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
