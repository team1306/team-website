'use client'
import Image from "next/image";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation'

export default function Home() {
    const router = useRouter();

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <div className="bg-red-900 w-full h-16 flex items-center px-4">
                <Image
                    src="/badgerbots.svg"
                    alt="Battery image"
                    width={55}
                    height={55}
                    className="cursor-pointer"
                />
                <h1 className="text-zinc-100 text-2xl font-bold ml-4">
                    Purchasing App
                </h1>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <Card className="w-96 p-3 bg-red-900">
                    <CardTitle className="text-center text-zinc-100 text-4xl font-jetbrains font-bold mt-2 mb-2">Welcome Back</CardTitle>
                    <Button onClick={() => router.push('/')} className="cursor-pointer w-full text-xl font-jetbrains font-bold text-zinc-100 h-fit p-1 bg-zinc-900 hover:bg-zinc-950"> <Image className="mr-1" src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Logo" width={18} height={18}/>Login with Slack</Button>
                </Card>
            </div>
        </div>
    );
}
