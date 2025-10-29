
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { BankQuestion, Test, FamilyMember, QuickTestQuestion, PracticeExam } from "@/lib/data";
import {
  onBankQuestionsUpdate,
  onSubjectsUpdate,
  updateSubjects,
  onTopicsUpdate,
  updateTopics,
  addTest,
  updateTest,
  onPracticeExamsUpdate,
} from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Key, Loader2, UploadCloud, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { AnswerKeyForm } from "@/components/answer-key-form";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AssignmentType = "quick" | "exam" | "bank";

const formSchema = z.object({
  studentIds: z.array(z.string()).min(1, "En az bir öğrenci seçmelisiniz."),
  activeTab: z.enum(["quick", "exam", "bank"]),
  assignedDate: z.date().optional(),
  dueDate: z.date().optional(),

  // Quick Test Fields
  title: z.string().optional(),
  subject: z.string().optional(),
  questionCount: z.coerce.number().optional(),
  answerKey: z.record(z.string()).optional(),
  questions: z.array(z.object({
    questionId: z.string(),
    questionNumber: z.number(),
    imageUrl: z.string().url("Geçerli bir görsel URL'si girilmelidir."),
  })).optional(),
  
  // Bank/Exam Fields
  selectedBankQuestions: z.array(z.string()).optional(),
  examId: z.string().optional(),
})
.refine((data) => {
    if (data.activeTab === 'quick' || data.activeTab === 'bank') {
        return data.title && data.title.length >= 2;
    }
    return true;
}, { message: "Test başlığı en az 2 karakter olmalıdır.", path: ["title"] })
.refine((data) => {
    if (data.activeTab === 'quick' || data.activeTab === 'bank') {
        return !!data.subject;
    }
    return true;
}, { message: "Lütfen bir ders seçin veya oluşturun.", path: ["subject"] })
.refine((data) => {
    if (data.activeTab === 'exam') {
        return !!data.examId;
    }
    return true;
}, { message: "Lütfen bir deneme sınavı seçin.", path: ["examId"] })
.refine((data) => {
    if (data.activeTab === 'bank' && (!data.selectedBankQuestions || data.selectedBankQuestions.length === 0)) {
        return false;
    }
    return true;
}, { message: "Lütfen soru bankasından en az bir soru seçin.", path: ["selectedBankQuestions"] })
.refine((data) => {
    if (data.assignedDate && data.dueDate) {
        return data.dueDate >= data.assignedDate;
    }
    return true;
}, { message: "Bitiş tarihi, başlangıç tarihinden önce olamaz.", path: ["dueDate"] });


