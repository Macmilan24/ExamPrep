"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { Question, QuestionExplanation, ConfidenceLevel } from "@/lib/supabase/types";
import {
    CheckCircle2,
    XCircle,
    Minus,
    ArrowLeft,
    BarChart3,
    Lightbulb,
    Loader2,
    Trophy,
    Target,
    AlertTriangle,
    RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;
    const { user } = useAuth();

    const { questions, answers, confidences, examTitle, reset } = useExamStore();
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [allQuestions, setAllQuestions] = useState<Question[]>([]);
    const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
    const [savedConfidences, setSavedConfidences] = useState<Record<string, ConfidenceLevel>>({});
    const [savedIsCorrect, setSavedIsCorrect] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);

    // Merge store answers with saved answers (saved takes precedence for showing results)
    const displayAnswers = Object.keys(answers).length > 0 ? answers : savedAnswers;
    const displayConfidences = Object.keys(confidences).length > 0 ? confidences : savedConfidences;

    // Load saved answers from database if not in store
    useEffect(() => {
        async function loadSavedResults() {
            if (!user) return;

            const supabase = createClient();

            // Get the most recent completed session for this exam
            const { data: session } = await supabase
                .from("user_sessions")
                .select("id")
                .eq("exam_id", examId)
                .eq("user_id", user.id)
                .not("completed_at", "is", null)
                .order("completed_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!session) return;

            // Load saved answers
            const { data: savedAnswersData } = await supabase
                .from("user_answers")
                .select("question_id, selected_option, confidence_level, is_correct")
                .eq("session_id", session.id);

            if (savedAnswersData && savedAnswersData.length > 0) {
                const answersMap: Record<string, string> = {};
                const confidencesMap: Record<string, ConfidenceLevel> = {};
                const isCorrectMap: Record<string, boolean> = {};

                savedAnswersData.forEach((ans) => {
                    if (ans.selected_option) {
                        answersMap[ans.question_id] = ans.selected_option;
                    }
                    if (ans.confidence_level) {
                        confidencesMap[ans.question_id] = ans.confidence_level;
                    }
                    if (typeof ans.is_correct === "boolean") {
                        isCorrectMap[ans.question_id] = ans.is_correct;
                    }
                });

                setSavedAnswers(answersMap);
                setSavedConfidences(confidencesMap);
                setSavedIsCorrect(isCorrectMap);
            }
        }

        loadSavedResults();
    }, [user, examId]);

    // If we have questions from the store, use them; otherwise fetch from Supabase
    useEffect(() => {
        if (questions.length > 0) {
            setAllQuestions(questions);
            return;
        }
        // Fallback: fetch from DB
        async function fetchQuestions() {
            setLoading(true);
            const supabase = createClient();
            const { data } = await supabase
                .from("questions")
                .select("*")
                .eq("exam_id", examId);
            setAllQuestions(data || []);
            setLoading(false);
        }
        fetchQuestions();
    }, [questions, examId]);

    const handleRetake = () => {
        reset();
        router.push(`/exam/${examId}?retake=true`);
    };

    const results = useMemo(() => {
        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        const topicStats: Record<string, { correct: number; total: number }> = {};

        allQuestions.forEach((q) => {
            const answer = displayAnswers[q.id];
            const topic = q.topic || "General";

            if (!topicStats[topic]) {
                topicStats[topic] = { correct: 0, total: 0 };
            }
            topicStats[topic].total++;

            if (!answer) {
                skipped++;
            } else {
                // If we have saved is_correct status, use it
                let isCorrect = false;

                if (savedIsCorrect[q.id] !== undefined) {
                    isCorrect = savedIsCorrect[q.id];
                } else {
                    // Fallback to manual check (e.g. if just finished and not loaded from DB yet)
                    isCorrect =
                        answer === q.correct_answer ||
                        q.options[answer as keyof typeof q.options] === q.correct_answer;
                }

                if (isCorrect) {
                    correct++;
                    topicStats[topic].correct++;
                } else {
                    wrong++;
                }
            }
        });

        return { correct, wrong, skipped, total: allQuestions.length, topicStats };
    }, [allQuestions, displayAnswers, savedIsCorrect]);

    const percentage = results.total > 0
        ? Math.round((results.correct / results.total) * 100)
        : 0;

    const openExplanation = (q: Question) => {
        setSelectedQuestion(q);
        setSheetOpen(true);
    };

    const getQuestionStatus = (q: Question) => {
        const answer = displayAnswers[q.id];
        if (!answer) return "skipped";

        if (savedIsCorrect[q.id] !== undefined) {
            return savedIsCorrect[q.id] ? "correct" : "wrong";
        }

        const isCorrect =
            answer === q.correct_answer ||
            q.options[answer as keyof typeof q.options] === q.correct_answer;
        return isCorrect ? "correct" : "wrong";
    };

    if (loading && allQuestions.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-emerald" />
            </div>
        );
    }

    return (
        <div className="px-3 py-6 sm:px-6 sm:py-10 md:py-16">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 sm:mb-8"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-3 gap-1.5 rounded-full px-2 sm:mb-4"
                                onClick={() => router.push("/exams")}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Exams
                            </Button>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Exam Review</h1>
                            {examTitle && (
                                <p className="mt-1 truncate text-sm text-muted-foreground sm:text-base">{examTitle}</p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5 rounded-full sm:w-auto"
                            onClick={handleRetake}
                        >
                            <RotateCcw className="h-4 w-4" />
                            Retake Exam
                        </Button>
                    </div>
                </motion.div>

                {/* Score Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 grid grid-cols-2 gap-3 sm:mb-10 sm:gap-4 lg:grid-cols-4"
                >
                    <Card className="border-emerald/20 bg-emerald/5">
                        <CardContent className="p-4 text-center sm:p-5">
                            <Trophy className="mx-auto mb-1.5 h-5 w-5 text-emerald sm:mb-2 sm:h-6 sm:w-6" />
                            <div className="text-2xl font-bold text-emerald sm:text-3xl">{percentage}%</div>
                            <p className="text-xs text-muted-foreground">Overall Score</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center sm:p-5">
                            <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-emerald sm:mb-2 sm:h-6 sm:w-6" />
                            <div className="text-2xl font-bold sm:text-3xl">{results.correct}</div>
                            <p className="text-xs text-muted-foreground">Correct</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center sm:p-5">
                            <XCircle className="mx-auto mb-1.5 h-5 w-5 text-destructive sm:mb-2 sm:h-6 sm:w-6" />
                            <div className="text-2xl font-bold sm:text-3xl">{results.wrong}</div>
                            <p className="text-xs text-muted-foreground">Wrong</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center sm:p-5">
                            <Minus className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground sm:mb-2 sm:h-6 sm:w-6" />
                            <div className="text-2xl font-bold sm:text-3xl">{results.skipped}</div>
                            <p className="text-xs text-muted-foreground">Skipped</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Question List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="mb-4 text-lg font-semibold">Questions</h2>
                    <div className="space-y-2.5 sm:space-y-3">
                        {allQuestions.map((q, i) => {
                            const status = getQuestionStatus(q);
                            const confidence = displayConfidences[q.id];
                            const userAnswer = displayAnswers[q.id];

                            return (
                                <Card
                                    key={q.id}
                                    className={`group cursor-pointer transition-all hover:shadow-md ${status === "correct"
                                        ? "border-emerald/20 hover:border-emerald/40"
                                        : status === "wrong"
                                            ? "border-destructive/20 hover:border-destructive/40"
                                            : "border-border/50 hover:border-border"
                                        }`}
                                    onClick={() => openExplanation(q)}
                                >
                                    <CardContent className="p-3 sm:p-4">
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div
                                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold sm:h-9 sm:w-9 sm:text-sm ${status === "correct"
                                                    ? "bg-emerald/10 text-emerald"
                                                    : status === "wrong"
                                                        ? "bg-destructive/10 text-destructive"
                                                        : "bg-secondary text-muted-foreground"
                                                    }`}
                                            >
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="line-clamp-2 text-sm leading-5 sm:text-[15px]">{q.question_text}</p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    {q.topic && (
                                                        <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0">
                                                            {q.topic}
                                                        </Badge>
                                                    )}
                                                    {confidence && (
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] rounded-full px-2 py-0 ${confidence === "confident"
                                                                ? "text-emerald border-emerald/30"
                                                                : confidence === "unsure"
                                                                    ? "text-amber border-amber/30"
                                                                    : "text-destructive border-destructive/30"
                                                                }`}
                                                        >
                                                            {confidence}
                                                        </Badge>
                                                    )}
                                                    {userAnswer && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Answered: {userAnswer}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 pt-0.5">
                                                {status === "correct" ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald sm:h-5 sm:w-5" />
                                                ) : status === "wrong" ? (
                                                    <XCircle className="h-4 w-4 text-destructive sm:h-5 sm:w-5" />
                                                ) : (
                                                    <Minus className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 w-full justify-center gap-1 rounded-full text-xs sm:mt-0 sm:w-auto sm:opacity-0 sm:transition sm:group-hover:opacity-100"
                                        >
                                            <Lightbulb className="h-3.5 w-3.5" />
                                            Explain
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Explanation Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    {selectedQuestion && (
                        <ExplanationContent
                            question={selectedQuestion}
                            userAnswer={displayAnswers[selectedQuestion.id]}
                            confidence={displayConfidences[selectedQuestion.id]}
                            isCorrectOverride={savedIsCorrect[selectedQuestion.id]}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function ExplanationContent({
    question,
    userAnswer,
    confidence,
    isCorrectOverride,
}: {
    question: Question;
    userAnswer?: string;
    confidence?: string;
    isCorrectOverride?: boolean;
}) {
    const exp = question.explanation as QuestionExplanation | undefined;
    const isCorrect = isCorrectOverride !== undefined
        ? isCorrectOverride
        : (userAnswer === question.correct_answer ||
            (userAnswer &&
                question.options[userAnswer as keyof typeof question.options] ===
                question.correct_answer));

    // Find the correct letter
    const correctLetter = Object.entries(question.options).find(
        ([, val]) => val === question.correct_answer
    )?.[0] || question.correct_answer;

    return (
        <div className="space-y-5 sm:space-y-6">
            <SheetHeader>
                <SheetTitle className="text-left">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        {isCorrect ? (
                            <Badge className="bg-emerald/10 text-emerald border-emerald/30">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                            </Badge>
                        ) : userAnswer ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                                <XCircle className="mr-1 h-3 w-3" /> Incorrect
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                <Minus className="mr-1 h-3 w-3" /> Skipped
                            </Badge>
                        )}
                        {confidence && (
                            <Badge variant="outline" className="text-xs">
                                {confidence}
                            </Badge>
                        )}
                    </div>
                    <p className="text-base font-medium leading-relaxed">
                        {question.question_text}
                    </p>
                </SheetTitle>
            </SheetHeader>

            <Separator />

            {/* Options review */}
            <div className="space-y-2">
                {Object.entries(question.options).map(([letter, text]) => {
                    const isUserChoice = letter === userAnswer;
                    const isCorrectOption = letter === correctLetter;

                    return (
                        <div
                            key={letter}
                            className={`flex items-start gap-3 rounded-lg border p-3 text-sm sm:items-center ${isCorrectOption
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
                            <span className="flex-1 leading-5">{text}</span>
                            {isCorrectOption && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald" />
                            )}
                            {isUserChoice && !isCorrectOption && (
                                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                            )}
                        </div>
                    );
                })}
            </div>

            <Separator />

            {/* Detailed Explanation */}
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

                    {/* Option analyses */}
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
                                    {analysis as string}
                                </p>
                            </div>
                        );
                    })}

                    {exp.key_takeaways && exp.key_takeaways.length > 0 && (
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-chart-2">
                                <BarChart3 className="h-4 w-4" />
                                Key Takeaways
                            </div>
                            <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                                {exp.key_takeaways.map((takeaway, i) => (
                                    <li key={i}>{takeaway}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {!exp && (
                <p className="text-sm text-muted-foreground italic">
                    No detailed explanation available for this question.
                </p>
            )}
        </div>
    );
}
