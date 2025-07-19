import { GraduationCap, ShoppingCart, BookOpen, Calendar, CheckSquare } from 'lucide-react';

export interface FamilyMember {
  id: number;
  name: string;
  role: 'Baba' | 'Anne' | 'Kız Çocuk' | 'Erkek Çocuk' | 'Bebek';
  avatar: string;
  completedTasks: number;
  color: string;
  level: number;
  xp: number;
  streak: number;
  badges: string[];
  mood: 'happy' | 'excited' | 'focused' | 'playful' | 'tired' | 'stressed';
  status: 'online' | 'away' | 'offline';
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: number;
  title: string;
  assigneeId: number;
  points: number;
  dueDate: string;
  completed: boolean;
  category: 'Ev İşleri' | 'Okul' | 'Kişisel' | 'Aile';
  subtasks: Subtask[];
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  notes?: string;
  photo?: string;
  audioNoteUrl?: string;
}

export interface CalendarEvent {
    id: number;
    date: string;
    title: string;
    category: 'Okul' | 'Spor' | 'Aile' | 'Doğum Günü' | 'Diğer';
    priority: 'Yüksek' | 'Orta' | 'Düşük';
    startTime: string;
    endTime?: string;
    location: string;
    description: string;
    attendees: number[];
}

export const familyMembers: FamilyMember[] = [
  { id: 1, name: 'Ahmet', role: 'Baba', avatar: 'https://placehold.co/64x64.png', completedTasks: 18, color: '#3B82F6', level: 5, xp: 1250, streak: 7, badges: ['🏆', '⚡', '🎯'], mood: 'happy', status: 'online' },
  { id: 2, name: 'Zeynep', role: 'Anne', avatar: 'https://placehold.co/64x64.png', completedTasks: 22, color: '#EC4899', level: 6, xp: 1580, streak: 12, badges: ['👑', '💎', '🌟', '🔥'], mood: 'excited', status: 'online' },
  { id: 3, name: 'Elif', role: 'Kız Çocuk', avatar: 'https://placehold.co/64x64.png', completedTasks: 14, color: '#8B5CF6', level: 4, xp: 890, streak: 5, badges: ['📚', '🎨', '⭐'], mood: 'focused', status: 'away' },
  { id: 4, name: 'Murat', role: 'Erkek Çocuk', avatar: 'https://placehold.co/64x64.png', completedTasks: 10, color: '#F59E0B', level: 3, xp: 650, streak: 3, badges: ['🎵', '🏃‍♂️'], mood: 'playful', status: 'online' },
];

export const tasks: Task[] = [
  { id: 1, title: 'Odanı topla ve temizle', assigneeId: 3, points: 20, dueDate: 'Bugün', completed: false, category: 'Ev İşleri', difficulty: 'Orta', subtasks: [{id: 's1', title: 'Yatağını yap', completed: true}, {id: 's2', title: 'Oyuncakları kutuya koy', completed: false}, {id: 's3', title: 'Çalışma masanı düzenle', completed: false}] },
  { id: 2, title: 'Matematik proje ödevini yap', assigneeId: 3, points: 50, dueDate: 'Yarın', completed: false, category: 'Okul', difficulty: 'Zor', subtasks: [{id: 's4', title: 'Araştırma yap', completed: true}, {id: 's5', title: 'Sunumu hazırla', completed: false}]},
  { id: 3, title: 'Haftalık alışverişi yap', assigneeId: 2, points: 30, dueDate: 'Bugün', completed: true, category: 'Aile', difficulty: 'Orta', subtasks: [] },
  { id: 4, title: 'Bulaşıkları makineye diz', assigneeId: 1, points: 10, dueDate: 'Bugün', completed: false, category: 'Ev İşleri', difficulty: 'Kolay', subtasks: [] },
  { id: 5, title: 'Bahçedeki çiçekleri sula', assigneeId: 3, points: 15, dueDate: 'Bugün', completed: true, category: 'Ev İşleri', difficulty: 'Kolay', subtasks: [] },
  { id: 6, title: 'Akşam yemeği için menü planla', assigneeId: 2, points: 25, dueDate: 'Cuma', completed: false, category: 'Aile', difficulty: 'Orta', subtasks: [] },
  { id: 7, title: 'Garajı düzenle ve temizle', assigneeId: 1, points: 100, dueDate: 'Hafta Sonu', completed: false, category: 'Ev İşleri', difficulty: 'Zor', subtasks: [] },
];

