'use client'

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import { toast } from "@/components/ui/toast";

function LoginContent() {
    const searchParams = useSearchParams();
    const notAuthed = searchParams.get("notAuthed") === "true";
    const supabase = createClient();
    const [sent, setSent] = useState(false);
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        if (notAuthed && !sent) {
            toast.add({ type: "warning", description: "Please sign in to continue" });
            setSent(true);
        }
    }, [notAuthed, sent]);

    /* TEMPORARY LOCAL TEST LOGIN - REMOVE BEFORE PUSH. */
    async function signInForTesting() {
        setSigningIn(true);
        const { error } = await supabase.auth.signInAnonymously({
            options: { data: { name: "Local Test User" } },
        });

        if (error) {
            console.error(error.message);
            toast.add({ type: "error", description: `Local test login failed: ${error.message}` });
            setSigningIn(false);
            return;
        }

        window.location.href = "/";
    }

    return (
        <main className="login-shell">
            <section className="login-panel">
                <div className="login-card">
                    <div className="login-brand">
                        <Image src="/badgerbots.svg" alt="Badgerbots" width={64} height={64} />
                        <span>TEAM 1306</span>
                    </div>
                    <div className="login-card-heading">
                        <h2>Welcome back</h2>
                        <p>Sign in to manage team purchases.</p>
                    </div>

                    <Button onClick={signInForTesting} disabled={signingIn} className="login-primary-button">
                        <LockKeyhole size={16} />
                        {signingIn ? "Signing you in..." : "Continue as test user"}
                        {!signingIn && <ArrowRight size={16} className="ml-auto" />}
                    </Button>

                </div>
            </section>
        </main>
    );
}

export default function Page() {
    return <Suspense><LoginContent /></Suspense>;
}
