
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, ChevronRight, ChevronLeft, Check, LayoutGrid, Type, Trash2, Plus, Minus, Image as ImageIcon, X } from "lucide-react";
import { BankQuestion } from "@/lib/data";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { addBankQuestion, updateBankQuestion } from "@/lib/dataService";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Combobox } from "./ui/combobox";
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Badge } from "./ui/badge";
import { DialogFooter } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

// --- SCHEMAS ---
const formSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  imageDataUri: z.string().min(1, "Soru görseli yüklemek zorunludur."),
  originalFilename: z.string().optional(),
  type: z.enum(['mcq', 'open_ended']).default('mcq'),
  options: z.record(z.string()).optional(),
  correctAnswer: z.string().optional(),
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

type Step = 'image' | 'category' | 'details' | 'confirm';

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
  const [currentStep, setCurrentStep] = React.useState<Step>('image');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [optionKeys, setOptionKeys] = React.useState(['A', 'B', 'C', 'D']);
  
  // Multiple image handling
  const [imageQueue, setImageQueue] = React.useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        options: { 'A': '', 'B': '', 'C': '', 'D': '' },
        correctAnswer: 'A',
        type: defaultType,
        subject: "",
        topic: "",
        imageDataUri: "",
    }
  });

  const { watch, setValue } = form;
  const watchedType = watch("type");
  const watchedImage = watch("imageDataUri");
  const watchedSubject = watch("subject");
  const watchedTopic = watch("topic");

  // Load initial data for editing mode
  React.useEffect(() => {
    if (initialData) {
        const type = initialData.type || defaultType;
        const opts = initialData.options || { 'A': '', 'B': '', 'C': '', 'D': '' };
        setOptionKeys(Object.keys(opts));
        setImageQueue([initialData.imageUrl]);
        form.reset({
            subject: initialData.subject,
            topic: initialData.topic,
            imageDataUri: initialData.imageUrl,
            originalFilename: initialData.originalFilename,
            correctAnswer: initialData.correctAnswer || 'A',
            options: opts,
            type: type,
        });
        setCurrentStep('category');
    }
  }, [initialData, form, defaultType]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUri = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        newImages.push(dataUri);
    }

    setImageQueue(prev => [...prev, ...newImages]);
    
    // Auto start first image if not already started
    if (imageQueue.length === 0 && newImages.length > 0) {
        setValue('imageDataUri', newImages[0], { shouldValidate: true });
        setCurrentIndex(0);
        setCurrentStep('category');
    }
  };

  const removeImageFromQueue = (idx: number) => {
    const newQueue = imageQueue.filter((_, i) => i !== idx);
    setImageQueue(newQueue);
    if (currentIndex === idx) {
        if (newQueue.length > 0) {
            const nextIdx = Math.min(idx, newQueue.length - 1);
            setCurrentIndex(nextIdx);
            setValue('imageDataUri', newQueue[nextIdx]);
        } else {
            setValue('imageDataUri', '');
        }
    } else if (currentIndex > idx) {
        setCurrentIndex(currentIndex - 1);
    }
  };

  const steps: Step[] = ['image', 'category', 'details', 'confirm'];
  const stepIndex = steps.indexOf(currentStep);

  const goToNextStep = () => {
    let canProceed = false;
    if (currentStep === 'image') canProceed = imageQueue.length > 0;
    else if (currentStep === 'category') canProceed = !!watchedSubject && !!watchedTopic;
    else if (currentStep === 'details') canProceed = true;

    if (canProceed || stepIndex === 2) {
        if (currentStep === 'image') {
            setValue('imageDataUri', imageQueue[currentIndex]);
        }
        const nextStep = steps[stepIndex + 1];
        if (nextStep) setCurrentStep(nextStep);
    } else {
        toast({ title: "Eksik Bilgi", description: "Lütfen bu adımı tamamlayın.", variant: "destructive" });
    }
  };

  const goToPrevStep = () => {
    const prevStep = steps[stepIndex - 1];
    if (prevStep) setCurrentStep(prevStep);
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
    if (!user) return;
    setLoading(true);
    try {
      let finalImageUrl = values.imageDataUri;
      if (values.imageDataUri.startsWith('data:image')) {
          const destinationPath = `bank-questions/${user.uid}-${Date.now()}-${currentIndex}.jpg`;
          const migrationResult = await migrateImage({ imageDataUri: values.imageDataUri, destinationPath });
          if (!migrationResult.success || !migrationResult.newUrl) throw new Error("Görsel yüklenemedi.");
          finalImageUrl = migrationResult.newUrl;
      }
      
      const questionData = {
        title: values.originalFilename || values.topic,
        subject: values.subject,
        topic: values.topic,
        imageUrl: finalImageUrl,
        originalFilename: values.originalFilename,
        type: values.type,
        options: values.type === 'mcq' ? values.options : undefined,
        correctAnswer: values.type === 'mcq' ? values.correctAnswer : undefined,
      };

      if (initialData) {
          await updateBankQuestion(initialData.id, questionData);
          toast({ title: "Güncellendi ✨" });
          onQuestionProcessed();
      } else {
          await addBankQuestion(questionData as any);
          
          // Check if there are more images in the queue
          if (currentIndex < imageQueue.length - 1) {
              const nextIdx = currentIndex + 1;
              setCurrentIndex(nextIdx);
              setValue('imageDataUri', imageQueue[nextIdx]);
              // Reset some fields but KEEP subject/topic for convenience
              setValue('originalFilename', '');
              setCurrentStep('category');
              toast({ title: "Kaydedildi, Sıradaki Soruya Geçildi" });
          } else {
              toast({ title: "Tamamlandı ✨", description: "Tüm sorular kaydedildi." });
              onQuestionProcessed();
          }
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 })
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        {/* Progress Header */}
        <div className="px-6 pt-4 pb-6">
            <div className="flex justify-between items-center mb-4">
                {steps.map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-2 flex-1 relative">
                        {i > 0 && <div className={cn("absolute right-1/2 top-4 w-full h-[1px] -z-10", i <= stepIndex ? "bg-indigo-600" : "bg-slate-100 dark:bg-slate-900")} />}
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
                            i <= stepIndex ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-100 text-slate-400 dark:bg-slate-900"
                        )}>
                            {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-tighter", i <= stepIndex ? "text-indigo-600" : "text-slate-400")}>
                            {s === 'image' ? 'Görsel' : s === 'category' ? 'Kategori' : s === 'details' ? 'İçerik' : 'Onay'}
                        </span>
                    </div>
                ))}
            </div>
            
            {imageQueue.length > 1 && (
                <div className="flex items-center justify-center mb-2">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-none font-bold">
                        Soru {currentIndex + 1} / {imageQueue.length}
                    </Badge>
                </div>
            )}
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 relative overflow-hidden px-6">
                    <AnimatePresence mode="wait" custom={stepIndex}>
                        {currentStep === 'image' && (
                            <motion.div key="image" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Soru Görselleri</h3>
                                    <p className="text-sm text-slate-500">Bir veya birden fazla soru fotoğrafı yükleyebilirsiniz.</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "aspect-video w-full rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group",
                                            imageQueue.length > 0 ? "border-indigo-500/50 bg-indigo-50/10" : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                                        )}
                                    >
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                <UploadCloud className="w-8 h-8" />
                                            </div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Görsel(ler) Seç</p>
                                        </div>
                                    </div>

                                    {imageQueue.length > 0 && (
                                        <ScrollArea className="h-40 w-full border rounded-2xl p-4 bg-slate-50 dark:bg-slate-900">
                                            <div className="grid grid-cols-4 gap-3">
                                                {imageQueue.map((uri, idx) => (
                                                    <div key={idx} className={cn("relative aspect-square rounded-lg overflow-hidden border-2", currentIndex === idx ? "border-indigo-500" : "border-transparent")}>
                                                        <Image src={uri} alt="Queue" fill className="object-cover" />
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.stopPropagation(); removeImageFromQueue(idx); }}
                                                            className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'category' && (
                            <motion.div key="category" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Kategori & Tip</h3>
                                    <p className="text-sm text-slate-500">Bu soru hangi ders ve konuya ait?</p>
                                </div>
                                <div className="space-y-4">
                                    <FormField control={form.control} name="type" render={({field}) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-xs font-bold uppercase text-slate-400 tracking-widest">Soru Tipi</FormLabel>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-3">
                                                <div onClick={() => field.onChange('mcq')} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer", field.value === 'mcq' ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-800")}>
                                                    <LayoutGrid className={cn("w-6 h-6", field.value === 'mcq' ? "text-indigo-600" : "text-slate-400")} />
                                                    <span className="text-xs font-bold">Çoktan Seçmeli</span>
                                                </div>
                                                <div onClick={() => field.onChange('open_ended')} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer", field.value === 'open_ended' ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-800")}>
                                                    <Type className={cn("w-6 h-6", field.value === 'open_ended' ? "text-indigo-600" : "text-slate-400")} />
                                                    <span className="text-xs font-bold">Açık Uçlu</span>
                                                </div>
                                            </RadioGroup>
                                        </FormItem>
                                    )}/>

                                    <div className="grid grid-cols-1 gap-4">
                                        <FormField control={form.control} name="subject" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-slate-400 tracking-widest">Ders</FormLabel>
                                                <Combobox options={availableSubjects.map(s => ({ label: s, value: s }))} value={field.value} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." className="h-12 rounded-xl" />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="topic" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-slate-400 tracking-widest">Konu</FormLabel>
                                                <Combobox options={availableTopics.map(t => ({ label: t, value: t }))} value={field.value} onChange={field.onChange} onCreate={onTopicCreated} placeholder="Konu seç..." className="h-12 rounded-xl" />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'details' && (
                            <motion.div key="details" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">{watchedType === 'mcq' ? 'Seçenekler' : 'Detaylar'}</h3>
                                    <p className="text-sm text-slate-500">Doğru cevabı işaretleyin.</p>
                                </div>
                                {watchedType === 'mcq' ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-widest">Şık Sayısı</span>
                                            <div className="flex items-center gap-3">
                                                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOptionCountChange(optionKeys.length - 1)} disabled={optionKeys.length <= 2}><Minus className="w-4 h-4"/></Button>
                                                <span className="text-sm font-black w-4 text-center">{optionKeys.length}</span>
                                                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOptionCountChange(optionKeys.length + 1)} disabled={optionKeys.length >= 5}><Plus className="w-4 h-4"/></Button>
                                            </div>
                                        </div>
                                        
                                        <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                                                {optionKeys.map((key) => {
                                                    const isActive = field.value === key;
                                                    return (
                                                        <div key={key} className={cn("flex items-center gap-3 p-3 rounded-2xl border transition-all", isActive ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-slate-100 dark:border-slate-900")}>
                                                            <FormControl><RadioGroupItem value={key} className="h-6 w-6" /></FormControl>
                                                            <span className="text-sm font-black w-4 text-center text-indigo-600">{key}</span>
                                                            <FormField
                                                                control={form.control}
                                                                name={`options.${key}`}
                                                                render={({ field: optionField }) => (
                                                                    <Input {...optionField} placeholder={`${key} seçeneği (isteğe bağlı)...`} className="bg-transparent border-none shadow-none h-8 px-0 focus-visible:ring-0" />
                                                                )}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </RadioGroup>
                                        )}/>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <p className="text-sm text-center text-slate-500 font-medium">Açık uçlu soru olarak kaydedilecek.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {currentStep === 'confirm' && (
                            <motion.div key="confirm" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6 pb-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Son Kontrol</h3>
                                    <p className="text-sm text-slate-500">Bilgileri gözden geçirin ve kaydedin.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <Image src={watchedImage} alt="Final" fill className="object-contain p-2" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ders</p>
                                            <p className="text-sm font-bold truncate">{watchedSubject}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tip</p>
                                            <p className="text-sm font-bold truncate">{watchedType === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'}</p>
                                        </div>
                                    </div>

                                    {watchedType === 'mcq' && (
                                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900">
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-indigo-600" />
                                                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Doğru Cevap: <span className="text-indigo-600 font-black ml-1">{form.getValues('correctAnswer')}</span></p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/30 flex-row gap-3">
                    {stepIndex > 0 ? (
                        <Button type="button" variant="ghost" className="h-12 rounded-2xl px-6 font-bold flex-1" onClick={goToPrevStep} disabled={loading}>
                            Geri
                        </Button>
                    ) : (
                        <Button type="button" variant="ghost" className="h-12 rounded-2xl px-6 font-bold flex-1" onClick={onQuestionProcessed} disabled={loading}>
                            İptal
                        </Button>
                    )}
                    
                    {currentStep === 'confirm' ? (
                        <Button type="submit" className="h-12 rounded-2xl px-8 font-bold flex-[2] bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20" disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                            {currentIndex < imageQueue.length - 1 ? 'Kaydet ve Sıradakine Geç' : (initialData ? 'Güncelle' : 'Bankaya Kaydet')}
                        </Button>
                    ) : (
                        <Button type="button" className="h-12 rounded-2xl px-8 font-bold flex-[2] bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20" onClick={goToNextStep}>
                            İlerle <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </DialogFooter>
            </form>
        </Form>
    </div>
  );
}
