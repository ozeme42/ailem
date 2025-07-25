
import { GraduationCap, ShoppingCart, BookOpen, Calendar, CheckSquare } from 'lucide-react';

export interface User {
    uid: string;
    email: string;
    name: string;
    familyId: string | null;
}

export interface FamilyMember {
  id: string; // Using string for ID now
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
  familyId: string; // To scope tasks to a family
  title: string;
  assigneeId: string; // Now refers to FamilyMember.id
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
    familyId: string;
    title: string;
    startDate: string; // ISO 8601 format
    endDate?: string; // ISO 8601 format
    recurrence: 'one-time' | 'monthly' | 'yearly';
}

export interface Book {
  id: string;
  familyId: string;
  title: string;
  author: string; 
  image: string;
  type: "Kitap";
  tags: string[];
  rating: number;
  description: string;
  pageCount?: number;
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
  id: string; // Changed to string to match FamilyMember.id
  name: string;
  grade: string;
  avatar: string;
}

export type AnswerKey = { [key: number]: string };
export type TextAnswerKey = { [key: number]: string };
export type GradingType = 'auto' | 'manual-text' | 'manual';
export type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated';
export type TextAnswerEvaluations = { [key: string]: EvaluationStatus };


export interface Test {
  id: string;
  familyId: string;
  title: string;
  subject: string;
  studentId: string; // Changed to string to match FamilyMember.id
  questionCount: number;
  assignedDate: string;
  dueDate: string;
  status: 'Atandı' | 'Çözüldü' | 'Değerlendirildi';
  sourceType: 'quick' | 'bank' | 'exam';
  gradingType?: GradingType;
  sourceId?: string;
  topicId?: string;
  score?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  emptyAnswers?: number;
  studentAnswers?: AnswerKey;
  studentTextAnswers?: TextAnswerKey;
  answerKey?: AnswerKey;
  studentTextAnswersEvaluation?: TextAnswerEvaluations;
}

export interface Topic {
    id: number;
    name: string;
    questionCount: number;
    gradingType: GradingType;
    answerKey?: AnswerKey;
}
export interface SubjectInBank {
    id: number;
    name: string;
    topics: Topic[];
}
export interface QuestionBank {
    id: string;
    familyId: string;
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
    familyId: string;
    name: string;
    subjects: SubjectInExam[];
    gradingType: GradingType;
    answerKey?: AnswerKey;
}

export interface ExamProgressStats {
    questionsSolved: number;
    correct: number;
    incorrect: number;
    empty: number;
}
export interface ExamProgress {
    questionBank: { [bankId: string]: { [studentId: string]: ExamProgressStats } }; // studentId is string
    practiceExam: { [examId: string]: { [studentId: string]: ExamProgressStats } }; // studentId is string
}

export const students: Student[] = [
  { id: "3", name: 'Elif', grade: '5. Sınıf', avatar: '👧' },
  { id: "4", name: 'Murat', grade: '8. Sınıf', avatar: '👦' },
];

export const examProgress: ExamProgress = {
    questionBank: {
        "1": { 
            "3": { questionsSolved: 80, correct: 65, incorrect: 10, empty: 5 }
        }
    },
    practiceExam: {
        "1": {
            "4": { questionsSolved: 60, correct: 45, incorrect: 12, empty: 3 }
        }
    }
};

export interface ShoppingItem {
  id: string;
  name: string;
  isBought: boolean;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  icon: string;
  items: ShoppingItem[];
}

export interface ShoppingNoteItem {
    id: string;
    text: string;
}

export interface ShoppingNoteList {
    id: string;
    familyId: string;
    name: string;
    icon: string;
    items: ShoppingNoteItem[];
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
export const initialBooks: Omit<Book, 'id' | 'familyId'>[] = [
    { title: "Yerdeniz Büyücüsü", author: "Ursula K. Le Guin", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Fantastik"], rating: 4.5, description: "Ged'in büyücülük yolculuğu.", pageCount: 208, isForChildren: false },
    { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Çocuk Klasikleri", "Felsefe"], rating: 4.9, description: "Bir pilot ve küçük bir prensin hikayesi.", pageCount: 96, isForChildren: true },
];

export const initialTasks: Omit<Task, 'id' | 'familyId'>[] = [
    { title: 'Odanı Topla', assigneeId: "3", points: 20, dueDate: '2024-08-15', completed: false, category: 'Ev İşleri', subtasks: [{id: 's1', title: 'Yatağını düzelt', completed: true}, {id: 's2', title: 'Oyuncakları topla', completed: false}], difficulty: 'Orta' },
    { title: 'Matematik Ödevi', assigneeId: "4", points: 50, dueDate: '2024-08-12', completed: false, category: 'Okul', subtasks: [], difficulty: 'Zor' },
];

export const initialShoppingLists: Omit<ShoppingList, 'id' | 'familyId'>[] = [
    {
        name: 'Haftalık Market Alışverişi',
        icon: 'ShoppingCart',
        items: [
            { id: '1', name: 'Süt', isBought: true },
            { id: '2', name: 'Ekmek', isBought: true },
            { id: '3', name: 'Yumurta', isBought: false },
        ],
    }
]

export const initialCalendarEvents: Omit<CalendarEvent, 'id' | 'familyId'>[] = [
    { title: 'Doktor Randevusu', startDate: '2024-08-20', recurrence: 'one-time' },
    { title: 'Elif\'in Doğum Günü', startDate: '2024-09-05', recurrence: 'yearly' },
]

export const initialMealPlan: MealPlan = {
  "2024-08-12": {
    "Kahvaltı": recipes[0],
    "Akşam Yemeği": recipes[1],
  },
};

export const initialQuestionBanks: Omit<QuestionBank, 'id' | 'familyId'>[] = [
    {
        name: "5. Sınıf Matematik Soru Bankası",
        subjects: [
            {
                id: 1,
                name: "Matematik",
                topics: [
                    { id: 1, name: "Doğal Sayılar", questionCount: 20, gradingType: 'auto', answerKey: {1: 'A', 2: 'B'} },
                    { id: 2, name: "Kesirler", questionCount: 20, gradingType: 'manual-text', answerKey: {} },
                ]
            }
        ]
    }
];

export const initialPracticeExams: Omit<PracticeExam, 'id' | 'familyId'>[] = [
     {
        name: "LGS Deneme Sınavı 1",
        gradingType: 'auto',
        subjects: [
            { id: 1, name: "Matematik", questionCount: 20 },
            { id: 2, name: "Türkçe", questionCount: 20 },
            { id: 3, name: "Fen Bilimleri", questionCount: 20 },
        ],
        answerKey: {1: 'A', 2: 'C', 3: 'B'}
    }
];

export const initialTests: Omit<Test, 'id' | 'status' | 'familyId'>[] = [
    {
        title: "LGS Deneme Sınavı 1",
        subject: "Deneme Sınavı",
        studentId: "4",
        questionCount: 60,
        assignedDate: "01 Ağustos 2024",
        dueDate: "15 Ağustos 2024",
        sourceType: 'exam',
        sourceId: '1',
        gradingType: 'auto',
    }
]
