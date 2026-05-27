import { GraduationCap, ShoppingCart, BookOpen, Calendar, CheckSquare, Timer } from 'lucide-react';
import { z } from 'zod';

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
  id: string; 
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
  status: 'online' | 'offline';
  readingGoals?: ReadingGoals;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id:string;
  familyId: string;
  title: string;
  assigneeId: string;
  points: number;
  dueDate: string;
  completed: boolean;
  category: 'Ev İşleri' | 'Okul' | 'Kişisel' | 'Aile' | 'Görev';
  subtasks?: Subtask[];
  notes?: string;
  photo?: string;
  audioNoteUrl?: string;
  createdAt: string;

  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly';
  recurrenceDays?: string[];
  recurrenceEndDate?: string;

  totalOccurrences?: number;
  completedOccurrences?: number;

  streak?: number;
  bestStreak?: number;
  lastCompletedDate?: string;
  completedDates?: string[];
}

export interface CalendarEvent {
    id: string;
    familyId: string;
    title: string;
    startDate: string;
    endDate?: string;
    recurrence: 'one-time' | 'monthly' | 'yearly';
    location?: string;
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
  readers?: string[];
  createdAt?: string;
}

export type BookReadingStatus = 'to-read' | 'reading' | 'finished';

export interface UserLibraryBook {
    bookId: string;
    status: BookReadingStatus;
    progress?: number;
    addedAt: string;
    startedAt?: string;
    finishedAt?: string;
}

export interface UserLibrary {
    id: string;
    familyId: string;
    memberId: string;
    books: UserLibraryBook[];
}

export interface ReadingSession {
    id: string;
    familyId: string;
    memberId: string;
    bookId: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    pagesRead: number;
    notes?: string;
    summary?: string;
}

export interface Recipe {
    id: string;
    familyId: string;
    title: string;
    category: string;
    rating: number;
    instructions?: string;
}

export type MealPlan = {
  [day: string]: {
    [meal: string]: Recipe | null;
  }
}

export interface CalorieLog {
    id: string;
    familyId: string;
    caloriesTaken: number;
    caloriesBurned: number;
    protein: number;
    carbs: number;
    fat: number;
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
    createdAt: string;
    status: 'in-progress' | 'completed';
    sections: GoalSection[];
    totalUnits: number;
    unitName: string;
    sectionCount: number;
    videoUrl?: string;
    platform?: 'YouTube' | 'Other';
}

// --- NEW: Performance Goals ---
export type PerformanceGoalType = 'questions' | 'successRate' | 'net' | 'streak';
export type PerformanceGoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface PerformanceGoal {
    id: string;
    familyId: string;
    memberId: string;
    type: PerformanceGoalType;
    subject?: string;
    target: number;
    label: string;
    period: PerformanceGoalPeriod;
    startDate: string;
    endDate?: string;
    createdAt: string;
}

export interface MemorizationItem {
    id: string;
    familyId: string;
    title: string;
    tags: string[];
    imageUrl?: string;
}

export interface MemorizationProgress {
    id: string;
    familyId: string;
    itemId: string;
    memberId: string;
    completed: boolean;
    completedAt?: string;
}

export interface PrayerProgress {
    id: string;
    familyId: string;
    memberId: string;
    completions: {
        [date: string]: string[];
    };
}

export type NoteContentType = 'text' | 'handwriting' | 'audio' | 'image' | 'file';

export interface NoteContentBlock {
    id: string;
    type: NoteContentType;
    data: string;
    textEquivalent?: string;
}

export interface Note {
    id: string;
    notebookId: string;
    sectionId: string;
    familyId: string;
    title: string;
    content: NoteContentBlock[];
    createdAt: string;
    updatedAt: string;
    color?: string;
    tags?: string[];
    imageUrl?: string | null;
    folder?: string;
}

export interface NotebookSection {
    id: string;
    title: string;
    order: number;
    color: string;
    folders?: string[];
}

export interface Notebook {
    id: string;
    familyId: string;
    ownerId: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    sections: NotebookSection[];
    createdAt: string;
}

export interface Video {
    id: string;
    familyId: string;
    title: string;
    url?: string;
    platform: 'YouTube' | 'Other';
    tags?: string[];
    description?: string;
    thumbnail?: string;
    createdAt?: string;
    totalVideos: number;
    completedVideos: number;
    assigneeId: string;
}

export type TrackableItemType = 'book' | 'video' | 'habit' | 'memorization';
export interface DailyTracking {
    id: string;
    familyId: string;
    memberId: string;
    itemId: string;
    itemType: TrackableItemType;
    date: string;
}

