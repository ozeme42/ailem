
"use client";

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { onPrayersUpdate } from '@/lib/dataService';
import type { PrayerContent } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, Moon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


const PrayerContentDisplay = ({ title, arabicText, turkishText, meaning, audioUrl }: Omit<PrayerContent, 'id' | 'familyId' | 'category' | 'order'>) => {
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const playAudio = () => {
        if (audioUrl) {
            if (audioRef.current) {
                // If an audio is already playing, pause it before starting the new one.
                if (!audioRef.current.paused) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }
            audioRef.current = new Audio(audioUrl);
            audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        }
    };

    return (
        <Card className="shadow-lg h-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-3xl">{title}</CardTitle>
                    {audioUrl && (
                        <Button variant="outline" size="icon" onClick={playAudio} className="rounded-full h-12 w-12">
                            <Volume2 className="h-6 w-6" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="font-semibold text-xl mb-2 text-primary">Arapça Okunuşu</h3>
                    <p className="text-3xl leading-relaxed text-right font-serif" dir="rtl">{arabicText}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-xl mb-2 text-primary">Türkçe Okunuşu</h3>
                    <p className="text-lg leading-relaxed">{turkishText}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-xl mb-2 text-primary">Anlamı</h3>
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
            const sortedData = data.sort((a,b) => a.order - b.order);
            setPrayers(sortedData);
            if (sortedData.length > 0 && !selectedContent) {
                 setSelectedContent(sortedData[0]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, selectedContent]);

    const groupedPrayers = React.useMemo(() => {
        const groups: { [key: string]: PrayerContent[] } = {
            'Namaz Sureleri': [],
            'Namaz Duaları': [],
        };
        prayers.forEach(p => {
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
                         <CardContent className="space-y-4">
                            {Object.entries(groupedPrayers).map(([category, items]) => (
                                <div key={category}>
                                    <h3 className="font-semibold text-lg mb-2 px-2 text-muted-foreground">{category}</h3>
                                    <div className="flex flex-col">
                                        {items.map(item => (
                                            <Button 
                                                key={item.id} 
                                                variant={selectedContent?.id === item.id ? 'default' : 'ghost'}
                                                className="w-full justify-start text-base h-12"
                                                onClick={() => setSelectedContent(item)}
                                            >
                                                {item.title}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
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
                         <Card className="h-full flex items-center justify-center min-h-[500px]">
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
                            <Skeleton className="h-6 w-1/2 mb-2" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-6 w-1/2 mt-4 mb-2" />
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
