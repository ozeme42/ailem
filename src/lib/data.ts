
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
  id: string;
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
    id: string;
    title: string;
    startDate: string; // ISO 8601 format
    endDate?: string; // ISO 8601 format
    recurrence: 'one-time' | 'monthly' | 'yearly';
}

export interface Book {
  id: string;
  title: string;
  author: string; 
  image: string;
  type: "Kitap";
  tags: string[];
  rating: number;
  description: string;
  pages?: number;
  isForChildren?: boolean;
}

export interface Recipe {
    id: number;
    title: string;
    category: 'Kahvaltı' | 'Akşam Yemeği' | 'Atıştırmalık';
    image: string;
    prepTime: string;
    rating: number;
    ingredients: string[];
    instructions: string[];
}

export type MealPlan = {
  [day: string]: { // format 'yyyy-MM-dd'
    [meal: string]: Recipe | null; // "Kahvaltı" | "Akşam Yemeği"
  }
}

// Static data that doesn't change often can remain here.
// Data that will be managed by the user is now in Firestore.

export const familyMembers: FamilyMember[] = [
  { id: 1, name: 'Ahmet', role: 'Baba', avatar: 'https://placehold.co/64x64.png', completedTasks: 18, color: '#3B82F6', level: 5, xp: 4250, streak: 7, badges: ['🏆', '⚡', '🎯'], mood: 'happy', status: 'online' },
  { id: 2, name: 'Zeynep', role: 'Anne', avatar: 'https://placehold.co/64x64.png', completedTasks: 22, color: '#EC4899', level: 6, xp: 5580, streak: 12, badges: ['👑', '💎', '🌟', '🔥'], mood: 'excited', status: 'online' },
  { id: 3, name: 'Elif', role: 'Kız Çocuk', avatar: 'https://placehold.co/64x64.png', completedTasks: 14, color: '#8B5CF6', level: 4, xp: 3890, streak: 5, badges: ['📚', '🎨', '⭐'], mood: 'focused', status: 'away' },
  { id: 4, name: 'Murat', role: 'Erkek Çocuk', avatar: 'https://placehold.co/64x64.png', completedTasks: 10, color: '#F59E0B', level: 3, xp: 2650, streak: 3, badges: ['🎵', '🏃‍♂️'], mood: 'playful', status: 'online' },
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

export const monthlyReadingStats = [
  { month: 'Ocak', books: 5, pages: 1200 },
  { month: 'Şubat', books: 7, pages: 1500 },
  { month: 'Mart', books: 6, pages: 1300 },
  { month: 'Nisan', books: 8, pages: 1800 },
  { month: 'Mayıs', books: 7, pages: 1600 },
  { month: 'Haziran', books: 9, pages: 2100 },
];

export interface Student {
  id: number;
  name: string;
  grade: string;
  avatar: string;
}

export type AnswerKey = { [key: number]: string };
export type TextAnswerKey = { [key: number]: string };

export interface Test {
  id: string;
  title: string;
  subject: string;
  studentId: number;
  questionCount: number;
  assignedDate: string;
  dueDate: string;
  status: 'Atandı' | 'Çözüldü' | 'Değerlendirildi';
  sourceType: 'quick' | 'bank' | 'exam';
  gradingType?: 'auto' | 'manual-text' | 'manual';
  sourceId?: string;
  topicId?: string;
  score?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  emptyAnswers?: number;
  studentAnswers?: AnswerKey;
  studentTextAnswers?: TextAnswerKey;
  answerKey?: AnswerKey;
}

export interface Topic {
    id: number;
    name: string;
    questionCount: number;
    answerKey?: AnswerKey;
}
export interface SubjectInBank {
    id: number;
    name: string;
    topics: Topic[];
}
export interface QuestionBank {
    id: string;
    name: string;
    subjects: SubjectInBank[];
}

export interface SubjectInExam {
    id: number;
    name: string;
    questionCount: number;
}
export interface PracticeExam {
    id: string;
    name: string;
    subjects: SubjectInExam[];
    answerKey?: AnswerKey;
}

export interface ExamProgressStats {
    questionsSolved: number;
    correct: number;
    incorrect: number;
    empty: number;
}
export interface ExamProgress {
    questionBank: { [bankId: string]: { [studentId: number]: ExamProgressStats } };
    practiceExam: { [examId: string]: { [studentId: number]: ExamProgressStats } };
}

export const students: Student[] = [
  { id: 3, name: 'Elif', grade: '5. Sınıf', avatar: '👧' },
  { id: 4, name: 'Murat', grade: '8. Sınıf', avatar: '👦' },
];

export const examProgress: ExamProgress = {
    questionBank: {
        "1": { 
            3: { questionsSolved: 80, correct: 65, incorrect: 10, empty: 5 }
        }
    },
    practiceExam: {
        "1": {
            4: { questionsSolved: 60, correct: 45, incorrect: 12, empty: 3 }
        }
    }
};

export interface ShoppingList {
  id: string;
  title: string;
  category: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  completed: boolean;
}

export const recipes: Recipe[] = [
    {
        id: 1,
        title: "Menemen",
        category: 'Kahvaltı',
        image: "https://placehold.co/400x250.png",
        prepTime: "20 dk",
        rating: 4.8,
        ingredients: ["3 adet domates", "2 adet sivri biber", "2 adet yumurta", "1 yemek kaşığı tereyağı", "Tuz, karabiber, pul biber"],
        instructions: ["Biberleri ve domatesleri doğrayın.", "Tereyağını tavada eritin ve biberleri kavurun.", "Domatesleri ekleyip suyunu çekene kadar pişirin.", "Yumurtaları kırın ve karıştırarak pişirin.", "Baharatları ekleyip servis yapın."]
    },
    {
        id: 2,
        title: "Mercimek Çorbası",
        category: 'Akşam Yemeği',
        image: "https://placehold.co/400x250.png",
        prepTime: "40 dk",
        rating: 4.9,
        ingredients: ["1 su bardağı kırmızı mercimek", "1 adet soğan", "1 adet havuç", "1 adet patates", "1 yemek kaşığı salça", "Nane, pul biber, tuz"],
        instructions: ["Tüm sebzeleri doğrayın.", "Mercimeği yıkayıp süzün.", "Tencerede yağı kızdırıp soğanları kavurun, salçayı ekleyin.", "Diğer sebzeleri ve mercimeği ekleyip üzerini geçecek kadar sıcak su koyun.", "Sebzeler yumuşayana kadar pişirin ve blenderdan geçirin.", "Baharatları ekleyip bir taşım daha kaynatın."]
    },
     {
        id: 4,
        title: "Meyveli Yoğurt",
        category: 'Atıştırmalık',
        image: "https://placehold.co/400x250.png",
        prepTime: "5 dk",
        rating: 4.5,
        ingredients: ["1 kase yoğurt", "Mevsim meyveleri (çilek, muz, yaban mersini vb.)", "1 tatlı kaşığı bal", "Yulaf ezmesi"],
        instructions: ["Meyveleri doğrayın.", "Yoğurdu bir kaseye alın, bal ile karıştırın.", "Üzerine meyveleri ve yulaf ezmesini ekleyerek servis yapın."]
    }
];

// Initial data for Firestore (if needed for a setup script)
export const initialBooks: Omit<Book, 'id'>[] = [
    { title: "Yerdeniz Büyücüsü", author: "Ursula K. Le Guin", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Fantastik"], rating: 4.5, description: "Ged'in büyücülük yolculuğu.", pages: 208, isForChildren: false },
    { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Çocuk Klasikleri", "Felsefe"], rating: 4.9, description: "Bir pilot ve küçük bir prensin hikayesi.", pages: 96, isForChildren: true },
];

export const initialTasks: Omit<Task, 'id'>[] = [
    { title: 'Odanı Topla', assigneeId: 3, points: 20, dueDate: '2024-08-15', completed: false, category: 'Ev İşleri', subtasks: [{id: 's1', title: 'Yatağını düzelt', completed: true}, {id: 's2', title: 'Oyuncakları topla', completed: false}], difficulty: 'Orta' },
    { title: 'Matematik Ödevi', assigneeId: 4, points: 50, dueDate: '2024-08-12', completed: false, category: 'Okul', subtasks: [], difficulty: 'Zor' },
];

export const initialShoppingLists: Omit<ShoppingList, 'id'>[] = [
    {
        title: 'Haftalık Market Alışverişi',
        category: 'Market',
        items: [
            { id: '1', name: 'Süt', quantity: '2L', completed: true },
            { id: '2', name: 'Ekmek', quantity: '1 adet', completed: true },
            { id: '3', name: 'Yumurta', quantity: '10 adet', completed: false },
        ],
    }
]

export const initialCalendarEvents: Omit<CalendarEvent, 'id'>[] = [
    { title: 'Doktor Randevusu', startDate: '2024-08-20', recurrence: 'one-time' },
    { title: 'Elif\'in Doğum Günü', startDate: '2024-09-05', recurrence: 'yearly' },
]

export const initialMealPlan: MealPlan = {
  "2024-08-12": {
    "Kahvaltı": recipes[0],
    "Akşam Yemeği": recipes[1],
  },
};

export const initialQuestionBanks: Omit<QuestionBank, 'id'>[] = [
    {
        name: "5. Sınıf Matematik Soru Bankası",
        subjects: [
            {
                id: 1,
                name: "Matematik",
                topics: [
                    { id: 1, name: "Doğal Sayılar", questionCount: 20, answerKey: {1: 'A', 2: 'B'} },
                    { id: 2, name: "Kesirler", questionCount: 20, answerKey: {} },
                ]
            }
        ]
    }
];

export const initialPracticeExams: Omit<PracticeExam, 'id'>[] = [
     {
        name: "LGS Deneme Sınavı 1",
        subjects: [
            { id: 1, name: "Matematik", questionCount: 20 },
            { id: 2, name: "Türkçe", questionCount: 20 },
            { id: 3, name: "Fen Bilimleri", questionCount: 20 },
        ],
        answerKey: {1: 'A', 2: 'C', 3: 'B'}
    }
];

export const initialTests: Omit<Test, 'id' | 'status'>[] = [
    {
        title: "LGS Deneme Sınavı 1",
        subject: "Deneme Sınavı",
        studentId: 4,
        questionCount: 60,
        assignedDate: "01 Ağustos 2024",
        dueDate: "15 Ağustos 2024",
        sourceType: 'exam',
        sourceId: '1',
        gradingType: 'auto',
    }
]
