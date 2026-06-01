

"use client";

import * as React from "react";
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle, Edit, X, UploadCloud, ChevronRight, BookPlus, ChevronDown, Settings, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { Combobox } from "./ui/combobox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

// SCHEMAS & TYPES
const bookFormSchema = z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(1, "Sayfa sayısı pozitif bir sayı olmalı.").optional()
  ),
  isForChildren: z.boolean().default(false),
  image: z.string().optional(), // Can be existing URL or new data URI for upload
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  rating: z.number().optional(),
});
export type BookFormData = z.infer<typeof bookFormSchema>;

// BOOK FORM COMPONENT
export const BookForm = ({ existingTags }: { existingTags: string[] }) => {
  const { control, getValues, setValue, watch } = useFormContext<BookFormData>();
  const [newShelfMain, setNewShelfMain] = useState('');
  const [newShelfSub, setNewShelfSub] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const imageValue = watch('image');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('image', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddShelf = () => {
    const main = newShelfMain.trim();
    const sub = newShelfSub.trim();
    if (!main) return;

    const newTag = sub ? `${main}/${sub}` : main;
    
    const currentTagsValue = getValues('tags') || [];
    if (!currentTagsValue.includes(newTag)) {
        setValue('tags', [...currentTagsValue, newTag], { shouldValidate: true });
    }
    setNewShelfMain('');
    setNewShelfSub('');
  };

  const removeTag = (tagToRemove: string) => {
    const currentTagsValue = getValues('tags') || [];
    setValue('tags', currentTagsValue.filter(tag => tag !== tagToRemove), { shouldValidate: true });
  };
  
  const handleToggleTag = (tag: string) => {
    const currentTagsValue = getValues('tags') || [];
    const newTags = currentTagsValue.includes(tag)
        ? currentTagsValue.filter((t) => t !== tag)
        : [...currentTagsValue, tag];
    setValue('tags', newTags, { shouldValidate: true });
  };
  
  const handleUseShelfAsTemplate = (shelfName: string) => {
    setNewShelfMain(shelfName);
    setNewShelfSub('');
  };

  const hierarchicalShelves = useMemo(() => {
    const shelves: Record<string, string[]> = {};
    const mainShelves: string[] = [];

    existingTags.forEach(tag => {
      const parts = tag.split('/');
      const main = parts[0];
      if (!shelves[main]) {
        shelves[main] = [];
        mainShelves.push(main);
      }
      if (parts.length > 1) {
        const sub = parts.slice(1).join('/');
        if (!shelves[main].includes(sub)) {
          shelves[main].push(sub);
        }
      }
    });

    mainShelves.sort((a,b) => a.localeCompare(b, 'tr'));
    Object.values(shelves).forEach(subs => subs.sort((a,b) => a.localeCompare(b, 'tr')));
    
    const sortedShelves: Record<string, string[]> = {};
    mainShelves.forEach(main => {
        sortedShelves[main] = shelves[main];
    });

    return sortedShelves;
  }, [existingTags]);

  const mainShelfOptions = useMemo(() => {
    return Object.keys(hierarchicalShelves).map(shelf => ({ label: shelf, value: shelf }));
  }, [hierarchicalShelves]);

  return (
    <div className="space-y-5 pb-4">
        <FormField control={control} name="title" render={({ field }) => (
            <FormItem>
                <FormLabel className="text-slate-700 dark:text-slate-300 ml-1">Kitap Adı</FormLabel>
                <FormControl>
                    <Input placeholder="Kitabın adını girin..." className="h-14 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] border-transparent px-4 text-[15px] shadow-none focus-visible:bg-white dark:focus-visible:bg-black focus-visible:ring-2 focus-visible:ring-indigo-500/20" {...field} />
                </FormControl>
                <FormMessage className="ml-1" />
            </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={control} name="author" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 ml-1">Yazar</FormLabel>
                    <FormControl>
                        <Input placeholder="İsteğe bağlı" className="h-14 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] border-transparent px-4 text-[15px] shadow-none focus-visible:bg-white dark:focus-visible:bg-black focus-visible:ring-2 focus-visible:ring-indigo-500/20" {...field} />
                    </FormControl>
                    <FormMessage className="ml-1" />
                </FormItem>
            )} />
            <FormField control={control} name="pageCount" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 ml-1">Sayfa Sayısı</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="Örn: 250" className="h-14 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] border-transparent px-4 text-[15px] shadow-none focus-visible:bg-white dark:focus-visible:bg-black focus-visible:ring-2 focus-visible:ring-indigo-500/20" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage className="ml-1" />
                </FormItem>
            )} />
        </div>
        
        <FormItem className="pt-2">
            <FormLabel className="text-slate-700 dark:text-slate-300 ml-1">Kapak Resmi</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </FormControl>
            <div 
                className="w-full h-32 bg-slate-100 dark:bg-[#2C2C2E] rounded-3xl flex items-center gap-5 px-5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-[0.98]"
                onClick={() => fileInputRef.current?.click()}
            >
                {imageValue ? (
                    <div className="relative w-20 h-24 rounded-xl overflow-hidden shadow-md shrink-0 bg-white dark:bg-[#1C1C1E]">
                        <Image src={imageValue} alt="Kapak önizlemesi" fill className="object-cover" data-ai-hint="book cover"/>
                    </div>
                ) : (
                    <div className="w-20 h-24 bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm flex items-center justify-center shrink-0 border border-slate-200 dark:border-transparent">
                        <UploadCloud className="h-7 w-7 text-indigo-400"/>
                    </div>
                )}
                <div className="flex flex-col">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                        {imageValue ? 'Kapağı Değiştir' : 'Kapak Ekle'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {imageValue ? 'Farklı bir resim yüklemek için dokunun.' : 'Cihazınızdan kapak fotoğrafı seçin.'}
                    </p>
                </div>
            </div>
            <FormMessage className="ml-1" />
        </FormItem>


        <FormField
            control={control}
            name="tags"
            render={({ field }) => (
                <FormItem className="pt-2">
                    <FormLabel className="text-slate-700 dark:text-slate-300 ml-1">Kategoriler / Raflar</FormLabel>
                    
                    {/* Hızlı Kategori Seçimi (Tüm mevcut kategoriler kaydırılabilir yatay liste) */}
                    {Object.keys(hierarchicalShelves).length > 0 && (
                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-2 px-2 snap-x">
                            {Object.entries(hierarchicalShelves).map(([main, subs]) => (
                                <Badge
                                    key={main}
                                    variant="outline"
                                    onClick={() => handleToggleTag(main)}
                                    className={cn(
                                        "snap-start shrink-0 rounded-xl cursor-pointer text-[13px] px-3 py-1.5 transition-colors border-slate-200 dark:border-white/10",
                                        (field.value || []).includes(main) ? "bg-indigo-600 text-white border-transparent dark:bg-indigo-600 dark:text-white" : "bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2C2C2E]"
                                    )}
                                >
                                    {main}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Seçili Etiketler Çipler Halinde */}
                    <div className="flex flex-wrap gap-2 mb-2 mt-1">
                        {(field.value || []).length === 0 && (
                            <span className="text-sm text-slate-400 dark:text-slate-500 ml-1 italic">Henüz seçili kategori yok.</span>
                        )}
                        {(field.value || []).map((tag) => (
                            <Badge key={tag} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 rounded-xl px-3 py-1.5 text-sm gap-2 font-medium border-0">
                                {tag}
                                <button type="button" onClick={() => removeTag(tag)} className="bg-indigo-200/50 dark:bg-black/20 rounded-full p-0.5 hover:bg-white/50">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>

                    {/* Yeni Raf Ekleme Modülü */}
                    <div className="bg-slate-100 dark:bg-[#2C2C2E] p-4 rounded-3xl mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kendi Rafını Oluştur</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="Raf Adı (örn: Felsefe, Tarih)"
                                value={newShelfMain}
                                onChange={(e) => setNewShelfMain(e.target.value)}
                                className="h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border-transparent px-4 shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 text-[15px]"
                            />
                            <Button type="button" onClick={handleAddShelf} className="h-12 rounded-2xl bg-slate-800 dark:bg-white text-white dark:text-black font-semibold w-full sm:w-auto px-6">
                                Ekle
                            </Button>
                        </div>
                    </div>

                    <FormMessage className="ml-1" />
                </FormItem>
            )}
        />

        <FormField control={control} name="isForChildren" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-3xl bg-slate-100 dark:bg-[#2C2C2E] p-4 shadow-none mt-2">
                <div className="space-y-0.5">
                    <FormLabel className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 ml-1">Çocuk Kitabı</FormLabel>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 ml-1">Sadece çocuklar rafında göster.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-indigo-600" /></FormControl>
            </FormItem>
        )} />
    </div>
  );
};
