"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notebook, Note } from '@/lib/data';
import { 
  onNotebooksUpdate, 
  addNotebook, 
  deleteNotebook, 
  updateNotebook, 
  onNotesUpdate, 
  updateNoteInSection, 
  addNoteToSection, 
  deleteNoteFromSection 
} from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { 
  Plus, Trash2, Edit, Search, MoreVertical, Folder, ChevronLeft, Lock, 
  LayoutGrid, FileText, X, Copy, Eye, EyeOff, List, AlignLeft, 
  Key, ArrowLeft, Pin, PinOff, Palette, Image as ImageIcon, CheckSquare, 
  Sparkles, Clock, Minus, FolderPlus, Settings, Check, ChevronDown, ChevronUp, CheckCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NewNotebookForm } from '@/components/new-notebook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CONSTANTS & DATA ---
const NOTE_COLORS = [
  { id: 'purple', bg: '#7C3AED', light: '#EDE9FE', text: '#FFFFFF' },
  { id: 'pink',   bg: '#DB2777', light: '#FCE7F3', text: '#FFFFFF' },
  { id: 'red',    bg: '#DC2626', light: '#FEE2E2', text: '#FFFFFF' },
  { id: 'orange', bg: '#EA580C', light: '#FFEDD5', text: '#FFFFFF' },
  { id: 'amber',  bg: '#D97706', light: '#FEF3C7', text: '#FFFFFF' },
  { id: 'green',  bg: '#059669', light: '#D1FAE5', text: '#FFFFFF' },
  { id: 'teal',   bg: '#0891B2', light: '#CFFAFE', text: '#FFFFFF' },
  { id: 'blue',   bg: '#2563EB', light: '#DBEAFE', text: '#FFFFFF' },
  { id: 'indigo', bg: '#4338CA', light: '#E0E7FF', text: '#FFFFFF' },
  { id: 'slate',  bg: '#475569', light: '#F1F5F9', text: '#FFFFFF' },
  { id: 'white',  bg: '#FFFFFF', light: '#F9FAFB', text: '#111827' },
  { id: 'black',  bg: '#111827', light: '#F9FAFB', text: '#FFFFFF' },
];

const FOLDER_COLORS = [
  '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
  '#D97706', '#059669', '#0891B2', '#2563EB',
];

const FOLDER_GRADIENTS: Record<string, string[]> = {
  '#7C3AED': ['from-[#8B5CF6]', 'to-[#6D28D9]'],
  '#DB2777': ['from-[#F43F5E]', 'to-[#BE185D]'],
  '#DC2626': ['from-[#EF4444]', 'to-[#B91C1C]'],
  '#EA580C': ['from-[#F97316]', 'to-[#C2410C]'],
  '#D97706': ['from-[#F59E0B]', 'to-[#B45309]'],
  '#059669': ['from-[#10B981]', 'to-[#047857]'],
  '#0891B2': ['from-[#06B6D4]', 'to-[#0E7490]'],
  '#2563EB': ['from-[#3B82F6]', 'to-[#1D4ED8]'],
};

const PASSWORD_CATEGORIES = [
  { id: 'all', label: '✨ Tümü', name: 'all' },
  { id: 'social', label: '🎬 Sosyal Medya', name: 'Sosyal Medya' },
  { id: 'bank', label: '🏦 Banka', name: 'Banka' },
  { id: 'email', label: '📧 E-posta', name: 'E-posta' },
  { id: 'wifi', label: '📶 Wi-Fi', name: 'Wi-Fi' },
  { id: 'other', label: '🏛️ Diğer', name: 'Diğer' },
];

