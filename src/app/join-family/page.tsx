
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function JoinFamilyPage() {
    const { user, createFamilyAndAddMember, joinFamilyWithId } = useAuth();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // State for creating a family
    const [creatorName, setCreatorName] = useState(user?.name || '');
    const [creatorRole, setCreatorRole] = useState<'Anne' | 'Baba' | ''>('');

    // State for joining a family
    const [familyId, setFamilyId] = useState('');
    const [joinerName, setJoinerName] = useState(user?.name || '');
    const [joinerRole, setJoinerRole] = useState<'Anne' | 'Baba' | 'Kız Çocuk' | 'Erkek Çocuk' | 'Bebek' | ''>('');

    const handleCreateFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!creatorName || !creatorRole) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen adınızı ve rolünüzü girin.' });
            return;
        }
        setLoading(true);
        try {
            await createFamilyAndAddMember(creatorName, creatorRole);
            toast({ title: 'Aile Oluşturuldu!', description: 'Aile asistanınıza hoş geldiniz!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!familyId || !joinerName || !joinerRole) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen tüm alanları doldurun.' });
            return;
        }
        setLoading(true);
        try {
            await joinFamilyWithId(familyId.trim(), joinerName, joinerRole as any);
            toast({ title: 'Aileye Katıldınız!', description: 'Aile asistanınıza hoş geldiniz!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Aileye Katılın veya Oluşturun</CardTitle>
                    <CardDescription>
                        Hoş geldin, {user.name}! Başlamak için yeni bir aile alanı oluşturun veya mevcut bir aileye katılın.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="create" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="create">Yeni Aile Oluştur</TabsTrigger>
                            <TabsTrigger value="join">Aileye Katıl</TabsTrigger>
                        </TabsList>
                        <TabsContent value="create" className="pt-4">
                            <form onSubmit={handleCreateFamily} className="space-y-4">
                                <div>
                                    <Label htmlFor="creator-name">Adınız</Label>
                                    <Input
                                        id="creator-name"
                                        value={creatorName}
                                        onChange={(e) => setCreatorName(e.target.value)}
                                        placeholder="Adınızı girin"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Rolünüz (Kurucu)</Label>
                                    <Select required onValueChange={(value) => setCreatorRole(value as any)} value={creatorRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Rolünüzü seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Anne">Anne</SelectItem>
                                            <SelectItem value="Baba">Baba</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Aile Oluştur'}
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="join" className="pt-4">
                             <form onSubmit={handleJoinFamily} className="space-y-4">
                                <div>
                                    <Label htmlFor="family-id">Aile ID'si</Label>
                                    <Input
                                        id="family-id"
                                        value={familyId}
                                        onChange={(e) => setFamilyId(e.target.value)}
                                        placeholder="Aile kurucusundan aldığınız kodu girin"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="joiner-name">Adınız</Label>
                                    <Input
                                        id="joiner-name"
                                        value={joinerName}
                                        onChange={(e) => setJoinerName(e.target.value)}
                                        placeholder="Adınızı girin"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Rolünüz</Label>
                                    <Select required onValueChange={(value) => setJoinerRole(value as any)} value={joinerRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Rolünüzü seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Anne">Anne</SelectItem>
                                            <SelectItem value="Baba">Baba</SelectItem>
                                            <SelectItem value="Kız Çocuk">Kız Çocuk</SelectItem>
                                            <SelectItem value="Erkek Çocuk">Erkek Çocuk</SelectItem>
                                            <SelectItem value="Bebek">Bebek</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Alert>
                                    <AlertDescription>
                                        Aileye katılmak için aile kurucusunun size verdiği özel Aile ID'sini girmeniz gerekir.
                                    </AlertDescription>
                                </Alert>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Aileye Katıl'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
