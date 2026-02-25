"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    AreaChart,
    Area,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { UserAnswer, UserSession } from "@/lib/supabase/types";
import {
    Target,
    CheckCircle2,
    TrendingUp,
    BookOpen,
    HelpCircle,
    Flame,
    Clock,
    Zap,
    ChevronRight,
    Play,
    RotateCcw,
    Lightbulb,
    GraduationCap,
    Trophy,
} from "lucide-react";
import { motion } from "framer-motion";

interface SessionWithExam extends UserSession {
    exam_title: string;
    total_questions: number;
    exam_subject: string;
    score_percentage: number;
}

interface ExamAttempt {
    exam_id: string;
    exam_title: string;
    subject: string;
    score: number;
    total_questions: number;
    completed_at: string;
    is_best: boolean;
}

interface ConfidenceInsights {
    confidentTotal: number;
    confidentCorrect: number;
    guessingTotal: number;
    guessingCorrect: number;
    unsureTotal: number;
}

interface SessionExamRow {
    id: string;
    title: string;
    subject: string;
    total_questions: number;
}

interface UserSessionRow {
    id: string;
    user_id: string;
    exam_id: string;
    score: number | null;
    started_at: string;
    completed_at: string | null;
    exams: SessionExamRow | SessionExamRow[] | null;
}

