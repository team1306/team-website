'use client'
import Image from "next/image";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import { useSearchParams } from 'next/navigation'
import { toast } from "@/components/ui/toast"
import { useEffect, useRef, useState, Suspense } from "react";

function LoginContent() {
    const searchParams = useSearchParams();
    const notAuthed = searchParams.get("notAuthed") === "true";
    const supabase = createClient();
    const sent = useRef(false);
    const [guestSignInPending, setGuestSignInPending] = useState(false);

    useEffect(() => {
        if (notAuthed && !sent.current) {
            toast.add({
                type: "warning",
                description: "Please sign in to continue",
            })
            sent.current = true;
        }
    }, [notAuthed]);

    async function signInWithSlack() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "custom:slack",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) console.error(error.message);
    }

    async function signInAsGuest() {
        setGuestSignInPending(true);
        try {
            const { error } = await supabase.auth.signInAnonymously({
                options: {
                    data: { name: "Guest" },
                },
            });

            if (error) {
                toast.add({
                    type: "warning",
                    description: `Could not start a guest session: ${error.message}`,
                });
                setGuestSignInPending(false);
                return;
            }

            window.location.assign("/");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setGuestSignInPending(false);
            toast.add({
                type: "warning",
                description: `Could not start a guest session: ${message}`,
            });
        }
    }

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <div className="bg-red-900 w-full h-16 flex items-center px-4">
                <Image src="/badgerbots.svg" alt="Badgerbots logo" width={55} height={55} className="cursor-pointer" />
                <h1 className="text-zinc-100 text-2xl font-title font-bold ml-4">Purchasing App</h1>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <Card className="w-96 p-3 bg-red-900">
                    <CardTitle className="text-center text-zinc-100 text-4xl font-jetbrains font-bold mt-2 mb-2">Welcome</CardTitle>
                    <Button onClick={signInWithSlack} className="cursor-pointer w-full text-xl font-jetbrains font-bold text-zinc-100 h-fit p-1 bg-zinc-900 hover:bg-zinc-950">
                        <Image className="mr-1" src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="" width={18} height={18} />
                        Login with Slack
                    </Button>
                    <div className="my-3 flex items-center gap-3 text-sm text-zinc-200" aria-hidden="true">
                        <span className="h-px flex-1 bg-zinc-500" />
                        <span>or</span>
                        <span className="h-px flex-1 bg-zinc-500" />
                    </div>
                    <Button
                        onClick={signInAsGuest}
                        disabled={guestSignInPending}
                        className="cursor-pointer w-full text-lg font-jetbrains font-bold text-zinc-100 h-fit p-1 bg-zinc-800 hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-70"
                    >
                        {guestSignInPending ? "Starting guest session…" : "Continue as guest"}
                    </Button>
                </Card>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    );
}