export const calendarEvents: CalendarEvent[] = [
    {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        title: 'Veli Toplantısı',
        category: 'Okul',
        priority: 'Yüksek',
        startTime: '14:00',
        location: 'İlkokul Konferans Salonu',
        description: 'Elif\'in dönem sonu değerlendirmesi.',
        attendees: [2, 3]
    },
    {
        id: 2,
        date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
        title: 'Murat\'ın Futbol Maçı',
        category: 'Spor',
        priority: 'Orta',
        startTime: '16:00',
        location: 'Şehir Stadyumu',
        description: 'Yıldızlar U-14 ligi maçı.',
        attendees: [1, 2, 3, 4]
    },
     {
        id: 3,
        date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
        title: 'Ahmet\'in Doğum Günü',
        category: 'Doğum Günü',
        priority: 'Yüksek',
        startTime: '19:00',
        location: 'Ev',
        description: 'Akşam yemeği ve pasta kesimi.',
        attendees: [1, 2, 3, 4]
    },
    {
        id: 4,
        date: new Date().toISOString().split('T')[0],
        title: 'Dişçi Randevusu',
        category: 'Diğer',
        priority: 'Orta',
        startTime: '11:00',
        location: 'Dentist Kliniği',
        description: 'Zeynep\'in yıllık kontrolü.',
        attendees: [2]
    }
];

export const recentActivities = [
    { id: 1, user: 'Elif', title: 'Matematik ödevi tamamlandı', time: '5 dakika önce', icon: GraduationCap, color: 'from-purple-500 to-indigo-500', points: 25 },
    { id: 2, user: 'Zeynep', title: 'Haftalık alışveriş tamamlandı', time: '1 saat önce', icon: ShoppingCart, color: 'from-green-500 to-emerald-500', points: 30 },
    { id: 3, user: 'Murat', title: '"Küçük Prens" kitabını okudu', time: '3 saat önce', icon: BookOpen, color: 'from-yellow-500 to-amber-500', points: 50 },
    { id: 4, user: 'Ahmet', title: 'Doktor randevusu eklendi', time: '5 saat önce', icon: Calendar, color: 'from-blue-500 to-sky-500', points: 10 },
];

export const weeklyPoints = [
    { name: 'Pzt', points: 300 },
    { name: 'Sal', points: 450 },
    { name: 'Çar', points: 200 },
    { name: 'Per', points: 700 },
    { name: 'Cum', points: 550 },
    { name: 'Cmt', points: 900 },
    { name: 'Paz', points: 600 },
];

export type MediaType = "Kitap" | "Film" | "Sesli Kitap" | "Oyun";

export interface MediaItem {
  id: number;
  title: string;
  author: string; // or director/developer
  coverImage: string;
  type: MediaType;
  genre: string;
  rating: number;
  description: string;
  status: 'Okunuyor' | 'İzleniyor' | 'Oynanıyor' | 'Tamamlandı' | 'İstek Listesi';
  // Type-specific fields
  pages?: number;
  duration?: string;
  platform?: string;
}

export const mediaItems: MediaItem[] = [
  { id: 1, title: "Yüzüklerin Efendisi", author: "J.R.R. Tolkien", coverImage: "https://placehold.co/300x450.png", type: "Kitap", genre: "Fantastik", rating: 4.9, description: "Orta Dünya'da geçen epik bir macera.", status: 'Tamamlandı' },
  { id: 2, title: "The Matrix", author: "Wachowski Kardeşler", coverImage: "https://placehold.co/300x450.png", type: "Film", genre: "Bilim Kurgu", rating: 4.8, description: "Gerçekliğin sorgulandığı bir siber dünya.", status: 'Tamamlandı', duration: '2s 16dk' },
  { id: 3, title: "The Witcher 3", author: "CD Projekt Red", coverImage: "https://placehold.co/300x450.png", type: "Oyun", genre: "RPG", rating: 4.9, description: "Geralt of Rivia'nın maceraları.", status: 'Oynanıyor', platform: 'PC' },
  { id: 4, title: "Dune", author: "Frank Herbert", coverImage: "https://placehold.co/300x450.png", type: "Sesli Kitap", genre: "Bilim Kurgu", rating: 4.7, description: "Arrakis gezegenindeki politik entrikalar.", status: 'Okunuyor', duration: '21s 5dk' },
  { id: 5, title: "1984", author: "George Orwell", coverImage: "https://placehold.co/300x450.png", type: "Kitap", genre: "Distopya", rating: 4.8, description: "Totaliter bir rejim altında yaşam.", status: 'İstek Listesi' },
];

