'use client'
import Image from "next/image";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "../../../utils/supabase/client";

export default function Page() {
    const supabase = createClient();

    async function signInWithSlack() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'slack_oidc',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) console.error(error.message);
    }

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <div className="bg-red-900 w-full h-16 flex items-center px-4">
                <Image src="/badgerbots.svg" alt="Badgerbots logo" width={55} height={55} className="cursor-pointer" />
                <h1 className="text-zinc-100 text-2xl font-bold ml-4">Purchasing App</h1>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <Card className="w-96 p-3 bg-red-900">
                    <CardTitle className="text-center text-zinc-100 text-4xl font-jetbrains font-bold mt-2 mb-2">Welcome Back</CardTitle>
                    <Button onClick={signInWithSlack} className="cursor-pointer w-full text-xl font-jetbrains font-bold text-zinc-100 h-fit p-1 bg-zinc-900 hover:bg-zinc-950"><Image className="mr-1" src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="" width={18} height={18} />Login with Slack</Button>
                </Card>
            </div>
        </div>
    );
}