
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { FamilyMember } from '@/lib/data';

const formSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır.'),
  role: z.enum(['Anne', 'Baba', 'Kız Çocuk', 'Erkek Çocuk', 'Bebek'], { required_error: 'Lütfen bir rol seçin.' }),
});

const roleBasedAvatars: Record<string, string> = {
    Baba: '/avatars/dad.png',
    Anne: '/avatars/mom.png',
    'Erkek Çocuk': '/avatars/boy.png',
    'Kız Çocuk': '/avatars/girl.png',
    Bebek: '/avatars/baby.png',
}

const roleBasedColors: Record<string, string> = {
    Baba: '#3B82F6',
    Anne: '#EC4899',
    'Kız Çocuk': '#8B5CF6',
    'Erkek Çocuk': '#14B8A6',
    Bebek: '#F59E0B',
};


export function NewFamilyMemberForm({ onMemberAdded }: { onMemberAdded: () => void }) {
  const { addFamilyMember } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const newMember: Omit<FamilyMember, 'id'> = {
            name: values.name,
            role: values.role,
            avatar: roleBasedAvatars[values.role] || 'https://placehold.co/64x64.png',
            color: roleBasedColors[values.role] || '#6b7280',
            completedTasks: 0,
            level: 1,
            xp: 0,
            streak: 0,
            badges: [],
            mood: 'happy',
            status: 'online',
        };
        await addFamilyMember(newMember);
        toast({ title: 'Üye Eklendi!', description: `${values.name} aileye katıldı.` });
        onMemberAdded();
    } catch (err: any) {
        toast({ title: 'Hata', description: 'Üye eklenirken bir sorun oluştu.', variant: 'destructive' });
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İsim</FormLabel>
              <FormControl>
                <Input placeholder="Üyenin adı" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Bir rol seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Baba">Baba</SelectItem>
                  <SelectItem value="Anne">Anne</SelectItem>
                  <SelectItem value="Erkek Çocuk">Erkek Çocuk</SelectItem>
                  <SelectItem value="Kız Çocuk">Kız Çocuk</SelectItem>
                  <SelectItem value="Bebek">Bebek</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Aileye Ekle
        </Button>
      </form>
    </Form>
  );
}
