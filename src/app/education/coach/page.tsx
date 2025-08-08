
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Paperclip, Send, Sparkles, User, ArrowRight, X, ImageUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { educationCoachFlow, analyzeQuestionImage } from '@/ai/flows/education-coach-flow';
import type { FamilyMember, CoachMessage } from "@/lib/data";

// New component for the image analysis section
const ImageAnalysisInterface = ({ onAnalysisComplete, activeUser }: { onAnalysisComplete: (result: string, imageUrl: string) => void, activeUser: FamilyMember }) => {
    const [imageUri, setImageUri] = React.useState<string | null>(null);
    const [questionText, setQuestionText] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUri(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!imageUri) return;
        setIsLoading(true);
        try {
            const result = await analyzeQuestionImage({
                photoDataUri: imageUri,
                studentQuery: questionText,
            });
            onAnalysisComplete(result, imageUri);
        } catch (error) {
            console.error("Image analysis error:", error);
            toast({
                title: "❌ Bir Hata Oluştu",
                description: "Görsel analiz edilirken bir sorun oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <CardTitle>Görsel Soru Çözümü</CardTitle>
            <CardDescription>Çözemediğin sorunun fotoğrafını yükle, yapay zeka koçu sana adım adım açıklasın.</CardDescription>
            
            <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            
            {imageUri ? (
                <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                    <Image src={imageUri} alt="Yüklenen soru" layout="fill" objectFit="contain" data-ai-hint="question paper" />
                    <button className="absolute top-2 right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center" onClick={() => setImageUri(null)}>
                        <X className="h-4 w-4"/>
                    </button>
                </div>
            ) : (
                <Button variant="outline" className="w-full h-32" onClick={() => fileInputRef.current?.click()}>
                    <ImageUp className="mr-2 h-5 w-5"/> Fotoğraf Yükle
                </Button>
            )}

            <Input 
                placeholder="Soruyla ilgili eklemek istediğin bir not var mı? (İsteğe bağlı)"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={!imageUri || isLoading}
            />
            <Button onClick={handleAnalyze} disabled={!imageUri || isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Sparkles className="mr-2 h-5 w-5" />}
                Analiz Et ve Çöz
            </Button>
        </div>
    )
}


const ChatInterface = ({ activeUser }: { activeUser: FamilyMember }) => {
    const [messages, setMessages] = React.useState<CoachMessage[]>([]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const [isImageAnalyzerOpen, setIsImageAnalyzerOpen] = React.useState(false);


    React.useEffect(() => {
        setMessages([
            {
                role: 'model',
                content: [{ text: `Merhaba ${activeUser?.name}! Ben senin kişisel yapay zeka eğitim koçunum. Derslerinde sana nasıl yardımcı olabilirim? Bir konuyu anlatmamı veya çözemediğin bir soruyu çözmemi isteyebilirsin.` }],
            },
        ]);
    }, [activeUser?.name]);

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollViewport = scrollAreaRef.current.querySelector('div');
            if (scrollViewport) {
                scrollViewport.scrollTo({ top: scrollViewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: CoachMessage = {
            role: 'user',
            content: [{ text: input.trim() }],
        };

        const newHistory = [...messages, userMessage];
        setMessages(newHistory);
        setIsLoading(true);
        setInput('');

        try {
            // The history needs to be plain objects for the server action.
            const plainHistory = JSON.parse(JSON.stringify(newHistory));
            const result = await educationCoachFlow(plainHistory);
            
            const modelMessage: CoachMessage = {
              role: 'model',
              content: [{ text: result }],
            };
            setMessages(prev => [...prev, modelMessage]);

        } catch (error) {
            console.error("AI chat error:", error);
            toast({
                title: "❌ Bir Hata Oluştu",
                description: "Yapay zeka ile iletişim kurulamadı. Lütfen tekrar deneyin.",
                variant: "destructive",
            });
             setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnalysisResult = (result: string, imageUrl: string) => {
        const userMessage: CoachMessage = {
            role: 'user',
            content: [{ text: "Bu soruyu çözebilir misin?", media: { url: imageUrl } }],
        };
        const modelMessage: CoachMessage = {
            role: 'model',
            content: [{ text: result }],
        };
        setMessages(prev => [...prev, userMessage, modelMessage]);
        setIsImageAnalyzerOpen(false);
    }

    return (
        <Card className="flex-grow flex flex-col mt-4">
            <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className={cn("flex items-start gap-3 my-4", message.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                            {message.role === 'model' && (
                                <Avatar className="w-8 h-8 bg-primary text-primary-foreground">
                                    <AvatarFallback><Sparkles className="w-5 h-5"/></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn("max-w-md p-3 rounded-lg", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                {message.content.map((part, partIndex) => (
                                    <div key={partIndex}>
                                        {part.media && <Image src={part.media.url} alt="Uploaded content" width={300} height={200} className="rounded-md mb-2" data-ai-hint="question paper"/>}
                                        {part.text && <p className="whitespace-pre-wrap">{part.text}</p>}
                                    </div>
                                ))}
                            </div>
                                {message.role === 'user' && (
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback style={{backgroundColor: activeUser?.color}} className="text-white font-bold">{activeUser?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3 my-4 justify-start"
                        >
                             <Avatar className="w-8 h-8 bg-primary text-primary-foreground">
                                <AvatarFallback><Sparkles className="w-5 h-5"/></AvatarFallback>
                            </Avatar>
                            <div className="max-w-md p-3 rounded-lg bg-muted flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin"/>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ScrollArea>
            <CardContent className="p-4 border-t">
                 {isImageAnalyzerOpen ? (
                    <ImageAnalysisInterface onAnalysisComplete={handleAnalysisResult} activeUser={activeUser} />
                 ) : (
                    <div className="flex items-center gap-2">
                        <Input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Bir soru sor veya konu anlatmamı iste..."
                            disabled={isLoading}
                        />
                        <Button variant="outline" size="icon" onClick={() => setIsImageAnalyzerOpen(true)} disabled={isLoading}>
                            <Paperclip className="h-5 w-5"/>
                        </Button>
                        <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
                        </Button>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}

export default function EducationCoachPage() {
    const { user, familyMembers } = useAuth();
    const [activeStudent, setActiveStudent] = React.useState<FamilyMember | null>(null);

    const currentUserMember = React.useMemo(() => 
        familyMembers.find(m => m.id === user?.uid),
    [user, familyMembers]);

    React.useEffect(() => {
        if (currentUserMember && !currentUserMember.role.includes('Çocuk')) {
            // Parent view, do nothing initially, let them select
        } else if (currentUserMember) {
            // It's a student, set them as active
            setActiveStudent(currentUserMember);
        }
    }, [currentUserMember]);

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')),
    [familyMembers]);

    if (!currentUserMember) {
        return <div>Kullanıcı bilgileri yükleniyor...</div>;
    }

    if (activeStudent) {
        return (
            <div className="h-full flex flex-col">
                <PageHeader title={`${activeStudent.name} için Eğitim Koçu`} />
                <ChatInterface activeUser={activeStudent} />
            </div>
        );
    }
    
    // If no student is active, it must be a parent. Show student selection screen.
    return (
         <div className="h-full flex flex-col">
            <PageHeader title="Yapay Zeka Eğitim Koçu" />
            <div className="flex-grow flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Öğrenci Seçimi</CardTitle>
                        <CardDescription>Yapay zeka koçunu kullanmak için lütfen bir öğrenci seçin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {studentMembers.length > 0 ? (
                            studentMembers.map(student => (
                                <button 
                                    key={student.id} 
                                    className="w-full p-4 border rounded-lg flex items-center justify-between hover:bg-muted transition-colors"
                                    onClick={() => setActiveStudent(student)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback style={{backgroundColor: student.color}} className="text-white font-bold">{student.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-semibold">{student.name}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground p-4">Sistemde kayıtlı öğrenci bulunmamaktadır.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
         </div>
    )
}
