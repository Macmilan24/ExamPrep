"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Brain,
  Target,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";

import type { Easing } from "framer-motion";

const ease: Easing = [0.25, 0.1, 0.25, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease },
  }),
};

const features = [
  {
    icon: Brain,
    title: "AI-Powered Questions",
    description:
      "Every question is extracted from real Ethiopian university mock exams and enriched with deep AI explanations.",
    color: "text-emerald",
  },
  {
    icon: Target,
    title: "Zen Mode Exam",
    description:
      "Full-screen, distraction-free exam interface with a 2.5-hour timer, question map, and cognitive tools.",
    color: "text-chart-2",
  },
  {
    icon: BarChart3,
    title: "Scientific Analytics",
    description:
      "Radar charts, confidence tracking, and actionable insights that tell you exactly what to study next.",
    color: "text-chart-4",
  },
  {
    icon: Zap,
    title: "Instant Explanations",
    description:
      "Zero loading time. Every question has a pre-generated breakdown of why each option is right or wrong.",
    color: "text-chart-3",
  },
  {
    icon: Shield,
    title: "Confidence Tracker",
    description:
      "Rate your certainty on every question. Discover where you're guessing right and confident but wrong.",
    color: "text-chart-5",
  },
  {
    icon: Sparkles,
    title: "100% Free",
    description:
      "No subscriptions, no hidden fees. Built with love for Ethiopian university students.",
    color: "text-emerald",
  },
];

const stats = [
  { value: "100+", label: "Questions per Exam" },
  { value: "10", label: "CS Topics Covered" },
  { value: "150", label: "Minutes per Exam" },
  { value: "∞", label: "Free Attempts" },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-[50%] h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-emerald/5 blur-3xl" />
        <div className="absolute top-[60%] -left-[10%] h-[600px] w-[600px] rounded-full bg-chart-2/5 blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald" />
              AI-Powered Practice Platform
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
          >
            Ace Your{" "}
            <span className="text-gradient">Exit Exam</span>
            <br />
            <span className="text-muted-foreground">with Confidence</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
          >
            The most advanced practice platform for Ethiopian University Computer Science students.
            Real exam questions, instant AI explanations, and scientific analytics — completely free.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
          >
            <Link href="/exams">
              <Button
                size="lg"
                className="h-12 gap-2 rounded-full bg-emerald px-8 text-base font-semibold text-emerald-foreground shadow-lg shadow-emerald/20 hover:bg-emerald/90 hover:shadow-xl hover:shadow-emerald/25 transition-all"
              >
                Start Practicing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-8 text-base"
              >
                Learn More
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-border/50 bg-card/50">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
            >
              <div className="text-3xl font-bold tracking-tight text-gradient md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need to{" "}
              <span className="text-gradient">Succeed</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Built with cognitive science principles and powered by AI to give you the most effective study experience.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="group h-full border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-emerald/30 hover:shadow-lg hover:shadow-emerald/5">
                  <CardContent className="p-6">
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary ${feature.color}`}
                    >
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative border-t border-border/50 bg-card/30 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              How It Works
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                icon: BookOpen,
                title: "Choose Your Exam",
                desc: "Browse our catalog of AI-generated exams covering all Computer Science exit exam topics.",
              },
              {
                step: "02",
                icon: Clock,
                title: "Enter Zen Mode",
                desc: "Take a timed, full-screen exam with cognitive tools like strike-through and confidence tracking.",
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: "Review & Learn",
                desc: "Get instant, detailed AI explanations for every question. Understand exactly why you got it right or wrong.",
              },
              {
                step: "04",
                icon: BarChart3,
                title: "Track Progress",
                desc: "Your analytics dashboard reveals your strengths, weaknesses, and where your confidence doesn't match reality.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="flex gap-6 items-start"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald/10 text-emerald font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-20 md:py-28">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <GraduationCap className="mx-auto mb-6 h-12 w-12 text-emerald" />
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Start?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of Ethiopian university students preparing smarter, not harder.
          </p>
          <Link href="/exams">
            <Button
              size="lg"
              className="mt-8 h-12 gap-2 rounded-full bg-emerald px-8 text-base font-semibold text-emerald-foreground shadow-lg shadow-emerald/20 hover:bg-emerald/90 transition-all"
            >
              Browse Exams
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald" />
            <span>ExitPrep</span>
          </div>
          <p>Built with ❤️ for Ethiopian students</p>
        </div>
      </footer>
    </div>
  );
}

