
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle, Edit, ListFilter, MinusCircle, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Test, FamilyMember } from "@/lib/data";
import { onTestsUpdate, deleteTest } from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AllTestsPage() {
    const { toast } = useToast();
    const { familyMembers, familyId } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [activeTab, setActiveTab] = React.useState('all');
    const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubTests = onTestsUpdate(setTests, false, 'assignedDate', 'desc');
        return () => unsubTests();
    }, []);
    
    const handleDeleteTest = async (testId: string) => {
        try {
            await deleteTest(testId);
            toast({ title: "Ödev Silindi", variant: "destructive"});
        } catch (error) {
            toast({ title: "Hata", description: "Ödev silinirken bir hata oluştu.", variant: "destructive"});
        }
    };
    
    const filteredTests = React.useMemo(() => {
        let filtered = tests;
        
        if (selectedStudents.length > 0) {
            filtered = filtered.filter(t => selectedStudents.includes(t.studentId));
        }

        if (activeTab === 'pending') {
            return filtered.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
        } else if (activeTab === 'completed') {
            return filtered.filter(t => t.status === 'Sonuçlandı');
        }

        return filtered;
    }, [tests, activeTab, selectedStudents]);

    return (
        <>
            <PageHeader title="Tüm Ödevler">
                <div className="flex flex-wrap gap-2">
                    <Link href="/education/management">
                        <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><ArrowLeft className="mr-2 h-4 w-4" /> Yönetim Paneli</Button>
                    </Link>
                </div>
            </PageHeader>
            
             <Card className="mt-6">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle>Ödev Listesi</CardTitle>
                            <CardDescription>Tüm öğrencilere atanmış bekleyen ve tamamlanmış ödevler.</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <ListFilter className="mr-2 h-4 w-4" />
                                    Filtrele ({selectedStudents.length > 0 ? selectedStudents.length : 'Tümü'})
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>Öğrenciye Göre Filtrele</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={selectedStudents.length === 0}
                                    onCheckedChange={() => setSelectedStudents([])}
                                >
                                    Tümü
                                </DropdownMenuCheckboxItem>
                                {studentMembers.map(student => (
                                    <DropdownMenuCheckboxItem
                                        key={student.id}
                                        checked={selectedStudents.includes(student.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedStudents(prev => 
                                                checked 
                                                ? [...prev, student.id] 
                                                : prev.filter(id => id !== student.id)
                                            );
                                        }}
                                    >
                                        {student.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">Tümü ({tests.filter(t => selectedStudents.length === 0 || selectedStudents.includes(t.studentId)).length})</TabsTrigger>
                            <TabsTrigger value="pending">Bekleyenler ({filteredTests.filter(t => t.status !== 'Sonuçlandı').length})</TabsTrigger>
                            <TabsTrigger value="completed">Bitenler ({filteredTests.filter(t => t.status === 'Sonuçlandı').length})</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="mt-4 space-y-3">
                        {filteredTests.map(test => {
                            const student = familyMembers.find(m => m.id === test.studentId);
                            return <ManagementTestCard key={test.id} test={test} student={student} onDelete={handleDeleteTest} />
                        })}
                         {filteredTests.length === 0 && (
                            <p className="text-center text-muted-foreground pt-8">Bu filtreye uygun ödev bulunamadı.</p>
                        )}
                    </div>
                </CardContent>
             </Card>
        </>
    );
}


function ManagementTestCard({ test, student, onDelete }: { test: Test, student?: FamilyMember, onDelete: (id: string) => void }) {
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
    const scorePercentage = test.score || 0;

    const hexToRgba = (hex: string, alpha: number) => {
        if (!hex) hex = '#cccccc';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const cardStyle = student ? { backgroundColor: hexToRgba(student.color, 0.1) } : {};

    return (
        <Card style={cardStyle}>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{getCategoryName(test)}</Badge>
                        <p className="font-semibold">{test.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{student?.name} • Son Teslim: {test.dueDate}</p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                    {isCompleted ? (
                        <div className="w-full sm:w-40 space-y-1">
                            <Progress value={scorePercentage} className="h-1.5" />
                            <div className="flex justify-between text-xs font-medium">
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3"/> D: {test.correctAnswers}</span>
                                <span className="flex items-center gap-1 text-red-600"><X className="h-3 w-3"/> Y: {test.incorrectAnswers}</span>
                                <span className="flex items-center gap-1 text-gray-500"><MinusCircle className="h-3 w-3"/> B: {test.emptyAnswers}</span>
                            </div>
                        </div>
                    ) : (
                         <Badge variant={isPendingGrade ? "secondary" : "outline"} className={cn(isPendingGrade && "bg-yellow-500/20 text-yellow-700")}>{test.status}</Badge>
                    )}
                    <div className="flex justify-end gap-2 w-full">
                        {isPendingGrade ? (
                            <Link href={`/education/${test.id}`}>
                                <Button variant="secondary" size="sm">Not Ver</Button>
                            </Link>
                        ) : isCompleted ? (
                             <Link href={`/education/${test.id}`}>
                                <Button variant="secondary" size="sm">Sonuçları Gör</Button>
                            </Link>
                        ) : null}
                        <Link href={`/education/management/questions?edit=${test.id}`}>
                            <Button variant="outline" size="sm"><Edit className="w-3 h-3 mr-1"/>Düzenle</Button>
                        </Link>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm"><Trash2 className="w-3 h-3 mr-1"/>Sil</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Ödevi Sil</AlertDialogTitle>
                                    <AlertDialogDescription>"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(test.id)}>Evet, Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

