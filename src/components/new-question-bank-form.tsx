
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, ChevronRight, ChevronLeft, Check, LayoutGrid, Type, Trash2, Plus, Minus, Image as ImageIcon, X, BookOpen, Layers, PlusCircle, Sparkles } from "lucide-react";
import { BankQuestion, TrackedBook, StudyPlan } from "@/lib/data";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { addBankQuestion, updateBankQuestion, updateSubjects, updateTopics, onTrackedBooksUpdate, onStudyPlansUpdate } from "@/lib/dataService";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Badge } from "./ui/badge";
import { DialogFooter } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

// --- DESIGN SYSTEM ---
const themeColors = {
    WIZARD_STEP_ACTIVE: "bg-indigo-600 text-white shadow-lg",
    WIZARD_STEP_INACTIVE: "bg-slate-100 dark:bg-slate-900 text-slate-400",
    SELECTION_CARD: "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center gap-2 h-24",
    CARD_ACTIVE: "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md",
    CARD_INACTIVE: "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800",
    ADD_CARD: "border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500",
};

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

type Step = 'image' | 'subject' | 'topic' | 'details' | 'confirm';

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
  
  // Data for filtering
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  
  // Multiple image handling
  const [imageQueue, setImageQueue] = React.useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Inline add states
  const [isAddingNewSubject, setIsAddingNewSubject] = React.useState(false);
  const [isAddingNewTopic, setIsAddingNewTopic] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");

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

  React.useEffect(() => {
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    const unsubPlans = onStudyPlansUpdate(setStudyPlans);
    return () => { unsubBooks(); unsubPlans(); };
  }, []);

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
        setCurrentStep('subject');
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
    
    if (imageQueue.length === 0 && newImages.length > 0) {
        setValue('imageDataUri', newImages[0], { shouldValidate: true });
        setCurrentIndex(0);
        setCurrentStep('subject');
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

  const steps: Step[] = ['image', 'subject', 'topic', 'details', 'confirm'];
  const stepIndex = steps.indexOf(currentStep);

  const goToNextStep = () => {
    if (currentStep === 'image' && imageQueue.length === 0) {
        toast({ title: "Görsel Seçin", description: "Lütfen en az bir soru görseli yükleyin.", variant: "destructive" });
        return;
    }
    if (currentStep === 'subject' && !watchedSubject) {
        toast({ title: "Ders Seçin", description: "Devam etmek için bir ders seçmelisiniz.", variant: "destructive" });
        return;
    }
    if (currentStep === 'topic' && !watchedTopic) {
        toast({ title: "Konu Seçin", description: "Devam etmek için bir konu seçmelisiniz.", variant: "destructive" });
        return;
    }

    if (currentStep === 'image') {
        setValue('imageDataUri', imageQueue[currentIndex]);
    }

    const nextStep = steps[stepIndex + 1];
    if (nextStep) setCurrentStep(nextStep);
  };

  const goToPrevStep = () => {
    const prevStep = steps[stepIndex - 1];
    if (prevStep) setCurrentStep(prevStep);
  };

  const handleQuickAdd = async (type: 'subject' | 'topic') => {
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    if (type === 'subject') {
        if (!availableSubjects.includes(name)) { await updateSubjects([...availableSubjects, name]); onSubjectCreated(name); }
        setValue('subject', name); setIsAddingNewSubject(false);
    } else {
        if (!availableTopics.includes(name)) { await updateTopics([...availableTopics, name]); onTopicCreated(name); }
        setValue('topic', name); setIsAddingNewTopic(false);
    }
    setNewItemName("");
  };

  const relevantTopics = React.useMemo(() => {
    if (!watchedSubject) return [];
    const topicsSet = new Set<string>();
    trackedBooks.forEach(book => (book.subjects || []).forEach(s => { if (s.name === watchedSubject) (s.topics || []).forEach(t => topicsSet.add(t.name)); }));
    studyPlans.forEach(plan => (plan.subjects || []).forEach(s => { if (s.name === watchedSubject) (s.topics || []).forEach(t => topicsSet.add(t.name)); }));
    availableTopics.forEach(t => { if (t) topicsSet.add(t); }); // Add master list too
    return Array.from(topicsSet).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [watchedSubject, trackedBooks, studyPlans, availableTopics]);

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
      
      // Perform client-side upload if it's a new data URI
      if (values.imageDataUri.startsWith('data:image')) {
          const destinationPath = `bank-questions/${user.uid}-${Date.now()}-${currentIndex}.jpg`;
          const storageRef = ref(storage, destinationPath);
          await uploadString(storageRef, values.imageDataUri, 'data_url');
          finalImageUrl = await getDownloadURL(storageRef);
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
          
          if (currentIndex < imageQueue.length - 1) {
              const nextIdx = currentIndex + 1;
              setCurrentIndex(nextIdx);
              setValue('imageDataUri', imageQueue[nextIdx]);
              setValue('originalFilename', '');
              setCurrentStep('subject'); // Go back to start of categorization for next image
              toast({ title: "Kaydedildi, Sıradaki Soruya Geçildi" });
          } else {
              toast({ title: "Tamamlandı ✨", description: "Tüm sorular başarıyla kaydedildi." });
              onQuestionProcessed();
          }
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Kaydedilemedi", description: error.message || "Bilinmeyen bir hata oluştu.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 200 : -200, opacity: 0 })
  };

  return (
    <div className="flex flex-col h-full">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-8 mt-2">
            {steps.map((s, i) => (
                <div key={s} className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === stepIndex ? "w-8 bg-indigo-600 shadow-md" : "w-2 bg-slate-200 dark:bg-slate-800"
                )} />
            ))}
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait" custom={stepIndex}>
                        {currentStep === 'image' && (
                            <motion.div key="image" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Soru Görseli</h3>
                                    <p className="text-sm text-slate-500">Cihazından bir veya daha fazla soru seç.</p>
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
                                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-inner">
                                                <UploadCloud className="w-8 h-8" />
                                            </div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Görsel Seç</p>
                                        </div>
                                    </div>

                                    {imageQueue.length > 0 && (
                                        <div className="grid grid-cols-4 gap-3 p-1">
                                            {imageQueue.map((uri, idx) => (
                                                <div key={idx} className={cn("relative aspect-square rounded-xl overflow-hidden border-2 transition-all", currentIndex === idx ? "border-indigo-500 scale-105 shadow-md z-10" : "border-transparent opacity-60 hover:opacity-100")}>
                                                    <Image src={uri} alt="Queue" fill className="object-cover" />
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeImageFromQueue(idx); }} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-md"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'subject' && (
                            <motion.div key="subject" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Ders Seçimi</h3>
                                    <p className="text-sm text-slate-500">Sorunun ait olduğu dersi belirleyin.</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {availableSubjects.map((s) => {
                                        const isActive = watchedSubject === s;
                                        return (
                                            <div key={s} onClick={() => setValue('subject', s)} className={cn(themeColors.SELECTION_CARD, isActive ? themeColors.CARD_ACTIVE : themeColors.CARD_INACTIVE)}>
                                                {isActive && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                                <BookOpen className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                                                <span className="text-xs font-bold truncate w-full px-1">{s}</span>
                                            </div>
                                        );
                                    })}
                                    {isAddingNewSubject ? (
                                        <div className={cn(themeColors.SELECTION_CARD, "border-indigo-300 bg-indigo-50/20")}>
                                            <Input autoFocus placeholder="Ders adı..." className="h-8 text-[11px] font-bold text-center bg-white" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd('subject')} />
                                            <div className="flex gap-1 w-full mt-1">
                                                <Button size="sm" className="h-6 flex-1 text-[10px] bg-indigo-600" onClick={() => handleQuickAdd('subject')}>Ekle</Button>
                                                <Button size="sm" variant="ghost" className="h-6 flex-1 text-[10px]" onClick={() => {setIsAddingNewSubject(false); setNewItemName("");}}>İptal</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => setIsAddingNewSubject(true)} className={cn(themeColors.SELECTION_CARD, themeColors.ADD_CARD)}>
                                            <PlusCircle className="w-5 h-5 text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Yeni Ders</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'topic' && (
                            <motion.div key="topic" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Konu Seçimi</h3>
                                    <p className="text-sm text-slate-500">Ders: <span className="text-indigo-600 font-bold">{watchedSubject}</span></p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {relevantTopics.map((t) => {
                                        const isActive = watchedTopic === t;
                                        return (
                                            <div key={t} onClick={() => setValue('topic', t)} className={cn(themeColors.SELECTION_CARD, isActive ? themeColors.CARD_ACTIVE : themeColors.CARD_INACTIVE)}>
                                                {isActive && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                                <Layers className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                                                <span className="text-xs font-bold truncate w-full px-1">{t}</span>
                                            </div>
                                        );
                                    })}
                                    {isAddingNewTopic ? (
                                        <div className={cn(themeColors.SELECTION_CARD, "border-indigo-300 bg-indigo-50/20")}>
                                            <Input autoFocus placeholder="Konu adı..." className="h-8 text-[11px] font-bold text-center bg-white" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd('topic')} />
                                            <div className="flex gap-1 w-full mt-1">
                                                <Button size="sm" className="h-6 flex-1 text-[10px] bg-indigo-600" onClick={() => handleQuickAdd('topic')}>Ekle</Button>
                                                <Button size="sm" variant="ghost" className="h-6 flex-1 text-[10px]" onClick={() => {setIsAddingNewTopic(false); setNewItemName("");}}>İptal</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => setIsAddingNewTopic(true)} className={cn(themeColors.SELECTION_CARD, themeColors.ADD_CARD)}>
                                            <PlusCircle className="w-5 h-5 text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Yeni Konu</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'details' && (
                            <motion.div key="details" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Soru Tipi & Cevap</h3>
                                    <p className="text-sm text-slate-500">Doğru cevabı veya tipi belirleyin.</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <FormField control={form.control} name="type" render={({field}) => (
                                        <FormItem className="space-y-3">
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-3">
                                                <div onClick={() => field.onChange('mcq')} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer", field.value === 'mcq' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200")}>
                                                    <LayoutGrid className={cn("w-6 h-6", field.value === 'mcq' ? "text-indigo-600" : "text-slate-400")} />
                                                    <span className="text-xs font-bold">Çoktan Seçmeli</span>
                                                </div>
                                                <div onClick={() => field.onChange('open_ended')} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer", field.value === 'open_ended' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200")}>
                                                    <Type className={cn("w-6 h-6", field.value === 'open_ended' ? "text-indigo-600" : "text-slate-400")} />
                                                    <span className="text-xs font-bold">Açık Uçlu</span>
                                                </div>
                                            </RadioGroup>
                                        </FormItem>
                                    )}/>

                                    {watchedType === 'mcq' ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Şıklar</span>
                                                <div className="flex items-center gap-3">
                                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOptionCountChange(optionKeys.length - 1)} disabled={optionKeys.length <= 2}><Minus className="w-4 h-4"/></Button>
                                                    <span className="text-sm font-black w-4 text-center">{optionKeys.length}</span>
                                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOptionCountChange(optionKeys.length + 1)} disabled={optionKeys.length >= 5}><Plus className="w-4 h-4"/></Button>
                                                </div>
                                            </div>
                                            
                                            <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-3">
                                                    {optionKeys.map((key) => {
                                                        const isActive = field.value === key;
                                                        return (
                                                            <div key={key} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all", isActive ? "border-emerald-600 bg-emerald-50/50" : "border-slate-100")}>
                                                                <FormControl><RadioGroupItem value={key} className="h-5 w-5" /></FormControl>
                                                                <span className="text-sm font-black text-emerald-600">{key}</span>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`options.${key}`}
                                                                    render={({ field: optionField }) => (
                                                                        <Input {...optionField} placeholder="Opsiyonel..." className="bg-transparent border-none shadow-none h-8 px-0 text-xs focus-visible:ring-0" />
                                                                    )}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </RadioGroup>
                                            )}/>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 rounded-3xl p-8 flex flex-col items-center justify-center border border-dashed border-emerald-200">
                                            <Sparkles className="w-10 h-10 text-emerald-500 mb-2" />
                                            <p className="text-sm font-bold text-emerald-700">Değerlendirme Modu Aktif</p>
                                            <p className="text-xs text-emerald-600 text-center mt-1">Öğrencinin cevabı öğretmen tarafından puanlanacak.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'confirm' && (
                            <motion.div key="confirm" custom={1} variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black tracking-tight">Son Onay</h3>
                                    <p className="text-sm text-slate-500">Bilgiler doğruysa kaydedebilirsiniz.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100">
                                        <Image src={watchedImage} alt="Final" fill className="object-contain p-2" />
                                    </div>
                                    
                                    <div className="bg-slate-50 rounded-2xl p-4 divide-y divide-slate-200 border">
                                        <div className="flex justify-between py-2.5">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Ders</span>
                                            <span className="text-sm font-bold text-slate-800">{watchedSubject}</span>
                                        </div>
                                        <div className="flex justify-between py-2.5">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Konu</span>
                                            <span className="text-sm font-bold text-slate-800">{watchedTopic}</span>
                                        </div>
                                        <div className="flex justify-between py-2.5">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Soru Tipi</span>
                                            <span className="text-sm font-bold text-slate-800">{watchedType === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'}</span>
                                        </div>
                                        {watchedType === 'mcq' && (
                                            <div className="flex justify-between py-2.5">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Doğru Cevap</span>
                                                <Badge className="bg-emerald-600">{form.getValues('correctAnswer')}</Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter className="p-6 border-t bg-slate-50/50 flex-row gap-3 mt-8">
                    {stepIndex > 0 ? (
                        <Button type="button" variant="ghost" className="h-12 rounded-2xl font-bold flex-1" onClick={goToPrevStep} disabled={loading}>
                            Geri
                        </Button>
                    ) : (
                        <Button type="button" variant="ghost" className="h-12 rounded-2xl font-bold flex-1" onClick={onQuestionProcessed} disabled={loading}>
                            İptal
                        </Button>
                    )}
                    
                    {currentStep === 'confirm' ? (
                        <Button type="submit" className="h-12 rounded-2xl font-black flex-[2] bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 text-white" disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                            {currentIndex < imageQueue.length - 1 ? 'Sıradaki Soruya Geç' : 'Bankaya Kaydet'}
                        </Button>
                    ) : (
                        <Button type="button" className="h-12 rounded-2xl font-black flex-[2] bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 text-white" onClick={goToNextStep}>
                            İlerle <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </DialogFooter>
            </form>
        </Form>
    </div>
  );
}
