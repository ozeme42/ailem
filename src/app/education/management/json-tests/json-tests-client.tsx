
"use client";

import * as React from "react";
import Link from 'next/link';
import { ArrowLeft, FileJson, PlusCircle, Trash2, Edit, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onTestsUpdate, deleteTest, addTest, updateTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember, JsonTestQuestion } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewJsonTestForm } from "@/components/new-json-test-form";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl shadow-lg",
};

export function JsonTestsClient() {
  const { familyId, familyMembers } = useAuth();
  const { toast } = useToast();
  const [jsonTests, setJsonTests] = React.useState<Test[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTest, setEditingTest] = React.useState<Test | null>(null);

  React.useEffect(() => {
    if (!familyId) return;
    const unsub = onTestsUpdate((allTests) => {
      setJsonTests(allTests.filter(t => t.sourceType === 'json'));
    });
    return () => unsub();
  }, [familyId]);

  const handleOpenForm = (test: Test | null) => {
    setEditingTest(test);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Test, 'id' | 'familyId'>) => {
    try {
      if (editingTest) {
        await updateTest(editingTest.id, data);
        toast({ title: "Yazılı Test Güncellendi" });
      } else {
        await addTest(data);
        toast({ title: "Yazılı Test Oluşturuldu" });
      }
      setIsFormOpen(false);
      setEditingTest(null);
    } catch (e) {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteTest(testId);
      toast({ title: "Test Silindi", variant: "destructive" });
    } catch (e) {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        <div className={cn("sticky top-0 z-40 w-full", glassColors.HEADER_BG)}>
            <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/education/management">
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2">
                        <ArrowLeft className="h-6 w-6" />
                      </Button>
                    </Link>
                    <div className={cn(glassColors.ICON_BOX)}>
                         <FileJson className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">Yazılı Testler</h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">JSON ile Test Yönetimi</p>
                    </div>
                </div>
                <Button onClick={() => handleOpenForm(null)} className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20">
                    <PlusCircle className="mr-1.5 h-4 w-4" /> Yeni Test Oluştur
                </Button>
            </div>
        </div>

        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 relative z-10">
            {jsonTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jsonTests.map(test => (
                        <Card key={test.id} className={cn("flex flex-col h-full", glassColors.CARD_BG)}>
                            <CardHeader>
                                <CardTitle className="text-lg text-slate-200">{test.title}</CardTitle>
                                <CardDescription className="text-slate-400">{test.subject}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{test.questionCount} Soru</Badge>
                                    {test.studentId && (
                                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                                            Atanan: {familyMembers.find(m => m.id === test.studentId)?.name || 'Bilinmiyor'}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 pt-4 border-t border-white/5">
                                <Button size="sm" variant="ghost" onClick={() => handleOpenForm(test)} className="hover:bg-white/10 text-slate-400">
                                    <Edit className="mr-2 h-4 w-4"/> Düzenle
                                </Button>
                                <Link href={`/education/${test.id}`}>
                                    <Button size="sm" variant="secondary" className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-600/30">Çöz</Button>
                                </Link>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                        <AlertDialogHeader><AlertDialogTitle>Testi Sil</AlertDialogTitle><AlertDialogDescription>"{test.title}" testini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteTest(test.id)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <FileJson className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-300">Yazılı Test Yok</h3>
                    <p className="mt-1 text-sm text-slate-500">JSON formatında yeni bir test oluşturarak başlayın.</p>
                </div>
            )}
        </div>

        <Dialog open={isFormOpen} onOpenChange={(open) => { if(!open) setEditingTest(null); setIsFormOpen(open); }}>
            <DialogContent className="max-w-2xl h-[85vh] flex flex-col bg-slate-900 border-white/10 text-slate-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold">{editingTest ? 'Yazılı Testi Düzenle' : 'Yeni Yazılı Test Oluştur'}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Test bilgilerini ve soruları güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden p-6 pt-0">
                    <NewJsonTestForm
                        familyMembers={familyMembers}
                        onFormSubmit={handleFormSubmit}
                        initialData={editingTest}
                    />
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
