import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import {
  onNotesUpdate,
  onNotebooksUpdate,
  addNotebook,
  updateNotebook,
  deleteNotebook,
  addNoteToSection,
  updateNoteInSection,
  deleteNoteFromSection,
} from '../lib/dataService';
import { Note, Notebook, NotebookSection } from '../lib/data';
import { useAuth } from '../context/auth-context';
import {
  ChevronLeft,
  Plus,
  Search,
  Trash2,
  Check,
  FileText,
  X,
  Pin,
  Folder,
  FolderOpen,
  ChevronRight,
  Clock,
  List,
  Minus,
  CheckSquare,
  MoreHorizontal,
  ArrowLeft,
  PinOff,
  Edit3,
  Home,
  FolderPlus,
  Palette,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// ── COLORS ──────────────────────────────────────────────────────

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
  '#7C3AED': ['#8B5CF6', '#6D28D9'],
  '#DB2777': ['#F43F5E', '#BE185D'],
  '#DC2626': ['#EF4444', '#B91C1C'],
  '#EA580C': ['#F97316', '#C2410C'],
  '#D97706': ['#F59E0B', '#B45309'],
  '#059669': ['#10B981', '#047857'],
  '#0891B2': ['#06B6D4', '#0E7490'],
  '#2563EB': ['#3B82F6', '#1D4ED8'],
};

const getNoteColor = (colorId?: string) =>
  NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0];

type Screen = 'folders' | 'notes' | 'editor';

