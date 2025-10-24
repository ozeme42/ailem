
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { NewTestForm } from "@/components/new-test-form";
import { BankQuestion, Test, FamilyMember } from "@/lib/data";
import {
  onBankQuestionsUpdate,
  onSubjectsUpdate,
  updateSubjects,
  onTopicsUpdate,
  updateTopics,
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

    const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    const [availableTopics, setAvailableTopics] = React.useState<string[]>([]);
    const [initialData, setInitialData] = React.useState<Test | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

     React.useEffect(() => {
        const unsubBankQuestions = onBankQuestionsUpdate(setBankQuestions);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
        const unsubTopics = onTopicsUpdate(setAvailableTopics);

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
            unsubBankQuestions();
            unsubSubjects();
            unsubTopics();
        };
    }, [editTestId]);


    const handleCreateSubject = async (subjectName: string) => {
        const newSubjects = [...new Set([...availableSubjects, subjectName])];
        await updateSubjects(newSubjects);
    };
    
    const handleCreateTopic = async (topicName: string) => {
        const newTopics = [...new Set([...availableTopics, topicName])];
        await updateTopics(newTopics);
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
        <div className="mt-6 max-w-4xl mx-auto">
             <NewTestForm 
                students={studentMembers} 
                bankQuestions={bankQuestions}
                onAssign={handleAssignmentSubmit}
                initialData={initialData}
                availableSubjects={availableSubjects}
                onSubjectCreated={handleCreateSubject}
                availableTopics={availableTopics}
                onTopicCreated={handleCreateTopic}
            />
        </div>
    );
}
