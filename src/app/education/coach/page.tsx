
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Paperclip, Send, Sparkles, User, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { runCoach } from '@/ai/flows/education-coach-flow';
import type { FamilyMember, CoachMessage } from "@/lib/data";

const ChatInterface = ({ activeUser }: { activeUser: FamilyMember }) => {
    const [messages, setMessages] = React.useState<CoachMessage[]>([]);
    const [input, setInput] = React.useState('');
    const [imageUri, setImageUri] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);


    React.useEffect(() => {
        setMessages([
            {
                role: 'model',
                content: [{ text: `Merhaba ${activeUser?.name}! Ben senin kişisel yapay zeka eğitim koçunum. Derslerinde sana nasıl yardımcı olabilirim? Bir konuyu anlatmamı veya çözemediğin bir soruyu çözmemi isteyebilirsin.` }],
            },
        ]);
    }, [activeUser?.name]);

    React.useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollAreaRef.current) {
            const scrollViewport = scrollAreaRef.current.querySelector('div');
            if (scrollViewport) {
                scrollViewport.scrollTo({ top: scrollViewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if ((!input.trim() && !imageUri) || isLoading) return;

        const contentParts = [];
        if (input.trim()) {
            contentParts.push({ text: input.trim() });
        }
        if (imageUri) {
            contentParts.push({ media: { url: imageUri } });
        }

        const userMessage: CoachMessage = {
            role: 'user',
            content: contentParts,
        };

        const newHistory = [...messages, userMessage];
        setMessages(newHistory);
        setIsLoading(true);
        setInput('');
        setImageUri(null);

        try {
            // Remove any tool messages from history sent to AI
            const historyForAi = newHistory.filter(m => m.role !== 'tool'); 
            
            const stream = await runCoach(historyForAi);
            
            let responseStarted = false;
            setMessages(prev => [...prev, { role: 'model', content: [{ text: '' }] }]);

            for await (const chunk of stream) {
                responseStarted = true;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'model') {
                        lastMessage.content[0].text += chunk;
                    }
                    return newMessages;
                });
            }

            if (!responseStarted) { // Handle non-streaming results (like image analysis)
                 setMessages(prev => prev.slice(0, -1)); // remove empty model message
                 setMessages(prev => [...prev, { role: 'model', content: [{ text: "İşte sorunun çözümü..." }] }]);
            }
        } catch (error) {
            console.error("AI chat error:", error);
            toast({
                title: "❌ Bir Hata Oluştu",
                description: "Yapay zeka ile iletişim kurulamadı. Lütfen tekrar deneyin.",
                variant: "destructive",
            });
             setMessages(prev => prev.filter(m => m.id !== userMessage.id)); // Remove user message on error
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUri(reader.result as string);
                toast({
                    title: "🖼️ Resim Eklendi",
                    description: "Soru fotoğrafı mesaja eklendi. Göndermek için butona basın.",
                });
            };
            reader.readAsDataURL(file);
        }
    };

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
                {imageUri && (
                        <div className="relative w-24 h-24 mb-2 rounded-md overflow-hidden border">
                        <Image src={imageUri} alt="Preview" layout="fill" objectFit="cover" data-ai-hint="question paper" />
                        <button className="absolute top-1 right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center" onClick={() => setImageUri(null)}>
                            <X className="h-4 w-4"/>
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Bir soru sor veya konu anlatmamı iste..."
                        disabled={isLoading}
                    />
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                        <Paperclip className="h-5 w-5"/>
                    </Button>
                    <Button onClick={handleSendMessage} disabled={isLoading || (!input.trim() && !imageUri)}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
                    </Button>
                </div>
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
