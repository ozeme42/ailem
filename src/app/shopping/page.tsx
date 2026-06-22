"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ListChecks, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Search, Sparkles, Home, Cake, Notebook, Edit, Check, ChevronUp, ChevronDown, Mic, Apple, Beef, Milk, Wheat, Coffee, Package, Droplets, Baby, Shirt, Star, ShoppingBag, X, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList, addShoppingListItemToList, deleteShoppingListItemFromList, toggleShoppingListItemStatusInList, moveItemToBought, moveItemToPending } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { generateShoppingListItems } from '@/ai/flows/generate-shopping-list-flow';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; dot: string }> = {
  'Meyve ve Sebze':      { icon: Apple,    color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-950/50',    border: 'border-green-200 dark:border-green-800',   dot: 'bg-green-500' },
  'Et ve Tavuk Ürünleri':{ icon: Beef,     color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/50',        border: 'border-red-200 dark:border-red-800',       dot: 'bg-red-500' },
  'Süt Ürünleri':        { icon: Milk,     color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/50',      border: 'border-blue-200 dark:border-blue-800',     dot: 'bg-blue-500' },
  'Unlu Mamüller':       { icon: Wheat,    color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/50',    border: 'border-amber-200 dark:border-amber-800',   dot: 'bg-amber-500' },
  'Temel Gıda':          { icon: Package,  color: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-50 dark:bg-orange-950/50',  border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  'Atıştırmalık':        { icon: Coffee,   color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-950/50',  border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  'İçecekler':           { icon: Droplets, color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-50 dark:bg-cyan-950/50',      border: 'border-cyan-200 dark:border-cyan-800',     dot: 'bg-cyan-500' },
  'Dondurulmuş Gıdalar': { icon: Package,  color: 'text-sky-600 dark:text-sky-400',      bg: 'bg-sky-50 dark:bg-sky-950/50',        border: 'border-sky-200 dark:border-sky-800',       dot: 'bg-sky-500' },
  'Temizlik Ürünleri':   { icon: Droplets, color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-50 dark:bg-teal-950/50',      border: 'border-teal-200 dark:border-teal-800',     dot: 'bg-teal-500' },
  'Kişisel Bakım':       { icon: Star,     color: 'text-pink-600 dark:text-pink-400',    bg: 'bg-pink-50 dark:bg-pink-950/50',      border: 'border-pink-200 dark:border-pink-800',     dot: 'bg-pink-500' },
  'Bebek Ürünleri':      { icon: Baby,     color: 'text-violet-600 dark:text-violet-400',bg: 'bg-violet-50 dark:bg-violet-950/50',  border: 'border-violet-200 dark:border-violet-800', dot: 'bg-violet-500' },
  'Diğer':               { icon: ShoppingBag, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900',     border: 'border-slate-200 dark:border-slate-700',   dot: 'bg-slate-400' },
};
const CATEGORY_ORDER = ['Meyve ve Sebze','Et ve Tavuk Ürünleri','Süt Ürünleri','Unlu Mamüller','Temel Gıda','Atıştırmalık','İçecekler','Dondurulmuş Gıdalar','Temizlik Ürünleri','Kişisel Bakım','Bebek Ürünleri','Diğer'];

// ─── THEME CONFIG ─────────────────────────────────────────────────────────────
const LIST_THEMES = [
  { id: 'indigo',   label: 'Mor',        gradient: 'from-indigo-500 to-violet-500',   ring: 'ring-indigo-500',   fab: 'bg-indigo-600 hover:bg-indigo-700', fabShadow: 'shadow-indigo-500/30' },
  { id: 'emerald',  label: 'Yeşil',      gradient: 'from-emerald-500 to-teal-500',    ring: 'ring-emerald-500',  fab: 'bg-emerald-600 hover:bg-emerald-700', fabShadow: 'shadow-emerald-500/30' },
  { id: 'rose',     label: 'Pembe',      gradient: 'from-rose-500 to-pink-500',       ring: 'ring-rose-500',     fab: 'bg-rose-600 hover:bg-rose-700', fabShadow: 'shadow-rose-500/30' },
  { id: 'amber',    label: 'Sarı',       gradient: 'from-amber-500 to-orange-500',    ring: 'ring-amber-500',    fab: 'bg-amber-600 hover:bg-amber-700', fabShadow: 'shadow-amber-500/30' },
  { id: 'cyan',     label: 'Mavi',       gradient: 'from-cyan-500 to-blue-500',       ring: 'ring-cyan-500',     fab: 'bg-cyan-600 hover:bg-cyan-700', fabShadow: 'shadow-cyan-500/30' },
  { id: 'fuchsia',  label: 'Fuşya',      gradient: 'from-fuchsia-500 to-purple-500',  ring: 'ring-fuchsia-500',  fab: 'bg-fuchsia-600 hover:bg-fuchsia-700', fabShadow: 'shadow-fuchsia-500/30' },
];
const listIcons = { ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag };
const getTheme = (id?: string) => LIST_THEMES.find(t => t.id === id) || LIST_THEMES[0];

// ─── FORM SCHEMA ──────────────────────────────────────────────────────────────
const createListSchema = z.object({
  name:    z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  icon:    z.string().min(1),
  colorId: z.string().optional(),
});
type CreateListFormData = z.infer<typeof createListSchema>;

// ─── CREATE / EDIT LIST DIALOG ────────────────────────────────────────────────
function CreateListDialog({ isOpen, onOpenChange, onCreate, initialData }: {
  isOpen: boolean; onOpenChange: (o: boolean) => void;
  onCreate: (d: CreateListFormData) => void;
  initialData?: ShoppingList | null;
}) {
  const form = useForm<CreateListFormData>({ resolver: zodResolver(createListSchema), defaultValues: { name: '', icon: 'ShoppingCart', colorId: 'indigo' } });
  useEffect(() => {
    if (isOpen) form.reset(initialData ? { name: initialData.name, icon: initialData.icon, colorId: initialData.colorId || 'indigo' } : { name: '', icon: 'ShoppingCart', colorId: 'indigo' });
  }, [initialData, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
            {initialData ? '✏️ Listeyi Düzenle' : '🛒 Yeni Liste Oluştur'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-5 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Liste Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Haftalık Market..." className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl h-12 text-base focus:border-indigo-500 transition-all" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="icon" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">İkon</FormLabel>
                <div className="flex gap-2.5">
                  {Object.keys(listIcons).map(iconName => {
                    const Icon = listIcons[iconName as keyof typeof listIcons];
                    return (
                      <div key={iconName} onClick={() => field.onChange(iconName)}
                        className={cn("p-3 rounded-xl cursor-pointer transition-all border-2 active:scale-95",
                          field.value === iconName ? "bg-indigo-600 text-white border-indigo-500 shadow-lg scale-110" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300")}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })}
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="colorId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tema Rengi</FormLabel>
                <div className="flex gap-3 flex-wrap">
                  {LIST_THEMES.map(theme => (
                    <div key={theme.id} onClick={() => field.onChange(theme.id)}
                      className={cn("group flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90")}>
                      <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br transition-all", theme.gradient,
                        field.value === theme.id ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-lg" : "opacity-70 hover:opacity-100 hover:scale-105")} />
                      <span className="text-[9px] font-bold text-slate-400">{theme.label}</span>
                    </div>
                  ))}
                </div>
              </FormItem>
            )} />

            <DialogFooter className="gap-2 flex-row justify-end mt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 flex-1 h-12 rounded-xl">İptal</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 flex-1 h-12">Kaydet</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── LIST CARD (Home screen) ──────────────────────────────────────────────────
function ListCard({ list, onClick, onEdit, onDelete, onMove, isFirst, isLast }: {
  list: ShoppingList; onClick: () => void; onEdit: () => void;
  onDelete: (id: string) => void; onMove: (d: 'up' | 'down') => void;
  isFirst: boolean; isLast: boolean;
}) {
  const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
  const items = list.items || [];
  const boughtItems = list.boughtItems || [];
  const total = items.length + boughtItems.length;
  const progress = total === 0 ? 0 : Math.round((boughtItems.length / total) * 100);
  const theme = getTheme(list.colorId);
  const done = progress === 100 && total > 0;

  return (
    <div onClick={onClick}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm">
      {/* Top color band */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", theme.gradient)} />

      {/* Content */}
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2.5 rounded-[14px] bg-gradient-to-br text-white shadow-sm", theme.gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 active:scale-95"
                onClick={e => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-44 p-1">
              {!isFirst && <DropdownMenuItem onClick={e => { e.stopPropagation(); onMove('up'); }} className="cursor-pointer rounded-lg gap-2"><ChevronUp className="h-4 w-4 text-indigo-500" />Yukarı Taşı</DropdownMenuItem>}
              {!isLast && <DropdownMenuItem onClick={e => { e.stopPropagation(); onMove('down'); }} className="cursor-pointer rounded-lg gap-2"><ChevronDown className="h-4 w-4 text-indigo-500" />Aşağı Taşı</DropdownMenuItem>}
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(); }} className="cursor-pointer rounded-lg gap-2"><Edit className="h-4 w-4 text-slate-500" />Düzenle</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={e => e.preventDefault()} onClick={e => e.stopPropagation()} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer rounded-lg gap-2">
                    <Trash2 className="h-4 w-4" />Sil
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90%] max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitleComponent>Listeyi sil?</AlertDialogTitleComponent>
                    <AlertDialogDescription className="text-slate-500 dark:text-slate-400">Bu liste ve tüm ürünleri kalıcı olarak silinecek.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-0 h-11 rounded-xl m-0">İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={e => { e.stopPropagation(); onDelete(list.id); }} className="bg-rose-600 hover:bg-rose-700 text-white h-11 rounded-xl m-0">Sil</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Name */}
        <h3 className="font-black text-base leading-snug text-slate-900 dark:text-white mb-1 truncate">{list.name}</h3>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
          <span>{items.length} ürün bekliyor</span>
          {done
            ? <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Tamamlandı</span>
            : <span>{boughtItems.length}/{total} alındı</span>
          }
        </div>

        {/* Progress */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", theme.gradient)} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── ITEM ROW (inside list view) ──────────────────────────────────────────────
function ItemRow({ item, theme, onToggle, onConfirmBuy, onDelete, isBought }: {
  item: ShoppingListItemType; theme: typeof LIST_THEMES[0];
  onToggle: () => void; onConfirmBuy: () => void; onDelete: () => void; isBought: boolean;
}) {
  const catCfg = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG['Diğer'];
  const CatIcon = catCfg.icon;

  return (
    <div onClick={onToggle}
      className={cn(
        "group relative flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.99] border overflow-hidden",
        isBought
          ? "bg-slate-50/80 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 opacity-60"
          : cn("bg-white dark:bg-slate-900 hover:shadow-md", catCfg.border, "border-l-[3px]", "border-y border-r border-slate-200 dark:border-slate-800 hover:border-l-[3px]")
      )}>
      {/* Subtle colored background wash */}
      {!isBought && (
        <div className={cn("absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none", catCfg.bg)} />
      )}

      {/* Circle check — category colored when unchecked */}
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all relative z-10",
        isBought
          ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/40"
          : cn(catCfg.border, "bg-white dark:bg-slate-900")
      )}>
        {isBought && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
      </div>

      {/* Category icon badge — bigger, more colorful */}
      <div className={cn(
        "p-2 rounded-xl flex-shrink-0 relative z-10 shadow-sm",
        catCfg.bg, catCfg.border, "border"
      )}>
        <CatIcon className={cn("h-4 w-4", catCfg.color)} />
      </div>

      {/* Name */}
      <span className={cn("flex-grow font-semibold text-sm transition-all relative z-10",
        isBought ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200")}>
        {item.name}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 relative z-10" onClick={e => e.stopPropagation()}>
        {isBought && (
          <button onClick={onConfirmBuy}
            className="h-8 w-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-90">
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
        <button onClick={onDelete}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ShoppingPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  const [isListDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'bought'>('pending');

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onShoppingListsUpdate(lists => {
      setShoppingLists(lists.sort((a, b) => {
        const oA = a.order ?? 0, oB = b.order ?? 0;
        if (oA !== oB) return oA - oB;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }));
      setIsLoaded(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedList) {
      const updated = shoppingLists.find(l => l.id === selectedList.id);
      setSelectedList(updated || null);
    }
  }, [shoppingLists, selectedList?.id]);

  // ── Suggestions ────────────────────────────────────────────────────────────
  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    shoppingLists.forEach(l => {
      (l.items || []).forEach(i => items.add(i.name));
      (l.boughtItems || []).forEach(i => items.add(i.name));
    });
    return Array.from(items);
  }, [shoppingLists]);

  useEffect(() => {
    if (!newItemName.trim()) { setSuggestions([]); return; }
    const q = newItemName.toLowerCase();
    const hist = historicalItems.filter(i => i.toLowerCase().startsWith(q)).slice(0, 3);
    const def = defaultShoppingItems.filter(i => i.toLowerCase().startsWith(q) && !hist.includes(i)).slice(0, 3);
    setSuggestions([...hist, ...def]);
  }, [newItemName, historicalItems]);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const toggleVoice = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: "Desteklenmiyor", variant: 'destructive' }); return;
    }
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR(); recognitionRef.current = rec;
    rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true;
    const base = newItemName ? newItemName + ' ' : '';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (ev: any) => { let t = ''; for (let i = 0; i < ev.results.length; ++i) t += ev.results[i][0].transcript; setNewItemName(base + t); inputRef.current?.focus(); };
    rec.onerror = rec.onend = () => setIsListening(false);
    rec.start();
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreateOrUpdateList = async (data: CreateListFormData) => {
    try {
      if (editingList) { await updateShoppingList(editingList.id, { name: data.name, icon: data.icon, colorId: data.colorId }); toast({ title: "Liste güncellendi ✅" }); }
      else { await addShoppingList(data.name, data.icon, data.colorId); toast({ title: "Yeni liste oluşturuldu 🛒" }); }
      setListDialogOpen(false); setEditingList(null);
    } catch { toast({ title: "Hata", variant: 'destructive' }); }
  };

  const handleAddItem = async (e?: React.FormEvent, name?: string) => {
    e?.preventDefault();
    const itemName = name || newItemName;
    if (!itemName.trim() || !selectedList) return;
    setIsAiProcessing(true);
    try {
      const complex = itemName.includes(',') || itemName.includes('malzemeleri') || itemName.includes('için');
      if (complex) {
        const res = await generateShoppingListItems(itemName.trim());
        if (res?.items?.length > 0) { for (const it of res.items) await addShoppingListItemToList(selectedList.id, it); toast({ title: `✨ ${res.items.length} ürün eklendi` }); }
        else await addShoppingListItemToList(selectedList.id, { name: itemName.trim(), category: 'Diğer' });
      } else {
        await addShoppingListItemToList(selectedList.id, { name: itemName.trim(), category: 'Diğer' });
      }
    } catch { await addShoppingListItemToList(selectedList.id, { name: itemName.trim(), category: 'Diğer' }); }
    finally { setNewItemName(''); setIsAiProcessing(false); inputRef.current?.focus(); }
  };

  const handleDeleteList = async (id: string) => {
    try { await deleteShoppingList(id); toast({ title: "Liste silindi" }); }
    catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  const handleMoveList = async (list: ShoppingList, dir: 'up' | 'down') => {
    const idx = shoppingLists.findIndex(l => l.id === list.id);
    const tIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (tIdx < 0 || tIdx >= shoppingLists.length) return;
    const target = shoppingLists[tIdx];
    try { await updateShoppingList(list.id, { order: target.order ?? tIdx }); await updateShoppingList(target.id, { order: list.order ?? idx }); }
    catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ─── LIST DETAIL VIEW ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedList) {
    const theme = getTheme(selectedList.colorId);
    const pendingItems = (selectedList.items || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const boughtItems  = (selectedList.boughtItems || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const total = pendingItems.length + boughtItems.length;
    const progress = total === 0 ? 0 : Math.round((boughtItems.length / total) * 100);

    // Group pending by category
    const grouped = pendingItems.reduce((acc, item) => {
      const cat = item.category || 'Diğer';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItemType[]>);
    const sortedCategories = Object.entries(grouped).sort(([a], [b]) =>
      (CATEGORY_ORDER.indexOf(a) ?? 99) - (CATEGORY_ORDER.indexOf(b) ?? 99)
    );

    const ListIcon = listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-28">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
          {/* Color bar */}
          <div className={cn("h-1 w-full bg-gradient-to-r", theme.gradient)} />
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 active:scale-95" onClick={() => setSelectedList(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={cn("p-2 rounded-xl bg-gradient-to-br text-white shadow-sm", theme.gradient)}>
              <ListIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">{selectedList.name}</h1>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{pendingItems.length} bekliyor · {boughtItems.length} alındı</p>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", theme.gradient)} style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{progress}%</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-4 pb-3 flex gap-2">
            {(['pending', 'bought'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("flex-1 h-9 rounded-xl text-xs font-bold transition-all",
                  activeTab === tab
                    ? cn("bg-gradient-to-r text-white shadow-md", theme.gradient)
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}>
                {tab === 'pending' ? `🛒 Alınacaklar (${pendingItems.length})` : `✅ Alınanlar (${boughtItems.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4">
          {activeTab === 'pending' && (
            <>
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <ListChecks className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">Liste boş!</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aşağıdaki + butonuna basarak ürün ekle.</p>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {sortedCategories.map(([category, items]) => {
                    const catCfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Diğer'];
                    const CatIcon = catCfg.icon;
                    return (
                      <div key={category}>
                        {/* Category header — gradient pill */}
                        <div className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-2xl mb-3 border shadow-sm", catCfg.bg, catCfg.border)}>
                          <div className={cn("p-1.5 rounded-xl", catCfg.bg, catCfg.border, "border")}>
                            <CatIcon className={cn("h-4 w-4", catCfg.color)} />
                          </div>
                          <span className={cn("text-xs font-black uppercase tracking-widest", catCfg.color)}>{category}</span>
                          <div className={cn("ml-auto flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-black border", catCfg.bg, catCfg.color, catCfg.border)}>
                            {items.length}
                          </div>
                        </div>
                        {/* Items */}
                        <div className="space-y-2">
                          {items.map((item, idx) => (
                            <ItemRow key={`${item.id}-${idx}`} item={item} theme={theme} isBought={!!item.isBought}
                              onToggle={() => toggleShoppingListItemStatusInList(selectedList.id, item.id, !item.isBought)}
                              onConfirmBuy={() => moveItemToBought(selectedList.id, item.id)}
                              onDelete={() => deleteShoppingListItemFromList(selectedList.id, item.id, false)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'bought' && (
            <>
              {boughtItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                  <CheckCircle2 className="h-12 w-12 text-slate-400 mb-3" />
                  <p className="font-bold text-slate-500 dark:text-slate-400">Henüz alınan ürün yok.</p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {boughtItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`}
                      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl group">
                      <button onClick={() => moveItemToPending(selectedList.id, item.id)}
                        className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 hover:bg-emerald-600 active:scale-90 transition-all">
                        <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                      </button>
                      <span className="flex-grow font-semibold text-sm line-through text-slate-400 dark:text-slate-500 truncate">{item.name}</span>
                      <button onClick={() => deleteShoppingListItemFromList(selectedList.id, item.id, true)}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50">
          <Button
            className={cn("rounded-[1.2rem] w-14 h-14 shadow-xl text-white active:scale-90 transition-all", theme.fab, theme.fabShadow, "shadow-lg")}
            size="icon" onClick={() => setIsAddItemOpen(true)}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Add Item Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent className="w-[95%] sm:max-w-md rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 top-[40%] p-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">🛒 Ürün Ekle</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs font-medium">Hızlı ekle veya yapay zeka ile liste oluştur.</DialogDescription>
            </DialogHeader>
            <div className="pt-2 space-y-3">
              <form onSubmit={handleAddItem} className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <Input ref={inputRef} value={newItemName} onChange={e => setNewItemName(e.target.value)}
                    placeholder="2kg domates, süt, ekmek..." autoComplete="off"
                    className="pl-4 pr-20 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 transition-all text-sm" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={toggleVoice}
                      className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                        isListening ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 animate-pulse" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30")}>
                      <Mic className="h-4 w-4" />
                    </button>
                    {isAiProcessing && <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                  </div>
                </div>
                <Button type="submit" size="icon"
                  className={cn("h-12 w-12 shrink-0 rounded-2xl shadow-md text-white active:scale-95 transition-all", theme.fab)}
                  disabled={!newItemName.trim() || isAiProcessing}>
                  <Plus className="h-5 w-5" />
                </Button>
              </form>
              {suggestions.length > 0 && newItemName.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => { handleAddItem(undefined, s); setNewItemName(''); setSuggestions([]); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                      {s}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ─── HOME VIEW ────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const totalPending = shoppingLists.reduce((sum, l) => sum + (l.items || []).length, 0);
  const totalBought  = shoppingLists.reduce((sum, l) => sum + (l.boughtItems || []).length, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-fuchsia-200/30 dark:bg-fuchsia-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 pb-32 space-y-8">
        {/* ── Header ── */}
        <div className="pt-4 md:pt-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <ShoppingCart className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Alışveriş <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">Listeleri</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">İhtiyaçlarını organize et.</p>
            </div>
          </div>
        </div>

        {/* ── Stats Strip ── */}
        {shoppingLists.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Liste', val: shoppingLists.length, icon: '📋', bg: 'from-indigo-500 to-violet-500' },
              { label: 'Alınacak', val: totalPending, icon: '🛒', bg: 'from-amber-500 to-orange-500' },
              { label: 'Alındı', val: totalBought, icon: '✅', bg: 'from-emerald-500 to-teal-500' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{s.val}</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Lists Grid ── */}
        {shoppingLists.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Listelerim</h2>
              <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                className="h-8 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Yeni Liste
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {shoppingLists.map((list, index) => (
                <ListCard key={list.id} list={list}
                  onClick={() => { setSelectedList(list); setActiveTab('pending'); }}
                  onEdit={() => { setEditingList(list); setListDialogOpen(true); }}
                  onDelete={handleDeleteList}
                  onMove={dir => handleMoveList(list, dir)}
                  isFirst={index === 0}
                  isLast={index === shoppingLists.length - 1}
                />
              ))}
              {/* Add new card */}
              <button onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                className="group border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[1.5rem] flex flex-col items-center justify-center min-h-[160px] gap-3 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 active:scale-95 bg-transparent">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 flex items-center justify-center transition-all">
                  <Plus className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Yeni Liste</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-indigo-200 dark:bg-indigo-900/50 blur-3xl opacity-40 rounded-full" />
              <div className="relative w-24 h-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex items-center justify-center shadow-xl rotate-6 hover:rotate-0 transition-transform duration-500">
                <ShoppingCart className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Alışverişe Başla</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed max-w-xs">Haftalık market, pazar veya özel günler için listeler oluşturun ve takip edin.</p>
            <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }}
              className="rounded-2xl h-14 px-8 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98]">
              <Plus className="mr-2 h-5 w-5" /> İlk Listeyi Oluştur
            </Button>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {shoppingLists.length > 0 && (
        <div className="fixed bottom-24 right-4 md:hidden z-40">
          <Button className="rounded-[1.2rem] w-14 h-14 shadow-xl shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 text-white active:scale-90 transition-all"
            size="icon" onClick={() => { setEditingList(null); setListDialogOpen(true); }}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
