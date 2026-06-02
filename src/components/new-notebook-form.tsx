"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';
import { Notebook } from '@/lib/data';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Palette, Type, Edit3, Smile, Lock } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- DESIGN SYSTEM ---
const glassColors = {
    INPUT_BG: "bg-slate-100/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:border-indigo-500/50 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500",
};

const notebookColors = [
    { id: 'red', class: 'from-red-500 to-rose-600', name: 'Gül' },
    { id: 'orange', class: 'from-orange-500 to-amber-600', name: 'Kehribar' },
    { id: 'green', class: 'from-emerald-500 to-teal-600', name: 'Zümrüt' },
    { id: 'teal', class: 'from-cyan-500 to-blue-500', name: 'Turkuaz' },
    { id: 'blue', class: 'from-blue-600 to-indigo-600', name: 'Okyanus' },
    { id: 'purple', class: 'from-violet-600 to-purple-600', name: 'Menekşe' },
    { id: 'pink', class: 'from-fuchsia-600 to-pink-600', name: 'Fuşya' },
    { id: 'gray', class: 'from-slate-600 to-slate-800', name: 'Füme' },
];

const formSchema = z.object({
  title: z.string().min(2, 'Defter adı en az 2 karakter olmalıdır.'),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  password: z.string().optional(),
});

type NewNotebookFormProps = {
    onSubmit: (data: Omit<Notebook, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => void;
    initialData?: Notebook | null;
    availableFolders?: Notebook[];
    currentFolderId?: string | null;
}

export function NewNotebookForm({ onSubmit, initialData, availableFolders, currentFolderId }: NewNotebookFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      color: initialData?.color || notebookColors[0].class,
      icon: initialData?.icon || '🗒️',
      parentId: initialData?.parentId || currentFolderId || 'root',
      password: initialData?.password || ''
    },
  });
  
   useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        color: initialData.color || notebookColors[0].class,
        icon: initialData.icon || '🗒️',
        parentId: initialData.parentId || currentFolderId || 'root',
        password: initialData.password || ''
      });
    } else {
        form.reset({
            title: '',
            description: '',
            color: notebookColors[0].class,
            icon: '🗒️',
            parentId: currentFolderId || 'root',
            password: ''
        })
    }
  }, [initialData, form, currentFolderId]);

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const notebookData = {
        ...values,
        sections: initialData?.sections || [], 
    };
    try {
      onSubmit(notebookData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-xl text-slate-900 dark:text-slate-100">{initialData ? "Klasörü Düzenle" : "Yeni Klasör"}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Notlarınızı düzenlemek için bir klasör oluşturun.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col flex-1">
            <div className="px-6 py-6 space-y-6 flex-1 overflow-y-auto">
                
                {availableFolders && availableFolders.length > 0 && (
                    <FormField name="parentId" control={form.control} render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 dark:text-slate-300 font-bold ml-1">Bulunduğu Klasör (Taşı)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={glassColors.INPUT_BG}>
                                        <SelectValue placeholder="Klasör seçin" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[100]">
                                    <SelectItem value="root" className="font-bold">Ana Dizin</SelectItem>
                                    {availableFolders.filter(f => f.id !== initialData?.id).map(nb => (
                                        <SelectItem key={nb.id} value={nb.id} className="font-medium">{nb.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}/>
                )}

                {/* Title & Icon Row */}
                <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem className="w-24 shrink-0">
                          <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Smile className="w-4 h-4"/> İkon</FormLabel>
                          <FormControl>
                              <div className="relative">
                                  <Input 
                                    placeholder="🗒️" 
                                    maxLength={2} 
                                    {...field} 
                                    className={cn("text-center text-2xl h-12 rounded-xl", glassColors.INPUT_BG)} 
                                  />
                              </div>
                          </FormControl>
                          <FormMessage className="text-rose-400" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Type className="w-4 h-4"/> Klasör Adı</FormLabel>
                          <FormControl>
                              <Input placeholder="Proje Notları" {...field} className={cn("h-12 rounded-xl", glassColors.INPUT_BG)} />
                          </FormControl>
                          <FormMessage className="text-rose-400" />
                        </FormItem>
                      )}
                    />
                </div>
                {form.watch('parentId') === 'root' && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Lock className="w-4 h-4"/> Şifre (İsteğe Bağlı)</FormLabel>
                          <FormControl>
                              <Input type="password" autoComplete="new-password" placeholder="Bu ana klasörü kilitlemek için şifre belirleyin..." {...field} className={cn("h-12 rounded-xl", glassColors.INPUT_BG)} />
                          </FormControl>
                          <FormMessage className="text-rose-400" />
                        </FormItem>
                      )}
                    />
                )}


                <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Palette className="w-4 h-4"/> Renk Teması</FormLabel>
                            <FormControl>
                                <div className="grid grid-cols-4 gap-3">
                                    {notebookColors.map(color => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            className={cn(
                                                "h-10 rounded-lg bg-gradient-to-br transition-all hover:scale-105 hover:shadow-lg", 
                                                color.class,
                                                field.value === color.class ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105" : "opacity-80 hover:opacity-100"
                                            )}
                                            onClick={() => field.onChange(color.class)}
                                            aria-label={color.name}
                                        />
                                    ))}
                                </div>
                            </FormControl>
                            <FormMessage className="text-rose-400" />
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm">
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Değişiklikleri Kaydet" : "Klasörü Oluştur"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
    </div>
  );
}