function getPasswordCategoryTheme(category?: string, isDark: boolean = false) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('sosyal')) return { primary: '#6366f1', bg: isDark ? '#1e1b4b' : '#eef2ff', border: isDark ? '#4338ca' : '#c7d2fe', badgeBg: isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff', text: isDark ? '#a5b4fc' : '#4338ca' };
  if (cat.includes('banka') || cat.includes('finans')) return { primary: '#059669', bg: isDark ? '#064e3b' : '#ecfdf5', border: isDark ? '#047857' : '#a7f3d0', badgeBg: isDark ? 'rgba(5,150,105,0.25)' : '#d1fae5', text: isDark ? '#6ee7b7' : '#047857' };
  if (cat.includes('posta') || cat.includes('email') || cat.includes('mail')) return { primary: '#d97706', bg: isDark ? '#451a03' : '#fffbeb', border: isDark ? '#b45309' : '#fde68a', badgeBg: isDark ? 'rgba(217,119,6,0.25)' : '#fef3c7', text: isDark ? '#fcd34d' : '#b45309' };
  if (cat.includes('wi-fi') || cat.includes('wifi') || cat.includes('internet')) return { primary: '#0284c7', bg: isDark ? '#0c4a6e' : '#f0f9ff', border: isDark ? '#0369a1' : '#bae6fd', badgeBg: isDark ? 'rgba(2,132,199,0.25)' : '#e0f2fe', text: isDark ? '#7dd3fc' : '#0369a1' };
  if (cat.includes('iş') || cat.includes('is') || cat.includes('okul')) return { primary: '#e11d48', bg: isDark ? '#4c0519' : '#fff1f2', border: isDark ? '#be123c' : '#fecdd3', badgeBg: isDark ? 'rgba(225,29,72,0.25)' : '#ffe4e6', text: isDark ? '#fda4af' : '#be123c' };
  if (cat.includes('ticaret') || cat.includes('alışveriş') || cat.includes('alisveris')) return { primary: '#9333ea', bg: isDark ? '#3b0764' : '#faf5ff', border: isDark ? '#7e22ce' : '#e9d5ff', badgeBg: isDark ? 'rgba(147,51,234,0.25)' : '#f3e8ff', text: isDark ? '#d8b4fe' : '#7e22ce' };
  return { primary: '#7c3aed', bg: isDark ? '#2e1065' : '#f5f3ff', border: isDark ? '#6d28d9' : '#ddd6fe', badgeBg: isDark ? 'rgba(124,58,237,0.25)' : '#ede9fe', text: isDark ? '#c4b5fd' : '#6d28d9' };
}

const getNoteColor = (colorId?: string) => NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0];

// --- PAPER BACKGROUND OVERLAY ---
function PaperBackgroundOverlay({ type }: { type: 'lined' | 'grid' | 'dots' }) {
  if (type === 'lined') {
    return (
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(transparent 95%, currentColor 5%)', backgroundSize: '100% 36px' }} />
    );
  }
  if (type === 'grid') {
    return (
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
    );
  }
  if (type === 'dots') {
    return (
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
    );
  }
  return null;
}

type ScreenState = 'folders' | 'notes' | 'editor' | 'vault_auth';
type ViewMode = 'grid' | 'list' | 'title';

