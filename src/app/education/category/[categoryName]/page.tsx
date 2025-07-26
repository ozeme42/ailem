
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { compareDesc } from 'date-fns';
import Link from 'next/link';

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const categoryName = decodeURIComponent(params.categoryName as string);
  const studentId = searchParams.get('studentId');

  const { familyMembers } = useAuth();
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [loading, setLoading] = React.useState(true);

  const student = React.useMemo(() => 
    familyMembers.find(m => m.id === studentId),
  [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    const unsubscribe = onTestsUpdate((tests) => {
      setAllTests(tests.filter(t => t.studentId === studentId));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [studentId]);

  const filteredTests = React.useMemo(() => {
    const getCategoryName = (test: Test): string => {
      if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
      if (test.subject) return test.subject;
      return 'Diğer';
    };
    
    return allTests
      .filter(test => getCategoryName(test) === categoryName)
      .sort((a, b) => compareDesc(new Date(a.assignedDate), new Date(b.assignedDate)));
  }, [allTests, categoryName]);

  const getStatusBadge = (status: Test['status']) => {
    switch (status) {
      case 'Atandı':
        return <Badge variant="secondary">Atandı</Badge>;
      case 'Çözüldü':
        return <Badge variant="outline" className="text-blue-600 border-blue-500/50">Çözüldü</Badge>;
      case 'Değerlendirildi':
        return <Badge className="bg-green-600 hover:bg-green-700">Değerlendirildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!student) {
    return <div className="text-center p-8">Öğrenci bulunamadı.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${student.name} - ${categoryName}`}>
        <Button onClick={() => router.back()} variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>

      {filteredTests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <Card key={test.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    {getStatusBadge(test.status)}
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                    <BookOpen className="h-4 w-4"/> {test.questionCount} Soru
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 {test.status === 'Değerlendirildi' && (
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/50">
                            <p className="font-bold text-green-700 dark:text-green-400">{test.correctAnswers}</p>
                            <p className="text-xs">Doğru</p>
                        </div>
                        <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/50">
                            <p className="font-bold text-red-700 dark:text-red-400">{test.incorrectAnswers}</p>
                            <p className="text-xs">Yanlış</p>
                        </div>
                         <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-700/50">
                            <p className="font-bold">{test.emptyAnswers}</p>
                            <p className="text-xs">Boş</p>
                        </div>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3"/>
                    <span>Son Teslim: {test.dueDate}</span>
                 </div>
                <Link href={`/education/${test.id}`} passHref>
                  <Button size="sm">
                    {test.status === 'Atandı' ? 'Teste Başla' : 'Sonucu Gör'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Bu kategoride atanmış test bulunmuyor.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

