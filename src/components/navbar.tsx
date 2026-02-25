"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, BookOpen, LogIn, LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";

const navLinks = [
    { href: "/exams", label: "Exams", icon: BookOpen },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, signOut } = useAuth();

    if (pathname.startsWith("/exam/") && !pathname.includes("/review")) {
        return null;
    }

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="sticky top-0 z-50 w-full glass border-b border-border/50"
        >
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald text-emerald-foreground transition-transform group-hover:scale-105">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold tracking-tight">
                        Exit<span className="text-gradient">Prep</span>
                    </span>
                </Link>

                <nav className="flex items-center gap-1">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href;
                        return (
                            <Link key={href} href={href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`gap-2 rounded-full px-3 sm:px-4 transition-all ${isActive
                                        ? "bg-secondary font-medium"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{label}</span>
                                </Button>
                            </Link>
                        );
                    })}

                    <div className="mx-2 h-5 w-px bg-border" />

                    <ThemeToggle />

                    {loading ? (
                        <div className="ml-1 h-9 w-20 animate-pulse rounded-full bg-muted" />
                    ) : user ? (
                        <div className="ml-1 flex items-center gap-1 sm:gap-2">
                            <div className="flex items-center gap-2 rounded-full bg-muted px-2 sm:px-3 py-1.5">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="hidden sm:inline text-sm text-muted-foreground">
                                    {user.email?.split("@")[0]}
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="gap-2 rounded-full px-2 sm:px-3 text-muted-foreground hover:text-foreground"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    ) : (
                        <Link href="/auth/login">
                            <Button
                                size="sm"
                                className="ml-1 gap-2 rounded-full px-3 sm:px-4 bg-emerald text-emerald-foreground hover:bg-emerald/90"
                            >
                                <LogIn className="h-4 w-4" />
                                <span className="hidden sm:inline">Sign in</span>
                            </Button>
                        </Link>
                    )}
                </nav>
            </div>
        </motion.header >
    );
}
