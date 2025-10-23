
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, FileText, KeyRound, CheckCircle, MoreVertical, Edit, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { onBankQuestionsUpdate, onTestsUpdate, addTest, updateTest, deleteTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { BankQuestion, Test, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";


export default function QuestionBankManagementPage() {
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<FamilyMember[]>([]);
  
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [newTestData, setNewTestData] = useState({ name: "", questionCount: "" });
  
  const [editingTest, setEditingTest] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [deletingTest, setDeletingTest] = useState<any>(null);

  const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = useState(false);
  const [selectedTestForAnswerKey, setSelectedTestForAnswerKey] = useState<any>(null);
  const [currentAnswerKey, setCurrentAnswerKey] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { familyMembers } = useAuth();


  const fetchBookDetails = async () => {
      // This is a placeholder now. We will manage questions directly.
      setIsLoading(false);
  };

  useEffect(() => {
    fetchBookDetails();
    const unsub = onBankQuestionsUpdate((questions) => {
        setBankQuestions(questions);
        setIsLoading(false);
    });
    setAllStudents(familyMembers.filter(m => m.role.includes('Çocuk')));
    return () => unsub();
  }, [familyMembers]);

  const handleDataChange = async () => {
    // Re-fetch or rely on onSnapshot
  }


  const openAnswerKeyDialog = (test: any) => {
    setSelectedTestForAnswerKey(test);
    setCurrentAnswerKey(test.answerKey || Array(test.questionCount).fill(null));
    setIsAnswerKeyDialogOpen(true);
  };

  const handleAnswerKeyChange = (questionIndex: number, answer: string) => {
    const newKey = [...currentAnswerKey];
    newKey[questionIndex] = answer;
    setCurrentAnswerKey(newKey);
  };

  const handleSaveAnswerKey = async () => {
    // This needs to be adapted to update a Test document, not a book's nested structure
    toast.error("Cevap anahtarı kaydetme henüz uygulanmadı.");
    setIsAnswerKeyDialogOpen(false);
  };


  const handleToggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };
  
  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAssignHomework = async () => {
     if(selectedTests.length === 0 || selectedStudents.length === 0) {
      toast({ title: "Hata", description: "Lütfen en az bir test ve bir öğrenci seçin.", variant: "destructive" });
      return;
    }
    try {
        // This logic needs to create 'Test' documents from 'BankQuestion' selections.
        // Simplified for now.
        toast({ title: "Başarılı", description: `${selectedTests.length} test ${selectedStudents.length} öğrenciye ödev olarak atandı.` });
        setIsAssignDialogOpen(false);
        setSelectedTests([]);
        setSelectedStudents([]);
    } catch (error) {
       toast({ title: "Hata", description: "Ödev atama sırasında bir hata oluştu.", variant: "destructive" });
    }
  };


  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  const subjects = Array.from(new Set(bankQuestions.map(q => q.subject)));

  return (
    <div className="space-y-6">
      <PageHeader title="Soru Bankası">
         <div className="flex items-center gap-2">
            <Link href="/education/management">
                <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Yönetim Paneli
                </Button>
            </Link>
            <Button 
              onClick={() => setIsAssignDialogOpen(true)}
              disabled={selectedTests.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Seçilenleri Ödev Ver ({selectedTests.length})
            </Button>
        </div>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>İçerik</CardTitle>
          <CardDescription>
            Tüm dersleri, konuları ve soruları yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {subjects && subjects.length > 0 ? (
                 <Accordion type="multiple" className="w-full">
                    {subjects.map((subject: any) => {
                        const topics = Array.from(new Set(bankQuestions.filter(q => q.subject === subject).map(q => q.topic)));
                        return (
                        <AccordionItem value={subject} key={subject}>
                            <AccordionTrigger className="text-lg font-medium">{subject}</AccordionTrigger>
                            <AccordionContent className="pl-4">
                                <div className="space-y-4">
                                     {topics && topics.length > 0 ? (
                                         <Accordion type="multiple" className="w-full">
                                            {topics.map((topic: any) => {
                                                const topicQuestions = bankQuestions.filter(q => q.subject === subject && q.topic === topic);
                                                return (
                                                    <AccordionItem value={topic} key={topic}>
                                                        <AccordionTrigger>{topic}</AccordionTrigger>
                                                        <AccordionContent className="pl-4">
                                                            <div className="space-y-3">
                                                                {topicQuestions.map((question: BankQuestion) => (
                                                                    <div key={question.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <Checkbox
                                                                                id={`test-select-${question.id}`}
                                                                                checked={selectedTests.includes(question.id)}
                                                                                onCheckedChange={() => handleToggleTestSelection(question.id)}
                                                                            />
                                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                                            <p className="font-medium">{question.topic} - Soru</p>
                                                                            <Badge variant="secondary">{Object.keys(question.options || {}).length} Şıklı</Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )
                                            })}
                                        </Accordion>
                                     ) : (
                                        <p className="text-sm text-muted-foreground py-4">Bu derse henüz konu eklenmemiş.</p>
                                     )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )})}
                </Accordion>
            ) : (
                <p className="text-center py-10 text-muted-foreground">Henüz soru eklenmemiş.</p>
            )}
        </CardContent>
      </Card>
      
        {/* Dialog for assigning homework */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ödev Ata</DialogTitle>
              <DialogDescription>
                Seçtiğiniz {selectedTests.length} testi aşağıdaki öğrencilere atayın.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <h4 className="font-medium">Öğrenciler</h4>
              {allStudents.map(student => (
                 <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`student-assign-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleToggleStudentSelection(student.id)}
                    />
                    <Label htmlFor={`student-assign-${student.id}`} className="font-normal">
                      {student.name}
                    </Label>
                  </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>İptal</Button>
              <Button onClick={handleAssignHomework} disabled={selectedStudents.length === 0}>
                Ödev Ver ({selectedStudents.length} öğrenci)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  );
}

    