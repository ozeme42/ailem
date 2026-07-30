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
  Image,
  PanResponder,
  Animated,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import Svg, { Line as SvgLine, Circle, Pattern, Rect } from 'react-native-svg';

function PaperBackgroundOverlay({ type, isDark }: { type: 'lined' | 'grid' | 'dots'; isDark: boolean }) {
  const strokeColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(99,102,241,0.28)';
  const dotColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(99,102,241,0.45)';

  if (type === 'lined') {
    return (
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Pattern id="lined-pattern" width="100%" height="36" patternUnits="userSpaceOnUse">
            <SvgLine x1="0" y1="35" x2="100%" y2="35" stroke={strokeColor} strokeWidth="1.2" />
          </Pattern>
          <Rect width="100%" height="100%" fill="url(#lined-pattern)" />
        </Svg>
      </View>
    );
  }

  if (type === 'grid') {
    return (
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Pattern id="grid-pattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <SvgLine x1="0" y1="36" x2="36" y2="36" stroke={strokeColor} strokeWidth="1" />
            <SvgLine x1="36" y1="0" x2="36" y2="36" stroke={strokeColor} strokeWidth="1" />
          </Pattern>
          <Rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </Svg>
      </View>
    );
  }

  if (type === 'dots') {
    return (
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Pattern id="dots-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <Circle cx="12" cy="12" r="1.5" fill={dotColor} />
          </Pattern>
          <Rect width="100%" height="100%" fill="url(#dots-pattern)" />
        </Svg>
      </View>
    );
  }

  return null;
}
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
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  ShieldCheck,
  Dices,
  CheckCheck,
  Sparkles,
  RotateCcw,
  Grid,
  LayoutList,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Image as ImageIcon,
  Maximize2,
  GripHorizontal,
  Link as LinkIcon,
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
  const [noteForm, setNoteForm] = useState<{ title: string; content: string; color: string; imageUrl?: string | null }>({ title: '', content: '', color: 'purple', imageUrl: null });

interface PasswordTemplate {
  id: string;
  label: string;
  name: string;
  cat: string;
}

const DEFAULT_PASSWORD_TEMPLATES: PasswordTemplate[] = [
  { id: '1', label: '🎬 Netflix', name: 'Netflix', cat: 'Sosyal Medya' },
  { id: '2', label: '📱 Instagram', name: 'Instagram', cat: 'Sosyal Medya' },
  { id: '3', label: '📶 Ev Wi-Fi', name: 'Ev Wi-Fi', cat: 'Wi-Fi' },
  { id: '4', label: '🏛️ e-Devlet', name: 'e-Devlet', cat: 'Diğer' },
  { id: '5', label: '🏦 Banka', name: 'Banka Hesabı', cat: 'Banka' },
  { id: '6', label: '📧 Gmail', name: 'Gmail', cat: 'E-posta' },
];