export interface Topic {
  id: string;
  name: string;
}

export interface StudyTopic {
    id: string;
    name: string;
    sources?: string[];
}

export interface StudyPlanSubject {
    id: string;
    name: string;
    topics: StudyTopic[];
}

export interface StudyPlan {
    id: string;
    familyId: string;
    title: string;
    description?: string;
    subjects: StudyPlanSubject[];
}

export interface TrackedBookSubject {
  id: string;
  name: string;
  topics: Topic[];
}

export interface TrackedBook {
  id: string;
  familyId: string;
  title: string;
  publisher: string;
  subjects: TrackedBookSubject[];
  createdAt: string;
  bookType?: 'standard' | 'open_ended';
  subjectCount?: number;
  testCount?: number;
  questionCount?: number;
  solvedTestCount?: number;
  totalCorrectAnswers?: number;
  totalIncorrectAnswers?: number;
}

export interface TrackedBookTest {
    id: string;
    familyId: string;
    bookId: string;
    subjectId: string;
    topicId: string;
    name: string;
    questionCount: number;
    answerKey?: { [key: string]: string };
}

export interface Summary {
  id: string;
  familyId: string;
  title: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  avatar: string;
}

export type AnswerKey = { [key: string]: string };
export type GradingType = 'auto' | 'manual';
export type EvaluationStatus = 'correct' | 'incorrect' | 'unevaluated' | 'empty' | 'partial';

export interface QuickTestQuestion {
  questionId: string;
  questionNumber: number;
  imageUrl: string;
}

export interface BankQuestion {
  id: string;
  familyId: string;
  subject: string;
  topic: string;
  title: string;
  imageUrl: string;
  originalFilename?: string;
  options?: { [key: string]: string };
  correctAnswer: string;
  createdAt: string;
  type?: 'mcq' | 'open_ended';
}

export interface PracticeExamSubject {
    id: string;
    name: string;
    questionCount: number;
    answerKey?: AnswerKey;
}

export interface PracticeExam {
  id: string;
  familyId: string;
  name: string;
  subjects: PracticeExamSubject[];
}

export interface JsonTestQuestion {
  id: string;
  text: string;
  options: string[];
  answer: string;
}

export interface Test {
  id: string;
  familyId: string;
  title: string;
  subject: string;
  studentId: string;
  questionCount: number;
  durationMinutes?: number;
  assignedDate: string;
  dueDate: string;
  status: 'Atandı' | 'Değerlendirme Bekliyor' | 'Sonuçlandı' | 'Tekrar Çözülüyor';
  isArchived: boolean;
  sourceType: 'bank' | 'quick' | 'exam' | 'mistake' | 'trackedBook' | 'json' | 'html';
  sourceId?: string;
  gradingType?: GradingType;
  score?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  emptyAnswers?: number;
  studentAnswers?: AnswerKey;
  answerKey?: AnswerKey;
  timeSpentSeconds?: number;
  timerStatus?: 'running' | 'paused' | 'finished';
  questions?: QuickTestQuestion[]; 
  openEnded?: boolean;
  studentTextAnswers?: { [key: string]: string };
  studentTextAnswersEvaluation?: { [key: string]: EvaluationStatus };
  studentTextAnswersFeedback?: { [key: string]: string };
  topicId?: string;
  jsonQuestions?: JsonTestQuestion[];
  htmlContent?: string;
  revealedSubjectIds?: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  isBought: boolean;
  createdAt?: string;
  category?: string;
  quantity?: string;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  icon: string;
  items: ShoppingItem[];
  boughtItems?: ShoppingItem[];
  createdAt?: string;
  colorId?: string;
  order?: number;
}

export interface ShoppingNoteItem {
  id: string;
  name: string;
  completed: boolean;
}
export interface ShoppingNoteList {
  id: string;
  familyId: string;
  name: string;
  icon: string;
  items: ShoppingNoteItem[];
}

export interface Mistake {
    id: string;
    familyId: string;
    creatorId: string;
    testId?: string;
    originalQuestionId?: string;
    imageUrl?: string;
    studentAnswer?: string;
    correctAnswer?: string;
    correctImageUrl?: string;
    feedback?: string;
    subject: string;
    topic: string;
    createdAt: string;
    status: 'active' | 'corrected';
    type: 'mcq' | 'open_ended';
}

export interface AmbientSound {
    id: string;
    familyId: string;
    name: string;
    url: string;
    loop: boolean;
}