export default function AssignClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editTestId = searchParams.get('edit');
    const { toast } = useToast();
    const { familyMembers } = useAuth();

    const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    const [availableTopics, setAvailableTopics] = React.useState<string[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [initialData, setInitialData] = React.useState<Test | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    
    // UI State
    const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [bankSubjectFilter, setBankSubjectFilter] = React.useState<string>("");
    const [bankTopicFilter, setBankTopicFilter] = React.useState<string>("");

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
        defaultValues: {
          activeTab: 'quick',
          studentIds: [],
          title: "",
          subject: "",
          questionCount: 0,
          answerKey: {},
          questions: [],
          selectedBankQuestions: [],
          assignedDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

     React.useEffect(() => {
        const unsubBankQuestions = onBankQuestionsUpdate(setBankQuestions);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
        const unsubTopics = onTopicsUpdate(setAvailableTopics);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);

        const fetchInitialData = async () => {
            if (editTestId) {
                const testDoc = await getDoc(doc(db, 'tests', editTestId));
                if (testDoc.exists()) {
                    const data = { id: testDoc.id, ...testDoc.data() } as Test;
                    setInitialData(data);
                    form.reset({
                        studentIds: data.studentId ? [data.studentId] : [],
                        activeTab: data.sourceType === 'exam' ? 'exam' : (data.sourceType === 'bank' ? 'bank' : 'quick'),
                        title: data.title || "",
                        subject: data.subject || "",
                        questionCount: data.questionCount || 0,
                        answerKey: data.answerKey || {},
                        questions: data.questions || [],
                        selectedBankQuestions: data.sourceType === 'bank' ? (data.questions || []).map(q => q.questionId) : [],
                        examId: data.sourceType === 'exam' ? data.sourceId : undefined,
                        assignedDate: data.assignedDate ? parse(data.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(),
                        dueDate: data.dueDate ? parse(data.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    });
                }
            }
            setIsLoading(false);
        }

        fetchInitialData();
        
        return () => {
            unsubBankQuestions();
            unsubSubjects();
            unsubTopics();
            unsubExams();
        };
    }, [editTestId, form]);


    const handleCreateSubject = async (subjectName: string) => {
        const newSubjects = [...new Set([...availableSubjects, subjectName])];
        await updateSubjects(newSubjects);
    };
    
    const handleCreateTopic = async (topicName: string) => {
        const newTopics = [...new Set([...availableTopics, topicName])];
        await updateTopics(newTopics);
    };

    const handleAssignmentSubmit = async (values: z.infer<typeof formSchema>) => {
        const assignedDate = values.assignedDate ? format(values.assignedDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(), 'dd MMMM yyyy', { locale: tr });
        const dueDate = values.dueDate ? format(values.dueDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr });
    
        try {
            for (const studentId of values.studentIds) {
                let testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>;
                let questionsForSubcollection: (QuickTestQuestion | BankQuestion)[] | undefined = undefined;

                switch (values.activeTab) {
                    case 'quick':
                        testData = {
                            title: values.title!,
                            subject: values.subject!,
                            studentId: studentId,
                            questionCount: values.questions?.length || 0,
                            assignedDate, dueDate,
                            sourceType: 'quick',
                            answerKey: values.answerKey,
                        };
                        questionsForSubcollection = values.questions;
                        break;
                    
                    case 'bank':
                        const selectedQuestionsFromBank = (values.selectedBankQuestions || []).map(qId => bankQuestions.find(bq => bq.id === qId)).filter((q): q is BankQuestion => !!q);
                        testData = {
                            title: values.title!,
                            subject: values.subject!,
                            sourceType: 'bank',
                            studentId: studentId,
                            questionCount: selectedQuestionsFromBank.length,
                            assignedDate, dueDate,
                        };
                        questionsForSubcollection = selectedQuestionsFromBank;
                        break;

                    case 'exam':
                        const selectedExam = practiceExams.find(e => e.id === values.examId);
                        if (!selectedExam) continue;
                        testData = {
                            title: selectedExam.name,
                            subject: 'Deneme Sınavı',
                            studentId: studentId,
                            questionCount: selectedExam.subjects?.reduce((acc, s) => acc + s.questionCount, 0) || 0,
                            assignedDate, dueDate,
                            sourceType: 'exam',
                            sourceId: selectedExam.id,
                        };
                        break;

                    default:
                        toast({ title: "Geçersiz seçim", description: "Lütfen geçerli bir ödev türü seçin.", variant: "destructive" });
                        continue;
                }
                
                if (editTestId) {
                    await updateTest(editTestId, testData, questionsForSubcollection);
                } else {
                    await addTest({ ...testData, status: 'Atandı', isArchived: false }, questionsForSubcollection);
                }
            }

            toast({ title: editTestId ? "✅ Ödev Güncellendi" : "✅ Ödev Atandı", description: "İşlem başarıyla tamamlandı." });
            router.push('/education/management');

        } catch (error) {
             toast({ title: "❌ Kaydetme Hatası", description: "Ödev kaydedilirken bir hata oluştu.", variant: 'destructive'});
        }
    };
    
    if(isLoading && editTestId) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    }
    
    const activeTab = form.watch("activeTab");
    const questions = form.watch("questions") || [];

     const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));

    const filteredBankQuestions = React.useMemo(() => {
        return bankQuestions.filter(q => {
        const subjectMatch = !bankSubjectFilter || q.subject === bankSubjectFilter;
        const topicMatch = !bankTopicFilter || q.topic === bankTopicFilter;
        return subjectMatch && topicMatch;
        });
    }, [bankQuestions, bankSubjectFilter, bankTopicFilter]);

    const bankTopicsOptions = React.useMemo(() => {
        if (!bankSubjectFilter) return [];
        const topics = new Set(bankQuestions.filter(q => q.subject === bankSubjectFilter).map(q => q.topic));
        return Array.from(topics).map(t => ({ label: t, value: t }));
    }, [bankQuestions, bankSubjectFilter]);
    
    const handleImageUpload = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        toast({ title: 'Görseller Yükleniyor...', description: 'Bu işlem biraz zaman alabilir.' });

        for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise<void>(resolve => {
            reader.onload = async () => {
            const imageDataUri = reader.result as string;
            try {
                const destinationPath = `test-questions/${Date.now()}-${file.name}`;
                const migrationResult = await migrateImage({ imageDataUri, destinationPath });
                if (migrationResult.success && migrationResult.newUrl) {
                append({
                    questionId: `${fields.length + i + 1}`, // temp id
                    questionNumber: fields.length + i + 1,
                    imageUrl: migrationResult.newUrl,
                });
                } else {
                toast({ title: "Görsel Yükleme Hatası", description: migrationResult.error, variant: "destructive" });
                }
            } catch(e) {
                toast({ title: "Görsel Yükleme Hatası", variant: "destructive" });
            }
            resolve();
            };
        });
        }
        if (event.target) {
        event.target.value = ''; // Reset file input
        }
    };


    return (
      <Tabs value={activeTab} onValueChange={(val) => form.setValue('activeTab', val as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="quick" disabled={!!initialData}>Hızlı Test</TabsTrigger>
                <TabsTrigger value="bank" disabled={!!initialData}>Soru Bankası</TabsTrigger>
                <TabsTrigger value="exam" disabled={!!initialData}>Deneme Sınavı</TabsTrigger>
            </TabsList>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAssignmentSubmit)} className="space-y-4 pt-4">
                <TabsContent value="quick" className="space-y-4 m-0">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input placeholder="Örn: 2. Dönem Genel Tekrar" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value || ""} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
                    )} />
                    
                    <div className="space-y-2">
                        <FormLabel>Sorular ({questions.length} adet)</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="relative group">
                                    <Badge className="absolute top-1 left-1 z-10">Soru {index + 1}</Badge>
                                    <Image src={(field as any).imageUrl} alt={`Soru ${index + 1}`} width={100} height={100} className="w-full h-auto object-contain rounded-md border" data-ai-hint="question paper" />
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleImageUpload}>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Soru Resimleri Yükle
                        </Button>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
                    </div>
                    
                    <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
                    <DialogTrigger asChild><Button type="button" variant="secondary" disabled={questions.length === 0}><Key className="mr-2 h-4 w-4"/>Cevap Anahtarını Düzenle ({Object.keys(form.getValues('answerKey') || {}).length} / {questions.length})</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Cevap Anahtarı</DialogTitle></DialogHeader>
                        <AnswerKeyForm totalQuestions={questions.length} answerKey={form.getValues('answerKey') || {}} onSave={(newKey: any) => { form.setValue('answerKey', newKey); setIsAnswerKeyDialogOpen(false); }} />
                    </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="bank" className="space-y-4 m-0">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input placeholder="Örn: Rasyonel Sayılar Değerlendirme" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value || ""} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
                    )} />

                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Soru Seçimi</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <Select value={bankSubjectFilter} onValueChange={(value) => {setBankSubjectFilter(value === 'all' ? '' : value); setBankTopicFilter('');}}>
                                <SelectTrigger><SelectValue placeholder="Derse göre filtrele"/></SelectTrigger>
                                <SelectContent><SelectItem value="all">Tüm Dersler</SelectItem>{availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={bankTopicFilter} onValueChange={(value) => setBankTopicFilter(value === 'all' ? '' : value)} disabled={!bankSubjectFilter}>
                                <SelectTrigger><SelectValue placeholder="Konuya göre filtrele"/></SelectTrigger>
                                <SelectContent><SelectItem value="all">Tüm Konular</SelectItem>{bankTopicsOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <FormField
                            control={form.control}
                            name="selectedBankQuestions"
                            render={({ field }) => (
                                <FormItem>
                                    <ScrollArea className="h-72">
                                        <div className="space-y-2 pr-4">
                                        {filteredBankQuestions.map(q => (
                                            <div key={q.id} className="flex items-center gap-2 p-2 border rounded-md">
                                                <Checkbox 
                                                    checked={field.value?.includes(q.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked 
                                                            ? field.onChange([...(field.value || []), q.id])
                                                            : field.onChange(field.value?.filter(v => v !== q.id))
                                                    }}
                                                />
                                                <Image src={q.imageUrl} alt={q.topic} width={60} height={40} className="rounded-sm border object-contain aspect-video" data-ai-hint="question paper" />
                                                <div className="flex-grow">
                                                    <p className="font-medium text-sm">{q.topic}</p>
                                                    <p className="text-xs text-muted-foreground">{q.subject}</p>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="exam" className="space-y-4 m-0">
                    <FormField control={form.control} name="examId" render={({ field }) => (
                        <FormItem><FormLabel>Deneme Sınavı</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!initialData}>
                        <FormControl><SelectTrigger><SelectValue placeholder={"Bir deneme sınavı seçin"} /></SelectTrigger></FormControl>
                        <SelectContent>{practiceExams.map((exam) => (<SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>))}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                </TabsContent>

                <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="studentIds"
                        render={() => (
                            <FormItem>
                            <FormLabel>Öğrenci(ler)</FormLabel>
                            {students.map((student) => (
                                <FormField
                                key={student.id}
                                control={form.control}
                                name="studentIds"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={student.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(student.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), student.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                    (value) => value !== student.id
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        {student.name}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="assignedDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Başlangıç Tarihi</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Bitiş Tarihi</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues('assignedDate') ? date < form.getValues('assignedDate')! : false} initialFocus/></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )} />
                    </div>
                </div>

                <Button type="submit" className="w-full">{editTestId ? 'Ödevi Güncelle' : `Ödevi Ata`}</Button>
            </form>
            </Form>
      </Tabs>
    );
}
