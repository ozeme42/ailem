export interface FamilyMember {
  id: number;
  name: string;
  role: 'Baba' | 'Anne' | 'Çocuk' | 'Bebek';
  avatar: string;
  badges: string[];
}

export interface Task {
  id: number;
  title: string;
  assigneeId: number;
  points: number;
  dueDate: string;
  completed: boolean;
  category: 'Ev İşleri' | 'Okul' | 'Kişisel' | 'Aile';
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: 'Okul' | 'Spor' | 'Aile' | 'Doğum Günü' | 'Diğer';
  description: string;
}

export interface Book {
    id: number;
    title: string;
    author: string;
    coverImage: string;
    rating: number;
    pages: number;
    description: string;
}

export const familyMembers: FamilyMember[] = [
  { id: 1, name: 'Ahmet', role: 'Baba', avatar: 'https://placehold.co/96x96/3B82F6/FFFFFF', badges: ['Görev Ustası', 'Takım Oyuncusu'] },
  { id: 2, name: 'Zeynep', role: 'Anne', avatar: 'https://placehold.co/96x96/EC4899/FFFFFF', badges: ['Haftanın Yıldızı', 'Kitap Kurdu'] },
  { id: 3, name: 'Elif', role: 'Çocuk', avatar: 'https://placehold.co/96x96/10B981/FFFFFF', badges: ['Kitap Kurdu'] },
  { id: 4, name: 'Mustafa', role: 'Bebek', avatar: 'https://placehold.co/96x96/F59E0B/FFFFFF', badges: [] },
];

export const tasks: Task[] = [
  { id: 1, title: 'Odanı topla', assigneeId: 3, points: 20, dueDate: 'Bugün', completed: false, category: 'Ev İşleri' },
  { id: 2, title: 'Matematik ödevini yap', assigneeId: 3, points: 30, dueDate: 'Yarın', completed: false, category: 'Okul' },
  { id: 3, title: 'Alışveriş listesini hazırla', assigneeId: 2, points: 15, dueDate: 'Bugün', completed: true, category: 'Aile' },
  { id: 4, title: 'Bulaşıkları makineye diz', assigneeId: 1, points: 10, dueDate: 'Bugün', completed: false, category: 'Ev İşleri' },
  { id: 5, title: 'Çiçekleri sula', assigneeId: 3, points: 5, dueDate: 'Bugün', completed: true, category: 'Ev İşleri' },
  { id: 6, title: 'Akşam yemeği planla', assigneeId: 2, points: 25, dueDate: 'Cuma', completed: false, category: 'Aile' },
  { id: 7, title: 'Garajı düzenle', assigneeId: 1, points: 100, dueDate: 'Hafta Sonu', completed: false, category: 'Ev İşleri' },
];

export const calendarEvents: CalendarEvent[] = [
    { id: 1, title: 'Elif\'in Piyano Dersi', date: '2024-07-29', startTime: '16:00', endTime: '17:00', category: 'Okul', description: 'Müzik okulunda piyano dersi.' },
    { id: 2, title: 'Veli Toplantısı', date: '2024-07-30', startTime: '18:00', endTime: '19:00', category: 'Okul', description: 'Elif\'in okuldaki veli toplantısı.' },
    { id: 3, title: 'Ahmet\'in Halı Saha Maçı', date: '2024-07-31', startTime: '21:00', endTime: '22:00', category: 'Spor', description: 'Arkadaşlarla haftalık maç.' },
    { id: 4, title: 'Aile Sinema Gecesi', date: '2024-08-02', startTime: '20:00', endTime: '22:00', category: 'Aile', description: 'Evde patlamış mısır ve film keyfi.' },
    { id: 5, title: 'Zeynep\'in Doğum Günü', date: '2024-08-05', startTime: 'Tüm gün', endTime: '', category: 'Doğum Günü', description: 'Zeynep\'in doğum gününü kutluyoruz!' },
];

export const books: Book[] = [
    { id: 1, title: 'Küçük Prens', author: 'Antoine de Saint-Exupéry', coverImage: 'https://placehold.co/300x450/3B82F6/FFFFFF', rating: 5, pages: 112, description: 'Bir pilotun Sahra Çölü\'ne düşmesi ve orada küçük bir prensle tanışmasını konu alır.' },
    { id: 2, title: 'Şeker Portakalı', author: 'José Mauro de Vasconcelos', coverImage: 'https://placehold.co/300x450/10B981/FFFFFF', rating: 5, pages: 200, description: 'Yoksul bir ailenin çocuğu olan Zezé\'nin hayal gücü ve hüzünlü hikayesi.' },
    { id: 3, title: 'Harry Potter ve Felsefe Taşı', author: 'J.K. Rowling', coverImage: 'https://placehold.co/300x450/8B5CF6/FFFFFF', rating: 5, pages: 250, description: 'Genç bir büyücünün Hogwarts\'taki maceralarının başlangıcı.' },
    { id: 4, title: 'Martı Jonathan Livingston', author: 'Richard Bach', coverImage: 'https://placehold.co/300x450/F59E0B/FFFFFF', rating: 4, pages: 144, description: 'Sıradan bir martı olmaktan fazlasını isteyen Jonathan\'ın hikayesi.' },
    { id: 5, title: '1984', author: 'George Orwell', coverImage: 'https://placehold.co/300x450/EF4444/FFFFFF', rating: 5, pages: 328, description: 'Distopik bir gelecekte totaliter bir rejimin altında yaşayan insanların hikayesi.' },
    { id: 6, title: 'Simyacı', author: 'Paulo Coelho', coverImage: 'https://placehold.co/300x450/6366F1/FFFFFF', rating: 4, pages: 188, description: 'Endülüslü çoban Santiago\'nun kişisel menkıbesini arayışını konu alan felsefi bir roman.' },
];

export const recentActivities = [
    { id: 1, user: 'Zeynep', userAvatar: 'https://placehold.co/40x40/EC4899/FFFFFF', description: '"Alışveriş listesi hazırla" görevini tamamladı.', time: '15 dakika önce' },
    { id: 2, user: 'Elif', userAvatar: 'https://placehold.co/40x40/10B981/FFFFFF', description: '"Şeker Portakalı" kitabını okumaya başladı.', time: '1 saat önce' },
    { id: 3, user: 'Ahmet', userAvatar: 'https://placehold.co/40x40/3B82F6/FFFFFF', description: '"Garajı düzenle" görevini ekledi.', time: '3 saat önce' },
    { id: 4, user: 'Elif', userAvatar: 'https://placehold.co/40x40/10B981/FFFFFF', description: '"Çiçekleri sula" görevini tamamladı.', time: 'Dün' },
];

export const weeklyPoints = [
    { name: 'Pzt', points: 30 },
    { name: 'Sal', points: 45 },
    { name: 'Çar', points: 20 },
    { name: 'Per', points: 70 },
    { name: 'Cum', points: 55 },
    { name: 'Cmt', points: 90 },
    { name: 'Paz', points: 60 },
];
