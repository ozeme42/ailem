export interface FamilyMember {
  id: number;
  name: string;
  role: 'Baba' | 'Anne' | 'Çocuk' | 'Bebek';
  avatar: string;
  badges: string[];
  xp: number;
  level: number;
  mood: 'Mutlu' | 'Normal' | 'Yorgun';
  online: boolean;
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

export interface Media {
    id: number;
    type: MediaType;
    title: string;
    author: string; // or director, developer etc.
    coverImage: string;
    rating: number;
    pages?: number; // for books
    duration?: string; // for movies/audiobooks
    platform?: string; // for games
    description: string;
    genre: string;
}

export const familyMembers: FamilyMember[] = [
  { id: 1, name: 'Ahmet', role: 'Baba', avatar: 'https://placehold.co/96x96.png', badges: ['Görev Ustası', 'Takım Oyuncusu'], xp: 2580, level: 12, mood: 'Normal', online: true },
  { id: 2, name: 'Zeynep', role: 'Anne', avatar: 'https://placehold.co/96x96.png', badges: ['Haftanın Yıldızı', 'Kitap Kurdu'], xp: 3120, level: 15, mood: 'Mutlu', online: false },
  { id: 3, name: 'Elif', role: 'Çocuk', avatar: 'https://placehold.co/96x96.png', badges: ['Kitap Kurdu', 'Sanatçı Ruh'], xp: 1750, level: 8, mood: 'Mutlu', online: true },
  { id: 4, name: 'Mustafa', role: 'Bebek', avatar: 'https://placehold.co/96x96.png', badges: [], xp: 100, level: 1, mood: 'Mutlu', online: true },
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

export const mediaItems: Media[] = [
    { id: 1, type: 'Kitap', title: 'Küçük Prens', author: 'Antoine de Saint-Exupéry', coverImage: 'https://placehold.co/300x450.png', rating: 5, pages: 112, description: 'Bir pilotun Sahra Çölü\'ne düşmesi ve orada küçük bir prensle tanışmasını konu alır.', genre: 'Fantastik' },
    { id: 2, type: 'Kitap', title: 'Şeker Portakalı', author: 'José Mauro de Vasconcelos', coverImage: 'https://placehold.co/300x450.png', rating: 5, pages: 200, description: 'Yoksul bir ailenin çocuğu olan Zezé\'nin hayal gücü ve hüzünlü hikayesi.', genre: 'Dram' },
    { id: 3, type: 'Film', title: 'Yüzüklerin Efendisi: Yüzük Kardeşliği', author: 'Peter Jackson', coverImage: 'https://placehold.co/300x450.png', rating: 5, duration: '2s 58dk', description: 'Genç bir hobbit olan Frodo Baggins\'in Tek Yüzük\'ü yok etmek için çıktığı macera.', genre: 'Fantastik' },
    { id: 4, type: 'Sesli Kitap', title: 'Martı Jonathan Livingston', author: 'Richard Bach', coverImage: 'https://placehold.co/300x450.png', rating: 4, duration: '1s 30dk', description: 'Sıradan bir martı olmaktan fazlasını isteyen Jonathan\'ın hikayesi.', genre: 'Felsefe' },
    { id: 5, type: 'Kitap', title: '1984', author: 'George Orwell', coverImage: 'https://placehold.co/300x450.png', rating: 5, pages: 328, description: 'Distopik bir gelecekte totaliter bir rejimin altında yaşayan insanların hikayesi.', genre: 'Distopya' },
    { id: 6, type: 'Oyun', title: 'Stardew Valley', author: 'ConcernedApe', coverImage: 'https://placehold.co/300x450.png', rating: 5, platform: 'PC/Konsol', description: 'Büyükbabanızın eski çiftliğini devralıp yeni bir hayata başlayın.', genre: 'Simülasyon' },
];

export const recentActivities = [
    { id: 1, user: 'Zeynep', userAvatar: 'https://placehold.co/40x40.png', description: '"Haftalık alışverişi yap" görevini tamamladı.', time: '15 dakika önce' },
    { id: 2, user: 'Elif', userAvatar: 'https://placehold.co/40x40.png', description: '"Şeker Portakalı" kitabını bitirdi ve 5 yıldız verdi.', time: '1 saat önce' },
    { id: 3, user: 'Ahmet', userAvatar: 'https://placehold.co/40x40.png', description: '"Garajı düzenle ve temizle" görevini ekledi.', time: '3 saat önce' },
    { id: 4, user: 'Elif', userAvatar: 'https://placehold.co/40x40.png', description: '"Bahçedeki çiçekleri sula" görevini tamamladı.', time: 'Dün' },
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
