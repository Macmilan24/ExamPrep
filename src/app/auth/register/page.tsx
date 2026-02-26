"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const { data, error: signUpError } = await signUp(email, password, name);

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else if (data?.session) {
            router.refresh();
            router.push("/dashboard");
        } else {
            // No session means email confirmation is likely required
            setSuccessMessage("Registration successful! Please check your email to confirm your account.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
            >
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald text-emerald-foreground">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Start your exam preparation journey
                    </p>
                </div>

                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <form onSubmit={handleRegister} className="space-y-4">
                            {successMessage && (
                                <div className="p-3 text-sm rounded-md bg-emerald/10 text-emerald">
                                    {successMessage}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Abebe Bikila"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="you@university.edu.et"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full gap-2 bg-emerald text-emerald-foreground hover:bg-emerald/90"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                        href="/auth/login"
                        className="font-medium text-emerald hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