export function NotesClient() {
  const { user, familyId } = useAuth();
  const { toast } = useToast();

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [screen, setScreen] = useState<ScreenState>('folders');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('default');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const [isVaultAuthenticated, setIsVaultAuthenticated] = useState(false);
  const [vaultPasswordInput, setVaultPasswordInput] = useState("");
  const [vaultAuthError, setVaultAuthError] = useState("");
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  
  const [pwdCategory, setPwdCategory] = useState('all');
  const [activeColorFilter, setActiveColorFilter] = useState('all');

  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingPasswordNote, setEditingPasswordNote] = useState<Note | null>(null);

  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: 'purple', paperPattern: 'plain' });
  const [passwordForm, setPasswordForm] = useState({ accountName: '', username: '', password: '', category: 'Diğer', notes: '' });
  
  const [expandedPasswordId, setExpandedPasswordId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    const unsubNb = onNotebooksUpdate(data => { setNotebooks(data); setLoading(false); });
    const unsubNotes = onNotesUpdate(setAllNotes);
    return () => { unsubNb(); unsubNotes(); };
  }, [user]);

  const currentFolder = useMemo(() => notebooks.find(n => n.id === currentFolderId) || null, [notebooks, currentFolderId]);
  const displayedFolders = useMemo(() => {
    let filtered = notebooks.filter(n => !n.parentId || n.parentId === 'root');
    if (searchTerm) {
      filtered = filtered.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered.sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [notebooks, searchTerm]);

  const displayedNotes = useMemo(() => {
    let filtered = allNotes.filter(n => (n.notebookId || 'root') === (currentFolderId || 'root'));
    
    if (activeSectionId === 'passwords-tab') {
      filtered = filtered.filter(n => n.isPassword);
      if (pwdCategory !== 'all') {
        const catName = PASSWORD_CATEGORIES.find(c => c.id === pwdCategory)?.name;
        if (catName) {
          filtered = filtered.filter(n => n.passwordCategory === catName);
        }
      }
    } else {
      filtered = filtered.filter(n => !n.isPassword && (n.sectionId || 'default') === activeSectionId);
      if (activeColorFilter !== 'all') {
        filtered = filtered.filter(n => (n.color || 'purple') === activeColorFilter);
      }
    }
    
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (n.content?.[0]?.data || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.accountName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
  }, [allNotes, currentFolderId, activeSectionId, pwdCategory, activeColorFilter, searchTerm]);

  const stats = useMemo(() => ({
    totalFolders: displayedFolders.length,
    totalNotes: allNotes.length,
    passwords: allNotes.filter(n => n.isPassword).length
  }), [allNotes, displayedFolders]);

  const handleFolderSubmit = async (data: any) => {
    if (!user) return;
    try {
      if (editingNotebook) {
        await updateNotebook(editingNotebook.id, { ...editingNotebook, ...data });
      } else {
        await addNotebook(data);
      }
      setIsFolderFormOpen(false);
      setEditingNotebook(null);
    } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
  };

  const handleDeleteFolder = async (id: string) => {
    try { 
      await deleteNotebook(id); 
      if (currentFolderId === id) { setCurrentFolderId(null); setScreen('folders'); }
    } catch (error) {}
  };

  const handleSaveNote = async () => {
    if (!familyId) return;
    try {
      const notePayload = {
        title: noteForm.title.trim() || 'İsimsiz Not',
        content: [{ id: '1', type: 'text' as const, data: noteForm.content }],
        color: noteForm.color || 'purple',
        notebookId: currentFolderId || 'root',
        sectionId: activeSectionId,
        updatedAt: new Date().toISOString(),
      };

      if (editingNote && editingNote.id) {
        await updateNoteInSection(editingNote.notebookId || 'root', editingNote.id, notePayload);
      } else {
        await addNoteToSection(familyId, currentFolderId || 'root', activeSectionId, notePayload);
      }
      setScreen('notes');
      setEditingNote(null);
      toast({ title: 'Not kaydedildi' });
    } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
  };

  const handleSavePassword = async () => {
    if (!familyId) return;
    try {
      const payload = {
        title: passwordForm.accountName.trim() || 'İsimsiz',
        content: [{ id: '1', type: 'text' as const, data: passwordForm.notes }],
        color: 'indigo',
        notebookId: currentFolderId || 'root',
        sectionId: 'passwords-tab',
        isPassword: true,
        accountName: passwordForm.accountName.trim(),
        username: passwordForm.username.trim(),
        password: passwordForm.password.trim(),
        passwordCategory: passwordForm.category,
        updatedAt: new Date().toISOString(),
      };

      if (editingPasswordNote && editingPasswordNote.id) {
        await updateNoteInSection(editingPasswordNote.notebookId || 'root', editingPasswordNote.id, payload);
      } else {
        await addNoteToSection(familyId, currentFolderId || 'root', 'passwords-tab', payload);
      }
      setIsPasswordFormOpen(false);
      setEditingPasswordNote(null);
      toast({ title: 'Şifre kaydedildi' });
    } catch (error) { toast({ title: 'Hata', variant: 'destructive' }); }
  };

  const handleDeleteNote = async (id: string) => {
    try { await deleteNoteFromSection(id); } catch (error) {}
  };

  const handleTogglePin = async (note: Note) => {
    if (!note.notebookId) return;
    try {
      await updateNoteInSection(note.notebookId, note.id, { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() });
    } catch (e) {}
  };

  const openFolder = (folder: Notebook) => {
    if (folder.password) {
      setPendingFolderId(folder.id);
      setVaultPasswordInput("");
      setVaultAuthError("");
      setScreen('vault_auth');
    } else {
      setCurrentFolderId(folder.id);
      setActiveSectionId(folder.sections?.[0]?.id || 'default');
      setScreen('notes');
    }
  };
  
  const goBack = () => {
    if (screen === 'editor') {
      setScreen(currentFolderId ? 'notes' : 'folders');
      setEditingNote(null);
    } else if (screen === 'notes' || screen === 'vault_auth') {
      setCurrentFolderId(null);
      setScreen('folders');
    }
  };

  const openEditor = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteForm({
        title: note.title || '',
        content: note.content?.[0]?.data || '',
        color: note.color || 'purple',
        paperPattern: 'plain'
      });
    } else {
      setEditingNote(null);
      setNoteForm({ title: "", content: "", color: 'purple', paperPattern: 'plain' });
    }
    setScreen('editor');
  };

  const openPasswordForm = (note?: Note) => {
    if (note) {
      setEditingPasswordNote(note);
      setPasswordForm({
        accountName: note.accountName || note.title || '',
        username: note.username || '',
        password: note.password || '',
        category: note.passwordCategory || 'Diğer',
        notes: note.content?.[0]?.data || ''
      });
    } else {
      setEditingPasswordNote(null);
      setPasswordForm({ accountName: '', username: '', password: '', category: 'Diğer', notes: '' });
    }
    setIsPasswordFormOpen(true);
  };

  const handleVaultAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const folder = notebooks.find(n => n.id === pendingFolderId);
    if (folder && folder.password === vaultPasswordInput) {
      setIsVaultAuthenticated(true);
      setCurrentFolderId(folder.id);
      setActiveSectionId(folder.sections?.[0]?.id || 'default');
      setScreen('notes');
      setPendingFolderId(null);
    } else {
      setVaultAuthError("Yanlış şifre");
    }
  };

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), useSensor(KeyboardSensor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const handleDragStart = (e: any) => setActiveId(e.active.id);
  const handleDragEnd = async (e: any) => { setActiveId(null); };
  const dndItems = displayedNotes.map(n => `note-${n.id}`);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // --- RENDERERS ---
  const renderFoldersScreen = () => (
    <div className="flex-1 overflow-y-auto w-full relative z-10 pb-32 [scrollbar-width:none]">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-b-[36px] pt-12 pb-8 px-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">
          <h1 className="text-3xl font-black mb-1">Notlarım</h1>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">Kişisel Not Deposu</span>
          </div>
          
          <div className="w-full max-w-2xl relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200" />
            <Input 
              placeholder="Ara..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-white/20 border-white/30 backdrop-blur-md rounded-full text-white placeholder:text-indigo-200 focus:bg-white focus:text-indigo-900 text-base"
            />
          </div>

          <div className="flex items-center justify-around w-full max-w-2xl bg-black/20 rounded-[20px] py-3 px-4 border border-white/10">
            <div className="text-center">
              <div className="text-xl font-black text-white">{stats.totalFolders}</div>
              <div className="text-[10px] font-bold text-white/70">📁 Klasör</div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <div className="text-xl font-black text-white">{stats.totalNotes}</div>
              <div className="text-[10px] font-bold text-white/70">📝 Toplam Not</div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <div className="text-xl font-black text-yellow-400">{stats.passwords}</div>
              <div className="text-[10px] font-bold text-white/70">🔐 Şifreler</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">📁 Klasörlerim</h2>
          <span className="text-xs font-bold text-slate-500">{displayedFolders.length} Klasör Mevcut</span>
        </div>
        
        {displayedFolders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
              <Folder className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Henüz Klasör Oluşturmadınız</h3>
            <p className="text-sm text-slate-500 max-w-[250px]">Notlarınızı düzenli tutmak için aşağıdaki + butonuna basarak ilk klasörünüzü oluşturun.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedFolders.map((folder, idx) => {
              const isColorValid = folder.color && FOLDER_COLORS.includes(folder.color);
              const folderColor = isColorValid ? folder.color : FOLDER_COLORS[idx % FOLDER_COLORS.length];
              const gradientClasses = FOLDER_GRADIENTS[folderColor] || FOLDER_GRADIENTS['#7C3AED'];
              const noteCount = allNotes.filter(n => n.notebookId === folder.id).length;
              return (
                <div key={folder.id} onClick={() => openFolder(folder)} className={cn("rounded-[24px] cursor-pointer p-4 shadow-lg min-h-[160px] flex flex-col justify-between bg-gradient-to-br transition-transform active:scale-95", gradientClasses[0], gradientClasses[1])} style={{ shadowColor: folderColor }}>
                  <div className="flex justify-between items-start">
                    <div className="w-11 h-11 bg-white/25 rounded-2xl flex items-center justify-center border border-white/30 text-2xl">
                      {folder.icon || '📁'}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white" onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingNotebook(folder); setIsFolderFormOpen(true); }} className="cursor-pointer gap-2 font-bold"><Edit className="w-4 h-4 text-slate-500" /> Düzenle</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="cursor-pointer gap-2 font-bold text-rose-600"><Trash2 className="w-4 h-4" /> Sil</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight mb-1">{folder.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{noteCount} Not</span>
                      {folder.password && <span className="bg-black/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"><Lock className="w-3 h-3"/> Şifreli</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={() => { setEditingNotebook(null); setIsFolderFormOpen(true); }} className="h-14 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/40 font-black text-base flex items-center gap-2">
          <FolderPlus className="w-5 h-5" /> Yeni Klasör
        </Button>
      </div>
    </div>
  );

  const renderNotesScreen = () => {
    return (
      <div className="flex-1 overflow-y-auto w-full relative z-10 pb-32 [scrollbar-width:none]">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-b-[32px] pt-12 pb-6 px-5 text-white shadow-md sticky top-0 z-30">
          <div className="flex items-center justify-between mb-5">
            <Button variant="ghost" size="icon" onClick={goBack} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-xl font-black truncate px-2">{currentFolder?.icon || '📁'} {currentFolder?.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setViewMode(v => v === 'grid' ? 'list' : v === 'list' ? 'title' : 'grid')} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white">
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : viewMode === 'list' ? <AlignLeft className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => {}} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Glassmorphism Tabs */}
          <div className="flex overflow-x-auto gap-2 [scrollbar-width:none]">
            <button onClick={() => setActiveSectionId('default')} className={cn("px-4 py-2 rounded-[20px] font-bold text-sm transition-all border", activeSectionId === 'default' ? "bg-white text-indigo-600 border-white" : "bg-white/15 text-white border-white/20")}>
              Genel
            </button>
            <button onClick={() => setActiveSectionId('passwords-tab')} className={cn("px-4 py-2 rounded-[20px] font-bold text-sm transition-all border flex items-center gap-2", activeSectionId === 'passwords-tab' ? "bg-white text-indigo-600 border-white" : "bg-white/15 text-white border-white/20")}>
              <Key className="w-4 h-4" /> Şifreler
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 mt-4">
          {activeSectionId === 'passwords-tab' ? (
            <div className="flex overflow-x-auto gap-2 pb-2 [scrollbar-width:none]">
              {PASSWORD_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setPwdCategory(cat.id)} className={cn("px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap border transition-all", pwdCategory === cat.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700")}>
                  {cat.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-2 pb-2 [scrollbar-width:none]">
              <button onClick={() => setActiveColorFilter('all')} className={cn("px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap border transition-all", activeColorFilter === 'all' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700")}>
                🎨 Tüm Renkler
              </button>
              {NOTE_COLORS.map(c => (
                <button key={c.id} onClick={() => setActiveColorFilter(c.id)} className={cn("w-8 h-8 rounded-full border-2 transition-transform", activeColorFilter === c.id ? "scale-110 border-indigo-500" : "border-transparent")} style={{ backgroundColor: c.bg }}></button>
              ))}
            </div>
          )}
        </div>

        {/* Notes Grid */}
        <div className="px-4 mt-4">
          {displayedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <div className={cn("w-20 h-20 rounded-[28px] flex items-center justify-center mb-4", activeSectionId === 'passwords-tab' ? "bg-indigo-600/20" : "bg-purple-600/20")}>
                {activeSectionId === 'passwords-tab' ? <Key className="w-8 h-8 text-indigo-600" /> : <FileText className="w-8 h-8 text-purple-600" />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{activeSectionId === 'passwords-tab' ? 'Henüz şifre yok' : 'Henüz not yok'}</h3>
            </div>
          ) : (
            <div className={cn("gap-3", viewMode === 'grid' ? "grid grid-cols-2" : "flex flex-col")}>
              {displayedNotes.map(note => {
                if (note.isPassword) {
                  const isExpanded = expandedPasswordId === note.id;
                  const isRevealed = !!showPasswordMap[note.id];
                  const theme = getPasswordCategoryTheme(note.passwordCategory, false);
                  return (
                    <div key={note.id} className="w-full rounded-2xl overflow-hidden border-[1.5px] shadow-sm mb-2" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
                      <div onClick={() => setExpandedPasswordId(isExpanded ? null : note.id)} className="p-3 flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary }}><Key className="w-5 h-5 text-white" /></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm truncate max-w-[120px]">{note.username ? `👤 ${note.username}` : note.accountName}</h3>
                              {note.passwordCategory && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.badgeBg, color: theme.primary }}>{note.passwordCategory}</span>}
                            </div>
                            <p className="text-[11px] font-bold mt-0.5" style={{ color: theme.text }}>🔑 {note.accountName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openPasswordForm(note); }}><Edit className="w-4 h-4" style={{ color: theme.primary }}/></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}><Trash2 className="w-4 h-4"/></Button>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.badgeBg }}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: theme.primary }}/> : <ChevronDown className="w-4 h-4" style={{ color: theme.primary }}/>}
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-3 border-t border-black/5 bg-white/50 space-y-3">
                          {note.username && (
                            <div className="bg-white rounded-xl p-3 border border-black/5 flex items-center justify-between">
                              <div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase">Kullanıcı Adı</p>
                                <p className="text-sm font-bold mt-0.5">{note.username}</p>
                              </div>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 gap-2 text-xs font-bold" onClick={() => navigator.clipboard.writeText(note.username || '')}><Copy className="w-3 h-3"/> Kopyala</Button>
                            </div>
                          )}
                          <div className="bg-white rounded-xl p-3 border border-black/5 flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Şifre</p>
                              <p className="text-sm font-bold mt-0.5 tracking-widest font-mono">{isRevealed ? note.password : '••••••••'}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowPasswordMap(p => ({ ...p, [note.id]: !p[note.id] }))}>
                                {isRevealed ? <EyeOff className="w-4 h-4 text-indigo-600"/> : <Eye className="w-4 h-4 text-indigo-600"/>}
                              </Button>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 gap-2 text-xs font-bold" onClick={() => navigator.clipboard.writeText(note.password || '')}><Copy className="w-3 h-3"/> Kopyala</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // General Note Card
                const nc = getNoteColor(note.color);
                return (
                  <div key={note.id} onClick={() => openEditor(note)} className={cn("relative rounded-2xl p-4 border-[1.5px] cursor-pointer shadow-sm", viewMode === 'title' ? "flex items-center gap-3 py-3" : "flex flex-col")} style={{ backgroundColor: nc.light, borderColor: nc.bg + '40' }}>
                    <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: nc.bg }}></div>
                    <div className="flex items-start justify-between mt-1 mb-2 w-full">
                      <h3 className="font-bold text-sm text-slate-900 truncate pr-2 flex-1">{note.title || 'İsimsiz Not'}</h3>
                    </div>
                    {viewMode !== 'title' && (
                      <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                        {note.content?.[0]?.data || ''}
                      </p>
                    )}
                    <div className={cn("flex items-center justify-between", viewMode === 'title' && "w-auto")}>
                      <span className="text-[10px] font-bold" style={{ color: nc.bg }}>{formatDate(note.updatedAt || note.createdAt)}</span>
                      <div className="flex gap-1 items-center">
                        {note.pinned && <Pin className="w-3 h-3" style={{ color: nc.bg }}/>}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}><MoreVertical className="w-4 h-4" style={{ color: nc.bg }}/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl font-bold">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditor(note); }} className="gap-2"><Edit className="w-4 h-4"/> Düzenle</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }} className="gap-2">{note.pinned ? <PinOff className="w-4 h-4"/> : <Pin className="w-4 h-4"/>} {note.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="text-rose-600 gap-2"><Trash2 className="w-4 h-4"/> Sil</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={() => activeSectionId === 'passwords-tab' ? openPasswordForm() : openEditor()} className="h-14 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl font-black text-base flex items-center gap-2">
            {activeSectionId === 'passwords-tab' ? <><Key className="w-5 h-5"/> Şifre Ekle</> : <><Plus className="w-5 h-5"/> Not Ekle</>}
          </Button>
        </div>
      </div>
    );
  };

  const renderEditorScreen = () => {
    const nc = getNoteColor(noteForm.color);
    const pattern = noteForm.paperPattern as 'plain' | 'lined' | 'grid' | 'dots';
    
    return (
      <div className="flex-1 flex flex-col w-full h-[100dvh]" style={{ backgroundColor: nc.light }}>
        <div className="h-14 px-4 flex items-center justify-between" style={{ backgroundColor: nc.bg }}>
          <Button variant="ghost" size="icon" onClick={goBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><Palette className="w-5 h-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-2 grid grid-cols-4 gap-2 rounded-xl">
                {NOTE_COLORS.map(c => (
                  <button key={c.id} onClick={() => setNoteForm(p => ({ ...p, color: c.id }))} className="w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: c.bg, borderColor: noteForm.color === c.id ? '#000' : 'transparent' }}>
                    {noteForm.color === c.id && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={handleSaveNote} className="text-white hover:bg-white/20"><Check className="w-5 h-5" /></Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex items-center gap-2 overflow-x-auto">
          {['plain', 'lined', 'grid', 'dots'].map(p => (
            <button key={p} onClick={() => setNoteForm(prev => ({ ...prev, paperPattern: p }))} className={cn("px-3 py-1.5 rounded-full text-xs font-bold border", pattern === p ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-100 text-slate-600 border-slate-200")}>
              {p === 'plain' ? '📄 Düz' : p === 'lined' ? '📝 Çizgili' : p === 'grid' ? '🏁 Kareli' : '🔴 Noktalı'}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-300 mx-2"></div>
          <button onClick={() => setNoteForm(p => ({ ...p, content: p.content + '\n☐ ' }))} className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Görev</button>
          <button onClick={() => setNoteForm(p => ({ ...p, content: p.content + '\n• ' }))} className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1"><List className="w-3 h-3"/> Madde</button>
        </div>

        <div className="flex-1 p-6 relative overflow-y-auto">
          {pattern !== 'plain' && <PaperBackgroundOverlay type={pattern as any} />}
          <div className="relative z-10 h-full flex flex-col">
            <input 
              value={noteForm.title} 
              onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} 
              placeholder="Başlık..." 
              className="w-full text-3xl font-black bg-transparent border-none outline-none mb-4 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <textarea 
              value={noteForm.content} 
              onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))} 
              placeholder="Yazmaya başla..." 
              className={cn("flex-1 w-full bg-transparent border-none outline-none text-base text-slate-800 dark:text-slate-200 resize-none placeholder:text-slate-400", pattern === 'lined' || pattern === 'grid' ? "leading-[36px]" : "leading-relaxed")}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderVaultAuthScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full h-[100dvh] bg-slate-950 text-white relative">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="text-white hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-8 h-8" />
        </Button>
      </div>
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-[32px] border-[1.5px] border-slate-800 shadow-2xl flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-slate-900" />
        </div>
        <h2 className="text-2xl font-black mb-2">Şifreli Klasör</h2>
        <p className="text-slate-400 mb-8 text-sm">Bu klasöre erişmek için şifreyi giriniz.</p>
        <form onSubmit={handleVaultAuth} className="w-full flex flex-col gap-4">
          <Input type="password" placeholder="Klasör şifresi" value={vaultPasswordInput} onChange={e => setVaultPasswordInput(e.target.value)} className="h-14 bg-slate-950 border-slate-800 rounded-2xl text-center text-xl tracking-widest focus:ring-yellow-500" autoFocus />
          {vaultAuthError && <p className="text-rose-500 font-bold text-sm">{vaultAuthError}</p>}
          <Button type="submit" className="h-14 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-lg">Kilidi Aç</Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 relative overflow-hidden">
      {screen === 'folders' && renderFoldersScreen()}
      {screen === 'notes' && renderNotesScreen()}
      {screen === 'editor' && renderEditorScreen()}
      {screen === 'vault_auth' && renderVaultAuthScreen()}

      <Dialog open={isFolderFormOpen} onOpenChange={(open) => { if (!open) setEditingNotebook(null); setIsFolderFormOpen(open); }}>
        <DialogContent className="w-[95%] sm:max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black">{editingNotebook ? "Klasörü Düzenle" : "Yeni Klasör"}</DialogTitle>
          </DialogHeader>
          <NewNotebookForm onSubmit={handleFolderSubmit} initialData={editingNotebook} availableFolders={notebooks} currentFolderId={currentFolderId} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPasswordFormOpen} onOpenChange={(open) => { if(!open) setEditingPasswordNote(null); setIsPasswordFormOpen(open); }}>
        <DialogContent className="w-[95%] sm:max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-0 shadow-2xl overflow-hidden border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{editingPasswordNote ? "Şifreyi Düzenle" : "Hızlı Şifre Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black">{editingPasswordNote ? "Şifreyi Düzenle" : "Hızlı Şifre Ekle"}</h2>
              <p className="text-indigo-200 text-sm font-medium mt-1">Güvenli Şifre Kasası</p>
            </div>
            <Key className="w-8 h-8 text-indigo-300" />
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex overflow-x-auto gap-2 pb-2 [scrollbar-width:none]">
              {PASSWORD_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <button key={c.id} onClick={() => setPasswordForm(p => ({ ...p, accountName: c.name, category: c.name }))} className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 whitespace-nowrap">
                  {c.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">📌 Ne Şifresi? (Hesap / Platform) *</label>
              <Input value={passwordForm.accountName} onChange={e => setPasswordForm(p => ({ ...p, accountName: e.target.value }))} className="bg-slate-50 rounded-xl h-12 font-bold" placeholder="Örn: Netflix, Ev Wi-Fi" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">👤 Kullanıcı Adı / E-posta</label>
              <Input value={passwordForm.username} onChange={e => setPasswordForm(p => ({ ...p, username: e.target.value }))} className="bg-slate-50 rounded-xl h-12 font-bold" placeholder="Örn: ahmet@gmail.com" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">🔑 Şifre *</label>
              <Input value={passwordForm.password} onChange={e => setPasswordForm(p => ({ ...p, password: e.target.value }))} className="bg-slate-50 rounded-xl h-12 font-bold font-mono tracking-widest" placeholder="Şifreyi girin" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">📝 Ek Not</label>
              <Input value={passwordForm.notes} onChange={e => setPasswordForm(p => ({ ...p, notes: e.target.value }))} className="bg-slate-50 rounded-xl h-12" placeholder="Örn: Kurtarma kodu" />
            </div>
            <Button onClick={handleSavePassword} className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg mt-4">
              {editingPasswordNote ? "💾 Değişiklikleri Kaydet" : "🔐 Şifreyi Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