const PASSING_THRESHOLD = 70;

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<SessionWithExam[]>([]);
    const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
    const [streak, setStreak] = useState(0);
    const [confidenceInsights, setConfidenceInsights] = useState<ConfidenceInsights>({
        confidentTotal: 0,
        confidentCorrect: 0,
        guessingTotal: 0,
        guessingCorrect: 0,
        unsureTotal: 0,
    });

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            if (!user) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                // Fetch sessions with exam details
                const { data: userSessions, error: sessionsError } = await supabase
                    .from("user_sessions")
                    .select(`
                        id,
                        user_id,
                        exam_id,
                        score,
                        started_at,
                        completed_at,
                        exams (
                            id,
                            title,
                            subject,
                            total_questions
                        )
                    `)
                    .eq("user_id", user.id)
                    .not("completed_at", "is", null)
                    .order("completed_at", { ascending: false });

                if (sessionsError) {
                    console.error("Error fetching sessions:", sessionsError);
                }

                if (userSessions && userSessions.length > 0) {
                    const typedSessions = userSessions as UserSessionRow[];
                    const sessionIds = typedSessions.map((s) => s.id);
                    const { data: answersData, error: answersError } = await supabase
                        .from("user_answers")
                        .select("session_id, confidence_level, is_correct")
                        .in("session_id", sessionIds);

                    if (answersError) {
                        console.error("Error fetching answer analytics:", answersError);
                    }

                    const sessionAnswerStats: Record<string, { total: number; correct: number }> = {};
                    const insights: ConfidenceInsights = {
                        confidentTotal: 0,
                        confidentCorrect: 0,
                        guessingTotal: 0,
                        guessingCorrect: 0,
                        unsureTotal: 0,
                    };

                    (answersData || []).forEach((answer: Pick<UserAnswer, "session_id" | "confidence_level" | "is_correct">) => {
                        if (!sessionAnswerStats[answer.session_id]) {
                            sessionAnswerStats[answer.session_id] = { total: 0, correct: 0 };
                        }

                        if (answer.is_correct !== null) {
                            sessionAnswerStats[answer.session_id].total += 1;
                            if (answer.is_correct) {
                                sessionAnswerStats[answer.session_id].correct += 1;
                            }
                        }

                        if (answer.confidence_level === "confident") {
                            insights.confidentTotal += 1;
                            if (answer.is_correct) {
                                insights.confidentCorrect += 1;
                            }
                        } else if (answer.confidence_level === "guessing") {
                            insights.guessingTotal += 1;
                            if (answer.is_correct) {
                                insights.guessingCorrect += 1;
                            }
                        } else if (answer.confidence_level === "unsure") {
                            insights.unsureTotal += 1;
                        }
                    });

                    // Calculate streak
                    let currentStreak = 0;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const completedDates = new Set(
                        typedSessions
                            .map((s) => s.completed_at)
                            .filter((completedAt): completedAt is string => completedAt !== null)
                            .map((completedAt) => {
                                const d = new Date(completedAt);
                                d.setHours(0, 0, 0, 0);
                                return d.getTime();
                            })
                    );

                    const checkDate = new Date(today);
                    while (completedDates.has(checkDate.getTime())) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    }
                    if (isMounted) setStreak(currentStreak);

                    // Process sessions and find best scores per exam
                    const examScores: Record<string, ExamAttempt> = {};
                    const allSessions: SessionWithExam[] = [];

                    typedSessions.forEach((s) => {
                        const exam = Array.isArray(s.exams) ? s.exams[0] : s.exams;
                        if (!exam) return;

                        const answerStats = sessionAnswerStats[s.id];
                        const rawScore = s.score ?? 0;
                        const totalQuestions = exam.total_questions || 1;
                        const percentage = answerStats && answerStats.total > 0
                            ? Math.round((answerStats.correct / answerStats.total) * 100)
                            : Math.round((rawScore / totalQuestions) * 100);

                        if (!examScores[exam.id] || percentage > examScores[exam.id].score) {
                            examScores[exam.id] = {
                                exam_id: exam.id,
                                exam_title: exam.title,
                                subject: exam.subject,
                                score: percentage,
                                total_questions: totalQuestions,
                                completed_at: s.completed_at ?? s.started_at,
                                is_best: true,
                            };
                        } else if (percentage === examScores[exam.id].score) {
                            examScores[exam.id].is_best = true;
                        }

                        allSessions.push({
                            id: s.id,
                            user_id: s.user_id,
                            exam_id: s.exam_id,
                            score: s.score,
                            started_at: s.started_at,
                            completed_at: s.completed_at ?? s.started_at,
                            exam_title: exam.title,
                            total_questions: totalQuestions,
                            exam_subject: exam.subject,
                            score_percentage: percentage,
                        });
                    });

                    if (isMounted) {
                        setSessions(allSessions);
                        setExamAttempts(Object.values(examScores));
                        setConfidenceInsights(insights);
                    }
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [user, supabase]);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
                    <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!examAttempts.length) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <div className="mb-6 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald/20 to-chart-2/20">
                    <GraduationCap className="h-8 w-8 md:h-10 md:w-10 text-emerald" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">Welcome to ExitPrep!</h2>
                <p className="mt-2 max-w-md text-sm md:text-base text-muted-foreground">
                    Start your first exam to unlock your personalized dashboard with progress tracking and insights.
                </p>
                <Button
                    className="mt-8 gap-2 rounded-full bg-emerald text-emerald-foreground hover:bg-emerald/90 px-6 md:px-8"
                    onClick={() => router.push("/exams")}
                >
                    <Play className="h-4 w-4" />
                    Start Exam
                </Button>
            </div>
        );
    }

    // Calculate stats
    const avgScore = Math.round(examAttempts.reduce((acc, e) => acc + e.score, 0) / examAttempts.length);
    const pointsToPass = Math.max(0, PASSING_THRESHOLD - avgScore);
    const totalAnswered = sessions.reduce((acc, s) => acc + (s.total_questions || 0), 0);

    const progressData = examAttempts.map(e => ({
        exam: e.exam_title.length > 10 ? e.exam_title.slice(0, 8) + "..." : e.exam_title,
        score: e.score,
        date: new Date(e.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })).reverse();

    const confidentAccuracy = confidenceInsights.confidentTotal > 0
        ? Math.round((confidenceInsights.confidentCorrect / confidenceInsights.confidentTotal) * 100)
        : 0;
    const guessingAccuracy = confidenceInsights.guessingTotal > 0
        ? Math.round((confidenceInsights.guessingCorrect / confidenceInsights.guessingTotal) * 100)
        : 0;
    const confidentWrong = Math.max(0, confidenceInsights.confidentTotal - confidenceInsights.confidentCorrect);

    return (
        <div className="px-3 py-4 md:px-6 md:py-8 pb-20">
            <div className="mx-auto max-w-6xl">
                {/* Hero Section - Mobile optimized */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald/10 via-card to-card border border-border/50 p-4 md:p-6 lg:p-8">
                        <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 bg-emerald/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                        <div className="relative">
                            {/* Top row - streak and questions */}
                            <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
                                <Badge className="bg-emerald/10 text-emerald border-emerald/30 gap-1 text-xs md:text-sm">
                                    <Flame className="h-3 w-3" />
                                    {streak} day{streak !== 1 ? 's' : ''}
                                </Badge>
                                <span className="text-xs md:text-sm text-muted-foreground">
                                    {totalAnswered} questions
                                </span>
                            </div>

                            {/* Main score */}
                            <div className="mb-4 md:mb-6">
                                <h1 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">
                                    Readiness Score
                                </h1>
                                <div className="flex items-baseline gap-2 md:gap-3">
                                    <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-emerald">
                                        {avgScore}%
                                    </span>
                                    {pointsToPass > 0 ? (
                                        <span className="text-xs md:text-sm text-muted-foreground">
                                            {pointsToPass} pts to pass
                                        </span>
                                    ) : (
                                        <Badge className="bg-emerald text-emerald-foreground text-xs">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Ready!
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* CTA Button */}
                            <Button
                                className="w-full md:w-auto gap-2 rounded-full bg-emerald hover:bg-emerald/90 text-sm md:text-base py-2 md:py-6 h-auto"
                                onClick={() => router.push("/exams")}
                            >
                                <Play className="h-4 w-4" />
                                <span className="md:hidden">New Exam</span>
                                <span className="hidden md:inline">Start New Exam</span>
                            </Button>

                            {/* Progress bar */}
                            <div className="mt-4 md:mt-6">
                                <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground mb-1.5 md:mb-2">
                                    <span>0%</span>
                                    <span>Pass: {PASSING_THRESHOLD}%</span>
                                    <span>100%</span>
                                </div>
                                <div className="h-2 md:h-3 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, avgScore)}%` }}
                                        className="h-full bg-gradient-to-r from-emerald to-chart-2 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions - 2x2 grid on mobile */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <h2 className="text-sm md:text-base font-semibold mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-chart-3" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                        <Button
                            variant="outline"
                            className="h-auto py-2.5 md:py-3 px-2 md:px-4 flex flex-col items-center gap-1 rounded-lg md:rounded-xl border-emerald/30 hover:bg-emerald/5 hover:border-emerald/50"
                            onClick={() => router.push("/exams")}
                        >
                            <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-emerald" />
                            <span className="text-[10px] md:text-xs font-medium">Practice</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto py-2.5 md:py-3 px-2 md:px-4 flex flex-col items-center gap-1 rounded-lg md:rounded-xl border-amber/30 hover:bg-amber/5 hover:border-amber/50"
                            onClick={() => sessions[0] && router.push(`/exam/${sessions[0].exam_id}/review`)}
                        >
                            <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-amber" />
                            <span className="text-[10px] md:text-xs font-medium">Review</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto py-2.5 md:py-3 px-2 md:px-4 flex flex-col items-center gap-1 rounded-lg md:rounded-xl border-chart-2/30 hover:bg-chart-2/5 hover:border-chart-2/50"
                            onClick={() => router.push("/exams")}
                        >
                            <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-chart-2" />
                            <span className="text-[10px] md:text-xs font-medium">Exams</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto py-2.5 md:py-3 px-2 md:px-4 flex flex-col items-center gap-1 rounded-lg md:rounded-xl border-chart-4/30 hover:bg-chart-4/5 hover:border-chart-4/50"
                            onClick={() => sessions[0] && router.push(`/exam/${sessions[0].exam_id}/review`)}
                        >
                            <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-chart-4" />
                            <span className="text-[10px] md:text-xs font-medium">Learn</span>
                        </Button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-6"
                >
                    <h2 className="text-sm md:text-base font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald" />
                        Confidence Insights
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Confident Accuracy</p>
                                <p className="text-2xl font-bold text-emerald mt-1">{confidentAccuracy}%</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    {confidenceInsights.confidentCorrect}/{confidenceInsights.confidentTotal} correct
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Guessing Accuracy</p>
                                <p className="text-2xl font-bold text-amber mt-1">{guessingAccuracy}%</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    {confidenceInsights.guessingCorrect}/{confidenceInsights.guessingTotal} correct
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Overconfidence Signals</p>
                                <p className="text-2xl font-bold mt-1">{confidentWrong}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Confident but wrong answers
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>

                {/* Main Grid - Stack on mobile */}
                <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                    {/* Exam Performance */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="h-full">
                            <CardHeader className="pb-2 md:pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                                    <Target className="h-4 w-4 text-emerald" />
                                    Your Exams
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 md:space-y-4 max-h-[300px] overflow-y-auto">
                                    {examAttempts.slice(0, 5).map((exam) => (
                                        <div key={exam.exam_id} className="space-y-1.5 md:space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs md:text-sm font-medium truncate pr-2">{exam.exam_title}</span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {exam.is_best && (
                                                        <Trophy className="h-3 w-3 text-amber" />
                                                    )}
                                                    <span className={`text-xs md:text-sm font-semibold ${exam.score >= 70 ? "text-emerald" :
                                                        exam.score >= 50 ? "text-amber" :
                                                            "text-red-500"
                                                        }`}>
                                                        {exam.score}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${exam.score >= 70 ? "bg-emerald" :
                                                        exam.score >= 50 ? "bg-amber" :
                                                            "bg-red-500"
                                                        }`}
                                                    style={{ width: `${exam.score}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Progress Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Card className="h-full">
                            <CardHeader className="pb-2 md:pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                                    <TrendingUp className="h-4 w-4 text-chart-2" />
                                    Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {progressData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <AreaChart data={progressData}>
                                            <defs>
                                                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                                tickLine={false}
                                                tickFormatter={(v) => `${v}%`}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{
                                                    background: "hsl(var(--card))",
                                                    border: "1px solid hsl(var(--border))",
                                                    borderRadius: "8px",
                                                }}
                                                formatter={(value) => [`${value}%`, "Score"]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#22c55e"
                                                strokeWidth={2}
                                                fill="url(#scoreGradient)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs md:text-sm">
                                        Complete more exams to see progress
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Recent Exams Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2"
                    >
                        <Card>
                            <CardHeader className="pb-2 md:pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    All Attempts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs md:text-sm">
                                        <thead>
                                            <tr className="border-b border-border/50 text-left text-muted-foreground">
                                                <th className="pb-2 md:pb-3 font-medium">Exam</th>
                                                <th className="pb-2 md:pb-3 font-medium hidden md:table-cell">Subject</th>
                                                <th className="pb-2 md:pb-3 font-medium">Date</th>
                                                <th className="pb-2 md:pb-3 font-medium">Score</th>
                                                <th className="pb-2 md:pb-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {sessions.slice(0, 8).map((session) => {
                                                const score = session.score_percentage;

                                                return (
                                                    <tr key={session.id} className="group">
                                                        <td className="py-2 md:py-3 font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{session.exam_title}</td>
                                                        <td className="py-2 md:py-3 hidden md:table-cell">
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {session.exam_subject}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-2 md:py-3 text-muted-foreground">
                                                            {session.completed_at ? new Date(session.completed_at).toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                            }) : "-"}
                                                        </td>
                                                        <td className="py-2 md:py-3">
                                                            <span className={`font-semibold ${score >= 70 ? "text-emerald" :
                                                                score >= 50 ? "text-amber" :
                                                                    "text-red-500"
                                                                }`}>
                                                                {score}%
                                                            </span>
                                                        </td>
                                                        <td className="py-2 md:py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 md:h-8 px-1 md:px-2"
                                                                onClick={() => router.push(`/exam/${session.exam_id}/review`)}
                                                            >
                                                                <span className="hidden md:inline">Review</span>
                                                                <ChevronRight className="h-3 w-3 md:hidden" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
