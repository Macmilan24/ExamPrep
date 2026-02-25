// Database types matching Supabase schema

export interface Exam {
    id: string;
    title: string;
    subject: string;
    total_questions: number;
    time_limit_minutes: number;
    created_at: string;
}

export interface QuestionOptions {
    A: string;
    B: string;
    C: string;
    D: string;
}

export interface QuestionExplanation {
    core_concept: string;
    correct_answer_explanation: string;
    option_a_analysis: string;
    option_b_analysis: string;
    option_c_analysis: string;
    option_d_analysis: string;
    key_takeaways: string[];
}

export interface Question {
    id: string;
    exam_id: string;
    question_text: string;
    options: QuestionOptions;
    correct_answer: string;
    answer_source: string;
    explanation: QuestionExplanation;
    topic: string;
    difficulty: string;
    created_at: string;
}

export interface UserSession {
    id: string;
    user_id: string;
    exam_id: string;
    score: number | null;
    started_at: string;
    completed_at: string | null;
    exam?: Exam;
}

export interface UserAnswerWithQuestion extends UserAnswer {
    question?: Question;
}

export interface UserAnswer {
    id: string;
    session_id: string;
    question_id: string;
    selected_option: string | null;
    confidence_level: "guessing" | "unsure" | "confident" | null;
    is_correct: boolean | null;
    answered_at: string;
}

export type ConfidenceLevel = "guessing" | "unsure" | "confident";

export interface ExamWithQuestions extends Exam {
    questions: Question[];
}