export interface Student {
  id: number;
  name: string;
  grade: string;
  avatar: string;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
  grade: number;
}

export interface Exam {
  id: number;
  subject: string;
  date: string;
  time: string;
  topics: string[];
  studentId: number;
  priority: 'Yüksek' | 'Orta' | 'Düşük';
}

export interface Assignment {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  status: 'Tamamlandı' | 'Beklemede';
  studentId: number;
}


export const students: Student[] = [
  { id: 3, name: 'Elif', grade: '5. Sınıf', avatar: '👧' },
  { id: 4, name: 'Murat', grade: '8. Sınıf', avatar: '👦' },
];

export const subjects: Subject[] = [
  { id: 1, name: 'Matematik', color: '#3B82F6', grade: 85 },
  { id: 2, name: 'Türkçe', color: '#10B981', grade: 92 },
  { id: 3, name: 'Fen Bilimleri', color: '#F59E0B', grade: 78 },
  { id: 4, name: 'Sosyal Bilgiler', color: '#8B5CF6', grade: 88 },
];

export const upcomingExams: Exam[] = [
  {
    id: 1,
    subject: 'Matematik',
    date: '15 Ocak 2025',
    time: '10:00',
    topics: ['Kesirler', 'Ondalık Sayılar'],
    studentId: 3,
    priority: 'Yüksek',
  },
  {
    id: 2,
    subject: 'Türkçe',
    date: '18 Ocak 2025',
    time: '14:00',
    topics: ['Yazım Kuralları', 'Noktalama İşaretleri'],
    studentId: 4,
    priority: 'Orta',
  },
];

export const assignments: Assignment[] = [
  {
    id: 1,
    title: 'Fen Bilimleri Projesi',
    subject: 'Fen Bilimleri',
    dueDate: '12 Ocak 2025',
    status: 'Beklemede',
    studentId: 3,
  },
  {
    id: 2,
    title: 'Tarih Sunumu',
    subject: 'Sosyal Bilgiler',
    dueDate: '14 Ocak 2025',
    status: 'Tamamlandı',
    studentId: 4,
  },
];


export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  price: number;
  completed: boolean;
}

export interface ShoppingList {
  id: number;
  title: string;
  items: ShoppingItem[];
  category: string;
  totalBudget: number;
  assigneeId: number;
  dueDate: string;
}

export const shoppingLists: ShoppingList[] = [
  {
    id: 1,
    title: 'Haftalık Market Alışverişi',
    items: [
      { id: 1, name: 'Süt', quantity: '2 litre', price: 55.50, completed: false },
      { id: 2, name: 'Ekmek', quantity: '3 adet', price: 45.00, completed: true },
      { id: 3, name: 'Yumurta', quantity: '1 düzine', price: 75.00, completed: false },
      { id: 4, name: 'Domates', quantity: '1 kg', price: 60.00, completed: false },
    ],
    category: 'Market',
    totalBudget: 450.00,
    assigneeId: 1,
    dueDate: 'Bugün',
  },
  {
    id: 2,
    title: 'Ev Temizlik Malzemeleri',
    items: [
      { id: 5, name: 'Çamaşır Deterjanı', quantity: '1 adet', price: 145.00, completed: false },
      { id: 6, name: 'Yumuşatıcı', quantity: '1 adet', price: 88.00, completed: false },
      { id: 7, name: 'Kağıt Havlu', quantity: '1 paket', price: 165.00, completed: true },
    ],
    category: 'Ev İhtiyaçları',
    totalBudget: 500.00,
    assigneeId: 2,
    dueDate: 'Yarın',
  },
];