export interface PomodoroProject {
    id: string;
    familyId: string;
    memberId: string;
    title: string;
    color: string;
    targetTimeSeconds: number;
    trackedTimeSeconds: number;
    sourceType?: 'task' | 'habit' | 'book' | 'test' | 'goal' | 'memorization' | 'video' | 'custom';
    sourceId?: string;
    createdAt: string;
}

export interface PomodoroSession {
    id: string;
    familyId: string;
    projectId: string;
    memberId: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
}

export interface Account {
    id: string;
    familyId: string;
    name: string;
    type: 'cash' | 'bank' | 'credit-card' | 'other' | 'debt';
    balance: number;
    ownerId: string;
    creditLimit?: number;
    statementDate?: number;
    dueDate?: number;
}

export interface Transaction {
    id: string;
    familyId: string;
    amount: number;
    type: 'income' | 'expense';
    accountId: string;
    ownerId: string;
    category: string;
    date: string;
    isInstallment: boolean;
    installmentDetails?: {
        current: number;
        total: number;
        originalTransactionId: string;
    };
}

export interface BudgetCategory {
    id: string;
    familyId: string;
    name: string;
    icon: string;
    type: 'income' | 'expense';
}

export interface Budget {
    id: string;
    familyId: string;
    categories: {
        [categoryName: string]: {
            limit: number;
            spent: number;
        };
    };
}

export interface StudyAssignment {
  id: string;
  familyId: string;
  studentId: string;
  studyPlanId: string;
  subject: string;
  topic: string;
  topicId: string;
  sources: string[];
  status: 'assigned' | 'completed';
  startDate: string;
  dueDate: string;
  completedAt?: string;
  durationMinutes?: number;
}

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

export const initialBooks: Omit<Book, 'id' | 'familyId' | 'createdAt'>[] = [
    { title: "Yerdeniz Büyücüsü", author: "Ursula K. Le Guin", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Fantastik"], rating: 4.5, description: "Ged'in büyücülük yolculuğu.", pageCount: 208, isForChildren: false, readers: [] },
    { title: "Küçük Prens", author: "Antoine de Saint-Exupéry", image: 'https://placehold.co/300x450.png', type: "Kitap", tags: ["Çocuk Klasikleri", "Felsefe"], rating: 4.9, description: "Bir pilot ve küçük bir prensin hikayesi.", pageCount: 96, isForChildren: true, readers: [] },
];

export const initialTasks: Omit<Task, 'id' | 'familyId' | 'assigneeId' | 'createdAt'>[] = [
    { title: 'Odanı Topla', points: 20, dueDate: '2024-08-15', completed: false, category: 'Ev İşleri', subtasks: [{id: 's1', title: 'Yatağını düzelt', completed: true}, {id: 's2', title: 'Oyuncakları topla', completed: false}] },
    { title: 'Matematik Ödevi', points: 50, dueDate: '2024-08-12', completed: false, category: 'Okul', subtasks: [] },
];

export const initialShoppingLists: Omit<ShoppingNoteList, 'id' | 'familyId'>[] = [
    {
        name: 'Haftalık Market Alışverişi',
        icon: 'ShoppingCart',
        items: [
            { id: '1', name: 'Süt', completed: true },
            { id: '2', name: 'Ekmek', completed: true },
            { id: '3', name: 'Yumurta', completed: false },
        ],
    }
];

export const initialCalendarEvents: Omit<CalendarEvent, 'id' | 'familyId'>[] = [
    { title: 'Doktor Randevusu', startDate: '2024-08-20', recurrence: 'one-time' },
    { title: 'Elif\'in Doğum Günü', startDate: '2024-09-05', recurrence: 'yearly' },
];

export const initialMealPlan: MealPlan = {
  "2024-08-12": {
    "Kahvaltı": initialRecipes[0] as Recipe,
    "Akşam Yemeği": initialRecipes[1] as Recipe,
  },
};

export const initialPracticeExams: Omit<PracticeExam, 'id' | 'familyId'>[] = [
         {
            name: "LGS Deneme Sınavı 1",
            subjects: [
                { id: "1", name: "Matematik", questionCount: 20 },
                { id: "2", name: "Türkçe", questionCount: 20 },
                { id: "3", name: "Fen Bilimleri", questionCount: 20 },
            ],
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
    ];

// Types for AI Coach
const MediaPartSchema = z.object({
  url: z.string(),
});
const ContentPartSchema = z.object({
  text: z.string().optional(),
  media: MediaPartSchema.optional(),
});
export const CoachMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(ContentPartSchema),
});
export type CoachMessage = z.infer<typeof CoachMessageSchema>;
