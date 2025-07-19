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
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  category: 'Okul' | 'Spor' | 'Aile' | 'Doğum Günü' | 'Diğer';
  description: string;
  location: string;
  priority: 'Yüksek' | 'Orta' | 'Düşük';
}

export type MediaType = 'Kitap' | 'Film' | 'Sesli Kitap' | 'Oyun';

export interface MediaItem {
    id: number;
    type: MediaType;
    title: string;
    author: string; // or director, developer etc.
    coverImage: string;
    rating: number;
    description: string;
    genre: string;
    pages?: number; // for books
    duration?: string; // for movies/audiobooks
    platform?: string; // for games
}

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
  status: 'Tamamlandı' | 'Bekliyor';
  studentId: number;
  priority: 'Yüksek' | 'Orta' | 'Düşük';
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
  { id: 5, name: 'İngilizce', color: '#EF4444', grade: 95 },
];

export const upcomingExams: Exam[] = [
  { id: 1, subject: 'Matematik', date: '2025-01-15', time: '10:00', topics: ['Kesirler', 'Ondalık Sayılar', 'Yüzdeler'], studentId: 3, priority: 'Yüksek' },
  { id: 2, subject: 'Fen Bilimleri', date: '2025-01-22', time: '11:00', topics: ['Güneş Sistemi', 'Hücre'], studentId: 3, priority: 'Orta' },
  { id: 3, subject: 'Türkçe', date: '2025-01-18', time: '14:00', topics: ['Yazım Kuralları', 'Noktalama İşaretleri'], studentId: 4, priority: 'Orta' },
];

export const assignments: Assignment[] = [
  { id: 1, title: 'Matematik Ödev Kitabı (Sayfa 50-55)', subject: 'Matematik', dueDate: 'Yarın', status: 'Bekliyor', studentId: 3, priority: 'Yüksek' },
  { id: 2, title: 'Türkçe Kompozisyon: "Hayalimdeki Dünya"', subject: 'Türkçe', dueDate: 'Dün', status: 'Tamamlandı', studentId: 4, priority: 'Orta' },
  { id: 3, title: 'Fen Bilimleri Projesi: Hücre Modeli', subject: 'Fen Bilimleri', dueDate: '2 Gün Sonra', status: 'Bekliyor', studentId: 3, priority: 'Yüksek' },
];


export const familyMembers: FamilyMember[] = [
  { id: 1, name: 'Ahmet', role: 'Baba', avatar: '👨', completedTasks: 18, color: '#3B82F6', level: 5, xp: 1250, streak: 7, badges: ['🏆', '⚡', '🎯'], mood: 'happy', status: 'online' },
  { id: 2, name: 'Zeynep', role: 'Anne', avatar: '👩', completedTasks: 22, color: '#EC4899', level: 6, xp: 1580, streak: 12, badges: ['👑', '💎', '🌟', '🔥'], mood: 'excited', status: 'online' },
  { id: 3, name: 'Elif', role: 'Kız Çocuk', avatar: '👧', completedTasks: 14, color: '#8B5CF6', level: 4, xp: 890, streak: 5, badges: ['📚', '🎨', '⭐'], mood: 'focused', status: 'away' },
  { id: 4, name: 'Murat', role: 'Erkek Çocuk', avatar: '👦', completedTasks: 10, color: '#F59E0B', level: 3, xp: 650, streak: 3, badges: ['🎵', '🏃‍♂️'], mood: 'playful', status: 'online' },
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
    { id: 1, title: 'Elif\'in Piyano Dersi', date: '2024-07-29', startTime: '16:00', endTime: '17:00', category: 'Okul', description: 'Müzik okulunda piyano dersi.', location: 'Müzik Okulu', priority: 'Yüksek' },
    { id: 2, title: 'Veli Toplantısı', date: '2024-07-30', startTime: '18:00', endTime: '19:00', category: 'Okul', description: 'Elif\'in okuldaki veli toplantısı.', location: 'İlkokul', priority: 'Yüksek' },
    { id: 3, title: 'Ahmet\'in Halı Saha Maçı', date: '2024-07-31', startTime: '21:00', endTime: '22:00', category: 'Spor', description: 'Arkadaşlarla haftalık maç.', location: 'Spor Kompleksi', priority: 'Orta' },
    { id: 4, title: 'Aile Sinema Gecesi', date: '2024-08-02', startTime: '20:00', endTime: '22:00', category: 'Aile', description: 'Evde patlamış mısır ve film keyfi.', location: 'Ev', priority: 'Orta' },
    { id: 5, title: 'Zeynep\'in Doğum Günü Yemeği', date: '2024-08-05', startTime: '19:30', category: 'Doğum Günü', description: 'Zeynep\'in doğum gününü dışarıda kutluyoruz!', location: 'Favori Restoran', priority: 'Yüksek' },
];

export const mediaItems: MediaItem[] = [
    { id: 1, type: 'Kitap', title: 'Küçük Prens', author: 'Antoine de Saint-Exupéry', coverImage: 'https://placehold.co/300x450.png', rating: 5, pages: 112, description: 'Bir pilotun Sahra Çölü\'ne düşmesi ve orada küçük bir prensle tanışmasını konu alır.', genre: 'Fantastik' },
    { id: 2, type: 'Kitap', title: 'Şeker Portakalı', author: 'José Mauro de Vasconcelos', coverImage: 'https://placehold.co/300x450.png', rating: 5, pages: 200, description: 'Yoksul bir ailenin çocuğu olan Zezé\'nin hayal gücü ve hüzünlü hikayesi.', genre: 'Dram' },
    { id: 3, type: 'Film', title: 'Yüzüklerin Efendisi: Yüzük Kardeşliği', author: 'Peter Jackson', coverImage: 'https://placehold.co/300x450.png', rating: 5, duration: '2s 58dk', description: 'Genç bir hobbit olan Frodo Baggins\'in Tek Yüzük\'ü yok etmek için çıktığı macera.', genre: 'Fantastik' },
    { id: 4, type: 'Sesli Kitap', title: 'Martı Jonathan Livingston', author: 'Richard Bach', coverImage: 'https://placehold.co/300x450.png', rating: 4, duration: '1s 30dk', description: 'Sıradan bir martı olmaktan fazlasını isteyen Jonathan\'ın hikayesi.', genre: 'Felsefe' },
    { id: 5, type: 'Kitap', title: '1984', author: 'George Orwell', coverImage: 'https://placehold.co/300x450.png', rating: 5, pages: 328, description: 'Distopik bir gelecekte totaliter bir rejimin altında yaşayan insanların hikayesi.', genre: 'Distopya' },
    { id: 6, type: 'Oyun', title: 'Stardew Valley', author: 'ConcernedApe', coverImage: 'https://placehold.co/300x450.png', rating: 5, platform: 'PC/Konsol', description: 'Büyükbabanızın eski çiftliğini devralıp yeni bir hayata başlayın.', genre: 'Simülasyon' },
    { id: 7, type: 'Film', title: 'Inception', author: 'Christopher Nolan', coverImage: 'https://placehold.co/300x450.png', rating: 5, duration: '2s 28dk', description: 'Başkalarının rüyalarına girerek fikir çalan bir hırsızın hikayesi.', genre: 'Bilim Kurgu'},
    { id: 8, type: 'Oyun', title: 'The Witcher 3: Wild Hunt', author: 'CD Projekt Red', coverImage: 'https://placehold.co/300x450.png', rating: 5, platform: 'PC/Konsol', description: 'Canavar avcısı Geralt of Rivia\'nın maceralarını konu alan bir rol yapma oyunu.', genre: 'RPG'},
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
