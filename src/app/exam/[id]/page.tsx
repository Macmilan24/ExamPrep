"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useExamStore } from "@/stores/exam-store";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { ExamWithQuestions, ConfidenceLevel, Question, QuestionExplanation } from "@/lib/supabase/types";
import {
    ChevronLeft,
    ChevronRight,
    Flag,
    Send,
    Clock,
    Loader2,
    X,
    HelpCircle,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const confidenceConfig: Record<
    ConfidenceLevel,
    { label: string; icon: React.ElementType; color: string; bg: string }
> = {
    guessing: {
        label: "Guessing",
        icon: HelpCircle,
        color: "text-destructive",
        bg: "bg-destructive/10 border-destructive/30 hover:bg-destructive/20",
    },
    unsure: {
        label: "Unsure",
        icon: AlertTriangle,
        color: "text-amber",
        bg: "bg-amber/10 border-amber/30 hover:bg-amber/20",
    },
    confident: {
        label: "Confident",
        icon: CheckCircle2,
        color: "text-emerald",
        bg: "bg-emerald/10 border-emerald/30 hover:bg-emerald/20",
    },
};

export default function ExamPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const examId = params.id as string;
    const isRetake = searchParams.get("retake") === "true";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showExplanationSheet, setShowExplanationSheet] = useState(false);
    const { user } = useAuth();

    // Initialize map visibility based on screen width
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            setShowMap(true);
        }
    }, []);

    const {
        questions,
        currentIndex,
        answers,
        confidences,
        flags,
        strikethroughs,
        results,
        timeRemaining,
        isRunning,
        isSubmitted,
        initExam,
        setSessionId,
        loadSavedAnswers,
        goToQuestion,
        nextQuestion,
        prevQuestion,
        selectAnswer,
        setConfidence,
        toggleFlag,
        toggleStrikethrough,
        checkAnswer,
        tick,
        submitExam,
    } = useExamStore();

    // Load exam data
    useEffect(() => {
        async function loadExam() {
            try {
                const supabase = createClient();
                const { data: exam } = await supabase
                    .from("exams")
                    .select("*")
                    .eq("id", examId)
                    .single();

                if (!exam) {
                    setError("Exam not found");
                    setLoading(false);
                    return;
                }

                const { data: questionsData } = await supabase
                    .from("questions")
                    .select("*")
                    .eq("exam_id", examId);

                // Check if user has any session for this exam (skip if retake)
                if (user && !isRetake) {
                    // First check for in-progress session
                    let { data: existingSession } = await supabase
                        .from("user_sessions")
                        .select("id, completed_at")
                        .eq("exam_id", examId)
                        .eq("user_id", user.id)
                        .eq("completed_at", null)
                        .maybeSingle();

                    // If no in-progress session, check for completed session
                    if (!existingSession) {
                        const { data: completedSession } = await supabase
                            .from("user_sessions")
                            .select("id, completed_at")
                            .eq("exam_id", examId)
                            .eq("user_id", user.id)
                            .not("completed_at", "is", null)
                            .order("completed_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        existingSession = completedSession;
                    }

                    // If there's a session, load saved answers
                    if (existingSession) {
                        setSessionId(existingSession.id);

                        // Load saved answers
                        const { data: savedAnswers } = await supabase
                            .from("user_answers")
                            .select("question_id, selected_option, confidence_level")
                            .eq("session_id", existingSession.id);

                        if (savedAnswers && savedAnswers.length > 0) {
                            const answersMap: Record<string, string> = {};
                            const confidencesMap: Record<string, ConfidenceLevel> = {};

                            savedAnswers.forEach((ans) => {
                                if (ans.selected_option) {
                                    answersMap[ans.question_id] = ans.selected_option;
                                }
                                if (ans.confidence_level) {
                                    confidencesMap[ans.question_id] = ans.confidence_level;
                                }
                            });

                            initExam(
                                exam.id,
                                exam.title,
                                questionsData || [],
                                exam.time_limit_minutes
                            );
                            loadSavedAnswers(answersMap, confidencesMap);
                            setLoading(false);
                            return;
                        }
                    }
                }

                initExam(
                    exam.id,
                    exam.title,
                    questionsData || [],
                    exam.time_limit_minutes
                );
                setLoading(false);
            } catch {
                setError("Failed to load exam");
                setLoading(false);
            }
        }
        loadExam();
    }, [examId, initExam, setSessionId, loadSavedAnswers, user]);

    // Timer
    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [isRunning, tick]);

    // Navigate to review on submit
    useEffect(() => {
        if (isSubmitted) {
            router.push(`/exam/${examId}/review`);
        }
    }, [isSubmitted, examId, router]);

    const currentQuestion = useMemo(
        () => questions[currentIndex],
        [questions, currentIndex]
    );

    const answeredCount = useMemo(
        () => Object.keys(answers).length,
        [answers]
    );

    const persistSubmission = useCallback(async () => {
        if (!user) return;

        const supabase = createClient();

        let correctCount = 0;
        questions.forEach((q) => {
            const selected = answers[q.id]?.toUpperCase();
            const correct = q.correct_answer?.toUpperCase();

            if (selected) {
                const isCorrect =
                    selected === correct ||
                    q.options[selected as keyof typeof q.options]?.toUpperCase() === correct;

                if (isCorrect) {
                    correctCount++;
                }
            }
        });

        const { data: session, error: sessionError } = await supabase
            .from("user_sessions")
            .insert({
                user_id: user.id,
                exam_id: examId,
                score: correctCount,
                completed_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (sessionError || !session) {
            console.error("Failed to save session:", sessionError);
            return;
        }

        const answersToInsert = questions.map((q) => {
            const selected = answers[q.id]?.toUpperCase();
            const correct = q.correct_answer?.toUpperCase();

            let isCorrect = null;
            if (selected) {
                isCorrect =
                    selected === correct ||
                    q.options[selected as keyof typeof q.options]?.toUpperCase() === correct;
            }

            return {
                session_id: session.id,
                question_id: q.id,
                selected_option: answers[q.id]?.toUpperCase() || null,
                confidence_level: confidences[q.id] || null,
                is_correct: isCorrect,
                answered_at: new Date().toISOString(),
            };
        });

        const { error: answersError } = await supabase.from("user_answers").insert(answersToInsert);
        if (answersError) {
            console.error("Failed to save answers:", answersError);
        }
    }, [user, examId, questions, answers, confidences]);

    // Auto-submit when time runs out
    useEffect(() => {
        if (timeRemaining <= 0 && isRunning) {
            const autoSubmit = async () => {
                await persistSubmission();
                submitExam();
            };
            autoSubmit();
        }
    }, [timeRemaining, isRunning, persistSubmission, submitExam]);

    const handleSubmit = useCallback(async () => {
        await persistSubmission();
        submitExam();
        setShowSubmitDialog(false);
    }, [persistSubmission, submitExam]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald" />
                    <p className="mt-4 text-sm text-muted-foreground">
                        Loading your exam...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !currentQuestion) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Card className="max-w-md p-8 text-center">
                    <p className="text-destructive">{error || "No questions found"}</p>
                    <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() => router.push("/exams")}
                    >
                        Back to Exams
                    </Button>
                </Card>
            </div>
        );
    }

    const currentStrikethroughs = strikethroughs[currentQuestion.id] || new Set();
    const currentAnswer = answers[currentQuestion.id];
    const currentConfidence = confidences[currentQuestion.id];
    const currentResult = results[currentQuestion.id];
    const hasCheckedAnswer = currentResult?.showResult ?? false;
    const isUrgent = timeRemaining < 300;

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Top bar */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => router.push("/exams")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <span className="hidden sm:block text-sm font-medium text-muted-foreground truncate max-w-[200px]">
                        {useExamStore.getState().examTitle}
                    </span>
                </div>

                <div
                    className={`flex items-center gap-2 font-mono text-lg font-semibold tabular-nums ${isUrgent ? "text-destructive animate-pulse" : "text-foreground"
                        }`}
                >
                    <Clock className="h-4 w-4" />
                    {formatTime(timeRemaining)}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowMap(!showMap)}
                    >
                        {showMap ? "Hide" : "Show"} Map
                    </Button>
                    <Button
                        size="sm"
                        className="gap-1.5 rounded-full bg-emerald text-emerald-foreground hover:bg-emerald/90"
                        onClick={() => setShowSubmitDialog(true)}
                    >
                        <Send className="h-3.5 w-3.5" />
                        Submit
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Question Map Sidebar */}
                <AnimatePresence>
                    {showMap && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-y-0 left-0 z-20 w-full border-r border-border/50 bg-background p-4 md:static md:w-[280px] md:bg-card/50 md:shrink-0 overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-3 md:hidden">
                                <span className="text-sm font-medium">Question Map</span>
                                <Button variant="ghost" size="icon" onClick={() => setShowMap(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="hidden md:block mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Question Map
                            </p>
                            <div className="grid grid-cols-5 gap-1.5">
                                {questions.map((q, i) => {
                                    const isAnswered = !!answers[q.id];
                                    const isFlagged = flags.has(q.id);
                                    const isCurrent = i === currentIndex;
                                    const result = results[q.id];
                                    const isChecked = result?.showResult ?? false;

                                    let bgColor = "bg-secondary hover:bg-secondary/80";
                                    if (isCurrent) bgColor = "bg-emerald text-emerald-foreground";
                                    else if (isFlagged) bgColor = "bg-amber/20 text-amber border border-amber/40";
                                    else if (isChecked && result?.isCorrect) bgColor = "bg-emerald/20 text-emerald border border-emerald/40";
                                    else if (isChecked && !result?.isCorrect) bgColor = "bg-destructive/20 text-destructive border border-destructive/40";
                                    else if (isAnswered) bgColor = "bg-emerald/15 text-emerald";

                                    return (
                                        <Tooltip key={q.id}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => goToQuestion(i)}
                                                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-medium transition-all ${bgColor}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>
                                                    Q{i + 1}:{" "}
                                                    {isChecked
                                                        ? result.isCorrect
                                                            ? "Correct"
                                                            : "Incorrect"
                                                        : isFlagged
                                                            ? "Flagged"
                                                            : isAnswered
                                                                ? "Answered"
                                                                : "Unanswered"}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>

                            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded bg-emerald/15" />
                                    <span>Answered ({answeredCount})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded bg-emerald/20 border border-emerald/40" />
                                    <span>Correct ({Object.values(results).filter(r => r.showResult && r.isCorrect).length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded bg-destructive/20 border border-destructive/40" />
                                    <span>Incorrect ({Object.values(results).filter(r => r.showResult && !r.isCorrect).length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded bg-secondary" />
                                    <span>Unanswered ({questions.length - answeredCount})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded bg-amber/20 border border-amber/40" />
                                    <span>Flagged ({flags.size})</span>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Question Area */}
                <div className="flex flex-1 flex-col overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 pb-24 md:px-12 md:py-12 md:pb-12">
                        {/* Question header */}
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="rounded-full px-3 text-xs">
                                    Q{currentIndex + 1} of {questions.length}
                                </Badge>
                                {currentQuestion.topic && (
                                    <Badge variant="outline" className="rounded-full px-3 text-xs">
                                        {currentQuestion.topic}
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant={flags.has(currentQuestion.id) ? "default" : "ghost"}
                                size="sm"
                                className={`gap-1.5 rounded-full text-xs ${flags.has(currentQuestion.id)
                                    ? "bg-amber/20 text-amber hover:bg-amber/30"
                                    : ""
                                    }`}
                                onClick={() => toggleFlag(currentQuestion.id)}
                            >
                                <Flag className="h-3.5 w-3.5" />
                                {flags.has(currentQuestion.id) ? "Flagged" : "Flag"}
                            </Button>
                        </div>

                        {/* Question text */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentQuestion.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h2 className="mb-8 text-xl font-medium leading-relaxed md:text-2xl">
                                    {currentQuestion.question_text}
                                </h2>

                                {/* Options */}
                                <div className="space-y-3">
                                    {Object.entries(currentQuestion.options).map(
                                        ([letter, text]) => {
                                            const isSelected = currentAnswer === letter;
                                            const isStruckThrough = currentStrikethroughs.has(letter);

                                            return (
                                                <div key={letter} className="flex items-stretch gap-3">
                                                    <button
                                                        onClick={() => {
                                                            if (!isStruckThrough) {
                                                                selectAnswer(currentQuestion.id, letter);
                                                            }
                                                        }}
                                                        className={`flex flex-1 items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.99] touch-manipulation ${isStruckThrough
                                                            ? "strikethrough-option border-border/30 cursor-not-allowed opacity-60"
                                                            : isSelected
                                                                ? "border-emerald bg-emerald/10 shadow-sm"
                                                                : "border-border/50 bg-card/50 hover:border-border hover:bg-card"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${isSelected
                                                                ? "bg-emerald text-emerald-foreground"
                                                                : "bg-secondary text-muted-foreground"
                                                                }`}
                                                        >
                                                            {letter}
                                                        </span>
                                                        <span className="text-sm md:text-base">{text}</span>
                                                    </button>

                                                    {/* Strike-through toggle */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() =>
                                                                    toggleStrikethrough(currentQuestion.id, letter)
                                                                }
                                                                className={`flex h-auto w-12 shrink-0 items-center justify-center rounded-xl border transition-all touch-manipulation ${isStruckThrough
                                                                    ? "bg-destructive/15 text-destructive border-destructive/20"
                                                                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary border-transparent"
                                                                    }`}
                                                                aria-label={isStruckThrough ? "Remove strike-through" : "Eliminate option"}
                                                            >
                                                                <span className="text-lg font-bold">✕</span>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {isStruckThrough
                                                                ? "Remove strike-through"
                                                                : "Eliminate this option"}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Result & Explanation Panel */}
                        {hasCheckedAnswer && currentResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-6 rounded-xl border p-4 ${currentResult.isCorrect
                                    ? "border-emerald/50 bg-emerald/5"
                                    : "border-destructive/50 bg-destructive/5"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {currentResult.isCorrect ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-emerald" />
                                                <span className="font-medium text-emerald">Correct!</span>
                                            </>
                                        ) : (
                                            <>
                                                <X className="h-5 w-5 text-destructive" />
                                                <span className="font-medium text-destructive">
                                                    Wrong! The correct answer is {currentQuestion.correct_answer}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {currentQuestion.explanation && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 rounded-full text-xs"
                                            onClick={() => setShowExplanationSheet(true)}
                                        >
                                            <Lightbulb className="h-3.5 w-3.5" />
                                            More
                                        </Button>
                                    )}
                                </div>

                                {currentQuestion.explanation && (
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="font-medium text-foreground mb-1">Core Concept:</p>
                                            <p className="text-muted-foreground">{currentQuestion.explanation.core_concept}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground mb-1">Explanation:</p>
                                            <p className="text-muted-foreground">{currentQuestion.explanation.correct_answer_explanation}</p>
                                        </div>
                                        {currentResult.isCorrect && currentQuestion.explanation.key_takeaways && (
                                            <div>
                                                <p className="font-medium text-foreground mb-1">Key Takeaways:</p>
                                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                    {currentQuestion.explanation.key_takeaways.map((takeaway, i) => (
                                                        <li key={i}>{takeaway}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Confidence Tracker */}
                        {currentAnswer && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8"
                            >
                                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    How confident are you?
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(
                                        Object.entries(confidenceConfig) as [
                                            ConfidenceLevel,
                                            (typeof confidenceConfig)[ConfidenceLevel],
                                        ][]
                                    ).map(([level, config]) => {
                                        const Icon = config.icon;
                                        const isActive = currentConfidence === level;
                                        return (
                                            <Button
                                                key={level}
                                                variant="outline"
                                                size="sm"
                                                className={`gap-1.5 rounded-full transition-all ${isActive
                                                    ? `${config.bg} ${config.color} border`
                                                    : "text-muted-foreground"
                                                    }`}
                                                onClick={() =>
                                                    setConfidence(currentQuestion.id, level)
                                                }
                                            >
                                                <Icon className="h-3.5 w-3.5" />
                                                {config.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Navigation */}
                        <div className="fixed bottom-0 left-0 right-0 gap-4 bg-background border-t p-4 z-10 flex items-center justify-between md:static md:bg-transparent md:border-0 md:p-0 md:mt-auto md:pt-8">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 rounded-full"
                                disabled={currentIndex === 0}
                                onClick={prevQuestion}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Previous</span>
                                <span className="sm:hidden">Prev</span>
                            </Button>

                            <span className="hidden md:inline text-xs text-muted-foreground">
                                {answeredCount} / {questions.length} answered
                            </span>

                            <div className="flex gap-2">
                                {(currentAnswer && !hasCheckedAnswer && currentIndex !== questions.length - 1) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={nextQuestion}
                                    >
                                        Skip
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                )}

                                {currentAnswer && !hasCheckedAnswer ? (
                                    <Button
                                        size="sm"
                                        className="gap-1.5 rounded-full bg-emerald text-emerald-foreground hover:bg-emerald/90"
                                        onClick={() => checkAnswer(currentQuestion.id)}
                                    >
                                        <span className="hidden sm:inline">Check Answer</span>
                                        <span className="sm:hidden">Check</span>
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                ) : hasCheckedAnswer ? (
                                    <Button
                                        size="sm"
                                        className="gap-1.5 rounded-full bg-emerald text-emerald-foreground hover:bg-emerald/90"
                                        disabled={currentIndex === questions.length - 1}
                                        onClick={nextQuestion}
                                    >
                                        <span className="hidden sm:inline">Next Question</span>
                                        <span className="sm:hidden">Next</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 rounded-full"
                                        disabled={currentIndex === questions.length - 1}
                                        onClick={nextQuestion}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Submit Exam?</DialogTitle>
                        <DialogDescription>
                            You&apos;ve answered {answeredCount} out of {questions.length}{" "}
                            questions.
                            {answeredCount < questions.length && (
                                <>
                                    {" "}
                                    <span className="text-amber font-medium">
                                        {questions.length - answeredCount} questions are
                                        unanswered.
                                    </span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowSubmitDialog(false)}
                        >
                            Continue Exam
                        </Button>
                        <Button
                            className="bg-emerald text-emerald-foreground hover:bg-emerald/90"
                            onClick={handleSubmit}
                        >
                            Submit Exam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Full Explanation Sheet */}
            <Sheet open={showExplanationSheet} onOpenChange={setShowExplanationSheet}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    {currentQuestion && (
                        <ExamExplanationContent
                            question={currentQuestion}
                            userAnswer={currentAnswer}
                            isCorrect={currentResult?.isCorrect ?? false}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function ExamExplanationContent({
    question,
    userAnswer,
    isCorrect,
}: {
    question: Question;
    userAnswer?: string;
    isCorrect: boolean;
}) {
    const exp = question.explanation as QuestionExplanation | undefined;
    const correctLetter = Object.entries(question.options).find(
        ([, val]) => val === question.correct_answer
    )?.[0] || question.correct_answer;

    return (
        <div className="space-y-6">
            <SheetHeader>
                <SheetTitle className="text-left">
                    <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? (
                            <Badge className="bg-emerald/10 text-emerald border-emerald/30">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                            </Badge>
                        ) : userAnswer ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                                <X className="mr-1 h-3 w-3" /> Incorrect
                            </Badge>
                        ) : (
                            <Badge variant="secondary">Skipped</Badge>
                        )}
                    </div>
                    <p className="text-base font-medium leading-relaxed">
                        {question.question_text}
                    </p>
                </SheetTitle>
            </SheetHeader>

            <Separator />

            <div className="space-y-2">
                {Object.entries(question.options).map(([letter, text]) => {
                    const isUserChoice = letter === userAnswer;
                    const isCorrectOption = letter === correctLetter;

                    return (
                        <div
                            key={letter}
                            className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${isCorrectOption
                                ? "border-emerald/40 bg-emerald/5"
                                : isUserChoice
                                    ? "border-destructive/40 bg-destructive/5"
                                    : "border-border/30"
                                }`}
                        >
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${isCorrectOption
                                    ? "bg-emerald text-emerald-foreground"
                                    : isUserChoice
                                        ? "bg-destructive text-white"
                                        : "bg-secondary text-muted-foreground"
                                    }`}
                            >
                                {letter}
                            </span>
                            <span className="flex-1">{text}</span>
                            {isCorrectOption && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald" />
                            )}
                            {isUserChoice && !isCorrectOption && (
                                <X className="h-4 w-4 shrink-0 text-destructive" />
                            )}
                        </div>
                    );
                })}
            </div>

            <Separator />

            {exp && (
                <div className="space-y-5">
                    {exp.core_concept && (
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald">
                                <Target className="h-4 w-4" />
                                Core Concept
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {exp.core_concept}
                            </p>
                        </div>
                    )}

                    {exp.correct_answer_explanation && (
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald">
                                <CheckCircle2 className="h-4 w-4" />
                                Why {correctLetter} is Correct
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {exp.correct_answer_explanation}
                            </p>
                        </div>
                    )}

                    {(["A", "B", "C", "D"] as const).map((letter) => {
                        const key = `option_${letter.toLowerCase()}_analysis` as keyof QuestionExplanation;
                        const analysis = exp[key];
                        if (!analysis || letter === correctLetter) return null;
                        return (
                            <div key={letter}>
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <AlertTriangle className="h-4 w-4 text-amber" />
                                    Why {letter} is a Trap
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {analysis}
                                </p>
                            </div>
                        );
                    })}

                    {exp.key_takeaways && exp.key_takeaways.length > 0 && (
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald">
                                <Lightbulb className="h-4 w-4" />
                                Key Takeaways
                            </div>
                            <ul className="space-y-2">
                                {exp.key_takeaways.map((takeaway, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
                                        {takeaway}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
