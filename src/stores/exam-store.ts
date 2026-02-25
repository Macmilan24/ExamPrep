import { create } from "zustand";
import type { Question, ConfidenceLevel } from "@/lib/supabase/types";

interface QuestionResult {
    isCorrect: boolean;
    showResult: boolean;
}

interface ExamState {
    // Data
    questions: Question[];
    examId: string | null;
    examTitle: string;
    sessionId: string | null;

    // Navigation
    currentIndex: number;

    // Answers & tracking
    answers: Record<string, string>; // questionId -> selected option letter (A/B/C/D)
    confidences: Record<string, ConfidenceLevel>; // questionId -> confidence
    flags: Set<string>; // set of flagged questionIds
    strikethroughs: Record<string, Set<string>>; // questionId -> set of option letters

    // Results (immediate feedback)
    results: Record<string, QuestionResult>; // questionId -> result

    // Timer
    timeRemaining: number; // seconds
    isRunning: boolean;

    // Submission
    isSubmitted: boolean;

    // Actions
    initExam: (examId: string, title: string, questions: Question[], timeLimitMinutes: number) => void;
    setSessionId: (sessionId: string) => void;
    loadSavedAnswers: (answers: Record<string, string>, confidences: Record<string, ConfidenceLevel>) => void;
    goToQuestion: (index: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    selectAnswer: (questionId: string, option: string) => void;
    setConfidence: (questionId: string, level: ConfidenceLevel) => void;
    toggleFlag: (questionId: string) => void;
    toggleStrikethrough: (questionId: string, option: string) => void;
    checkAnswer: (questionId: string) => boolean;
    hideResult: (questionId: string) => void;
    tick: () => void;
    submitExam: () => void;
    reset: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
    questions: [],
    examId: null,
    examTitle: "",
    sessionId: null,
    currentIndex: 0,
    answers: {},
    confidences: {},
    flags: new Set(),
    strikethroughs: {},
    results: {},
    timeRemaining: 150 * 60,
    isRunning: false,
    isSubmitted: false,

    initExam: (examId, title, questions, timeLimitMinutes) =>
        set({
            examId,
            examTitle: title,
            questions,
            currentIndex: 0,
            answers: {},
            confidences: {},
            flags: new Set(),
            strikethroughs: {},
            results: {},
            timeRemaining: timeLimitMinutes * 60,
            isRunning: true,
            isSubmitted: false,
            sessionId: null,
        }),

    setSessionId: (sessionId) => set({ sessionId }),

    loadSavedAnswers: (answers, confidences) =>
        set({
            answers,
            confidences,
            isRunning: false,
            isSubmitted: true,
        }),

    goToQuestion: (index) => {
        const { questions } = get();
        if (index >= 0 && index < questions.length) {
            set({ currentIndex: index });
        }
    },

    nextQuestion: () => {
        const { currentIndex, questions } = get();
        if (currentIndex < questions.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        }
    },

    prevQuestion: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
            set({ currentIndex: currentIndex - 1 });
        }
    },

    selectAnswer: (questionId, option) =>
        set((state) => ({
            answers: { ...state.answers, [questionId]: option },
        })),

    setConfidence: (questionId, level) =>
        set((state) => ({
            confidences: { ...state.confidences, [questionId]: level },
        })),

    toggleFlag: (questionId) =>
        set((state) => {
            const newFlags = new Set(state.flags);
            if (newFlags.has(questionId)) {
                newFlags.delete(questionId);
            } else {
                newFlags.add(questionId);
            }
            return { flags: newFlags };
        }),

    toggleStrikethrough: (questionId, option) =>
        set((state) => {
            const current = state.strikethroughs[questionId] || new Set();
            const newSet = new Set(current);
            if (newSet.has(option)) {
                newSet.delete(option);
            } else {
                newSet.add(option);
            }
return {
                strikethroughs: { ...state.strikethroughs, [questionId]: newSet },
            };
        }),

    checkAnswer: (questionId) => {
        const { questions, answers } = get();
        const question = questions.find((q) => q.id === questionId);
        if (!question) return false;

        const selectedOption = answers[questionId];
        if (!selectedOption) return false;

        const isCorrect = 
            selectedOption === question.correct_answer ||
            question.options[selectedOption as keyof typeof question.options] === question.correct_answer;
        
        set((state) => ({
            results: {
                ...state.results,
                [questionId]: { isCorrect, showResult: true },
            },
        }));
        return isCorrect;
    },

    hideResult: (questionId) =>
        set((state) => ({
            results: {
                ...state.results,
                [questionId]: { ...state.results[questionId], showResult: false },
            },
        })),

    tick: () =>
        set((state) => {
            if (state.timeRemaining <= 0) {
                return { isRunning: false, timeRemaining: 0 };
            }
            return { timeRemaining: state.timeRemaining - 1 };
        }),

    submitExam: () => set({ isSubmitted: true, isRunning: false }),

reset: () =>
        set({
            questions: [],
            examId: null,
            examTitle: "",
            sessionId: null,
            currentIndex: 0,
            answers: {},
            confidences: {},
            flags: new Set(),
            strikethroughs: {},
            results: {},
            timeRemaining: 150 * 60,
            isRunning: false,
            isSubmitted: false,
        }),
}));