export default function NotesScreen() {
  const { user, familyId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [screen, setScreen] = useState<Screen>('folders');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);  // current notebook
  const [activeSectionId, setActiveSectionId] = useState<string>('default');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Breadcrumb stack: array of {id, title}
  const [folderStack, setFolderStack] = useState<{ id: string; title: string; icon: string }[]>([]);

  // Modals
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isNewSectionOpen, setIsNewSectionOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [noteOptionsVisible, setNoteOptionsVisible] = useState(false);
  const [folderOptionsId, setFolderOptionsId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Forms
  const [searchTerm, setSearchTerm] = useState('');
  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: 'purple' });
  const [folderForm, setFolderForm] = useState({ title: '', icon: '📁', color: FOLDER_COLORS[0] });
  const [sectionForm, setSectionForm] = useState({ title: '', color: FOLDER_COLORS[0] });
  const [colorPickerTarget, setColorPickerTarget] = useState<string | null>(null); // noteId

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<TextInput>(null);

  // ── Theme ──
  const bg = isDark ? '#0D0D12' : '#F4F3FF';
  const cardBg = isDark ? '#1A1825' : '#FFFFFF';
  const textPrimary = isDark ? '#F0EFF8' : '#111827';
  const textSecondary = isDark ? '#6B6A7A' : '#6B7280';
  const border = isDark ? '#252438' : '#E5E7EB';
  const headerBg = isDark ? '#13121E' : '#FFFFFF';

  // ── Firestore ──
  useEffect(() => {
    let unsubNotes = () => {};
    let unsubNotebooks = () => {};
    try {
      unsubNotes = onNotesUpdate((data) => setNotes(data));
      unsubNotebooks = onNotebooksUpdate((data) => {
        setNotebooks(data);
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
    return () => { unsubNotes(); unsubNotebooks(); };
  }, []);

  // Auto-create root notebook
  useEffect(() => {
    if (!loading && notebooks.length === 0 && familyId) {
      addNotebook({
        title: 'Notlarım',
        icon: '📝',
        description: '',
        color: '#7C3AED',
        sections: [{ id: 'default', title: 'Genel', color: '#7C3AED', order: 0 }],
      }).catch(console.log);
    }
  }, [loading, notebooks, familyId]);

  // Current folder (notebook)
  const activeFolder = useMemo(
    () => notebooks.find((n) => n.id === activeFolderId) || null,
    [notebooks, activeFolderId]
  );

  // Subfolders of current folder (parentId === activeFolderId)
  const subFolders = useMemo(
    () => notebooks.filter((n) => (n.parentId || null) === activeFolderId),
    [notebooks, activeFolderId]
  );

  // Sections of current folder
  const sections = useMemo((): NotebookSection[] => {
    if (!activeFolder?.sections?.length) {
      return [{ id: 'default', title: 'Genel', color: '#7C3AED', order: 0 }];
    }
    return activeFolder.sections;
  }, [activeFolder]);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) || sections[0] || { id: 'default', title: 'Genel', color: '#7C3AED' },
    [sections, activeSectionId]
  );

  // Notes in current section
  const sectionNotes = useMemo(() => {
    let filtered = notes.filter(
      (n) =>
        (n.notebookId || 'root') === (activeFolderId || 'root') &&
        (n.sectionId || 'default') === (activeSectionId || 'default')
    );
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content?.[0]?.data?.toLowerCase().includes(q)
      );
    }
    return filtered.sort(
      (a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [notes, activeFolderId, activeSectionId, searchTerm]);

  const activeNote = useMemo(
    () => sectionNotes.find((n) => n.id === activeNoteId) || null,
    [sectionNotes, activeNoteId]
  );

  useEffect(() => {
    if (activeNote) {
      setNoteForm({
        title: activeNote.title || '',
        content: activeNote.content?.[0]?.data || '',
        color: activeNote.color || 'purple',
      });
    }
  }, [activeNoteId]);

  // ── Helpers ──
  const formatDate = (d?: string) => {
    if (!d) return '';
    try { return format(parseISO(d), 'd MMMM yyyy, HH:mm', { locale: tr }); } catch { return ''; }
  };

  const formatShort = (d?: string) => {
    if (!d) return '';
    try {
      const dt = parseISO(d);
      const diff = Math.floor((Date.now() - dt.getTime()) / 86400000);
      if (diff === 0) return format(dt, 'HH:mm');
      if (diff < 7) return format(dt, 'EEE', { locale: tr });
      return format(dt, 'd MMM', { locale: tr });
    } catch { return ''; }
  };

  const getPreview = (note: Note) =>
    (note.content?.[0]?.data || '').replace(/\n/g, ' ').trim().slice(0, 70);

  const getNoteCount = (nbId: string) => notes.filter((n) => n.notebookId === nbId).length;

  // ── Actions ──
  const scheduleSave = useCallback((title: string, content: string, color: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!activeNoteId || !activeFolderId) return;
      try {
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        await updateNoteInSection(activeFolderId, activeNoteId, {
          ...note,
          title: title.trim() || 'İsimsiz Not',
          content: [{ id: '1', type: 'text' as const, data: content }],
          color,
          updatedAt: new Date().toISOString(),
        });
      } catch {}
    }, 1200);
  }, [activeNoteId, activeFolderId, notes]);

  const handleNewNote = async () => {
    if (!familyId || !activeFolderId) return;
    try {
      const color = NOTE_COLORS[Math.floor(Math.random() * 8)].id;
      const payload = {
        title: 'Yeni Not',
        content: [{ id: '1', type: 'text' as const, data: '' }],
        color,
        notebookId: activeFolderId,
        sectionId: activeSectionId,
        updatedAt: new Date().toISOString(),
        pinned: false,
      };
      const ref = await addNoteToSection(familyId, activeFolderId, activeSectionId, payload);
      if (ref?.id) {
        setActiveNoteId(ref.id);
        setNoteForm({ title: 'Yeni Not', content: '', color });
        setScreen('editor');
        setTimeout(() => contentRef.current?.focus(), 400);
      }
    } catch {
      Alert.alert('Hata', 'Not oluşturulamadı.');
    }
  };

  const handleOpenNote = (note: Note) => {
    setActiveNoteId(note.id);
    setNoteForm({ title: note.title || '', content: note.content?.[0]?.data || '', color: note.color || 'purple' });
    setScreen('editor');
  };

  const handleTogglePin = async (note: Note) => {
    if (!note.notebookId) return;
    try {
      await updateNoteInSection(note.notebookId, note.id, { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() });
    } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert('Notu Sil', 'Bu notu silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await deleteNoteFromSection(noteId);
            if (activeNoteId === noteId) { setActiveNoteId(null); setScreen('notes'); }
            setNoteOptionsVisible(false);
          } catch { Alert.alert('Hata', 'Not silinemedi.'); }
        },
      },
    ]);
  };

  const handleChangeNoteColor = async (colorId: string) => {
    if (!colorPickerTarget || !activeFolderId) return;
    const note = notes.find((n) => n.id === colorPickerTarget);
    if (!note) return;
    try {
      await updateNoteInSection(activeFolderId, colorPickerTarget, { ...note, color: colorId, updatedAt: new Date().toISOString() });
      if (colorPickerTarget === activeNoteId) setNoteForm((p) => ({ ...p, color: colorId }));
    } catch {}
    setIsColorPickerOpen(false);
  };

  const handleOpenFolder = (nb: Notebook) => {
    setFolderStack((prev) => [...prev, { id: nb.id, title: nb.title, icon: nb.icon || '📁' }]);
    setActiveFolderId(nb.id);
    setActiveSectionId(nb.sections?.[0]?.id || 'default');
    setScreen('notes');
  };

  const handleGoBack = () => {
    if (screen === 'editor') { setScreen('notes'); setActiveNoteId(null); return; }
    if (screen === 'notes') {
      setScreen('folders');
      const newStack = [...folderStack];
      newStack.pop();
      setFolderStack(newStack);
      const parentEntry = newStack[newStack.length - 1];
      setActiveFolderId(parentEntry?.id || null);
      return;
    }
    router.back();
  };

  const handleCreateFolder = async () => {
    if (!folderForm.title.trim()) { Alert.alert('Hata', 'Klasör adı girin.'); return; }
    try {
      if (editingFolderId) {
        await updateNotebook(editingFolderId, {
          title: folderForm.title.trim(),
          icon: folderForm.icon.trim() || '📁',
          color: folderForm.color,
        });
      } else {
        await addNotebook({
          title: folderForm.title.trim(),
          icon: folderForm.icon.trim() || '📁',
          description: '',
          color: folderForm.color,
          sections: [{ id: 'default', title: 'Genel', color: folderForm.color, order: 0 }],
          parentId: activeFolderId || undefined,
        } as any);
      }
      setIsNewFolderOpen(false);
      setFolderForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] });
      setEditingFolderId(null);
    } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  const handleDeleteFolder = (nbId: string) => {
    Alert.alert('Klasörü Sil', 'Bu klasörü ve tüm içeriğini silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await deleteNotebook(nbId);
            setFolderOptionsId(null);
          } catch { Alert.alert('Hata', 'Klasör silinemedi.'); }
        },
      },
    ]);
  };

  const handleCreateSection = async () => {
    if (!activeFolder || !sectionForm.title.trim()) { Alert.alert('Hata', 'Bölüm adı girin.'); return; }
    try {
      const newSec: NotebookSection = {
        id: 'sec-' + Math.random().toString(36).substr(2, 9),
        title: sectionForm.title.trim(),
        color: sectionForm.color,
        order: sections.length,
      };
      await updateNotebook(activeFolder.id, { ...activeFolder, sections: [...(activeFolder.sections || []), newSec] });
      setActiveSectionId(newSec.id);
      setIsNewSectionOpen(false);
      setSectionForm({ title: '', color: FOLDER_COLORS[0] });
    } catch { Alert.alert('Hata', 'Bölüm oluşturulamadı.'); }
  };

  const insertText = (text: string) => {
    setNoteForm((prev) => {
      const updated = { ...prev, content: prev.content + text };
      scheduleSave(updated.title, updated.content, updated.color);
      return updated;
    });
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ color: textSecondary, marginTop: 12, fontSize: 14 }}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  // ── EDITOR SCREEN ─────────────────────────────────────────────
  if (screen === 'editor' && activeNote) {
    const noteColor = getNoteColor(noteForm.color);
    const editorBg = isDark ? noteColor.bg + '22' : noteColor.light;

    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0D0D12' : noteColor.light }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? '#13121E' : noteColor.bg }}>
          <View style={[s.editorTopBar, { backgroundColor: isDark ? '#13121E' : noteColor.bg }]}>
            <TouchableOpacity
              onPress={() => {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                const note = notes.find((n) => n.id === activeNoteId);
                if (note && activeFolderId) {
                  updateNoteInSection(activeFolderId, activeNoteId!, {
                    ...note,
                    title: noteForm.title.trim() || 'İsimsiz Not',
                    content: [{ id: '1', type: 'text' as const, data: noteForm.content }],
                    color: noteForm.color,
                    updatedAt: new Date().toISOString(),
                  }).catch(() => {});
                }
                setScreen('notes');
              }}
              style={s.editorBackBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="white" />
              <Text style={s.editorBackText}>Geri</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              onPress={() => { setColorPickerTarget(activeNoteId); setIsColorPickerOpen(true); }}
              style={[s.editorToolBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              activeOpacity={0.7}
            >
              <Palette size={18} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTogglePin(activeNote)}
              style={[s.editorToolBtn, { backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 6 }]}
              activeOpacity={0.7}
            >
              {activeNote.pinned ? <PinOff size={18} color="white" /> : <Pin size={18} color="white" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteNote(activeNote.id)}
              style={[s.editorToolBtn, { backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 6 }]}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Formatting bar */}
        <View style={[s.fmtBar, { backgroundColor: isDark ? '#1A1825' : '#FFFFFF', borderBottomColor: border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fmtBarContent}>
            {[
              { label: '• Liste', onPress: () => insertText('\n• '), icon: <List size={13} color={textSecondary} /> },
              { label: '☐ Görev', onPress: () => insertText('\n☐ '), icon: <CheckSquare size={13} color={textSecondary} /> },
              { label: '🕐 Saat', onPress: () => insertText(' [' + format(new Date(), 'HH:mm') + '] '), icon: <Clock size={13} color={textSecondary} /> },
              { label: '─ Ayraç', onPress: () => insertText('\n─────────────\n'), icon: <Minus size={13} color={textSecondary} /> },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={[s.fmtChip, { borderColor: border }]} onPress={item.onPress} activeOpacity={0.7}>
                {item.icon}
                <Text style={[s.fmtChipText, { color: textSecondary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Editor body */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.editorBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[s.editorTitleInput, { color: textPrimary }]}
              placeholder="Başlık..."
              placeholderTextColor={textSecondary}
              value={noteForm.title}
              onChangeText={(t) => { setNoteForm((p) => ({ ...p, title: t })); scheduleSave(t, noteForm.content, noteForm.color); }}
              multiline={false}
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />
            <Text style={[s.editorDateText, { color: textSecondary }]}>
              {formatDate(activeNote.updatedAt || activeNote.createdAt)}
            </Text>
            <TextInput
              ref={contentRef}
              style={[s.editorContentInput, { color: isDark ? '#D1D5DB' : '#374151' }]}
              placeholder="Yazmaya başla..."
              placeholderTextColor={textSecondary}
              value={noteForm.content}
              onChangeText={(t) => { setNoteForm((p) => ({ ...p, content: t })); scheduleSave(noteForm.title, t, noteForm.color); }}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Color picker */}
        <ColorPickerModal
          visible={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          onSelect={handleChangeNoteColor}
          selectedId={noteForm.color}
          cardBg={cardBg}
          border={border}
          textPrimary={textPrimary}
        />
      </View>
    );
  }

  // ── NOTES LIST SCREEN ─────────────────────────────────────────
  if (screen === 'notes' && activeFolder) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* ── PREMIUM HEADER ── */}
        <LinearGradient 
          colors={isDark ? ['#4c1d95', '#5b21b6'] : ['#7c3aed', '#8b5cf6']} 
          style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity onPress={handleGoBack} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 10 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={1}>{activeFolder.icon} {activeFolder.title}</Text>
              {folderStack.length > 1 && (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' }} numberOfLines={1}>
                  {folderStack.slice(0, -1).map((f) => f.title).join(' › ')}
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={() => setIsSearchOpen(true)} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Search size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* GLASSMORPHISM TABS FOR SECTIONS */}
          {sections.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {sections.map((sec) => {
                const isActive = sec.id === activeSectionId;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    onPress={() => { setActiveSectionId(sec.id); setActiveNoteId(null); }}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: isActive ? 'white' : 'rgba(255,255,255,0.15)',
                      borderWidth: 1,
                      borderColor: isActive ? 'white' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#7c3aed' : 'white' }}>{sec.title}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => { setSectionForm({ title: '', color: FOLDER_COLORS[0] }); setIsNewSectionOpen(true); }}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Plus size={16} color="white" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </LinearGradient>

        {/* Subfolder row */}
        {subFolders.length > 0 && (
          <View style={[s.subFolderRow, { backgroundColor: bg, paddingTop: 16, paddingBottom: 8 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {subFolders.map((sf, idx) => {
                const isColorValid = sf.color && FOLDER_COLORS.includes(sf.color);
                const sfColor = isColorValid ? sf.color : FOLDER_COLORS[idx % FOLDER_COLORS.length];
                return (
                  <TouchableOpacity
                    key={sf.id}
                    onPress={() => handleOpenFolder(sf)}
                    onLongPress={() => setFolderOptionsId(sf.id)}
                    style={[s.subFolderChip, { backgroundColor: sfColor, borderColor: 'rgba(0,0,0,0.1)' }]}
                    activeOpacity={0.7}
                  >
                    <Folder size={14} color="#FFFFFF" />
                    <Text style={[s.subFolderChipText, { color: '#FFFFFF' }]} numberOfLines={1}>{sf.icon} {sf.title}</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={[s.subFolderChipCount, { color: '#FFFFFF' }]}>{getNoteCount(sf.id)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => { setFolderForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] }); setIsNewFolderOpen(true); }}
                style={[s.subFolderChip, { borderColor: border, borderStyle: 'dashed' }]}
                activeOpacity={0.7}
              >
                <FolderPlus size={14} color={textSecondary} />
                <Text style={[s.subFolderChipText, { color: textSecondary }]}>Alt Klasör</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Note grid */}
        <ScrollView contentContainerStyle={s.noteGrid} showsVerticalScrollIndicator={false}>
          {sectionNotes.length === 0 ? (
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { backgroundColor: '#7C3AED20' }]}>
                <FileText size={32} color="#7C3AED" />
              </View>
              <Text style={[s.emptyTitle, { color: textPrimary }]}>Henüz not yok</Text>
              <Text style={[s.emptyDesc, { color: textSecondary }]}>Aşağıdaki + butonuna basarak{'\n'}ilk notunuzu oluşturun</Text>
            </View>
          ) : (
            <View style={s.noteGridInner}>
              {sectionNotes.map((note, idx) => {
                const nc = getNoteColor(note.color);
                const isWide = idx % 3 === 0; // alternate wide/narrow
                return (
                  <TouchableOpacity
                    key={note.id}
                    onPress={() => handleOpenNote(note)}
                    onLongPress={() => {
                      setActiveNoteId(note.id);
                      setNoteOptionsVisible(true);
                    }}
                    style={[
                      s.noteCard,
                      isWide ? s.noteCardWide : s.noteCardNarrow,
                      { backgroundColor: isDark ? nc.bg + '33' : nc.light, borderColor: isDark ? nc.bg + '55' : nc.bg + '30' },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={[s.noteCardColorBar, { backgroundColor: nc.bg }]} />
                    {note.pinned && (
                      <View style={s.noteCardPinBadge}>
                        <Pin size={9} color={nc.bg} />
                      </View>
                    )}
                    <Text style={[s.noteCardTitle, { color: isDark ? nc.bg : nc.bg }]} numberOfLines={2}>
                      {note.title || 'İsimsiz Not'}
                    </Text>
                    {getPreview(note).length > 0 && (
                      <Text style={[s.noteCardPreview, { color: isDark ? '#A0A0B0' : '#6B7280' }]} numberOfLines={isWide ? 4 : 3}>
                        {getPreview(note)}
                      </Text>
                    )}
                    <Text style={[s.noteCardDate, { color: isDark ? nc.bg + 'AA' : nc.bg + 'BB' }]}>
                      {formatShort(note.updatedAt || note.createdAt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }} pointerEvents="box-none">
          <View style={s.fabRow} pointerEvents="box-none">
            {subFolders.length === 0 && (
              <TouchableOpacity
                onPress={() => { setFolderForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] }); setIsNewFolderOpen(true); }}
                style={[s.fabSecondary, { backgroundColor: cardBg, borderColor: border }]}
                activeOpacity={0.85}
              >
                <FolderPlus size={20} color="#7C3AED" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.fab, { backgroundColor: '#7C3AED' }]} onPress={handleNewNote} activeOpacity={0.85}>
              <Plus size={26} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Note options sheet */}
        <Modal visible={noteOptionsVisible} transparent animationType="slide">
          <View style={s.sheetOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setNoteOptionsVisible(false)} />
            <View style={[s.optionsSheet, { backgroundColor: cardBg }]}>
              <View style={[s.sheetHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
              {activeNote && (
                <>
                  <Text style={[s.optionsSheetTitle, { color: textSecondary }]} numberOfLines={1}>{activeNote.title || 'İsimsiz Not'}</Text>
                  {[
                    { icon: <Palette size={20} color="#7C3AED" />, label: 'Renk Değiştir', onPress: () => { setColorPickerTarget(activeNoteId); setNoteOptionsVisible(false); setIsColorPickerOpen(true); } },
                    { icon: activeNote.pinned ? <PinOff size={20} color={textPrimary} /> : <Pin size={20} color="#F59E0B" />, label: activeNote.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle', onPress: () => { handleTogglePin(activeNote); setNoteOptionsVisible(false); } },
                    { icon: <Edit3 size={20} color="#7C3AED" />, label: 'Düzenle', onPress: () => { handleOpenNote(activeNote); setNoteOptionsVisible(false); } },
                    { icon: <Trash2 size={20} color="#EF4444" />, label: 'Sil', color: '#EF4444', onPress: () => handleDeleteNote(activeNote.id) },
                  ].map((item, i) => (
                    <TouchableOpacity key={i} style={[s.optionsItem, { borderColor: border }]} onPress={item.onPress} activeOpacity={0.7}>
                      {item.icon}
                      <Text style={[s.optionsItemText, { color: item.color || textPrimary }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Folder options */}
        <Modal visible={!!folderOptionsId} transparent animationType="fade">
          <Pressable style={s.sheetOverlay} onPress={() => setFolderOptionsId(null)}>
            <View style={[s.smallMenu, { backgroundColor: cardBg }]}>
              <TouchableOpacity style={s.optionsItem} onPress={() => {
                const nb = notebooks.find(n => n.id === folderOptionsId);
                if (nb) {
                  setFolderForm({ title: nb.title, icon: nb.icon || '📁', color: nb.color || FOLDER_COLORS[0] });
                  setEditingFolderId(nb.id);
                  setFolderOptionsId(null);
                  setIsNewFolderOpen(true);
                }
              }} activeOpacity={0.7}>
                <Edit3 size={18} color={textPrimary} />
                <Text style={[s.optionsItemText, { color: textPrimary }]}>Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.optionsItem} onPress={() => { handleDeleteFolder(folderOptionsId!); setFolderOptionsId(null); }} activeOpacity={0.7}>
                <Trash2 size={18} color="#EF4444" />
                <Text style={[s.optionsItemText, { color: '#EF4444' }]}>Klasörü Sil</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Search */}
        <SearchModal
          visible={isSearchOpen}
          onClose={() => { setIsSearchOpen(false); setSearchTerm(''); }}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          results={sectionNotes}
          onSelect={(note) => { handleOpenNote(note); setIsSearchOpen(false); setSearchTerm(''); }}
          cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} getPreview={getPreview}
          isDark={isDark}
        />

        {/* New/Edit folder modal */}
        <FolderFormModal
          visible={isNewFolderOpen}
          onClose={() => { setIsNewFolderOpen(false); setEditingFolderId(null); }}
          form={folderForm}
          setForm={setFolderForm}
          onSubmit={handleCreateFolder}
          cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} isDark={isDark}
          title={editingFolderId ? "Klasörü Düzenle" : (activeFolderId ? "Yeni Alt Klasör" : "Yeni Klasör")}
        />

        {/* New section modal */}
        <SectionFormModal
          visible={isNewSectionOpen}
          onClose={() => setIsNewSectionOpen(false)}
          form={sectionForm}
          setForm={setSectionForm}
          onSubmit={handleCreateSection}
          cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} isDark={isDark}
        />

        {/* Color picker */}
        <ColorPickerModal
          visible={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          onSelect={handleChangeNoteColor}
          selectedId={colorPickerTarget ? (notes.find((n) => n.id === colorPickerTarget)?.color || 'purple') : 'purple'}
          cardBg={cardBg} border={border} textPrimary={textPrimary}
        />
      </View>
    );
  }

  // ── FOLDERS SCREEN (root) ────────────────────────────────────
  const rootFolders = notebooks.filter((n) => !n.parentId);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── PREMIUM HEADER ── */}
      <LinearGradient 
        colors={isDark ? ['#4c1d95', '#5b21b6'] : ['#7c3aed', '#8b5cf6']} 
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>Notlarım</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' }}>{notes.length} NOT • {rootFolders.length} KLASÖR</Text>
          </View>

          <TouchableOpacity onPress={() => setIsSearchOpen(true)} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.folderGrid} showsVerticalScrollIndicator={false}>
        {rootFolders.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: '#7C3AED20' }]}>
              <Folder size={36} color="#7C3AED" />
            </View>
            <Text style={[s.emptyTitle, { color: textPrimary }]}>Henüz klasör yok</Text>
            <Text style={[s.emptyDesc, { color: textSecondary }]}>+ butonuna basarak{'\n'}ilk klasörünüzü oluşturun</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {rootFolders.map((nb, idx) => {
              const isColorValid = nb.color && FOLDER_COLORS.includes(nb.color);
              const folderColor = isColorValid ? nb.color : FOLDER_COLORS[idx % FOLDER_COLORS.length];
              const gradient = FOLDER_GRADIENTS[folderColor] || [folderColor, folderColor];
              const subCount = notebooks.filter((n) => n.parentId === nb.id).length;
              const noteCount = getNoteCount(nb.id);
              
              const totalItems = subCount + noteCount;

              return (
                <TouchableOpacity
                  key={nb.id}
                  onPress={() => handleOpenFolder(nb)}
                  onLongPress={() => setFolderOptionsId(nb.id)}
                  style={{ width: '48%', marginBottom: 16, borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradient as [string, string, ...string[]]}
                    style={{ padding: 14, minHeight: 145, justifyContent: 'space-between' }}
                  >
                    {/* Card Top Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{nb.icon || '📁'}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => setFolderOptionsId(nb.id)}
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MoreHorizontal size={14} color="white" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Card Info */}
                    <View style={{ marginTop: 16 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginBottom: 4 }} numberOfLines={1}>
                        {nb.title}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' }}>
                        {noteCount} Not • {subCount} Alt Klasör
                      </Text>
                      
                      {/* Card Progress / Separator */}
                      <View style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: '#FFFFFF', borderRadius: 2, width: totalItems > 0 ? '100%' : '0%' }} />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }} pointerEvents="box-none">
        <View style={s.fabRow} pointerEvents="box-none">
          <TouchableOpacity style={[s.fab, { backgroundColor: '#7C3AED' }]} onPress={() => { setFolderForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] }); setIsNewFolderOpen(true); }} activeOpacity={0.85}>
            <Plus size={26} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Folder options */}
      <Modal visible={!!folderOptionsId} transparent animationType="fade">
        <Pressable style={s.sheetOverlay} onPress={() => setFolderOptionsId(null)}>
          <View style={[s.smallMenu, { backgroundColor: cardBg }]}>
            <TouchableOpacity style={s.optionsItem} onPress={() => handleDeleteFolder(folderOptionsId!)} activeOpacity={0.7}>
              <Trash2 size={18} color="#EF4444" />
              <Text style={[s.optionsItemText, { color: '#EF4444' }]}>Klasörü Sil</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Search */}
      <SearchModal
        visible={isSearchOpen}
        onClose={() => { setIsSearchOpen(false); setSearchTerm(''); }}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        results={notes.filter((n) => !searchTerm || n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content?.[0]?.data?.toLowerCase().includes(searchTerm.toLowerCase()))}
        onSelect={(note) => {
          const nb = notebooks.find((nb) => nb.id === note.notebookId);
          if (nb) {
            setFolderStack([{ id: nb.id, title: nb.title, icon: nb.icon || '📁' }]);
            setActiveFolderId(nb.id);
            setActiveSectionId(note.sectionId || 'default');
          }
          handleOpenNote(note);
          setIsSearchOpen(false);
          setSearchTerm('');
        }}
        cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} getPreview={getPreview}
        isDark={isDark}
      />

      {/* New folder modal */}
      <FolderFormModal
        visible={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        form={folderForm}
        setForm={setFolderForm}
        onSubmit={handleCreateFolder}
        cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} isDark={isDark}
        title="Yeni Klasör"
      />
    </View>
  );
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────

function ColorPickerModal({ visible, onClose, onSelect, selectedId, cardBg, border, textPrimary }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.sheetOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.colorSheet, { backgroundColor: cardBg }]}>
          <View style={[s.sheetHandle, { backgroundColor: '#DDD', alignSelf: 'center' }]} />
          <Text style={[s.formSheetTitle, { color: textPrimary }]}>Not Rengi</Text>
          <View style={s.colorGrid}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => onSelect(c.id)}
                style={[s.colorOption, { backgroundColor: c.bg }, selectedId === c.id && { borderWidth: 3, borderColor: '#fff' }]}
                activeOpacity={0.8}
              >
                {selectedId === c.id && <Check size={16} color={c.text} strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FolderFormModal({ visible, onClose, form, setForm, onSubmit, cardBg, textPrimary, textSecondary, border, isDark, title }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.sheetOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.formSheet, { backgroundColor: cardBg }]}>
          <View style={[s.sheetHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
          <Text style={[s.formSheetTitle, { color: textPrimary }]}>{title}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 64 }}>
              <Text style={[s.formLabel, { color: textSecondary }]}>Emoji</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: isDark ? '#0D0D12' : '#F3F4F6', color: textPrimary, borderColor: border, textAlign: 'center', fontSize: 22 }]}
                value={form.icon}
                onChangeText={(t: string) => setForm((p: any) => ({ ...p, icon: t }))}
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: textSecondary }]}>Klasör Adı</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: isDark ? '#0D0D12' : '#F3F4F6', color: textPrimary, borderColor: border }]}
                placeholder="Örn: İş Notları"
                placeholderTextColor={textSecondary}
                value={form.title}
                onChangeText={(t: string) => setForm((p: any) => ({ ...p, title: t }))}
              />
            </View>
          </View>
          <Text style={[s.formLabel, { color: textSecondary, marginTop: 16 }]}>Renk</Text>
          <View style={s.colorPicker}>
            {FOLDER_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setForm((p: any) => ({ ...p, color }))}
                style={[s.colorOption, { backgroundColor: color }, form.color === color && { borderWidth: 3, borderColor: '#fff' }]}
                activeOpacity={0.8}
              >
                {form.color === color && <Check size={14} color="white" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onSubmit} style={[s.formPrimaryBtn, { backgroundColor: '#7C3AED' }]} activeOpacity={0.8}>
            <Text style={s.formPrimaryBtnText}>Oluştur</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SectionFormModal({ visible, onClose, form, setForm, onSubmit, cardBg, textPrimary, textSecondary, border, isDark }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.sheetOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.formSheet, { backgroundColor: cardBg }]}>
          <View style={[s.sheetHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
          <Text style={[s.formSheetTitle, { color: textPrimary }]}>Yeni Bölüm</Text>
          <Text style={[s.formLabel, { color: textSecondary }]}>Bölüm Adı</Text>
          <TextInput
            style={[s.formInput, { backgroundColor: isDark ? '#0D0D12' : '#F3F4F6', color: textPrimary, borderColor: border }]}
            placeholder="Örn: Toplantılar, Fikirler..."
            placeholderTextColor={textSecondary}
            value={form.title}
            onChangeText={(t: string) => setForm((p: any) => ({ ...p, title: t }))}
            autoFocus
          />
          <Text style={[s.formLabel, { color: textSecondary, marginTop: 14 }]}>Renk</Text>
          <View style={s.colorPicker}>
            {FOLDER_COLORS.map((color) => (
              <TouchableOpacity key={color} onPress={() => setForm((p: any) => ({ ...p, color }))} style={[s.colorOption, { backgroundColor: color }, form.color === color && { borderWidth: 3, borderColor: '#fff' }]} activeOpacity={0.8}>
                {form.color === color && <Check size={14} color="white" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onSubmit} style={[s.formPrimaryBtn, { backgroundColor: '#7C3AED' }]} activeOpacity={0.8}>
            <Text style={s.formPrimaryBtnText}>Bölüm Oluştur</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SearchModal({ visible, onClose, searchTerm, onSearch, results, onSelect, cardBg, textPrimary, textSecondary, border, getPreview, isDark }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[s.searchModal, { backgroundColor: isDark ? 'rgba(10,10,18,0.97)' : 'rgba(255,255,255,0.97)' }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={[s.searchHeader, { borderBottomColor: border }]}>
            <View style={[s.searchInputWrap, { backgroundColor: isDark ? '#1A1825' : '#F3F4F6' }]}>
              <Search size={16} color={textSecondary} />
              <TextInput
                style={[s.searchInput, { color: textPrimary }]}
                placeholder="Notlarda ara..."
                placeholderTextColor={textSecondary}
                value={searchTerm}
                onChangeText={onSearch}
                autoFocus
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => onSearch('')}>
                  <X size={16} color={textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
              <Text style={{ color: '#7C3AED', fontSize: 15, fontWeight: '600' }}>İptal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {results.map((note: Note) => {
            const nc = getNoteColor(note.color);
            return (
              <TouchableOpacity
                key={note.id}
                style={[s.searchResultItem, { backgroundColor: isDark ? nc.bg + '22' : nc.light, borderColor: nc.bg + '40' }]}
                onPress={() => onSelect(note)}
                activeOpacity={0.7}
              >
                <View style={[s.searchResultColorDot, { backgroundColor: nc.bg }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.searchResultTitle, { color: isDark ? '#F0EFF8' : '#111827' }]} numberOfLines={1}>
                    {note.title || 'İsimsiz Not'}
                  </Text>
                  {getPreview(note).length > 0 && (
                    <Text style={[s.searchResultPreview, { color: textSecondary }]} numberOfLines={1}>
                      {getPreview(note)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {results.length === 0 && searchTerm.length > 0 && (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Text style={{ color: textSecondary, fontSize: 15 }}>Sonuç bulunamadı</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── STYLES ───────────────────────────────────────────────────────

const s = StyleSheet.create({
  listHeader: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBackBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  folderHeaderTitle: { fontSize: 17, fontWeight: '800' },
  breadcrumb: { fontSize: 11, marginTop: 1 },

  // Section tabs
  sectionScroll: { borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTab: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  sectionTabText: { fontSize: 13 },
  sectionTabAdd: { paddingHorizontal: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },

  // Subfolder row
  subFolderRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  subFolderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  subFolderChipText: { fontSize: 12, fontWeight: '700', maxWidth: 80 },
  subFolderChipCount: { fontSize: 11, fontWeight: '600', opacity: 0.7 },

  // Folder grid (root screen)
  folderGrid: { padding: 14, gap: 12, paddingBottom: 100 },
  folderCard: {
    borderRadius: 20, padding: 16, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  folderCardIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  folderCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  folderCardMeta: { flexDirection: 'row', gap: 6 },
  folderMetaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  folderMetaBadgeText: { fontSize: 11, fontWeight: '700' },

  // Note grid (masonry-ish)
  noteGrid: { padding: 12, paddingBottom: 100 },
  noteGridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  noteCard: {
    borderRadius: 16, padding: 14, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  noteCardWide: { width: '100%' },
  noteCardNarrow: { width: '47%' },
  noteCardColorBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  noteCardPinBadge: { position: 'absolute', top: 10, right: 10 },
  noteCardTitle: { fontSize: 14, fontWeight: '800', marginTop: 8, marginBottom: 5 },
  noteCardPreview: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  noteCardDate: { fontSize: 10, fontWeight: '600', marginTop: 4 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // FAB
  fabRow: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fab: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabSecondary: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },

  // Editor
  editorTopBar: {
    height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6,
  },
  editorBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingRight: 8 },
  editorBackText: { color: 'white', fontSize: 15, fontWeight: '600' },
  editorToolBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fmtBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  fmtBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  fmtChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  fmtChipText: { fontSize: 12, fontWeight: '600' },
  editorBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80 },
  editorTitleInput: { fontSize: 26, fontWeight: '800', backgroundColor: 'transparent', padding: 0, marginBottom: 6 },
  editorDateText: { fontSize: 12, marginBottom: 16 },
  editorContentInput: { fontSize: 16, lineHeight: 28, backgroundColor: 'transparent', padding: 0, minHeight: 300 },

  // Sheets
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  optionsSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  optionsSheetTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  optionsItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optionsItemText: { fontSize: 16, fontWeight: '500' },
  smallMenu: { borderRadius: 16, margin: 20, overflow: 'hidden', alignSelf: 'center', minWidth: 200 },

  // Color picker
  colorSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  colorOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Form sheets
  formSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  formSheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '500', marginBottom: 4 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  formPrimaryBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  formPrimaryBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  // Search
  searchModal: { flex: 1 },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  searchResultItem: { borderRadius: 14, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchResultColorDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  searchResultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  searchResultPreview: { fontSize: 12 },
});