"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Save, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Student, Test } from "@/lib/data";
import { addTest, onSubjectsUpdate, onTopicsUpdate, onTestsUpdate, onBankQuestionsUpdate, onCurriculumMapUpdate } from "@/lib/dataService";
import { cn } from "@/lib/utils";

import { TrackedBook, StudyPlan } from "@/lib/data";

interface AddOfflineResultDialogProps {
  trackedBooks: TrackedBook[];
  studyPlans: StudyPlan[];
  students: Student[];
  onResultAdded: () => void;
  trigger?: React.ReactNode;
}

interface ExamSubjectRow {
  id: string;
  subjectName: string;
  correct: number;
  incorrect: number;
  blank: number;
}

export function AddOfflineResultDialog({ students, trackedBooks, studyPlans, onResultAdded, trigger }: AddOfflineResultDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(students.length > 0 ? students[0].id : "");
  const [mode, setMode] = React.useState<"single" | "exam">("single");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [globalSubjects, setGlobalSubjects] = React.useState<string[]>([]);
  const [globalTopics, setGlobalTopics] = React.useState<string[]>([]);
  const [curriculumMap, setCurriculumMap] = React.useState<Record<string, string[]>>({});

  const [tests, setTests] = React.useState<any[]>([]);
  const [bankQuestions, setBankQuestions] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsubTests = onTestsUpdate(setTests);
    const unsubBank = onBankQuestionsUpdate(setBankQuestions);
    const unsubC = onCurriculumMapUpdate(setCurriculumMap);
    return () => { unsubTests(); unsubBank(); unsubC(); };
  }, []);


  React.useEffect(() => {
    const unsubS = onSubjectsUpdate(setGlobalSubjects);
    const unsubT = onTopicsUpdate(setGlobalTopics);
    return () => { unsubS(); unsubT(); };
  }, []);


  // Single Test State
  const [singleSubject, setSingleSubject] = React.useState("");
  const [singleTitle, setSingleTitle] = React.useState("");
  const [singleDate, setSingleDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [singleTopic, setSingleTopic] = React.useState("Genel");
  const [singleCorrect, setSingleCorrect] = React.useState("");
  const [singleIncorrect, setSingleIncorrect] = React.useState("");
  const [singleBlank, setSingleBlank] = React.useState("");

  // Exam State
  const [examName, setExamName] = React.useState("");
  const [examDate, setExamDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [examSubjects, setExamSubjects] = React.useState<ExamSubjectRow[]>([
    { id: Math.random().toString(36).substring(7), subjectName: "Türkçe", correct: 0, incorrect: 0, blank: 0 },
    { id: Math.random().toString(36).substring(7), subjectName: "Matematik", correct: 0, incorrect: 0, blank: 0 },
    { id: Math.random().toString(36).substring(7), subjectName: "Fen Bilimleri", correct: 0, incorrect: 0, blank: 0 },
    { id: Math.random().toString(36).substring(7), subjectName: "Sosyal Bilgiler", correct: 0, incorrect: 0, blank: 0 }
  ]);

  
  
  
  const hierarchyMap = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    globalSubjects.forEach(s => map.set(s, new Set()));

    Object.entries(curriculumMap).forEach(([subj, topics]) => {
        if (!map.has(subj)) map.set(subj, new Set());
        topics.forEach(t => map.get(subj)!.add(t));
    });

    return map;
  }, [globalSubjects, curriculumMap]);


  const availableSubjects = Array.from(new Set([
      ...globalSubjects,
      ...Object.keys(curriculumMap)
  ])).filter(Boolean).sort();

  const availableTopics = singleSubject 
    ? Array.from(new Set([
        ...Array.from(hierarchyMap.get(singleSubject) || new Set<string>()).filter(t => globalTopics.includes(t)),
        "Genel"
      ])).filter(Boolean).sort((a,b) => a.localeCompare(b, 'tr'))
    : ["Genel"];




  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset forms
      setSingleSubject("");
      setSingleTopic("Genel");
      setSingleCorrect("");
      setSingleIncorrect("");
      setSingleBlank("");
      setSingleTitle("");
      setSingleDate(new Date().toISOString().split('T')[0]);
      setExamDate(new Date().toISOString().split('T')[0]);
      setExamName("");
      setMode("single");
    }
  };

  const handleSaveSingle = async () => {
    if (!selectedStudentId || !singleSubject) {
      toast({ title: "Hata", description: "Lütfen öğrenci ve ders seçin.", variant: "destructive" });
      return;
    }
    const correct = parseInt(singleCorrect) || 0;
    const incorrect = parseInt(singleIncorrect) || 0;
    const blank = parseInt(singleBlank) || 0;
    const totalQ = correct + incorrect + blank;

    if (totalQ === 0) {
      toast({ title: "Hata", description: "Lütfen en az bir soru verisi girin.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const newTest: Omit<Test, 'id' | 'familyId' | 'questions'> = {
        title: singleTitle || `${singleSubject} - ${singleTopic} (Dışarıdan Eklendi)`,
        subject: singleSubject,
        topicId: singleTopic,
        studentId: selectedStudentId,
        questionCount: totalQ,
        assignedDate: new Date(singleDate).toISOString(),
        dueDate: new Date(singleDate).toISOString(),
        status: 'Sonuçlandı',
        isArchived: false,
        sourceType: 'offline',
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        emptyAnswers: blank,
        score: totalQ > 0 ? (correct / totalQ) * 100 : 0
      };

      await addTest(newTest);
      toast({ title: "Başarılı", description: "Sonuç başarıyla kaydedildi." });
      onResultAdded();
      handleOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Hata", description: "Kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveExam = async () => {
    if (!selectedStudentId || !examName) {
      toast({ title: "Hata", description: "Lütfen öğrenci ve deneme adı girin.", variant: "destructive" });
      return;
    }

    const validSubjects = examSubjects.filter((s: ExamSubjectRow) => s.subjectName && (s.correct + s.incorrect + s.blank) > 0);
    if (validSubjects.length === 0) {
      toast({ title: "Hata", description: "Lütfen en az bir derse ait net bilgisi girin ve ders adını seçin.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = validSubjects.map((subj: ExamSubjectRow) => {
        const totalQ = subj.correct + subj.incorrect + subj.blank;
        const newTest: Omit<Test, 'id' | 'familyId' | 'questions'> = {
          title: `${examName} - ${subj.subjectName}`,
          subject: subj.subjectName,
          topicId: "Genel", // Deneme için konu Genel
          studentId: selectedStudentId,
          questionCount: totalQ,
          assignedDate: new Date(examDate).toISOString(),
          dueDate: new Date(examDate).toISOString(),
          status: 'Sonuçlandı',
          isArchived: false,
          sourceType: 'offline',
          correctAnswers: subj.correct,
          incorrectAnswers: subj.incorrect,
          emptyAnswers: subj.blank,
          score: totalQ > 0 ? (subj.correct / totalQ) * 100 : 0
        };
        return addTest(newTest);
      });

      await Promise.all(promises);
      toast({ title: "Başarılı", description: "Deneme sonuçları başarıyla kaydedildi." });
      onResultAdded();
      handleOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Hata", description: "Kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExamSubjectRow = () => {
    setExamSubjects([...examSubjects, { id: Math.random().toString(36).substring(7), subjectName: "", correct: 0, incorrect: 0, blank: 0 }]);
  };

  const removeExamSubjectRow = (id: string) => {
    setExamSubjects(examSubjects.filter((s: ExamSubjectRow) => s.id !== id));
  };

  const updateExamSubjectRow = (id: string, field: keyof ExamSubjectRow, value: any) => {
    setExamSubjects(examSubjects.map((s: ExamSubjectRow) => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-9 gap-2 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200">
            <Plus className="h-4 w-4" />
            <span>Hızlı Sonuç Ekle</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Dışarıdan Sonuç Ekle
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Öğrenci Seçin</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Öğrenci Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "exam")} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-10 mb-6 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
              <TabsTrigger value="single" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">Tekil Test Sonucu</TabsTrigger>
              <TabsTrigger value="exam" className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">Genel Deneme Sonucu</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-4 outline-none">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Test Adı</label>
                  <Input value={singleTitle} onChange={e => setSingleTitle(e.target.value)} placeholder="Örn: Limit Fasikülü Test 1" className="h-10 bg-white dark:bg-slate-950" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Çözülme Tarihi</label>
                  <Input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="h-10 bg-white dark:bg-slate-950" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Ders</label>
                  <Select value={singleSubject} onValueChange={(val) => { setSingleSubject(val); setSingleTopic("Genel"); }}>
                    <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Ders Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Konu (Opsiyonel)</label>
                  <Select value={singleTopic} onValueChange={setSingleTopic} disabled={!singleSubject}>
                    <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Konu Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Genel">Genel (Tüm Konular)</SelectItem>
                      {availableTopics.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Doğru</label>
                  <Input type="number" min="0" value={singleCorrect} onChange={e => setSingleCorrect(e.target.value)} className="h-10 bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-rose-600 dark:text-rose-400">Yanlış</label>
                  <Input type="number" min="0" value={singleIncorrect} onChange={e => setSingleIncorrect(e.target.value)} className="h-10 bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Boş</label>
                  <Input type="number" min="0" value={singleBlank} onChange={e => setSingleBlank(e.target.value)} className="h-10 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 font-bold" />
                </div>
              </div>
              
              <div className="pt-6">
                <Button onClick={handleSaveSingle} disabled={isSubmitting} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {isSubmitting ? "Kaydediliyor..." : "Test Sonucunu Kaydet"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="exam" className="space-y-5 outline-none">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Deneme Adı</label>
                  <Input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Örn: 1. Dönem LGS Türkiye Geneli" className="h-10 bg-white dark:bg-slate-950" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Çözülme Tarihi</label>
                  <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="h-10 bg-white dark:bg-slate-950" />
                </div>
              </div>


              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Ders Bazlı Netler</label>
                  <Button type="button" variant="ghost" size="sm" onClick={addExamSubjectRow} className="h-7 px-2 text-[11px] text-indigo-600 hover:bg-indigo-50">
                    <Plus className="w-3 h-3 mr-1" /> Ders Ekle
                  </Button>
                </div>
                
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_50px_50px_50px_40px] gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase text-center items-center">
                    <div className="text-left pl-2">Ders</div>
                    <div className="text-emerald-600">D</div>
                    <div className="text-rose-600">Y</div>
                    <div>B</div>
                    <div></div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {examSubjects.map(row => (
                      <div key={row.id} className="grid grid-cols-[1fr_50px_50px_50px_40px] gap-2 p-2 items-center">
                        <Select value={row.subjectName} onValueChange={v => updateExamSubjectRow(row.id, 'subjectName', v)}>
                          <SelectTrigger className="h-8 text-xs border-none shadow-none bg-transparent focus:ring-0 px-2">
                            <SelectValue placeholder="Seç" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" min="0" value={row.correct || ""} onChange={e => updateExamSubjectRow(row.id, 'correct', parseInt(e.target.value) || 0)} className="h-8 text-center text-xs px-1 font-bold text-emerald-600 bg-emerald-50/30 border-emerald-100" />
                        <Input type="number" min="0" value={row.incorrect || ""} onChange={e => updateExamSubjectRow(row.id, 'incorrect', parseInt(e.target.value) || 0)} className="h-8 text-center text-xs px-1 font-bold text-rose-600 bg-rose-50/30 border-rose-100" />
                        <Input type="number" min="0" value={row.blank || ""} onChange={e => updateExamSubjectRow(row.id, 'blank', parseInt(e.target.value) || 0)} className="h-8 text-center text-xs px-1 font-bold text-slate-600 bg-slate-50/50 border-slate-100" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeExamSubjectRow(row.id)} className="h-8 w-8 text-slate-400 hover:text-rose-500">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleSaveExam} disabled={isSubmitting} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {isSubmitting ? "Kaydediliyor..." : "Deneme Sonuçlarını Kaydet"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
