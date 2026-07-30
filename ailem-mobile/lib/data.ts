import { GraduationCap, ShoppingCart, BookOpen, Calendar, CheckSquare, Timer } from 'lucide-react-native';
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
  starBalance?: number;
  totalStarsEarned?: number;
  stickerBalance?: number;
  totalStickersEarned?: number;
  totalBigRewardsEarned?: number;
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
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:mm
  recurrence: 'one-time' | 'monthly' | 'yearly';
  location?: string;
  category?: string;
  color?: string;
  reminderMinutes?: number;
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
    summaryImageUrl?: string; // Legacy single image
    summaryImageUrls?: string[]; // Multiple images
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
    sourceUrl?: string;
    imageUrls?: string[];
}

export type MealPlan = {
  [day: string]: {
    [meal: string]: Recipe | null;
  }
}

export interface CalorieEntry {
    id: string;
    name: string;
    type: 'food' | 'exercise';
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

export interface CalorieLog {
    id: string;
    familyId: string;
    caloriesTaken: number;
    caloriesBurned: number;
    protein: number;
    carbs: number;
    fat: number;
    entries?: CalorieEntry[];
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
    subSectionId?: string;
    familyId: string;
    title: string;
    content: NoteContentBlock[];
    createdAt: string;
    updatedAt: string;
    color?: string;
    tags?: string[];
    imageUrl?: string | null;
    folder?: string;
    pinned?: boolean;
    isPassword?: boolean;
    accountName?: string;
    username?: string;
    password?: string;
    passwordCategory?: string;
}

export interface NotebookSection {
    id: string;
    title: string;
    order: number;
    color: string;
    subSections?: { id: string; title: string; color?: string; icon?: string }[];
}

export interface Notebook {
    id: string;
    familyId: string;
    ownerId: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    password?: string;
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
    link?: string;
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
    openEnded?: boolean;
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

export interface TestSection {
    name: string;
    questionCount: number;
}

import { parseISO, addMonths, format } from "date-fns";

export interface Test {
  id: string;
  familyId: string;
  title: string;
  subject: string;
  studentId: string;
  questionCount: number;
  startNumber?: number;
  durationMinutes?: number;
  assignedDate: string;
  dueDate: string;
  status: 'Atandı' | 'Değerlendirme Bekliyor' | 'Sonuçlandı' | 'Tekrar Çözülüyor';
  isArchived: boolean;
  sourceType: 'bank' | 'quick' | 'exam' | 'mistake' | 'trackedBook' | 'json' | 'html' | 'pdf' | 'offline';
  sourceId?: string;
  fileUrl?: string;
  sections?: TestSection[];
  gradingType?: GradingType;
  score?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  emptyAnswers?: number;
  studentAnswers?: AnswerKey;
  answerKey?: AnswerKey;
  timeSpentSeconds?: number;
  completedDate?: string;
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
  mistakesReviewed?: boolean;
  updatedAt?: string;
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
    targetLimit?: number;
    statementDate?: number;
    dueDate?: number;
    order?: number;
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
    isRecurring?: boolean;
    isApplied?: boolean;
    description?: string;
    installmentDetails?: {
        current: number;
        total: number;
        originalTransactionId: string;
    };
    isAppliedToAccount?: boolean;
}

export interface TransactionTemplate {
    id: string;
    familyId: string;
    name: string;
    amount?: number;
    type: 'income' | 'expense';
    accountId: string;
    category: string;
    description?: string;
}
export interface BudgetCategory {
    id: string;
    familyId: string;
    name: string;
    icon: string;
    color?: string;
    type: 'income' | 'expense';
    limit?: number;
    order?: number;
}

export interface Bill {
    id: string;
    familyId: string;
    title: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    paidDate?: string;
    paidAccountId?: string;
    paidTransactionId?: string;
    category?: string;
    isRecurring?: boolean;
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
  bookId?: string;
  testId?: string;
  order?: number;
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

export interface Deck {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  level: number;
  nextReviewAt?: number;
  createdAt: number;
}

export function getEffectiveMonth(txDate: string, accountId: string | undefined, accounts: Account[]): string {
  if (!accountId) return txDate.substring(0, 7);
  
  const account = accounts.find(a => a.id === accountId);
  if (!account || account.type !== 'credit-card' || !account.statementDate) {
    return txDate.substring(0, 7);
  }

  const txDay = parseInt(txDate.substring(8, 10), 10);
  if (txDay > account.statementDate) {
    const nextMonth = addMonths(parseISO(txDate), 1);
    return format(nextMonth, 'yyyy-MM');
  }
  
  return txDate.substring(0, 7);
}

// --- BEHAVIOR REWARD SYSTEM ---
export interface BehaviorRecord {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  type: 'positive' | 'negative';
  title: string;
  stars: number;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface RewardItem {
  id: string;
  familyId: string;
  title: string;
  starCost: number;
  emoji: string;
  description?: string;
  isActive: boolean;
  color?: string;
}

export interface RewardClaim {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  rewardId: string;
  rewardTitle: string;
  rewardEmoji: string;
  starCost: number;
  status: 'pending' | 'approved' | 'rejected';
  claimedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export const DEFAULT_POSITIVE_BEHAVIORS = [
  { title: 'Ödevini yaptı', emoji: '📚', stars: 3 },
  { title: 'Yatağını topladı', emoji: '🛏', stars: 1 },
  { title: 'Büyüklerine saygılı davrandı', emoji: '🙏', stars: 2 },
  { title: 'Kardeşiyle paylaştı', emoji: '🤝', stars: 2 },
  { title: 'Dişlerini fırçaladı', emoji: '🦷', stars: 1 },
  { title: 'Kitap okudu', emoji: '📖', stars: 2 },
  { title: 'Tabağını bitirdi', emoji: '🍽', stars: 1 },
  { title: 'Sınavda başarılı oldu', emoji: '🎯', stars: 5 },
  { title: 'Odasını topladı', emoji: '🧹', stars: 2 },
  { title: 'Zamanında uyudu', emoji: '💤', stars: 1 },
  { title: 'Arkadaşına yardım etti', emoji: '🫂', stars: 2 },
  { title: 'Spor yaptı', emoji: '🏃', stars: 2 },
];

export const DEFAULT_NEGATIVE_BEHAVIORS = [
  { title: 'Kardeşine vurdu', emoji: '😤', stars: 3 },
  { title: 'İzinsiz tablet/telefon kullandı', emoji: '📱', stars: 2 },
  { title: 'Yalan söyledi', emoji: '🤥', stars: 3 },
  { title: 'Bağırdı / kaba konuştu', emoji: '😡', stars: 2 },
  { title: 'Ödevini yapmadı', emoji: '🚫', stars: 2 },
  { title: 'İzinsiz şeker/atıştırmalık yedi', emoji: '🍭', stars: 1 },
  { title: 'Eşyalarını dağıttı', emoji: '🗑️', stars: 1 },
];

export const LEVEL_THRESHOLDS = [
  { min: 0,   max: 49,  label: 'Çırak',    emoji: '⚔️',  color: '#CD7F32' },
  { min: 50,  max: 149, label: 'Kaşif',    emoji: '🗺️',  color: '#C0C0C0' },
  { min: 150, max: 299, label: 'Kahraman', emoji: '🦸',  color: '#FFD700' },
  { min: 300, max: 499, label: 'Usta',     emoji: '⚡',  color: '#4FC3F7' },
  { min: 500, max: Infinity, label: 'Efsane', emoji: '🌟', color: '#CE93D8' },
];

export function getLevelInfo(totalStars: number) {
  return LEVEL_THRESHOLDS.find(t => totalStars >= t.min && totalStars <= t.max) || LEVEL_THRESHOLDS[0];
}

export interface BehaviorOption {
  id: string;
  title: string;
  emoji: string;
  stars: number;
  type: 'positive' | 'negative';
}

export interface MemberRewardTarget {
  bigRewardTitle?: string;
  bigRewardEmoji?: string;
  stickersPerBigReward?: number;
}

export interface FamilyRewardSettings {
  familyId: string;
  starsPerSticker: number;        // Kaç yıldız = 1 etiket (varsayılan: 10)
  stickersPerBigReward: number;   // Kaç etiket = büyük ödül (varsayılan: 10)
  bigRewardTitle: string;         // Büyük ödülün adı
  bigRewardEmoji: string;         // Büyük ödül emojisi
  stickerEmoji: string;           // Etiket emojisi (varsayılan: 🌟)
  customBehaviors?: BehaviorOption[]; // Aileye özel hazır davranış listesi
  memberTargets?: Record<string, MemberRewardTarget>; // Çocuğa özel büyük ödül ve etiket hedefleri
}

export const DEFAULT_REWARD_SETTINGS: Omit<FamilyRewardSettings, 'familyId'> = {
  starsPerSticker: 10,
  stickersPerBigReward: 10,
  bigRewardTitle: 'Büyük Ödül',
  bigRewardEmoji: '🎁',
  stickerEmoji: '🌟',
};

export interface StickerRecord {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  type: 'sticker_awarded' | 'big_reward_awarded' | 'sticker_removed';
  count: number;          // Kaç etiket verildi/alındı
  starsSpent?: number;    // Etiket verilirken harcanan yıldız
  note?: string;
  createdAt: string;
  createdBy: string;
}
