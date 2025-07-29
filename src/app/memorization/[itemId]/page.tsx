
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { MemorizationItem } from "@/lib/data";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateMemorizationItem } from "@/lib/dataService";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MemorizationItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const itemId = params.itemId as string;

    const [item, setItem] = React.useState<MemorizationItem | null>(null);
    const [content, setContent] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (!itemId) return;

        const docRef = doc(db, "memorizationItems", itemId);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = { id: doc.id, ...doc.data() } as MemorizationItem;
                setItem(data);
                setContent(data.content || "");
            } else {
                setItem(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [itemId]);

    const handleSave = async () => {
        if (!item) return;
        setIsSaving(true);
        try {
            await updateMemorizationItem(item.id, { content });
            toast({
                title: "✅ Kaydedildi!",
                description: `"${item.title}" içeriği başarıyla güncellendi.`,
            });
        } catch (error) {
            toast({
                title: "❌ Hata",
                description: "İçerik kaydedilirken bir sorun oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <DetailPageSkeleton />;
    }

    if (!item) {
        return (
            <div className="text-center p-8">
                <p>Ezberlenecek öğe bulunamadı.</p>
                <Button onClick={() => router.back()} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </div>
        );
    }
    
    const isContentChanged = content !== (item.content || "");

    return (
        <div className="h-full flex flex-col">
            <PageHeader title={item.title}>
                 <Button onClick={() => router.back()} variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !isContentChanged}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
            </PageHeader>

             <div className="flex flex-wrap gap-2 px-4 md:px-0 mb-4">
                {item.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
            
            <div className="flex-grow min-h-0">
                <Textarea
                    placeholder="Ezberlenecek metni buraya yazın..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="h-full min-h-[50vh] text-lg leading-relaxed p-4 bg-background resize-none border-border"
                />
            </div>
        </div>
    );
}

function DetailPageSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="...">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </PageHeader>
            <div className="px-4 md:px-0">
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
    )
}
