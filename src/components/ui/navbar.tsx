'use client'
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Package, List, CircleDollarSign, Users, Crown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation'

type user = {
    userName: string;
    userRole: string;
    userPicture: string;
}

export default function Navbar({ userName, userRole, userPicture }: user) {
    const roleBadge = () => {
        switch (userRole) {
            case "student":
                return (
                    <Badge className="rounded-md text-base bg-red-600">Student</Badge>
                )
            case "mentor":
                return (
                    <Badge className="rounded-md text-base bg-red-600">Mentor</Badge>
                )
            case "studentLead":
                return (
                    <Badge className="rounded-md text-base bg-red-600">Student Lead</Badge>
                )
            case "president":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">President</Badge>
                )
            case "programDirector":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">Program Director</Badge>
                )
        }
    }
    const router = useRouter();

    return (
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
            <Button className="rounded-md text-lg bg-red-400 hover:bg-red-400 ml-5 mr-1 text-zinc-100 font-jetbrains"><Package /> Purchases</Button>
            <Button className="rounded-md text-lg bg-red-600 hover:bg-red-400 mr-1 text-zinc-100"><List />Categories</Button>
            <Button className="rounded-md text-lg bg-red-600 hover:bg-red-400 mr-1 text-zinc-100"><CircleDollarSign />Budget</Button>
            <Button className="rounded-md text-lg bg-red-600 hover:bg-red-400 mr-1 text-zinc-100"><Users />Meetings</Button>
            {(userRole == "president" || userRole == "programDirector") && (
                <Button className="rounded-md text-lg bg-violet-600 hover:bg-violet-400 mr-1 text-zinc-100"><Crown /> Admin Panel</Button>
            )}
            <div className="ml-auto flex items-center gap-3">
                <HoverCard>
                    <HoverCardTrigger>
                        <div className="flex items-center gap-2 cursor-pointer">
                            {roleBadge()}
                            <div className="text-right">
                                <h2 className="text-lg font-jetbrains font-bold text-white ml-1 mr-2 text-zinc-100">{userName}</h2>
                            </div>
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={userPicture} />
                                <AvatarFallback className="bg-red-400 text-zinc-100 items-center">EU</AvatarFallback>
                            </Avatar>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="rounded-md bg-red-400 w-64 flex justify-center">
                        <Button onClick={() => router.push('/login')} className="text-slate-100 bg-red-600 m-2 w-full rounded-sm hover:bg-red-700">Sign Out</Button>
                    </HoverCardContent>
                </HoverCard>
            </div>
        </div>
    )
}