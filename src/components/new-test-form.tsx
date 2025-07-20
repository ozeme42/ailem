
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Student, QuestionBank, PracticeExam } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const quickTestSchema = z.object({
  title: z.string().min(5, { message: "Başlık en az 5 karakter olmalıdır." }),
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  subject: z.string({ required_error: "Lütfen bir ders seçin." }),
  questionCount: z.coerce.number().min(1, "En az 1 soru olmalı.").max(100, "En fazla 100 soru olabilir."),
});

const questionBankSchema = z.object({
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  bankId: z.string({ required_error: "Lütfen bir soru bankası seçin." }),
  topicId: z.string({ required_error: "Lütfen bir konu seçin." }),
});

const practiceExamSchema = z.object({
    studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
    examId: z.string({ required_error: "Lütfen bir deneme sınavı seçin." }),
});

export type AssignmentType = "quick" | "bank" | "exam";

type NewTestFormProps = {
  students: Student[];
  questionBanks: QuestionBank[];
  practiceExams: PracticeExam[];
};

export function NewTestForm({ students, questionBanks, practiceExams }: NewTestFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<AssignmentType>("quick");
  const [selectedBankId, setSelectedBankId] = React.useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(
      activeTab === 'quick' ? quickTestSchema : 
      activeTab === 'bank' ? questionBankSchema : 
      practiceExamSchema
    ),
    defaultValues: {
      title: "",
      questionCount: 20,
    },
  });

  function onSubmit(values: any) {
    console.log({assignmentType: activeTab, values});
    toast({
      title: "✅ Ödev Başarıyla Atandı!",
      description: `Ödev başarıyla oluşturuldu ve öğrenciye atandı.`,
    });
    // Here you would typically call an API to save the assignment
  }
  
  const selectedBank = questionBanks.find(b => b.id.toString() === selectedBankId);

  return (
    <Tabs defaultValue="quick" onValueChange={(value) => setActiveTab(value as AssignmentType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick">Hızlı Test</TabsTrigger>
            <TabsTrigger value="bank">Soru Bankası</TabsTrigger>
            <TabsTrigger value="exam">Deneme</TabsTrigger>
        </TabsList>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                 <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Öğrenci</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Öğrenci seçin" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {students.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                                {student.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <TabsContent value="quick" className="space-y-4 m-0">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Test Başlığı</FormLabel>
                        <FormControl>
                            <Input placeholder="Örn: 2. Dönem Genel Tekrar" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ders</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Ders seçin" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Matematik">Matematik</SelectItem>
                                    <SelectItem value="Türkçe">Türkçe</SelectItem>
                                    <SelectItem value="Fen Bilimleri">Fen Bilimleri</SelectItem>
                                    <SelectItem value="Sosyal Bilgiler">Sosyal Bilgiler</SelectItem>
                                    <SelectItem value="İngilizce">İngilizce</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="questionCount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Soru Sayısı</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="20" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                </TabsContent>

                <TabsContent value="bank" className="space-y-4 m-0">
                    <FormField
                        control={form.control}
                        name="bankId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Soru Bankası</FormLabel>
                            <Select onValueChange={(value) => { field.onChange(value); setSelectedBankId(value); }} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Soru bankası seçin" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {questionBanks.map((bank) => (
                                <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {selectedBank && (
                        <FormField
                            control={form.control}
                            name="topicId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Konu</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Konu seçin" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {selectedBank.subjects.map(subject => 
                                        subject.topics.map(topic => (
                                            <SelectItem key={topic.id} value={topic.id.toString()}>
                                                {subject.name} - {topic.name} ({topic.questionCount} soru)
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                </TabsContent>

                <TabsContent value="exam" className="space-y-4 m-0">
                     <FormField
                        control={form.control}
                        name="examId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Deneme Sınavı</FormLabel>
                            <Select onValuechange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Deneme seçin" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {practiceExams.map((exam) => (
                                <SelectItem key={exam.id} value={exam.id.toString()}>{exam.name}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormDescription>
                        Seçilen deneme sınavı öğrenciye atanacaktır.
                    </FormDescription>
                </TabsContent>
                
                <Button type="submit" className="w-full">Ödevi Ata</Button>
            </form>
        </Form>
    </Tabs>
  );
}

    