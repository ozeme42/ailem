
"use client";

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { onPrayersUpdate, updatePrayerContent } from '@/lib/dataService';
import type { PrayerContent } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Volume2, Moon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PrayerContentDisplay = ({ title, arabicText, turkishText, meaning, audioUrl }: Omit<PrayerContent, 'id' | 'familyId' | 'category' | 'order'>) => {
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const playAudio = () => {
        if (audioUrl) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(audioUrl);
            audioRef.current.play();
        }
    };

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    {audioUrl && (
                        <Button variant="outline" size="icon" onClick={playAudio}>
                            <Volume2 className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary">Arapça Okunuşu</h3>
                    <p className="text-2xl leading-loose text-right font-serif" dir="rtl">{arabicText}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary">Türkçe Okunuşu</h3>
                    <p className="text-lg leading-relaxed">{turkishText}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary">Anlamı</h3>
                    <p className="text-lg leading-relaxed italic text-muted-foreground">{meaning}</p>
                </div>
            </CardContent>
        </Card>
    )
};


export default function PrayersPage() {
    const { user } = useAuth();
    const [prayers, setPrayers] = React.useState<PrayerContent[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedContent, setSelectedContent] = React.useState<PrayerContent | null>(null);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onPrayersUpdate(data => {
            setPrayers(data);
            if (data.length > 0 && !selectedContent) {
                 setSelectedContent(data.sort((a,b) => a.order - b.order)[0]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, selectedContent]);

    const groupedPrayers = React.useMemo(() => {
        const groups: { [key: string]: PrayerContent[] } = {
            'Namaz Sureleri': [],
            'Namaz Duaları': [],
            'Günlük Dualar': [],
        };
        prayers.sort((a,b) => a.order - b.order).forEach(p => {
            if (groups[p.category]) {
                groups[p.category].push(p);
            }
        });
        return groups;
    }, [prayers]);
    
    if (loading) {
        return <PrayersPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Dualar & Sureler" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>İçindekiler</CardTitle>
                        </CardHeader>
                         <CardContent>
                             <Accordion type="multiple" defaultValue={Object.keys(groupedPrayers)} className="w-full">
                                {Object.entries(groupedPrayers).map(([category, items]) => (
                                    <AccordionItem key={category} value={category}>
                                        <AccordionTrigger>{category}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="flex flex-col items-start">
                                                {items.map(item => (
                                                    <Button 
                                                        key={item.id} 
                                                        variant="ghost" 
                                                        className="w-full justify-start"
                                                        onClick={() => setSelectedContent(item)}
                                                        disabled={selectedContent?.id === item.id}
                                                    >
                                                        {item.title}
                                                    </Button>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                         </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    {selectedContent ? (
                        <PrayerContentDisplay 
                            title={selectedContent.title}
                            arabicText={selectedContent.arabicText}
                            turkishText={selectedContent.turkishText}
                            meaning={selectedContent.meaning}
                            audioUrl={selectedContent.audioUrl}
                        />
                    ) : (
                         <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center p-8">
                                <Moon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">Listeden bir sure veya dua seçin.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}


function PrayersPageSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="Dualar & Sureler" />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                     <Card>
                         <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                         <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                         </CardContent>
                     </Card>
                </div>
                <div className="md:col-span-2">
                     <Card>
                        <CardHeader><Skeleton className="h-10 w-1/2" /></CardHeader>
                        <CardContent className="space-y-8">
                            <div>
                                <Skeleton className="h-6 w-1/3 mb-4" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                             <div>
                                <Skeleton className="h-6 w-1/3 mb-4" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                             <div>
                                <Skeleton className="h-6 w-1/3 mb-4" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </CardContent>
                     </Card>
                </div>
            </div>
        </div>
    )
}

    