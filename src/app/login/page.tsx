'use client'

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { ArrowRight,LockKeyhole } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense,useEffect,useRef,useState } from "react";
import { createClient } from "../../../utils/supabase/client";

function LoginContent() {
    const searchParams = useSearchParams();
    const notAuthed = searchParams.get("notAuthed") === "true";
    const supabase = createClient();
    const sent = useRef(false);
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        if (notAuthed && !sent.current) {
            toast.add({ type: "warning", description: "Please sign in to continue" });
            sent.current = true;
        }
    }, [notAuthed]);

    async function signIn(testUser = false) {
        if (signingIn) return;
        setSigningIn(true);
        try {
            const { error } = testUser && process.env.NODE_ENV === "development"
                ? await supabase.auth.signInAnonymously({ options: { data: { name: "Local Test User" } } })
                : await supabase.auth.signInWithOAuth({
                    provider: "custom:slack",
                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                });
            if (error) throw error;
            if (testUser) window.location.href = "/";
        } catch (error) {
            toast.add({ type: "error", description: error instanceof Error ? error.message : "Sign-in failed. Please try again." });
            setSigningIn(false);
        }
    }

    return (
        <main className="flex min-h-dvh items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardHeader className="gap-6">
                    <div className="flex items-center gap-4"><Image src="/badgerbots.svg" alt="Badgerbots" width={72} height={72} /><span className="font-mono text-sm font-semibold">1306<br />Purchasing app</span></div>
                    <div className="space-y-2"><CardTitle className="text-2xl">Welcome back</CardTitle><CardDescription>Sign in to manage your team’s purchase requests.</CardDescription></div>
                </CardHeader>
                <CardContent>
                    <Button size="lg" onClick={() => signIn()} disabled={signingIn} aria-busy={signingIn} className="w-full">{signingIn ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <LockKeyhole data-icon="inline-start" />}{signingIn ? "Signing you in…" : "Continue with Slack"}{!signingIn && <ArrowRight data-icon="inline-end" className="ml-auto" />}</Button>
                    {process.env.NODE_ENV === "development" && <Button variant="outline" className="mt-3 w-full" disabled={signingIn} onClick={() => signIn(true)}>Continue as test user</Button>}
                    <p className="mt-4 text-center text-xs text-muted-foreground">Team 1306 · BadgerBOTS</p>
                </CardContent>
            </Card>
        </main>
    );
}

export default function Page() {
    return <Suspense><LoginContent /></Suspense>;
}
