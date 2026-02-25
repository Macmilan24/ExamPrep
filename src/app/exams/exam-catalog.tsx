"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { Exam, UserAnswer } from "@/lib/supabase/types";
import {
    BookOpen,
    Clock,
    FileQuestion,
    ArrowRight,
    AlertCircle,
    Search,
    Trophy,
    CheckCircle2,
    Play,
    RotateCcw,
    TrendingUp,
    Target,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.4 },
    }),
};

interface ExamWithStatus extends Exam {
    best_score: number | null;
    attempts_count: number;
    last_attempt_at: string | null;
    is_completed: boolean;
    is_in_progress: boolean;
}

function ExamCard({ exam, index }: { exam: ExamWithStatus; index: number }) {
    const getScoreColor = (score: number) => {
        if (score >= 70) return "text-emerald bg-emerald/10 border-emerald/30";
        if (score >= 50) return "text-amber bg-amber/10 border-amber/30";
        return "text-red-500 bg-red-500/10 border-red-500/30";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 70) return "Passed";
        if (score >= 50) return "Needs Work";
        return "Try Again";
    };

    const hasScore = exam.best_score != null;

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={index}
            className="w-full"
        >
            <Link href={`/exam/${exam.id}`} className="block">
                <Card className="group h-full cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-emerald/30 hover:shadow-lg hover:shadow-emerald/5 hover:-translate-y-1">
                    <CardContent className="flex h-full flex-col p-4 md:p-6">
                        {/* Header - Mobile optimized */}
                        <div className="flex items-start justify-between mb-3 md:mb-4 gap-2">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-emerald/10 shrink-0">
                                    <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-emerald" />
                                </div>
                                <div className="min-w-0">
                                    <Badge variant="secondary" className="text-[10px] md:text-xs font-medium">
                                        {exam.subject}
                                    </Badge>
                                    <div className="flex gap-1 mt-1">
                                        {exam.is_completed && (
                                            <Badge className="text-[9px] md:text-[10px] bg-emerald/10 text-emerald border-emerald/30 gap-0.5 px-1 py-0">
                                                <CheckCircle2 className="h-2 w-2" />
                                                Done
                                            </Badge>
                                        )}
                                        {exam.is_in_progress && !exam.is_completed && (
                                            <Badge className="text-[9px] md:text-[10px] bg-amber/10 text-amber border-amber/30 gap-0.5 px-1 py-0">
                                                <Play className="h-2 w-2" />
                                                In Progress
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {hasScore && exam.best_score !== null && (
                                <div className={`flex flex-col items-end rounded-lg border px-2 py-1.5 md:px-3 md:py-2 shrink-0 ${getScoreColor(exam.best_score)}`}>
                                    <div className="flex items-center gap-1">
                                        {exam.best_score >= 70 && <Trophy className="h-3 w-3 md:h-3.5 md:w-3.5" />}
                                        <span className="text-sm md:text-lg font-bold">{exam.best_score}%</span>
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-medium opacity-80 hidden md:inline">{getScoreLabel(exam.best_score)}</span>
                                </div>
                            )}
                        </div>

                        <h3 className="text-sm md:text-lg font-semibold group-hover:text-emerald transition-colors line-clamp-2 mb-2">
                            {exam.title}
                        </h3>

                        <div className="mt-auto space-y-2 md:space-y-3">
                            {/* Stats row */}
                            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FileQuestion className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    {exam.total_questions}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    {exam.time_limit_minutes} min
                                </span>
                            </div>

                            {/* Progress bar - only show if attempted */}
                            {hasScore && (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${(exam.best_score ?? 0) >= 70 ? "bg-emerald" :
                                                    (exam.best_score ?? 0) >= 50 ? "bg-amber" : "bg-red-500"
                                                }`}
                                            style={{ width: `${exam.best_score ?? 0}%` }}
                                        />
                                    </div>
                                    {exam.attempts_count > 1 && (
                                        <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                                            {exam.attempts_count}x
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Action text */}
                            <div className="flex items-center gap-1 text-xs md:text-sm font-medium text-emerald opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasScore ? (
                                    <>
                                        <RotateCcw className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                        Retake
                                    </>
                                ) : (
                                    <>
                                        Start <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

function FilterDropdown({
    value,
    options,
    onChange
}: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1rem",
            }}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

export function ExamCatalog({
    exams: initialExams,
    error,
}: {
    exams: Exam[];
    error: string | null;
}) {
    const { user } = useAuth();
    const supabase = createClient();

    const [searchQuery, setSearchQuery] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("recent");
    const [exams, setExams] = useState<ExamWithStatus[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user exam progress
    useEffect(() => {
        async function fetchExamStatuses() {
            // Initialize with basic exam data
            const initialExamsWithStatus: ExamWithStatus[] = initialExams.map(e => ({
                ...e,
                best_score: null,
                attempts_count: 0,
                last_attempt_at: null,
                is_completed: false,
                is_in_progress: false,
            }));

            setExams(initialExamsWithStatus);
            setLoading(false);

            if (!user) return;

            try {
                // Get all sessions for this user
                const { data: sessions, error: sessionsError } = await supabase
                    .from("user_sessions")
                    .select("id, exam_id, score, completed_at, started_at")
                    .eq("user_id", user.id)
                    .order("completed_at", { ascending: false });

                if (sessionsError) {
                    console.error("Error fetching sessions:", sessionsError);
                    return;
                }

                if (!sessions || sessions.length === 0) return;

                const sessionIds = sessions.map((session) => session.id);
                const { data: answersData, error: answersError } = await supabase
                    .from("user_answers")
                    .select("session_id, is_correct")
                    .in("session_id", sessionIds);

                if (answersError) {
                    console.error("Error fetching answer stats:", answersError);
                }

                const sessionAnswerStats: Record<string, { total: number; correct: number }> = {};
                (answersData || []).forEach((answer: Pick<UserAnswer, "session_id" | "is_correct">) => {
                    if (!sessionAnswerStats[answer.session_id]) {
                        sessionAnswerStats[answer.session_id] = { total: 0, correct: 0 };
                    }
                    if (answer.is_correct !== null) {
                        sessionAnswerStats[answer.session_id].total += 1;
                        if (answer.is_correct) {
                            sessionAnswerStats[answer.session_id].correct += 1;
                        }
                    }
                });

                // Get exam details for calculating scores
                const examIds = [...new Set(sessions.map(s => s.exam_id))];
                const { data: examsData } = await supabase
                    .from("exams")
                    .select("id, total_questions")
                    .in("id", examIds);

                const examsMap = new Map(examsData?.map(e => [e.id, e.total_questions]) || []);

                // Calculate best score per exam
                const statuses: Record<string, { best_score: number | null; attempts: number; last_attempt: string; completed: boolean; in_progress: boolean }> = {};

                sessions.forEach((session) => {
                    const examId = session.exam_id;
                    const totalQuestions = examsMap.get(examId) || 1;
                    const isCompleted = session.completed_at !== null;
                    const answerStats = sessionAnswerStats[session.id];
                    const rawScore = session.score ?? 0;
                    const score = answerStats && answerStats.total > 0
                        ? Math.round((answerStats.correct / answerStats.total) * 100)
                        : Math.round((rawScore / totalQuestions) * 100);

                    if (!statuses[examId]) {
                        statuses[examId] = {
                            best_score: null,
                            attempts: 0,
                            last_attempt: session.completed_at || session.started_at,
                            completed: false,
                            in_progress: false,
                        };
                    }

                    statuses[examId].attempts++;
                    if (isCompleted) {
                        statuses[examId].completed = true;
                        if (statuses[examId].best_score === null || score > statuses[examId].best_score) {
                            statuses[examId].best_score = score;
                        }
                    }
                    const attemptTime = session.completed_at || session.started_at;
                    if (attemptTime && new Date(attemptTime) > new Date(statuses[examId].last_attempt)) {
                        statuses[examId].last_attempt = attemptTime;
                    }
                });

                // Check for in-progress exams
                const inProgressExamIds = new Set(
                    sessions
                        .filter(s => s.completed_at === null)
                        .map(s => s.exam_id)
                );

                // Update exams with status
                const updatedExams = initialExams.map(exam => {
                    const status = statuses[exam.id];
                    const inProgress = inProgressExamIds.has(exam.id);

                    return {
                        ...exam,
                        best_score: status?.best_score ?? null,
                        attempts_count: status?.attempts ?? 0,
                        last_attempt_at: status?.last_attempt ?? null,
                        is_completed: status?.completed ?? false,
                        is_in_progress: inProgress,
                    };
                });

                setExams(updatedExams);
            } catch (error) {
                console.error("Error fetching exam statuses:", error);
            }
        }

        fetchExamStatuses();

        // Subscribe to real-time updates
        if (user) {
            const channel = supabase
                .channel("exam_progress")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "user_sessions",
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => {
                        fetchExamStatuses();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user, supabase, initialExams]);

    // Get unique subjects
    const subjects = useMemo(() => {
        const uniqueSubjects = new Set(exams.map(e => e.subject).filter(Boolean));
        return Array.from(uniqueSubjects).sort();
    }, [exams]);

    // Filter and sort exams
    const filteredExams = useMemo(() => {
        let result = [...exams];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                e =>
                    e.title.toLowerCase().includes(query) ||
                    e.subject.toLowerCase().includes(query)
            );
        }

        // Subject filter
        if (subjectFilter !== "all") {
            result = result.filter(e => e.subject === subjectFilter);
        }

        // Status filter
        if (statusFilter === "completed") {
            result = result.filter(e => e.is_completed);
        } else if (statusFilter === "in_progress") {
            result = result.filter(e => e.is_in_progress);
        } else if (statusFilter === "not_started") {
            result = result.filter(e => !e.is_completed && !e.is_in_progress);
        }

        // Sort
        if (sortBy === "recent") {
            result.sort((a, b) => {
                const aTime = a.last_attempt_at ? new Date(a.last_attempt_at).getTime() : 0;
                const bTime = b.last_attempt_at ? new Date(b.last_attempt_at).getTime() : 0;
                return bTime - aTime;
            });
        } else if (sortBy === "title") {
            result.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === "score") {
            result.sort((a, b) => (b.best_score || 0) - (a.best_score || 0));
        }

        return result;
    }, [exams, searchQuery, subjectFilter, statusFilter, sortBy]);

    // Stats
    const stats = useMemo(() => {
        const completed = exams.filter(e => e.is_completed).length;
        const inProgress = exams.filter(e => e.is_in_progress).length;
        const attempted = exams.filter(e => e.best_score !== null).length;
        const total = exams.length;
        const avgScore = attempted > 0
            ? Math.round(exams.filter(e => e.best_score !== null).reduce((acc, e) => acc + (e.best_score || 0), 0) / attempted)
            : 0;

        return { completed, inProgress, attempted, total, avgScore };
    }, [exams]);

    const subjectOptions = [
        { value: "all", label: "All Subjects" },
        ...subjects.map(s => ({ value: s, label: s }))
    ];

    const statusOptions = [
        { value: "all", label: "All Status" },
        { value: "completed", label: "Completed" },
        { value: "in_progress", label: "In Progress" },
        { value: "not_started", label: "Not Started" },
    ];

    const sortOptions = [
        { value: "recent", label: "Most Recent" },
        { value: "title", label: "A-Z" },
        { value: "score", label: "Best Score" },
    ];

    return (
        <div className="px-3 py-6 md:px-6 md:py-8 pb-20">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
                        Exam Catalog
                    </h1>
                    <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
                        Choose an exam to practice
                    </p>
                </motion.div>

                {/* Stats Bar - Horizontal scroll on mobile */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 -mx-3 px-3 md:mx-0 md:px-0"
                >
                    <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:pb-0">
                        <Card className="bg-gradient-to-br from-emerald/5 to-transparent border-emerald/20 shrink-0 min-w-[140px] md:min-w-0">
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-emerald/10 shrink-0">
                                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-emerald" />
                                    </div>
                                    <div>
                                        <p className="text-lg md:text-2xl font-bold">{stats.completed}</p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground">Completed</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber/5 to-transparent border-amber/20 shrink-0 min-w-[140px] md:min-w-0">
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-amber/10 shrink-0">
                                        <Play className="h-4 w-4 md:h-5 md:w-5 text-amber" />
                                    </div>
                                    <div>
                                        <p className="text-lg md:text-2xl font-bold">{stats.inProgress}</p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground">In Progress</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-chart-2/5 to-transparent border-chart-2/20 shrink-0 min-w-[140px] md:min-w-0">
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-chart-2/10 shrink-0">
                                        <Target className="h-4 w-4 md:h-5 md:w-5 text-chart-2" />
                                    </div>
                                    <div>
                                        <p className="text-lg md:text-2xl font-bold">{stats.avgScore}%</p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground">Avg Score</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-chart-3/5 to-transparent border-chart-3/20 shrink-0 min-w-[140px] md:min-w-0">
                            <CardContent className="p-3 md:p-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-chart-3/10 shrink-0">
                                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-chart-3" />
                                    </div>
                                    <div>
                                        <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>

                {/* Search and Filters - Stack on mobile */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-6 space-y-3"
                >
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search exams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Filters - Horizontal scroll on mobile */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 md:mx-0 md:px-0 md:grid md:grid-cols-3">
                        <FilterDropdown
                            value={subjectFilter}
                            options={subjectOptions}
                            onChange={setSubjectFilter}
                        />
                        <FilterDropdown
                            value={statusFilter}
                            options={statusOptions}
                            onChange={setStatusFilter}
                        />
                        <FilterDropdown
                            value={sortBy}
                            options={sortOptions}
                            onChange={setSortBy}
                        />
                    </div>
                </motion.div>

                {/* Error State */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
                    >
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                        <div>
                            <p className="font-medium text-destructive">Connection Error</p>
                            <p className="text-muted-foreground">{error}</p>
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {!error && filteredExams.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-16 md:py-24 text-center"
                    >
                        <div className="mb-4 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-secondary">
                            <BookOpen className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No Exams Found</h3>
                        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                            {searchQuery || subjectFilter !== "all" || statusFilter !== "all"
                                ? "Try adjusting your search or filters."
                                : "No exams available yet."}
                        </p>
                    </motion.div>
                )}

                {/* Exam Grid */}
                {filteredExams.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredExams.map((exam, i) => (
                            <ExamCard key={exam.id} exam={exam} index={i} />
                        ))}
                    </div>
                )}

                {/* Results count */}
                {filteredExams.length > 0 && (
                    <p className="mt-6 text-sm text-muted-foreground text-center">
                        {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </div>
    );
}
