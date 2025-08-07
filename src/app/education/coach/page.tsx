
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Paperclip, Send, Sparkles, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { runCoach, type CoachMessage } from '@/ai/flows/education-coach-flow';

export default function EducationCoachPage() {
    const { user, familyMembers } = useAuth();
    const [messages, setMessages] = React.useState<CoachMessage[]>([]);
    const [input, setInput] = React.useState('');
    const [imageUri, setImageUri] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Load initial greeting message
    React.useEffect(() => {
        setMessages([
            {
                role: 'model',
                content: [{ text: `Merhaba ${user?.name}! Ben senin kişisel yapay zeka eğitim koçunum. Derslerinde sana nasıl yardımcı olabilirim? Bir konuyu anlatmamı veya çözemediğin bir soruyu çözmemi isteyebilirsin.` }],
            },
        ]);
    }, [user?.name]);

    const handleSendMessage = async () => {
        if ((!input.trim() && !imageUri) || isLoading) return;

        const userMessage: CoachMessage = {
            role: 'user',
            content: [{ text: input.trim(),...(imageUri && { media: { url: imageUri } }) }],
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setInput('');
        setImageUri(null);

        try {
            const history = messages.filter(m => m.role !== 'tool');
            const stream = await runCoach(history, userMessage);
            let responseStarted = false;

            for await (const chunk of stream) {
                if (!responseStarted) {
                    setMessages(prev => [...prev, { role: 'model', content: [{ text: '' }] }]);
                    responseStarted = true;
                }
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'model') {
                        lastMessage.content[0].text += chunk;
                    }
                    return newMessages;
                });
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
        <div className="h-full flex flex-col">
            <PageHeader title="Yapay Zeka Eğitim Koçu" />
            <Card className="flex-grow flex flex-col mt-4">
                <ScrollArea className="flex-grow p-4 space-y-4">
                    <AnimatePresence>
                        {messages.map((message, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}
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
                                       <AvatarFallback style={{backgroundColor: user?.color}} className="text-white font-bold">{user?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </ScrollArea>
                <CardContent className="p-4 border-t">
                    {imageUri && (
                         <div className="relative w-24 h-24 mb-2 rounded-md overflow-hidden border">
                            <Image src={imageUri} alt="Preview" layout="fill" objectFit="cover" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setImageUri(null)}>
                                <X className="h-4 w-4"/>
                            </Button>
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
        </div>
    );
}
