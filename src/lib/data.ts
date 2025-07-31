

import { GraduationCap, ShoppingCart, BookOpen, Calendar, CheckSquare } from 'lucide-react';

export interface User {
    uid: string;
    email: string;
    name: string;
    role: 'Anne' | 'Baba';
    familyId: string | null;
}

export interface ReadingGoals {
    primaryGoal?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    daily?: { pages?: number; books?: number };
    weekly?: { pages?: number; books?: number };
    monthly?: { pages?: number; books?: number };
    yearly?: { pages?: number; books?: number };
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
  readingGoals?: ReadingGoals;
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
  dueDate: string; // For one-time tasks, or the start date for recurring tasks
  completed: boolean; // For one-time tasks or for each instance of a recurring task
  category: 'Ev İşleri' | 'Okul' | 'Kişisel' | 'Aile' | 'Görev';
  subtasks?: Subtask[];
  notes?: string;
  photo?: string;
  audioNoteUrl?: string;
  createdAt: string; // ISO date string

  // New recurrence fields
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly';
  recurrenceDays?: string[]; // e.g., ['Mon', 'Wed', 'Fri'] for weekly
  recurrenceEndDate?: string; // Optional end date for recurring tasks

  // Progress for count-based recurring tasks
  totalOccurrences?: number;
  completedOccurrences?: number;

  // Streak tracking for daily tasks
  streak?: number;
  bestStreak?: number;
  lastCompletedDate?: string; // For compatibility
  completedDates?: string[]; // For daily habits, array of 'yyyy-MM-dd'
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
  author: string | undefined; 
  image: string;
  type: "Kitap";
  tags?: string[] | undefined;
  rating: number | undefined;
  description: string;
  pageCount?: number;
  isForChildren?: boolean;
  readers?: string[]; // Array of member IDs who have this in their library
  createdAt?: string;
}

export type BookReadingStatus = 'to-read' | 'reading' | 'finished';

export interface UserLibraryBook {
    bookId: string;
    status: BookReadingStatus;
    progress?: number; // 0-100 for 'reading' status
    addedAt: string; // ISO Date string
    startedAt?: string; // ISO Date string, set when status becomes 'reading' for the first time
    finishedAt?: string; // ISO Date string, set when status becomes 'finished'
}

export interface UserLibrary {
    id: string; // Composite key familyId_memberId
    familyId: string;
    memberId: string;
    books: UserLibraryBook[];
}

export interface ReadingSession {
    id: string;
    familyId: string;
    memberId: string;
    bookId: string;
    startTime: string; // ISO Date string
    endTime: string; // ISO Date string
    durationSeconds: number;
    pagesRead: number;
    notes?: string;
    summary?: string;
}


export interface Recipe {
    id: string;
    familyId: string;
    title: string;
    category: 'Kahvaltı' | 'Akşam Yemeği';
    rating: number;
    instructions?: string;
}

export type MealPlan = {
  [day: string]: { // format 'yyyy-MM-dd'
    [meal: string]: Recipe | null; // "Kahvaltı" | "Akşam Yemeği"
  }
}

// Goals / Roadmaps
export interface GoalTask {
    id: string;
    title: string;
    completed: boolean;
    order: number;
}
export interface GoalSection {
    id: string;
    title: string;
    order: number;
    status: 'unlocked' | 'completed';
    sectionTotalUnits: number;
    completedUnits: number;
}
export interface Goal {
    id: string;
    familyId: string;
    creatorId: string;
    assigneeId: string;
    title: string;
    description?: string;
    createdAt: string; // ISO String
    status: 'in-progress' | 'completed';
    sections: GoalSection[];
    // Fields for editing
    totalUnits: number;
    unitName: string;
    sectionCount: number;
}

export interface MemorizationItem {
    id: string;
    familyId: string;
    title: string;
    tags: string[];
    imageUrl?: string;
}

export interface MemorizationProgress {
    id: string; // composite key: `${itemId}_${memberId}`
    familyId: string;
    itemId: string;
    memberId: string;
    completed: boolean;
    completedAt?: string; // ISO string
}

export interface PrayerProgress {
    id: string; // Should be memberId
    familyId: string;
    memberId: string;
    completions: {
        [date: string]: string[]; // date is 'YYYY-MM-DD', value is array of prayer names
    };
}


// NOTES FEATURE DATA MODELS
export type NoteContentType = 'text' | 'handwriting' | 'audio' | 'image' | 'file';

export interface NoteContentBlock {
    id: string;
    type: NoteContentType;
    data: string; // URL for files/audio/images, base64 for handwriting, text for text
    textEquivalent?: string; // For OCR or speech-to-text results
}

export interface Note {
    id: string;
    notebookId: string;
    sectionId: string;
    familyId: string;
    title: string;
    content: NoteContentBlock[];
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    color?: string; // e.g. 'bg-yellow-100 border-yellow-200'
    tags?: string[];
    imageUrl?: string | null;
}

export interface NotebookSection {
    id: string;
    title: string;
    order: number;
}