function getPasswordCategoryTheme(category?: string, isDark?: boolean) {
  const cat = (category || '').toLowerCase();
  
  if (cat.includes('sosyal')) {
    return {
      primary: '#6366f1',
      bg: isDark ? '#1e1b4b' : '#eef2ff',
      border: isDark ? '#4338ca' : '#c7d2fe',
      badgeBg: isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff',
      text: isDark ? '#a5b4fc' : '#4338ca',
    };
  }
  if (cat.includes('banka') || cat.includes('finans')) {
    return {
      primary: '#059669',
      bg: isDark ? '#064e3b' : '#ecfdf5',
      border: isDark ? '#047857' : '#a7f3d0',
      badgeBg: isDark ? 'rgba(5,150,105,0.25)' : '#d1fae5',
      text: isDark ? '#6ee7b7' : '#047857',
    };
  }
  if (cat.includes('posta') || cat.includes('email') || cat.includes('mail')) {
    return {
      primary: '#d97706',
      bg: isDark ? '#451a03' : '#fffbeb',
      border: isDark ? '#b45309' : '#fde68a',
      badgeBg: isDark ? 'rgba(217,119,6,0.25)' : '#fef3c7',
      text: isDark ? '#fcd34d' : '#b45309',
    };
  }
  if (cat.includes('wi-fi') || cat.includes('wifi') || cat.includes('internet')) {
    return {
      primary: '#0284c7',
      bg: isDark ? '#0c4a6e' : '#f0f9ff',
      border: isDark ? '#0369a1' : '#bae6fd',
      badgeBg: isDark ? 'rgba(2,132,199,0.25)' : '#e0f2fe',
      text: isDark ? '#7dd3fc' : '#0369a1',
    };
  }
  if (cat.includes('iş') || cat.includes('is') || cat.includes('okul')) {
    return {
      primary: '#e11d48',
      bg: isDark ? '#4c0519' : '#fff1f2',
      border: isDark ? '#be123c' : '#fecdd3',
      badgeBg: isDark ? 'rgba(225,29,72,0.25)' : '#ffe4e6',
      text: isDark ? '#fda4af' : '#be123c',
    };
  }
  if (cat.includes('ticaret') || cat.includes('alışveriş') || cat.includes('alisveris')) {
    return {
      primary: '#9333ea',
      bg: isDark ? '#3b0764' : '#faf5ff',
      border: isDark ? '#7e22ce' : '#e9d5ff',
      badgeBg: isDark ? 'rgba(147,51,234,0.25)' : '#f3e8ff',
      text: isDark ? '#d8b4fe' : '#7e22ce',
    };
  }
  
  // Default / Diğer
  return {
    primary: '#7c3aed',
    bg: isDark ? '#2e1065' : '#f5f3ff',
    border: isDark ? '#6d28d9' : '#ddd6fe',
    badgeBg: isDark ? 'rgba(124,58,237,0.25)' : '#ede9fe',
    text: isDark ? '#c4b5fd' : '#6d28d9',
  };
}

  // ── Password Vault & Note Management States ──
  const [isNewPasswordOpen, setIsNewPasswordOpen] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [selectedPasswordFilter, setSelectedPasswordFilter] = useState<string>('all');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('all');
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMoveSectionModalOpen, setIsMoveSectionModalOpen] = useState(false);
  const [moveTargetNote, setMoveTargetNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'titleOnly'>('grid');
  const isDoubleColumn = viewMode === 'grid' || viewMode === 'titleOnly';
  const [sectionOptionsId, setSectionOptionsId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<NotebookSection | null>(null);
  const [paperStyle, setPaperStyle] = useState<'plain' | 'lined' | 'grid' | 'dots'>('plain');

  const extractLinks = (text: string) => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  const [expandedPasswordId, setExpandedPasswordId] = useState<string | null>(null);
  const [copiedUsernameNoteId, setCopiedUsernameNoteId] = useState<string | null>(null);
  const [isPasswordFolderPickerOpen, setIsPasswordFolderPickerOpen] = useState(false);
  const [fullScreenImageUri, setFullScreenImageUri] = useState<string | null>(null);

  // ── Drag & Drop States ──
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragPan = useRef(new Animated.ValueXY()).current;
  const sectionRefs = useRef<Record<string, View | null>>({});
  const sectionLayouts = useRef<Record<string, { x: number, y: number, w: number, h: number }>>({});
  const draggedNoteRef = useRef<Note | null>(null);
  const activeFolderIdRef = useRef<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  useEffect(() => {
    draggedNoteRef.current = draggedNote;
    activeFolderIdRef.current = activeFolderId;
    dropTargetIdRef.current = dropTargetId;
  }, [draggedNote, activeFolderId, dropTargetId]);

  const notePanResponders = useRef<Record<string, any>>({});

  const getNotePanResponder = (note: Note) => {
    if (!notePanResponders.current[note.id]) {
      notePanResponders.current[note.id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          dragPan.setValue({ x: pageX - 75, y: pageY - 75 });
          setDraggedNote(note);
          
          Object.keys(sectionRefs.current).forEach(id => {
            sectionRefs.current[id]?.measure((x, y, width, height, px, py) => {
              sectionLayouts.current[id] = { x: px, y: py, w: width, h: height };
            });
          });
        },
        onPanResponderMove: (e, gesture) => {
          dragPan.setValue({ x: gesture.moveX - 75, y: gesture.moveY - 75 });
          const { moveX, moveY } = gesture;
          let target = null;
          for (const [id, layout] of Object.entries(sectionLayouts.current)) {
            if (moveX >= layout.x - 10 && moveX <= layout.x + layout.w + 10 &&
                moveY >= layout.y - 10 && moveY <= layout.y + layout.h + 10) {
              target = id;
              break;
            }
          }
          setDropTargetId(target);
        },
        onPanResponderRelease: (e, gesture) => {
          const targetSectionId = dropTargetIdRef.current;
          const folderId = activeFolderIdRef.current;
          
          if (targetSectionId && folderId && note.sectionId !== targetSectionId && targetSectionId !== 'passwords-tab') {
            updateNoteInSection(folderId, note.id, {
              ...note,
              sectionId: targetSectionId,
              updatedAt: new Date().toISOString()
            }).catch(console.log);
          }
          setDraggedNote(null);
          setDropTargetId(null);
        }
      });
    }
    return notePanResponders.current[note.id];
  };

  const handleCopyUsername = async (username: string, noteId: string) => {
    await Clipboard.setStringAsync(username);
    setCopiedUsernameNoteId(noteId);
    setTimeout(() => setCopiedUsernameNoteId(null), 2000);
  };

  const [passwordForm, setPasswordForm] = useState({
    accountName: '',
    username: '',
    password: '',
    category: 'Diğer',
    notes: '',
  });

  // ── Password Templates Management States ──
  const [passwordTemplates, setPasswordTemplates] = useState<PasswordTemplate[]>(DEFAULT_PASSWORD_TEMPLATES);
  const [isEditTemplatesOpen, setIsEditTemplatesOpen] = useState(false);
  const [newTplEmoji, setNewTplEmoji] = useState('🔑');
  const [newTplName, setNewTplName] = useState('');

  // Load custom password templates
  useEffect(() => {
    AsyncStorage.getItem('@password_templates').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPasswordTemplates(parsed);
          }
        } catch {}
      }
    });
  }, []);

  const savePasswordTemplates = async (newTpls: PasswordTemplate[]) => {
    setPasswordTemplates(newTpls);
    try {
      await AsyncStorage.setItem('@password_templates', JSON.stringify(newTpls));
    } catch {}
  };

  const handleAddTemplate = () => {
    if (!newTplName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen şablon adı yazın.');
      return;
    }
    const emoji = newTplEmoji.trim() || '🔑';
    const name = newTplName.trim();
    const newTpl: PasswordTemplate = {
      id: Date.now().toString(),
      label: `${emoji} ${name}`,
      name,
      cat: 'Diğer',
    };
    const updated = [...passwordTemplates, newTpl];
    savePasswordTemplates(updated);
    setNewTplName('');
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = passwordTemplates.filter((t) => t.id !== id);
    savePasswordTemplates(updated);
  };

  const handleResetTemplates = () => {
    savePasswordTemplates(DEFAULT_PASSWORD_TEMPLATES);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 14; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordForm((p) => ({ ...p, password: res }));
  };

  const handleCopyPassword = async (pwd: string, noteId: string) => {
    try {
      await Clipboard.setStringAsync(pwd);
      setCopiedNoteId(noteId);
      setTimeout(() => setCopiedNoteId(null), 2500);
    } catch {
      Alert.alert('Hata', 'Kopyalanamadı.');
    }
  };

  const [editingPasswordNoteId, setEditingPasswordNoteId] = useState<string | null>(null);

  const handleEditPasswordNote = (note: Note) => {
    setEditingPasswordNoteId(note.id);
    setPasswordForm({
      accountName: note.accountName || note.title || '',
      username: note.username || '',
      password: note.password || '',
      category: note.passwordCategory || 'Diğer',
      notes: note.content?.[0]?.data || '',
    });
    setIsNewPasswordOpen(true);
  };

  const handleSavePasswordNote = async () => {
    if (!familyId || !activeFolderId) return;
    if (!passwordForm.accountName.trim() || !passwordForm.password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ne şifresi olduğunu ve şifreyi girin.');
      return;
    }

    try {
      if (editingPasswordNoteId) {
        const existing = notes.find((n) => n.id === editingPasswordNoteId);
        if (existing) {
          await updateNoteInSection(activeFolderId, editingPasswordNoteId, {
            ...existing,
            title: passwordForm.accountName.trim(),
            content: [{ id: '1', type: 'text' as const, data: passwordForm.notes || '' }],
            updatedAt: new Date().toISOString(),
            isPassword: true,
            accountName: passwordForm.accountName.trim(),
            username: passwordForm.username.trim(),
            password: passwordForm.password.trim(),
            passwordCategory: passwordForm.category,
          });
        }
      } else {
        const color = 'indigo';
        const payload: any = {
          title: passwordForm.accountName.trim(),
          content: [{ id: '1', type: 'text' as const, data: passwordForm.notes || '' }],
          color,
          notebookId: activeFolderId,
          sectionId: activeSectionId,
          updatedAt: new Date().toISOString(),
          pinned: false,
          isPassword: true,
          accountName: passwordForm.accountName.trim(),
          username: passwordForm.username.trim(),
          password: passwordForm.password.trim(),
          passwordCategory: passwordForm.category,
        };
        await addNoteToSection(familyId, activeFolderId, activeSectionId, payload);
      }

      setIsNewPasswordOpen(false);
      setEditingPasswordNoteId(null);
      setPasswordForm({ accountName: '', username: '', password: '', category: 'Diğer', notes: '' });
      Alert.alert('Başarılı 🔐', editingPasswordNoteId ? 'Şifreniz güncellendi!' : 'Şifreniz güvenle kaydedildi!');
    } catch {
      Alert.alert('Hata', 'Şifre kaydedilemedi.');
    }
  };

  const handleMoveNote = async (targetFolderId: string, targetSectionId: string) => {
    if (!moveTargetNote) return;
    try {
      await updateNoteInSection(moveTargetNote.notebookId || activeFolderId || 'root', moveTargetNote.id, {
        ...moveTargetNote,
        notebookId: targetFolderId,
        sectionId: targetSectionId,
        updatedAt: new Date().toISOString(),
      });
      setIsMoveModalOpen(false);
      setMoveTargetNote(null);
      setNoteOptionsVisible(false);
      Alert.alert('Başarılı 📁', 'Not başka bir klasöre taşındı!');
    } catch {
      Alert.alert('Hata', 'Not taşınamadı.');
    }
  };

  const handleUpdateSection = async () => {
    if (!activeFolder || !editingSection || !sectionForm.title.trim()) return;
    try {
      const updatedSections = (activeFolder.sections || []).map((s) =>
        s.id === editingSection.id ? { ...s, title: sectionForm.title.trim(), color: sectionForm.color } : s
      );
      await updateNotebook(activeFolder.id, { ...activeFolder, sections: updatedSections });
      setIsNewSectionOpen(false);
      setEditingSection(null);
      setSectionForm({ title: '', color: FOLDER_COLORS[0] });
    } catch {
      Alert.alert('Hata', 'Bölüm güncellenemedi.');
    }
  };

  const handleDeleteSection = (secId: string) => {
    if (!activeFolder) return;
    const realSections = activeFolder.sections || [];
    if (realSections.length <= 1) {
      Alert.alert('Uyarı', 'Klasördeki tek kalan bölümü silemezsiniz.');
      return;
    }

    Alert.alert('Bölümü Sil', 'Bu bölümü silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedSections = realSections.filter((s) => s.id !== secId);
            await updateNotebook(activeFolder.id, { ...activeFolder, sections: updatedSections });
            if (activeSectionId === secId) {
              setActiveSectionId(updatedSections[0]?.id || 'default');
            }
            setSectionOptionsId(null);
          } catch {
            Alert.alert('Hata', 'Bölüm silinemedi.');
          }
        },
      },
    ]);
  };
  const [folderForm, setFolderForm] = useState({ title: '', icon: '📁', color: FOLDER_COLORS[0] });
  const [sectionForm, setSectionForm] = useState({ title: '', color: FOLDER_COLORS[0] });
  const [activeSubSectionId, setActiveSubSectionId] = useState<string | null>(null);
  const [isNewSubSectionOpen, setIsNewSubSectionOpen] = useState(false);
  const [subSectionForm, setSubSectionForm] = useState({ title: '', icon: '📁', color: FOLDER_COLORS[0] });
  const [editingSubSectionId, setEditingSubSectionId] = useState<string | null>(null);
  const [subSectionOptionsId, setSubSectionOptionsId] = useState<string | null>(null);
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

  // Sections of current folder
  const sections = useMemo((): NotebookSection[] => {
    const base = activeFolder?.sections?.length
      ? activeFolder.sections
      : [{ id: 'default', title: 'Genel', color: '#7C3AED', order: 0 }];
    return [
      ...base,
      { id: 'passwords-tab', title: '🔐 Şifreler', color: '#4f46e5', order: 99 },
    ];
  }, [activeFolder]);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) || sections[0] || { id: 'default', title: 'Genel', color: '#7C3AED' },
    [sections, activeSectionId]
  );

  // Notes in current section
  const sectionNotes = useMemo(() => {
    let filtered = notes.filter((n) => (n.notebookId || 'root') === (activeFolderId || 'root'));

    if (activeSectionId === 'passwords-tab') {
      filtered = filtered.filter((n) => n.isPassword);
      if (selectedPasswordFilter !== 'all') {
        const q = selectedPasswordFilter.toLowerCase();
        filtered = filtered.filter(
          (n) =>
            (n.accountName || n.title || '').toLowerCase().includes(q) ||
            (n.passwordCategory || '').toLowerCase().includes(q)
        );
      }
    } else {
      filtered = filtered.filter(
        (n) =>
          !n.isPassword &&
          (n.sectionId || 'default') === (activeSectionId || 'default')
      );
      
      if (activeSubSectionId) {
        filtered = filtered.filter((n) => n.subSectionId === activeSubSectionId);
      } else {
        filtered = filtered.filter((n) => !n.subSectionId);
      }
      
      if (selectedColorFilter !== 'all') {
        filtered = filtered.filter((n) => (n.color || 'purple') === selectedColorFilter);
      }
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content?.[0]?.data?.toLowerCase().includes(q) ||
          (n.accountName || '').toLowerCase().includes(q) ||
          (n.username || '').toLowerCase().includes(q)
      );
    }
    return filtered.sort(
      (a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [notes, activeFolderId, activeSectionId, selectedPasswordFilter, selectedColorFilter, searchTerm, activeSubSectionId]);

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
        imageUrl: activeNote.imageUrl || null,
      });
    }
  }, [activeNoteId, activeNote?.id, activeNote?.imageUrl]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('İzin Gerekli', 'Notlara fotoğraf eklemek için galeri izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const selectedUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setNoteForm((prev) => ({ ...prev, imageUrl: selectedUri }));
        if (activeNoteId) {
          const note = notes.find((n) => n.id === activeNoteId);
          if (note) {
            const targetFolderId = note.notebookId || activeFolderId || activeFolder?.id || 'root';
            await updateNoteInSection(targetFolderId, activeNoteId, {
              ...note,
              imageUrl: selectedUri,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf seçilemedi.');
    }
  };

  const handleRemoveImage = async () => {
    setNoteForm((prev) => ({ ...prev, imageUrl: null }));
    if (activeNoteId) {
      const note = notes.find((n) => n.id === activeNoteId);
      if (note) {
        const targetFolderId = note.notebookId || activeFolderId || activeFolder?.id || 'root';
        await updateNoteInSection(targetFolderId, activeNoteId, {
          ...note,
          imageUrl: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

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
      if (!activeNoteId) return;
      try {
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        const targetFolderId = note.notebookId || activeFolderId || activeFolder?.id || 'root';
        await updateNoteInSection(targetFolderId, activeNoteId, {
          ...note,
          title: title.trim() || 'İsimsiz Not',
          content: [{ id: '1', type: 'text' as const, data: content }],
          color,
          imageUrl: noteForm.imageUrl || note.imageUrl || null,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        console.log('Save note error');
      }
    }, 600);
  }, [activeNoteId, activeFolderId, activeFolder, notes, noteForm.imageUrl]);

  const handleNewNote = async () => {
    if (!familyId) return;
    try {
      const color = NOTE_COLORS[Math.floor(Math.random() * 8)].id;
      const payload = {
        title: 'Yeni Not',
        content: [{ id: '1', type: 'text' as const, data: '' }],
        color,
        imageUrl: null,
        notebookId: activeFolderId,
        sectionId: activeSectionId,
        subSectionId: activeSubSectionId,
        updatedAt: new Date().toISOString(),
        pinned: false,
      };
      const ref = await addNoteToSection(familyId, activeFolderId, activeSectionId, payload);
      if (ref?.id) {
        setActiveNoteId(ref.id);
        setNoteForm({ title: 'Yeni Not', content: '', color, imageUrl: null });
        setScreen('editor');
        setTimeout(() => contentRef.current?.focus(), 400);
      }
    } catch {
      Alert.alert('Hata', 'Not oluşturulamadı.');
    }
  };

  const handleOpenNote = (note: Note) => {
    if (note.isPassword) {
      handleEditPasswordNote(note);
      return;
    }
    setActiveNoteId(note.id);
    setNoteForm({
      title: note.title || '',
      content: note.content?.[0]?.data || '',
      color: note.color || 'purple',
      imageUrl: note.imageUrl || null,
    });
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
        } as any);
      }
      setIsNewFolderOpen(false);
      setFolderForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] });
      setEditingFolderId(null);
    } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  const handleCreateSubSection = async () => {
    if (!subSectionForm.title.trim()) { Alert.alert('Hata', 'Alt bölüm adı girin.'); return; }
    try {
      if (!activeFolder || !activeSection) return;
      const currentSections = [...activeFolder.sections];
      const secIdx = currentSections.findIndex(s => s.id === activeSection.id);
      if (secIdx === -1) return;

      const currentSubSections = currentSections[secIdx].subSections || [];

      if (editingSubSectionId) {
        currentSections[secIdx].subSections = currentSubSections.map(ss => 
           ss.id === editingSubSectionId ? { ...ss, title: subSectionForm.title.trim(), icon: subSectionForm.icon.trim() || '📁', color: subSectionForm.color } : ss
        );
      } else {
        const newId = Date.now().toString() + Math.random().toString(36).substring(7);
        currentSections[secIdx].subSections = [...currentSubSections, {
          id: newId,
          title: subSectionForm.title.trim(),
          icon: subSectionForm.icon.trim() || '📁',
          color: subSectionForm.color,
        }];
      }

      await updateNotebook(activeFolder.id, { sections: currentSections });
      
      setIsNewSubSectionOpen(false);
      setSubSectionForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] });
      setEditingSubSectionId(null);
    } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  const handleDeleteSubSection = async (ssId: string) => {
    Alert.alert('Alt Bölümü Sil', 'Bu alt bölümü silmek istediğinize emin misiniz? İçindeki notlar, ana bölüme taşınacaktır.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            if (!activeFolder || !activeSection) return;
            const currentSections = [...activeFolder.sections];
            const secIdx = currentSections.findIndex(s => s.id === activeSection.id);
            if (secIdx === -1) return;
            
            const currentSubSections = currentSections[secIdx].subSections || [];
            currentSections[secIdx].subSections = currentSubSections.filter(ss => ss.id !== ssId);
            
            await updateNotebook(activeFolder.id, { sections: currentSections });
            
            const affectedNotes = notes.filter(n => n.subSectionId === ssId);
            for (const n of affectedNotes) {
                updateNoteInSection(activeFolder.id, n.id, { ...n, subSectionId: null }).catch(console.log);
            }
            
            if (activeSubSectionId === ssId) setActiveSubSectionId(null);
            setSubSectionOptionsId(null);
          } catch { Alert.alert('Hata', 'Silinemedi.'); }
        },
      },
    ]);
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
      const updated = { ...prev, content: (prev.content || '') + text };
      scheduleSave(updated.title, updated.content, updated.color);
      return updated;
    });
  };

  const insertFormatting = (prefix: string) => {
    setNoteForm((prev) => {
      const current = prev.content || '';
      const needsNewline = current.length > 0 && !current.endsWith('\n');
      const textToInsert = (needsNewline ? '\n' : '') + prefix;
      const updated = { ...prev, content: current + textToInsert };
      scheduleSave(updated.title, updated.content, updated.color);
      return updated;
    });
  };

  const handleContentChange = (newText: string) => {
    const oldText = noteForm.content || '';
    
    // Check if user pressed Enter (new line added)
    if (newText.length === oldText.length + 1 && newText.endsWith('\n') && !oldText.endsWith('\n')) {
      const lines = oldText.split('\n');
      const lastLine = lines[lines.length - 1] || '';

      // 1. Checkbox list: "☐ "
      if (lastLine === '☐ ') {
        const updatedLines = [...lines.slice(0, -1), ''];
        const updated = updatedLines.join('\n');
        setNoteForm((p) => ({ ...p, content: updated }));
        scheduleSave(noteForm.title, updated, noteForm.color);
        return;
      } else if (lastLine.startsWith('☐ ')) {
        const auto = newText + '☐ ';
        setNoteForm((p) => ({ ...p, content: auto }));
        scheduleSave(noteForm.title, auto, noteForm.color);
        return;
      }

      // 2. Bullet list: "• "
      if (lastLine === '• ') {
        const updatedLines = [...lines.slice(0, -1), ''];
        const updated = updatedLines.join('\n');
        setNoteForm((p) => ({ ...p, content: updated }));
        scheduleSave(noteForm.title, updated, noteForm.color);
        return;
      } else if (lastLine.startsWith('• ')) {
        const auto = newText + '• ';
        setNoteForm((p) => ({ ...p, content: auto }));
        scheduleSave(noteForm.title, auto, noteForm.color);
        return;
      }

      // 3. Numbered list: e.g. "1. "
      const numMatch = lastLine.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        const itemContent = numMatch[2];
        if (!itemContent.trim()) {
          const updatedLines = [...lines.slice(0, -1), ''];
          const updated = updatedLines.join('\n');
          setNoteForm((p) => ({ ...p, content: updated }));
          scheduleSave(noteForm.title, updated, noteForm.color);
          return;
        } else {
          const auto = newText + `${num + 1}. `;
          setNoteForm((p) => ({ ...p, content: auto }));
          scheduleSave(noteForm.title, auto, noteForm.color);
          return;
        }
      }

      // 4. Quote: "> "
      if (lastLine === '> ') {
        const updatedLines = [...lines.slice(0, -1), ''];
        const updated = updatedLines.join('\n');
        setNoteForm((p) => ({ ...p, content: updated }));
        scheduleSave(noteForm.title, updated, noteForm.color);
        return;
      } else if (lastLine.startsWith('> ')) {
        const auto = newText + '> ';
        setNoteForm((p) => ({ ...p, content: auto }));
        scheduleSave(noteForm.title, auto, noteForm.color);
        return;
      }
    }

    setNoteForm((p) => ({ ...p, content: newText }));
    scheduleSave(noteForm.title, newText, noteForm.color);
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
                if (note && activeNoteId) {
                  const targetFolderId = note.notebookId || activeFolderId || activeFolder?.id || 'root';
                  updateNoteInSection(targetFolderId, activeNoteId, {
                    ...note,
                    title: noteForm.title.trim() || 'İsimsiz Not',
                    content: [{ id: '1', type: 'text' as const, data: noteForm.content }],
                    color: noteForm.color,
                    imageUrl: noteForm.imageUrl || note.imageUrl || null,
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
              onPress={handlePickImage}
              style={[s.editorToolBtn, { backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 6 }]}
              activeOpacity={0.7}
            >
              <ImageIcon size={18} color="white" />
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
        <View style={[s.fmtBar, { backgroundColor: isDark ? '#1A1825' : '#FFFFFF', borderBottomColor: border, paddingVertical: 8 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
            {/* Paper Pattern Selector */}
            {[
              { id: 'plain', label: '📄 Düz Kağıt' },
              { id: 'lined', label: '📝 Çizgili Kağıt' },
              { id: 'grid', label: '🏁 Kareli Kağıt' },
              { id: 'dots', label: '🔴 Noktalı Kağıt' },
            ].map((p) => {
              const active = paperStyle === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPaperStyle(p.id as any)}
                  style={{
                    backgroundColor: active ? '#7C3AED' : isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: active ? '#7C3AED' : border,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? 'white' : textPrimary }}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={{ width: 1, height: 24, backgroundColor: border, marginHorizontal: 4, alignSelf: 'center' }} />

            {[
              { label: '📸 Görsel Ekle', onPress: handlePickImage, icon: <ImageIcon size={14} color="#EC4899" />, color: '#EC4899' },
              { label: '☐ Görev Kutusu', onPress: () => insertFormatting('☐ '), icon: <CheckSquare size={14} color="#7C3AED" />, color: '#7C3AED' },
              { label: '• Madde Listesi', onPress: () => insertFormatting('• '), icon: <List size={14} color="#3B82F6" />, color: '#3B82F6' },
              { label: '1. Numaralı', onPress: () => insertFormatting('1. '), icon: <FileText size={14} color="#10B981" />, color: '#10B981' },
              { label: '📌 Vurgu Başlık', onPress: () => insertFormatting('📌 '), icon: <Pin size={14} color="#F59E0B" />, color: '#F59E0B' },
              { label: '─── Temiz Ayraç', onPress: () => insertFormatting('──────────────────────────────\n'), icon: <Minus size={14} color="#6B7280" />, color: '#6B7280' },
              { label: '📅 Tarih Tag', onPress: () => insertText(' [' + format(new Date(), 'd MMMM yyyy, HH:mm', { locale: tr }) + '] '), icon: <Clock size={14} color="#8B5CF6" />, color: '#8B5CF6' },
              { label: '⭐ Önemli Not', onPress: () => insertFormatting('⭐ [ÖNEMLİ]: '), icon: <Sparkles size={14} color="#EF4444" />, color: '#EF4444' },
              { label: '💬 Alıntı Kutusu', onPress: () => insertFormatting('> '), icon: <Copy size={14} color="#06B6D4" />, color: '#06B6D4' },
              { label: '🔑 Şifre Şablonu', onPress: () => insertFormatting('📌 Platform/Hesap: \n👤 Kullanıcı Adı: \n🔑 Şifre: \n📝 Not: '), icon: <Key size={14} color="#4F46E5" />, color: '#4F46E5' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  s.fmtChip,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={0.75}
              >
                {item.icon}
                <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Editor body with Expanded Paper Canvas */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[s.editorBody, { minHeight: '100%', paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
            <Text style={[s.editorDateText, { color: textSecondary, marginBottom: 12 }]}>
              {formatDate(activeNote.updatedAt || activeNote.createdAt)}
            </Text>

            {/* HERO ATTACHED IMAGE BANNER */}
            {noteForm.imageUrl ? (
              <View style={{ width: '100%', height: 340, borderRadius: 22, overflow: 'hidden', marginBottom: 16, position: 'relative', borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImageUri(noteForm.imageUrl || null)} style={{ width: '100%', height: '100%' }}>
                  <Image source={{ uri: noteForm.imageUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                </TouchableOpacity>

                {/* Full Screen Hint Badge */}
                <TouchableOpacity
                  onPress={() => setFullScreenImageUri(noteForm.imageUrl || null)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  activeOpacity={0.8}
                >
                  <Maximize2 size={13} color="white" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: 'white' }}>Tam Ekran 🔍</Text>
                </TouchableOpacity>

                {/* Delete Image Button */}
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: 'rgba(225,29,72,0.85)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  activeOpacity={0.8}
                >
                  <X size={14} color="white" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: 'white' }}>Görseli Kaldır</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                style={{
                  width: '100%',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
                activeOpacity={0.8}
              >
                <ImageIcon size={16} color={textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>+ Fotoğraf / Görsel Ekle</Text>
              </TouchableOpacity>
            )}

            {/* EXPANDED PRO PAPER CANVAS */}
            <View
              style={{
                flex: 1,
                minHeight: 550,
                borderRadius: 22,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
                borderWidth: paperStyle !== 'plain' ? 1.5 : 0,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {paperStyle !== 'plain' && <PaperBackgroundOverlay type={paperStyle} isDark={isDark} />}

              {/* Quick Links */}
              {extractLinks(noteForm.content).length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Bağlantılar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {extractLinks(noteForm.content).map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => Linking.openURL(url).catch(console.error)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#EDE9FE',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 16,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(124,58,237,0.4)' : '#C4B5FD',
                          gap: 6,
                          marginBottom: 8,
                        }}
                      >
                        <LinkIcon size={14} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#C4B5FD' : '#7C3AED' }} numberOfLines={1}>{url.replace(/^https?:\/\//, '')}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TextInput
                ref={contentRef}
                style={[
                  s.editorContentInput,
                  {
                    color: isDark ? '#F1F5F9' : '#1E293B',
                    minHeight: 550,
                    fontSize: 16,
                    lineHeight: paperStyle === 'lined' || paperStyle === 'grid' ? 36 : 28,
                    paddingTop: paperStyle === 'lined' || paperStyle === 'grid' ? (Platform.OS === 'android' ? 9 : 9) : 16,
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    backgroundColor: 'transparent',
                  },
                ]}
                includeFontPadding={false}
                placeholder="Yazmaya başla..."
                placeholderTextColor={textSecondary}
                value={noteForm.content}
                onChangeText={handleContentChange}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </View>
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

        {/* FULL SCREEN IMAGE VIEWER MODAL IN EDITOR */}
        <FullScreenImageViewerModal uri={fullScreenImageUri} onClose={() => setFullScreenImageUri(null)} />
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setViewMode(prev => prev === 'grid' ? 'list' : (prev === 'list' ? 'titleOnly' : 'grid'));
                }}
                style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.8}
              >
                {viewMode === 'grid' ? <LayoutList size={20} color="white" /> : (viewMode === 'list' ? <List size={20} color="white" /> : <Grid size={20} color="white" />)}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsSearchOpen(true)} style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Search size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* GLASSMORPHISM TABS FOR SECTIONS */}
          {sections.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {sections.map((sec) => {
                const isActive = sec.id === activeSectionId;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    ref={(el: any) => sectionRefs.current[sec.id] = el}
                    onPress={() => { setActiveSectionId(sec.id); setActiveNoteId(null); }}
                    onLongPress={() => {
                      if (sec.id !== 'passwords-tab') setSectionOptionsId(sec.id);
                    }}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: isActive ? 'white' : 'rgba(255,255,255,0.15)',
                      borderWidth: 1,
                      borderColor: isActive ? 'white' : (dropTargetId === sec.id ? '#10B981' : 'rgba(255,255,255,0.2)'),
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#7c3aed' : 'white' }}>{sec.title}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => { setSectionForm({ title: '', color: FOLDER_COLORS[0] }); setEditingSection(null); setIsNewSectionOpen(true); }}
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

        {/* PASSWORDS TAB FILTER CHIPS */}
        {activeSectionId === 'passwords-tab' && (
          <View style={{ backgroundColor: bg, paddingTop: 14, paddingBottom: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <TouchableOpacity
                onPress={() => setSelectedPasswordFilter('all')}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: selectedPasswordFilter === 'all' ? '#4f46e5' : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                  borderWidth: 1,
                  borderColor: selectedPasswordFilter === 'all' ? '#4f46e5' : border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: selectedPasswordFilter === 'all' ? 'white' : textPrimary }}>
                  ✨ Tümü ({notes.filter(n => (n.notebookId || 'root') === (activeFolderId || 'root') && n.isPassword).length})
                </Text>
              </TouchableOpacity>

              {passwordTemplates.map((tpl) => {
                const isActive = selectedPasswordFilter.toLowerCase() === tpl.name.toLowerCase();
                const count = notes.filter(n => 
                  (n.notebookId || 'root') === (activeFolderId || 'root') && 
                  n.isPassword && 
                  ((n.accountName || '').toLowerCase().includes(tpl.name.toLowerCase()) || (n.passwordCategory || '').toLowerCase().includes(tpl.name.toLowerCase()))
                ).length;

                return (
                  <TouchableOpacity
                    key={tpl.id}
                    onPress={() => setSelectedPasswordFilter(isActive ? 'all' : tpl.name)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 16,
                      backgroundColor: isActive ? '#4f46e5' : (isDark ? 'rgba(79,70,229,0.15)' : '#eef2ff'),
                      borderWidth: 1,
                      borderColor: isActive ? '#4f46e5' : '#c7d2fe',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isActive ? 'white' : '#4f46e5' }}>
                      {tpl.label}
                    </Text>
                    {count > 0 && (
                      <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#4f46e5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* STANDARD SECTION COLOR FILTER CHIPS */}
        {activeSectionId !== 'passwords-tab' && (
          <View style={{ backgroundColor: bg, paddingTop: 10, paddingBottom: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
              <TouchableOpacity
                onPress={() => setSelectedColorFilter('all')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: selectedColorFilter === 'all' ? '#7C3AED' : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                  borderWidth: 1,
                  borderColor: selectedColorFilter === 'all' ? '#7C3AED' : border,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: selectedColorFilter === 'all' ? 'white' : textPrimary }}>
                  🎨 Tüm Renkler
                </Text>
              </TouchableOpacity>

              {NOTE_COLORS.slice(0, 8).map((nc) => {
                const isActive = selectedColorFilter === nc.id;
                const count = notes.filter(n => (n.notebookId || 'root') === (activeFolderId || 'root') && !n.isPassword && (n.color || 'purple') === nc.id).length;
                if (count === 0 && !isActive) return null;
                return (
                  <TouchableOpacity
                    key={nc.id}
                    onPress={() => setSelectedColorFilter(isActive ? 'all' : nc.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 14,
                      backgroundColor: isActive ? nc.bg : (isDark ? nc.bg + '30' : nc.light),
                      borderWidth: 1.5,
                      borderColor: nc.bg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isActive ? 'white' : nc.bg }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? 'white' : (isDark ? '#E5E7EB' : '#1F2937') }}>
                      {count} Not
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Sub-sections row */}
        {activeSectionId !== 'passwords-tab' && (
          <View style={[s.subFolderRow, { backgroundColor: bg, paddingTop: 16, paddingBottom: 8 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {activeSection?.subSections?.map((sf, idx) => {
                const isColorValid = sf.color && FOLDER_COLORS.includes(sf.color);
                const sfColor = isColorValid ? sf.color : FOLDER_COLORS[idx % FOLDER_COLORS.length];
                const isActive = activeSubSectionId === sf.id;
                const ssNoteCount = notes.filter(n => n.subSectionId === sf.id && (n.notebookId || 'root') === (activeFolderId || 'root')).length;
                return (
                  <TouchableOpacity
                    key={sf.id}
                    onPress={() => setActiveSubSectionId(isActive ? null : sf.id)}
                    onLongPress={() => setSubSectionOptionsId(sf.id)}
                    style={[s.subFolderChip, { backgroundColor: isActive ? sfColor : (isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc'), borderColor: isActive ? 'transparent' : border, borderWidth: 1 }]}
                    activeOpacity={0.7}
                  >
                    <Folder size={14} color={isActive ? '#FFFFFF' : sfColor} />
                    <Text style={[s.subFolderChipText, { color: isActive ? '#FFFFFF' : textPrimary }]} numberOfLines={1}>{sf.icon} {sf.title}</Text>
                    <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={[s.subFolderChipCount, { color: isActive ? '#FFFFFF' : textSecondary }]}>{ssNoteCount}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSubSectionOptionsId(sf.id)} style={{ paddingLeft: 2 }}>
                      <MoreHorizontal size={14} color={isActive ? "rgba(255,255,255,0.85)" : textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => { setSubSectionForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] }); setIsNewSubSectionOpen(true); }}
                style={[s.subFolderChip, { borderColor: border, borderStyle: 'dashed' }]}
                activeOpacity={0.7}
              >
                <FolderPlus size={14} color={textSecondary} />
                <Text style={[s.subFolderChipText, { color: textSecondary }]}>Alt Bölüm Ekle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Note grid */}
        <ScrollView contentContainerStyle={s.noteGrid} showsVerticalScrollIndicator={false}>
          {sectionNotes.length === 0 ? (
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { backgroundColor: activeSectionId === 'passwords-tab' ? '#4f46e520' : '#7C3AED20' }]}>
                {activeSectionId === 'passwords-tab' ? (
                  <Key size={32} color="#4f46e5" />
                ) : (
                  <FileText size={32} color="#7C3AED" />
                )}
              </View>
              <Text style={[s.emptyTitle, { color: textPrimary }]}>
                {activeSectionId === 'passwords-tab' 
                  ? (selectedPasswordFilter !== 'all' ? `${selectedPasswordFilter} kaydı bulunamadı` : 'Henüz şifre yok')
                  : 'Henüz not yok'}
              </Text>
              <Text style={[s.emptyDesc, { color: textSecondary }]}>
                {activeSectionId === 'passwords-tab'
                  ? 'Aşağıdaki + Şifre Ekle butonuna basarak\nilk şifrenizi güvenle kaydedin'
                  : 'Aşağıdaki + butonuna basarak\nilk notunuzu oluşturun'}
              </Text>
            </View>
          ) : (
            <View style={s.noteGridInner}>
              {sectionNotes.map((note, idx) => {
                if (note.isPassword) {
                  const isExpanded = expandedPasswordId === note.id;
                  const isRevealed = !!showPasswordMap[note.id];
                  const isPasswordCopied = copiedNoteId === note.id;
                  const isUserCopied = copiedUsernameNoteId === note.id;
                  const catTheme = getPasswordCategoryTheme(note.passwordCategory, isDark);

                  return (
                    <View
                      key={note.id}
                      style={{
                        width: '100%',
                        backgroundColor: catTheme.bg,
                        borderColor: catTheme.border,
                        borderWidth: 1.5,
                        borderRadius: 16,
                        overflow: 'hidden',
                        marginBottom: 6,
                        shadowColor: catTheme.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      {/* Collapsed Header Bar (Ultra Compact Single Row) */}
                      <TouchableOpacity
                        onPress={() => setExpandedPasswordId(isExpanded ? null : note.id)}
                        onLongPress={() => {
                          setActiveNoteId(note.id);
                          setNoteOptionsVisible(true);
                        }}
                        activeOpacity={0.8}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: catTheme.primary, alignItems: 'center', justifyContent: 'center' }}>
                            <Key size={16} color="white" />
                          </View>
                          <View style={{ flex: 1 }}>
                            {/* Top Line: Username */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 13, fontWeight: '900', color: isDark ? '#ffffff' : '#0f172a' }} numberOfLines={1}>
                                {note.username ? `👤 ${note.username}` : (note.accountName || note.title)}
                              </Text>
                              {note.passwordCategory && (
                                <View style={{ backgroundColor: catTheme.badgeBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: catTheme.primary }}>
                                    {note.passwordCategory}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {/* Sub Line: Account Name */}
                            <Text style={{ fontSize: 11, fontWeight: '700', color: catTheme.text, marginTop: 1 }} numberOfLines={1}>
                              🔑 {note.accountName || note.title}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <TouchableOpacity
                            onPress={() => { setActiveNoteId(note.id); setNoteOptionsVisible(true); }}
                            style={{ padding: 4 }}
                          >
                            <MoreHorizontal size={18} color={catTheme.primary} />
                          </TouchableOpacity>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: catTheme.badgeBg, alignItems: 'center', justifyContent: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} color={catTheme.primary} />
                            ) : (
                              <ChevronDown size={16} color={catTheme.primary} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Expanded Drawer (Opens on Click with Full Copy Buttons) */}
                      {isExpanded && (
                        <View style={{
                          borderTopWidth: 1,
                          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(79,70,229,0.15)',
                          padding: 14,
                          gap: 10,
                          backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                        }}>
                          {/* Username Copy Field */}
                          {note.username ? (
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : '#ffffff',
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: textSecondary, textTransform: 'uppercase' }}>Kullanıcı Adı / E-Posta</Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#ffffff' : '#0f172a', marginTop: 2 }}>{note.username}</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleCopyUsername(note.username, note.id)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  backgroundColor: isUserCopied ? '#10b981' : '#6366f1',
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {isUserCopied ? <CheckCheck size={12} color="white" /> : <Copy size={12} color="white" />}
                                <Text style={{ fontSize: 10, fontWeight: '900', color: 'white' }}>
                                  {isUserCopied ? 'Kopyalandı' : 'Kopyala'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}

                          {/* Password Copy Field with Eye Toggle */}
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : '#ffffff',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: textSecondary, textTransform: 'uppercase' }}>Şifre</Text>
                              <Text style={{
                                fontSize: 14,
                                fontWeight: '900',
                                color: isDark ? '#ffffff' : '#0f172a',
                                letterSpacing: isRevealed ? 0 : 2,
                                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                marginTop: 2,
                              }}>
                                {isRevealed ? note.password : '••••••••••••'}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {/* Eye Button */}
                              <TouchableOpacity
                                onPress={() => setShowPasswordMap(p => ({ ...p, [note.id]: !p[note.id] }))}
                                style={{ padding: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', borderRadius: 8 }}
                              >
                                {isRevealed ? <EyeOff size={14} color="#4f46e5" /> : <Eye size={14} color="#4f46e5" />}
                              </TouchableOpacity>

                              {/* Copy Password Button */}
                              <TouchableOpacity
                                onPress={() => note.password && handleCopyPassword(note.password, note.id)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  backgroundColor: isPasswordCopied ? '#10b981' : '#4f46e5',
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {isPasswordCopied ? <CheckCheck size={12} color="white" /> : <Copy size={12} color="white" />}
                                <Text style={{ fontSize: 10, fontWeight: '900', color: 'white' }}>
                                  {isPasswordCopied ? 'Kopyalandı' : 'Kopyala'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Extra Notes field if present */}
                          {(note.notes || getPreview(note)) ? (
                            <View style={{
                              backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff',
                              borderRadius: 10,
                              padding: 10,
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Notlar</Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#cbd5e1' : '#334155' }}>
                                {note.notes || getPreview(note)}
                              </Text>
                            </View>
                          ) : null}

                          {/* Quick Edit Action Button */}
                          <TouchableOpacity
                            onPress={() => handleEditPasswordNote(note)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#e0e7ff',
                              marginTop: 2,
                            }}
                          >
                            <Edit3 size={14} color="#4f46e5" />
                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#4f46e5' }}>Şifre Kaydını Düzenle</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }

                const nc = getNoteColor(note.color);
                return (
                  <View
                    key={note.id}
                    style={[
                      s.noteCard,
                      isDoubleColumn ? s.noteCardNarrow : s.noteCardWide,
                      { 
                        backgroundColor: isDark ? nc.bg + '26' : nc.light, 
                        borderColor: isDark ? nc.bg + '60' : nc.bg + '45', 
                        borderWidth: 1.5, 
                        padding: viewMode === 'titleOnly' ? 10 : (isDoubleColumn ? 14 : 16),
                        borderRadius: 20,
                        shadowColor: nc.bg,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: isDark ? 0.25 : 0.1,
                        shadowRadius: 6,
                        elevation: 3,
                        opacity: draggedNote?.id === note.id ? 0.3 : 1, // Dim while dragging
                      },
                    ]}
                  >
                    <View style={[s.noteCardColorBar, { backgroundColor: nc.bg, borderRadius: 3 }]} />
                    
                    {/* TOP ROW: Title & Drag Handle */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: viewMode === 'titleOnly' ? 0 : 5, marginTop: viewMode === 'titleOnly' ? 4 : 8 }}>
                      <TouchableOpacity onPress={() => handleOpenNote(note)} style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[s.noteCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: '800', fontSize: isDoubleColumn ? 14 : 16, marginTop: 0, marginBottom: 0 }]} numberOfLines={viewMode === 'titleOnly' ? 1 : 2}>
                          {note.title || 'İsimsiz Not'}
                        </Text>
                      </TouchableOpacity>
                      <View {...getNotePanResponder(note).panHandlers} style={{ padding: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 6 }}>
                        <GripHorizontal size={14} color={nc.bg} />
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => handleOpenNote(note)} activeOpacity={0.8} style={{ flex: 1 }}>
                      {note.imageUrl && viewMode !== 'titleOnly' ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImageUri(note.imageUrl || null)} style={{ width: '100%', height: isDoubleColumn ? 170 : 260, borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', position: 'relative' }}>
                          <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                          <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Maximize2 size={11} color="white" />
                            <Text style={{ fontSize: 9, fontWeight: '800', color: 'white' }}>Tam Ekran</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                      
                      {getPreview(note).length > 0 && viewMode !== 'titleOnly' && (
                        <Text style={[s.noteCardPreview, { color: isDark ? '#CBD5E1' : '#475569', fontSize: 12, lineHeight: 18, marginTop: 6 }]} numberOfLines={isDoubleColumn ? 3 : 4}>
                          {getPreview(note)}
                        </Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: viewMode === 'titleOnly' ? 4 : 10 }}>
                        <Text style={[s.noteCardDate, { color: isDark ? nc.bg + 'EE' : nc.bg, fontSize: 10, fontWeight: '800' }]}>
                          {formatShort(note.updatedAt || note.createdAt)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {note.pinned && <Pin size={11} color={nc.bg} />}
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); setActiveNoteId(note.id); setNoteOptionsVisible(true); }}>
                            <MoreHorizontal size={16} color={nc.bg} />
                          </TouchableOpacity>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: nc.bg }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }} pointerEvents="box-none">
          <View style={s.fabRow} pointerEvents="box-none">
            {activeSectionId === 'passwords-tab' ? (
              <TouchableOpacity
                onPress={() => {
                  setEditingPasswordNoteId(null);
                  setPasswordForm({
                    accountName: selectedPasswordFilter !== 'all' ? selectedPasswordFilter : '',
                    username: '',
                    password: '',
                    category: selectedPasswordFilter !== 'all' ? selectedPasswordFilter : 'Diğer',
                    notes: '',
                  });
                  setIsNewPasswordOpen(true);
                }}
                style={{
                  height: 52,
                  paddingHorizontal: 22,
                  borderRadius: 26,
                  backgroundColor: '#4f46e5',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#4f46e5',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  elevation: 6,
                }}
                activeOpacity={0.85}
              >
                <Key size={20} color="white" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: 'white' }}>+ Şifre Ekle</Text>
              </TouchableOpacity>
            ) : (
              <>
                {!activeFolderId && (
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
              </>
            )}
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
                    { icon: <FolderPlus size={20} color="#059669" />, label: 'Başka Klasöre Taşı', onPress: () => { setMoveTargetNote(activeNote); setNoteOptionsVisible(false); setIsMoveModalOpen(true); } },
                    { icon: <LayoutList size={20} color="#0891B2" />, label: 'Bölüme Taşı', onPress: () => { setMoveTargetNote(activeNote); setNoteOptionsVisible(false); setIsMoveSectionModalOpen(true); } },
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

        {/* ── MOVE NOTE TO FOLDER MODAL ── */}
        <Modal visible={isMoveModalOpen} animationType="slide" transparent={true} onRequestClose={() => setIsMoveModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: border }}>
              
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }}>
                    <FolderPlus size={18} color="white" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>Notu Taş</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary }}>Hedef Klasörü Seçin</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsMoveModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 16, paddingBottom: 20 }}>
                  
                  <View style={{ gap: 16 }}>
                    {notebooks.map((nb) => (
                      <View key={nb.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <Text style={{ fontSize: 18 }}>{nb.icon || '📁'}</Text>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: textPrimary }}>{nb.title}</Text>
                        </View>
                        <View style={{ gap: 8, paddingLeft: 4 }}>
                           {nb.sections?.filter(s => s.id !== 'passwords-tab').map(sec => (
                              <View key={sec.id} style={{ gap: 6 }}>
                                 <TouchableOpacity
                                    onPress={() => {
                                      if (moveTargetNote) {
                                        updateNoteInSection(nb.id, moveTargetNote.id, { ...moveTargetNote, notebookId: nb.id, sectionId: sec.id, subSectionId: null, updatedAt: new Date().toISOString() }).catch(console.log);
                                      }
                                      setIsMoveModalOpen(false);
                                    }}
                                    style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF', borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                 >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                       <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sec.color || '#0891B2' }} />
                                       <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{sec.title} Bölümü</Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: sec.color || '#0891B2' }}>Buraya Taşı ➔</Text>
                                 </TouchableOpacity>

                                 {/* Sub-sections */}
                                 {sec.subSections?.map(ss => (
                                    <TouchableOpacity
                                       key={ss.id}
                                       onPress={() => {
                                         if (moveTargetNote) {
                                           updateNoteInSection(nb.id, moveTargetNote.id, { ...moveTargetNote, notebookId: nb.id, sectionId: sec.id, subSectionId: ss.id, updatedAt: new Date().toISOString() }).catch(console.log);
                                         }
                                         setIsMoveModalOpen(false);
                                       }}
                                       style={{ padding: 10, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 24 }}
                                    >
                                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                          <Folder size={14} color={ss.color || '#3B82F6'} />
                                          <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>{ss.icon} {ss.title}</Text>
                                       </View>
                                       <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>İçine Taşı ➔</Text>
                                    </TouchableOpacity>
                                 ))}
                              </View>
                           ))}
                        </View>
                      </View>
                    ))}
                  </View>

                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MOVE NOTE TO SECTION MODAL ── */}
        <Modal visible={isMoveSectionModalOpen} animationType="slide" transparent={true} onRequestClose={() => setIsMoveSectionModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: border }}>
              
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#0891B2', alignItems: 'center', justifyContent: 'center' }}>
                    <LayoutList size={18} color="white" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>Bölüme Taşı</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary }}>Hedef Bölümü Seçin</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsMoveSectionModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 16 }}>
                    {sections.filter(s => s.id !== 'passwords-tab').map((sec) => (
                       <View key={sec.id} style={{ gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (moveTargetNote && activeFolderId) {
                                updateNoteInSection(activeFolderId, moveTargetNote.id, {
                                  ...moveTargetNote,
                                  sectionId: sec.id,
                                  subSectionId: null,
                                  updatedAt: new Date().toISOString()
                                }).catch(console.log);
                              }
                              setIsMoveSectionModalOpen(false);
                            }}
                            style={{
                              padding: 14,
                              borderRadius: 16,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                              borderWidth: 1,
                              borderColor: sec.id === activeSectionId ? '#0891B2' : border,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sec.color || '#0891B2' }} />
                              <View>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{sec.title} Bölümü</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: '#0891B2' }}>Buraya Taşı ➔</Text>
                          </TouchableOpacity>
                          
                          {/* Sub-sections */}
                          {sec.subSections?.map(ss => (
                             <TouchableOpacity
                                key={ss.id}
                                onPress={() => {
                                  if (moveTargetNote && activeFolderId) {
                                    updateNoteInSection(activeFolderId, moveTargetNote.id, { ...moveTargetNote, sectionId: sec.id, subSectionId: ss.id, updatedAt: new Date().toISOString() }).catch(console.log);
                                  }
                                  setIsMoveSectionModalOpen(false);
                                }}
                                style={{ padding: 10, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 24 }}
                             >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                   <Folder size={14} color={ss.color || '#3B82F6'} />
                                   <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>{ss.icon} {ss.title}</Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>İçine Taşı ➔</Text>
                             </TouchableOpacity>
                          ))}
                       </View>
                    ))}
                  </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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



        {/* Sub-section options */}
        <Modal visible={!!subSectionOptionsId} transparent animationType="fade">
          <Pressable style={s.sheetOverlay} onPress={() => setSubSectionOptionsId(null)}>
            <View style={[s.smallMenu, { backgroundColor: cardBg }]}>
              <TouchableOpacity style={s.optionsItem} onPress={() => {
                const ss = activeSection?.subSections?.find(s => s.id === subSectionOptionsId);
                if (ss) {
                  setSubSectionForm({ title: ss.title, icon: ss.icon || '📁', color: ss.color || FOLDER_COLORS[0] });
                  setEditingSubSectionId(ss.id);
                  setSubSectionOptionsId(null);
                  setIsNewSubSectionOpen(true);
                }
              }} activeOpacity={0.7}>
                <Edit3 size={18} color={textPrimary} />
                <Text style={[s.optionsItemText, { color: textPrimary }]}>Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.optionsItem} onPress={() => { handleDeleteSubSection(subSectionOptionsId!); }} activeOpacity={0.7}>
                <Trash2 size={18} color="#EF4444" />
                <Text style={[s.optionsItemText, { color: '#EF4444' }]}>Alt Bölümü Sil</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Section options */}
        <Modal visible={!!sectionOptionsId} transparent animationType="fade">
          <Pressable style={s.sheetOverlay} onPress={() => setSectionOptionsId(null)}>
            <View style={[s.smallMenu, { backgroundColor: cardBg }]}>
              <TouchableOpacity
                style={s.optionsItem}
                onPress={() => {
                  const sec = sections.find((s) => s.id === sectionOptionsId);
                  if (sec) {
                    setEditingSection(sec);
                    setSectionForm({ title: sec.title, color: sec.color || FOLDER_COLORS[0] });
                    setSectionOptionsId(null);
                    setIsNewSectionOpen(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Edit3 size={18} color={textPrimary} />
                <Text style={[s.optionsItemText, { color: textPrimary }]}>Bölümü Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.optionsItem}
                onPress={() => {
                  if (sectionOptionsId) handleDeleteSection(sectionOptionsId);
                }}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={[s.optionsItemText, { color: '#EF4444' }]}>Bölümü Sil</Text>
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
          title={editingFolderId ? "Klasörü Düzenle" : "Yeni Klasör"}
        />

        {/* New/Edit sub-section modal */}
        <FolderFormModal
          visible={isNewSubSectionOpen}
          onClose={() => { setIsNewSubSectionOpen(false); setEditingSubSectionId(null); }}
          form={subSectionForm as any}
          setForm={setSubSectionForm as any}
          onSubmit={handleCreateSubSection}
          cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} isDark={isDark}
          title={editingSubSectionId ? "Alt Bölümü Düzenle" : "Yeni Alt Bölüm Ekle"}
        />

        {/* New/Edit section modal */}
        <SectionFormModal
          visible={isNewSectionOpen}
          onClose={() => { setIsNewSectionOpen(false); setEditingSection(null); }}
          form={sectionForm}
          setForm={setSectionForm}
          onSubmit={editingSection ? handleUpdateSection : handleCreateSection}
          cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} border={border} isDark={isDark}
          title={editingSection ? "Bölümü Düzenle" : "Yeni Bölüm"}
        />

        {/* ── NEW PASSWORD MODAL ── */}
        <Modal visible={isNewPasswordOpen} animationType="slide" transparent={true} onRequestClose={() => setIsNewPasswordOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '90%', borderWidth: 1, borderColor: border }}>
              
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={20} color="white" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>{editingPasswordNoteId ? "Şifreyi Düzenle" : "Hızlı Şifre Ekle"}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary }}>Güvenli Şifre Kasası</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setIsNewPasswordOpen(false); setEditingPasswordNoteId(null); }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Template Chips Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    ⚡ Hızlı Şablonlar
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsEditTemplatesOpen(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: isDark ? 'rgba(79,70,229,0.15)' : '#eef2ff', borderRadius: 8, borderWidth: 1, borderColor: '#c7d2fe' }}
                  >
                    <SlidersHorizontal size={11} color="#4f46e5" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#4f46e5' }}>Şablonları Düzenle ⚙️</Text>
                  </TouchableOpacity>
                </View>

                {/* Template Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                  {passwordTemplates.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      onPress={() => setPasswordForm(p => ({ ...p, accountName: tpl.name, category: tpl.cat || 'Diğer' }))}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#4f46e5' }}>{tpl.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Form Fields */}
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>📌 Ne Şifresi? (Hesap / Platform Adı) *</Text>
                    <TextInput
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '800', color: textPrimary, borderWidth: 1, borderColor: border }}
                      placeholder="Örn: Netflix, Ev Wi-Fi, Garanti"
                      placeholderTextColor={textSecondary}
                      value={passwordForm.accountName}
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, accountName: t }))}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>👤 Kullanıcı Adı / E-posta / Telefon (Opsiyonel)</Text>
                    <TextInput
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: textPrimary, borderWidth: 1, borderColor: border }}
                      placeholder="Örn: ahmet@gmail.com veya 0532..."
                      placeholderTextColor={textSecondary}
                      value={passwordForm.username}
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, username: t }))}
                    />
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary }}>🔑 Şifre *</Text>
                      <TouchableOpacity onPress={generatePassword} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Dices size={13} color="#4f46e5" />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#4f46e5' }}>Rastgele Üret 🎲</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '900', color: textPrimary, borderWidth: 1, borderColor: border, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
                      placeholder="Şifreyi girin..."
                      placeholderTextColor={textSecondary}
                      value={passwordForm.password}
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, password: t }))}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>📝 Ek Not / Açıklama (Opsiyonel)</Text>
                    <TextInput
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: textPrimary, borderWidth: 1, borderColor: border }}
                      placeholder="Örn: Kurtarma kodu, PIN numarası"
                      placeholderTextColor={textSecondary}
                      value={passwordForm.notes}
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, notes: t }))}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={handleSavePasswordNote}
                    activeOpacity={0.85}
                    style={{ marginTop: 8, backgroundColor: '#4f46e5', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '900', color: 'white' }}>
                      {editingPasswordNoteId ? "💾 Değişiklikleri Kaydet" : "🔐 Şifreyi Kasaya Kaydet"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── EDIT TEMPLATES MODAL ── */}
        <Modal visible={isEditTemplatesOpen} animationType="slide" transparent={true} onRequestClose={() => setIsEditTemplatesOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: border }}>
              
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                    <SlidersHorizontal size={18} color="white" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>Şablonları Düzenle</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary }}>Özel Hızlı Şablonlarınız</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsEditTemplatesOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Active Templates List */}
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  Mevcut Şablonlar ({passwordTemplates.length})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {passwordTemplates.map((tpl) => (
                    <View
                      key={tpl.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 8, paddingVertical: 6, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', borderWidth: 1, borderColor: border }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }}>{tpl.label}</Text>
                      <TouchableOpacity onPress={() => handleDeleteTemplate(tpl.id)} style={{ padding: 2 }}>
                        <X size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Add New Template Section */}
                <View style={{ padding: 14, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderWidth: 1, borderColor: border, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: textPrimary, marginBottom: 8 }}>+ Yeni Şablon Ekle</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={{ width: 50, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, fontSize: 16, textAlign: 'center', borderWidth: 1, borderColor: border }}
                      placeholder="🔑"
                      value={newTplEmoji}
                      onChangeText={setNewTplEmoji}
                      maxLength={4}
                    />
                    <TextInput
                      style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontWeight: '700', color: textPrimary, borderWidth: 1, borderColor: border }}
                      placeholder="Örn: PlayStation, İş E-posta"
                      placeholderTextColor={textSecondary}
                      value={newTplName}
                      onChangeText={setNewTplName}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleAddTemplate}
                    style={{ backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '900', color: 'white' }}>+ Şablonu Kaydet</Text>
                  </TouchableOpacity>
                </View>

                {/* Reset to Defaults Button */}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Varsayılana Sıfırla', 'Tüm şablonlar varsayılan listeye sıfırlansın mı?', [
                      { text: 'İptal', style: 'cancel' },
                      { text: 'Sıfırla', style: 'destructive', onPress: handleResetTemplates },
                    ]);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
                >
                  <RotateCcw size={14} color={textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: textSecondary }}>Varsayılan Şablonlara Sıfırla</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* DRAG OVERLAY */}
        {draggedNote && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
            <Animated.View
              style={[
                s.noteCard,
                {
                  position: 'absolute',
                  width: 150,
                  height: 150,
                  backgroundColor: getNoteColor(draggedNote.color).bg,
                  opacity: 0.95,
                  borderRadius: 20,
                  padding: 16,
                  transform: dragPan.getTranslateTransform(),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 10,
                }
              ]}
            >
              <Text style={[s.noteCardTitle, { color: '#FFF' }]} numberOfLines={2}>
                {draggedNote.title || 'İsimsiz Not'}
              </Text>
              <Text style={[s.noteCardPreview, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={3}>
                {getPreview(draggedNote)}
              </Text>
            </Animated.View>
          </View>
        )}

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
  const rootFolders = notebooks;
  const passwordNotesCount = notes.filter((n) => n.isPassword).length;
  const pinnedNotesCount = notes.filter((n) => n.pinned).length;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* ── FLAGSHIP HERO HEADER ── */}
      <LinearGradient 
        colors={isDark ? ['#1e1b4b', '#311075', '#4c1d95'] : ['#4f46e5', '#6366f1', '#7c3aed']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ 
          paddingTop: insets.top + 12, 
          paddingBottom: 22, 
          paddingHorizontal: 20, 
          borderBottomLeftRadius: 36, 
          borderBottomRightRadius: 36,
          shadowColor: '#4f46e5',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.4 : 0.25,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {/* Navigation Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="white" />
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>Notlarım</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>Kişisel Not Deposu</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => setIsSearchOpen(true)} style={{ width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Dashboard Quick Stats Pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>{rootFolders.length}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>📁 Klasör</Text>
          </View>
          <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>{notes.length}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>📝 Toplam Not</Text>
          </View>
          <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#fbbf24' }}>{passwordNotesCount}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>🔐 Şifreler</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        
        {/* QUICK SHORTCUT CARDS ROW */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>⚡ Hızlı Kısayollar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {/* Şifre Kasası Quick Shortcut */}
            <TouchableOpacity
              onPress={() => {
                if (rootFolders.length > 1) {
                  setIsPasswordFolderPickerOpen(true);
                } else {
                  const targetFolder = rootFolders[0] || notebooks[0];
                  if (targetFolder) {
                    setFolderStack([{ id: targetFolder.id, title: targetFolder.title, icon: targetFolder.icon || '📁' }]);
                    setActiveFolderId(targetFolder.id);
                    setActiveSectionId('passwords-tab');
                    setScreen('notes');
                  }
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(79,70,229,0.18)' : '#eef2ff',
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(79,70,229,0.35)' : '#c7d2fe',
              }}
              activeOpacity={0.8}
            >
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={16} color="white" />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: textPrimary }}>Şifre Kasası 🔐</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#4f46e5' }}>{passwordNotesCount} Kayıtlı Şifre</Text>
              </View>
            </TouchableOpacity>

            {/* Sabitlenen Notlar Shortcut */}
            {pinnedNotesCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  const targetFolder = rootFolders[0] || notebooks[0];
                  if (targetFolder) {
                    setFolderStack([{ id: targetFolder.id, title: targetFolder.title, icon: targetFolder.icon || '📁' }]);
                    setActiveFolderId(targetFolder.id);
                    setActiveSectionId(targetFolder.sections?.[0]?.id || 'default');
                    setScreen('notes');
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#fde68a',
                }}
                activeOpacity={0.8}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' }}>
                  <Pin size={16} color="white" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: textPrimary }}>Sabitlenenler 📌</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>{pinnedNotesCount} Önemli Not</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ROOT FOLDERS SECTION TITLE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>📁 Klasörlerim</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary }}>{rootFolders.length} Klasör Mevcut</Text>
        </View>

        {rootFolders.length === 0 ? (
          <View style={[s.emptyState, { backgroundColor: cardBg, borderRadius: 24, padding: 30, borderWidth: 1, borderColor: border }]}>
            <View style={[s.emptyIcon, { backgroundColor: '#7C3AED20', width: 64, height: 64, borderRadius: 32 }]}>
              <Folder size={32} color="#7C3AED" />
            </View>
            <Text style={[s.emptyTitle, { color: textPrimary, fontSize: 18, marginTop: 12 }]}>Henüz Klasör Oluşturmadınız</Text>
            <Text style={[s.emptyDesc, { color: textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 }]}>
              Notlarınızı düzenli tutmak için aşağıdaki + butonuna basarak ilk klasörünüzü hemen oluşturabilirsiniz.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {rootFolders.map((nb, idx) => {
              const isColorValid = nb.color && FOLDER_COLORS.includes(nb.color);
              const folderColor = isColorValid ? nb.color : FOLDER_COLORS[idx % FOLDER_COLORS.length];
              const gradient = FOLDER_GRADIENTS[folderColor] || [folderColor, folderColor];
              const noteCount = getNoteCount(nb.id);
              
              const totalItems = noteCount;

              return (
                <TouchableOpacity
                  key={nb.id}
                  onPress={() => handleOpenFolder(nb)}
                  onLongPress={() => setFolderOptionsId(nb.id)}
                  style={{
                    width: '48%',
                    marginBottom: 16,
                    borderRadius: 26,
                    overflow: 'hidden',
                    elevation: 6,
                    shadowColor: folderColor,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={gradient as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 16, minHeight: 160, justifyContent: 'space-between' }}
                  >
                    {/* Card Top Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 22 }}>{nb.icon || '📁'}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => setFolderOptionsId(nb.id)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MoreHorizontal size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Card Info */}
                    <View style={{ marginTop: 16 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 17, letterSpacing: -0.3, marginBottom: 6 }} numberOfLines={1}>
                        {nb.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                            {noteCount} Not
                          </Text>
                        </View>
                      </View>
                      
                      {/* Card Progress Bar */}
                      <View style={{ width: '100%', height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: '#FFFFFF', borderRadius: 3, width: totalItems > 0 ? '100%' : '0%' }} />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* PRO FAB ROW */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }} pointerEvents="box-none">
        <View style={s.fabRow} pointerEvents="box-none">
          <TouchableOpacity
            style={{
              height: 52,
              paddingHorizontal: 22,
              borderRadius: 26,
              backgroundColor: '#7C3AED',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={() => { setFolderForm({ title: '', icon: '📁', color: FOLDER_COLORS[0] }); setEditingFolderId(null); setIsNewFolderOpen(true); }}
            activeOpacity={0.85}
          >
            <FolderPlus size={20} color="white" />
            <Text style={{ fontSize: 14, fontWeight: '900', color: 'white' }}>+ Yeni Klasör</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Folder options */}
      <Modal visible={!!folderOptionsId} transparent animationType="fade">
        <Pressable style={s.sheetOverlay} onPress={() => setFolderOptionsId(null)}>
          <View style={[s.smallMenu, { backgroundColor: cardBg }]}>
            <TouchableOpacity
              style={s.optionsItem}
              onPress={() => {
                const nb = notebooks.find((n) => n.id === folderOptionsId);
                if (nb) {
                  setFolderForm({ title: nb.title, icon: nb.icon || '📁', color: nb.color || FOLDER_COLORS[0] });
                  setEditingFolderId(nb.id);
                  setFolderOptionsId(null);
                  setIsNewFolderOpen(true);
                }
              }}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color={textPrimary} />
              <Text style={[s.optionsItemText, { color: textPrimary }]}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.optionsItem}
              onPress={() => {
                const fId = folderOptionsId;
                setFolderOptionsId(null);
                if (fId) handleDeleteFolder(fId);
              }}
              activeOpacity={0.7}
            >
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
        results={notes.filter((n) => {
          if (!searchTerm) return true;
          const q = searchTerm.toLowerCase();
          return (
            n.title?.toLowerCase().includes(q) ||
            n.accountName?.toLowerCase().includes(q) ||
            n.username?.toLowerCase().includes(q) ||
            n.passwordCategory?.toLowerCase().includes(q) ||
            n.notes?.toLowerCase().includes(q) ||
            n.content?.[0]?.data?.toLowerCase().includes(q)
          );
        })}
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

      {/* ── PASSWORD FOLDER PICKER MODAL ── */}
      <Modal visible={isPasswordFolderPickerOpen} animationType="slide" transparent={true} onRequestClose={() => setIsPasswordFolderPickerOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={20} color="white" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>Şifre Kasası</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary }}>Hangi Klasörün Şifrelerini Açmak İstiyorsunuz?</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsPasswordFolderPickerOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {rootFolders.map((nb) => {
                  const folderPasswordCount = notes.filter((n) => n.notebookId === nb.id && n.isPassword).length;
                  return (
                    <TouchableOpacity
                      key={nb.id}
                      onPress={() => {
                        setFolderStack([{ id: nb.id, title: nb.title, icon: nb.icon || '📁' }]);
                        setActiveFolderId(nb.id);
                        setActiveSectionId('passwords-tab');
                        setScreen('notes');
                        setIsPasswordFolderPickerOpen(false);
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                        borderWidth: 1.5,
                        borderColor: isDark ? 'rgba(79,70,229,0.3)' : '#c7d2fe',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 22 }}>{nb.icon || '📁'}</Text>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{nb.title}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#4f46e5' }}>{folderPasswordCount} Şifre Kaydı</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#4f46e5' }}>Şifreleri Aç ➔</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FULL SCREEN IMAGE VIEWER MODAL IN NOTES LIST */}
      <FullScreenImageViewerModal uri={fullScreenImageUri} onClose={() => setFullScreenImageUri(null)} />
    </View>
  );
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────

function FullScreenImageViewerModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  if (!uri) return null;
  return (
    <Modal
      visible={true}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar hidden />
        <SafeAreaView style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 25,
              right: 20,
              zIndex: 99999,
              backgroundColor: 'rgba(255,255,255,0.3)',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 22,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            activeOpacity={0.8}
          >
            <X size={22} color="white" />
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>Kapat</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={{ uri }}
              style={{ width: '100%', height: '92%', resizeMode: 'contain' }}
            />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={s.sheetOverlay} onPress={onClose}>
          <Pressable style={[s.formSheet, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SectionFormModal({ visible, onClose, form, setForm, onSubmit, cardBg, textPrimary, textSecondary, border, isDark, title }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={s.sheetOverlay} onPress={onClose}>
          <Pressable style={[s.formSheet, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={[s.sheetHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
            <Text style={[s.formSheetTitle, { color: textPrimary }]}>{title || "Yeni Bölüm"}</Text>
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
              <Text style={s.formPrimaryBtnText}>{title?.includes("Düzenle") ? "Kaydet" : "Bölüm Oluştur"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
            const isPassword = note.isPassword;
            const nc = isPassword ? { bg: '#4f46e5', light: isDark ? '#1e1b4b' : '#eef2ff' } : getNoteColor(note.color);
            const titleText = isPassword 
              ? `🔑 ${note.accountName || note.title || 'Şifre Kaydı'}`
              : (note.title || 'İsimsiz Not');
            
            const subtitleText = isPassword
              ? (note.username ? `👤 ${note.username} • ${note.passwordCategory || 'Şifre'}` : `🔑 ${note.passwordCategory || 'Şifre Kaydı'}`)
              : getPreview(note);

            return (
              <TouchableOpacity
                key={note.id}
                style={[s.searchResultItem, { backgroundColor: isDark ? nc.bg + '22' : nc.light, borderColor: nc.bg + '40' }]}
                onPress={() => onSelect(note)}
                activeOpacity={0.7}
              >
                <View style={[s.searchResultColorDot, { backgroundColor: nc.bg }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.searchResultTitle, { color: isDark ? '#F0EFF8' : '#111827', fontWeight: '800' }]} numberOfLines={1}>
                    {titleText}
                  </Text>
                  {subtitleText.length > 0 && (
                    <Text style={[s.searchResultPreview, { color: isPassword ? (isDark ? '#a5b4fc' : '#4f46e5') : textSecondary, fontWeight: isPassword ? '700' : '400' }]} numberOfLines={1}>
                      {subtitleText}
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