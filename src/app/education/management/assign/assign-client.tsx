
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { NewTestForm } from "@/components/new-test-form";
import { QuestionBank, Test, PracticeExam, FamilyMember } from "@/lib/data";
import {
  onQuestionBanksUpdate,
  onPracticeExamsUpdate,
  onSubjectsUpdate,
  updateSubjects,
  addTest,
  updateTest,
  onTestsUpdate,
} from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AssignClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editTestId = searchParams.get('edit');
    const { toast } = useToast();
    const { familyMembers } = useAuth();

    const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    const [initialData, setInitialData] = React.useState<Test | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

     React.useEffect(() => {
        const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);

        const fetchInitialData = async () => {
            if (editTestId) {
                const testDoc = await getDoc(doc(db, 'tests', editTestId));
                if (testDoc.exists()) {
                    setInitialData({ id: testDoc.id, ...testDoc.data() } as Test);
                }
            }
            setIsLoading(false);
        }

        fetchInitialData();
        
        return () => {
            unsubBanks();
            unsubExams();
            unsubSubjects();
        };
    }, [editTestId]);


    const handleCreateSubject = async (subjectName: string) => {
        const newSubjects = [...new Set([...availableSubjects, subjectName])];
        await updateSubjects(newSubjects);
    };

    const handleAssignmentSubmit = async (testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => {
        try {
            if (id) {
                await updateTest(id, testData);
                toast({ title: "✅ Ödev Güncellendi", description: "Ödev bilgileri başarıyla güncellendi." });
            } else {
                await addTest({ ...testData, status: 'Atandı', isArchived: false });
                toast({ title: "✅ Ödev Atandı", description: "Yeni ödev başarıyla öğrenciye atandı." });
            }
            router.push('/education/management');
        } catch (error) {
             toast({ title: "❌ Kaydetme Hatası", description: "Ödev kaydedilirken bir hata oluştu.", variant: 'destructive'});
        }
    };
    
    if(isLoading && editTestId) {
        return <div>Yükleniyor...</div>;
    }

    return (
        <div className="mt-6 max-w-xl mx-auto">
             <NewTestForm 
                students={studentMembers} 
                questionBanks={questionBanks}
                practiceExams={practiceExams}
                onAssign={handleAssignmentSubmit}
                initialData={initialData}
                availableSubjects={availableSubjects}
                onSubjectCreated={handleCreateSubject}
            />
        </div>
    );
}