export interface Notebook {
    id: string;
    familyId: string;
    ownerId: string; // The user who created it
    title: string;
    description?: string;
    icon?: string;
    color?: string; // e.g., 'from-blue-500 to-indigo-600'
    sections: NotebookSection[];
    createdAt: string; // ISO string
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

export interface Student {
  id: string; // Changed to string to match FamilyMember.id
  name: string;
  grade: string;
  avatar: string;
}

export type AnswerKey = { [key: number]: string };
export type TextAnswerKey = { [key: string]: string };
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
  status: 'Atandı' | 'Değerlendirme Bekliyor' | 'Sonuçlandı';
  isArchived: boolean;
  sourceType: 'quick' | 'bank' | 'exam' | 'mistake';
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
  timeSpentSeconds?: number;
  timerStatus?: 'running' | 'paused' | 'finished';
  mistakeIds?: string[];
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

export interface StudyPlan {
  id: string;
  familyId: string;
  title: string;
  description: string;
}

export interface StudyAssignment {
    id: string;
    studyPlanId: string;
    studentId: string;
    subject: string;
    topic: string;
    sources: string[];
    startDate: string; // ISO String
    dueDate: string; // ISO String
    status: 'assigned' | 'completed';
    completedAt?: string; // ISO String
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


// This data is now only for initial setup
// ... (rest of the initial data remains the same)
export interface Mistake {
    id: string;
    familyId: string;
    creatorId: string;
    imageUrl: string;
    subject: string;
    topic: string;
    createdAt: string; // ISO date string
    status: 'active' | 'corrected';
}
export interface AmbientSound {
    id: string;
    familyId: string;
    name: string;
    url: string; // Public URL to the audio file in Firebase Storage
    loop: boolean;
}
// This data is now only for initial setup
// ... (rest of the initial data remains the same)
export const initialRecipes: Omit<Recipe, 'id' | 'familyId'>[] = [
    {
        title: "Menemen",
        category: 'Kahvaltı',
        rating: 4.8,
        instructions: "Biberleri ve domatesleri doğrayın. Tereyağını tavada eritin ve biberleri kavurun. Domatesleri ekleyip suyunu çekene kadar pişirin. Yumurtaları kırın ve karıştırarak pişirin. Baharatları ekleyip servis yapın."
    },
    {
        title: "Mercimek Çorbası",
        category: 'Akşam Yemeği',
        rating: 4.9,
        instructions: "Tüm sebzeleri doğrayın. Mercimeği yıkayıp süzün. Tencerede yağı kızdırıp soğanları kavurun, salçayı ekleyin. Diğer sebzeleri ve mercimeği ekleyip üzerini geçecek kadar sıcak su koyun. Sebzeler yumuşayana kadar pişirin ve blenderdan geçirin. Baharatları ekleyip bir taşım daha kaynatın."
    }
];

// Initial data for Firestore (if needed for a setup script)
export const initialBooks: Omit<Book, 'id' | 'familyId' | 'createdAt'>[] = [
    { title: "Yerdeniz Büyücüsü", author: "Ursula K. Le Guin", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Fantastik"], rating: 4.5, description: "Ged'in büyücülük yolculuğu.", pageCount: 208, isForChildren: false, readers: [] },
    { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Çocuk Klasikleri", "Felsefe"], rating: 4.9, description: "Bir pilot ve küçük bir prensin hikayesi.", pageCount: 96, isForChildren: true, readers: [] },
];

export const initialTasks: Omit<Task, 'id' | 'familyId' | 'assigneeId' | 'createdAt'>[] = [
    { title: 'Odanı Topla', points: 20, dueDate: '2024-08-15', completed: false, category: 'Ev İşleri', subtasks: [{id: 's1', title: 'Yatağını düzelt', completed: true}, {id: 's2', title: 'Oyuncakları topla', completed: false}] },
    { title: 'Matematik Ödevi', points: 50, dueDate: '2024-08-12', completed: false, category: 'Okul', subtasks: [] },
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
];

export const initialCalendarEvents: Omit<CalendarEvent, 'id' | 'familyId'>[] = [
    { title: 'Doktor Randevusu', startDate: '2024-08-20', recurrence: 'one-time' },
    { title: 'Elif\'in Doğum Günü', startDate: '2024-09-05', recurrence: 'yearly' },
];

export const initialMealPlan: MealPlan = {
  "2024-08-12": { // This key needs to be dynamic based on current week, but for initial setup it's fine
    "Kahvaltı": initialRecipes[0] as Recipe,
    "Akşam Yemeği": initialRecipes[1] as Recipe,
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
                    { id: 2, name: "Kesirler", questionCount: 20, gradingType: 'manual-text' },
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

export const initialTests: Omit<Test, 'id' | 'status' | 'familyId' | 'studentId'>[] = [
    {
        title: "LGS Deneme Sınavı 1",
        subject: "Deneme Sınavı",
        questionCount: 60,
        assignedDate: "01 Ağustos 2024",
        dueDate: "15 Ağustos 2024",
        sourceType: 'exam',
        sourceId: '1',
        gradingType: 'auto',
        isArchived: false,
    }
]
