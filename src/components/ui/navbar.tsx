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
import { usePathname } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "../../../utils/supabase/client";

type user = {
    user: UserData;
    updateUserRole: (newRole: string) => void;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
  }

export default function Navbar({ user, updateUserRole }: user) {
    const userName = user.name;
    const userRole = user.role;
    const userPicture = user.profilePicture;

    const roleBadge = () => {
        switch (userRole) {
            case "student":
                return (
                    <Badge className="rounded-md text-base bg-red-600">Student</Badge>
                )
            case "mentor":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Mentor</Badge>
                )
            case "mentorLead":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Lead Mentor</Badge>
                )
            case "treasurer":
                    return (
                        <Badge className="rounded-md text-base bg-emerald-600">Treasurer</Badge>
                    )
            case "studentLead":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Student Lead</Badge>
                )
            case "president":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">President</Badge>
                )
            case "programDirector":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">Program Director</Badge>
                )
            case "teamAdministrator":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">Team Adminstrator</Badge>
                )
        }
    }
    const router = useRouter();
    const supabase = createClient();

    const activeCSS = (url: String) => {
        if (url == usePathname()) {
            return ("rounded-md text-lg bg-red-400 hover:bg-red-400 mr-1 text-zinc-100");
        }
        else {
            return ("cursor-pointer rounded-md text-lg bg-red-600 hover:bg-red-400 mr-1 text-zinc-100");
        }
    }
    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error(error.message);
            return;
        }
        router.push("/login");
        router.refresh();
    }

    const defaultRole = userRole;

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
            <div className="ml-3 mt-1">
                <Button onClick={() => router.push('/')} className={activeCSS("/")}><Package /> Orders</Button>
                <Button onClick={() => router.push('/budget')} className={activeCSS("/budget")}><CircleDollarSign />Budget</Button>
                <Button disabled className="cursor-pointer rounded-md text-lg bg-red-600 hover:bg-red-400 mr-1 text-zinc-100"><Users />Meetings</Button>
                {(userRole == "president" || userRole == "programDirector" || userRole == "teamAdministrator") && (
                    <Button disabled className="cursor-pointer rounded-md text-lg bg-violet-600 hover:bg-violet-400 mr-1 text-zinc-100"><Crown /> Admin Panel</Button>
                )}
            </div>
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
                    <HoverCardContent className="rounded-md bg-red-400 w-64 justify-center">
                    <Select value={userRole} onValueChange={(value) => updateUserRole(String(value))}>
                    <SelectTrigger className="cursor-pointer w-fit min-w-32">
                        <SelectValue className="text-zinc-100" placeholder="Select a Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="studentLead">Student Lead</SelectItem>
                        <SelectItem value="mentor">Mentor</SelectItem>
                        <SelectItem value="mentorLead">Lead Mentor</SelectItem>
                        <SelectItem value="treasurer">Treasurer</SelectItem>
                        <SelectItem value="president">President</SelectItem>
                        <SelectItem value="programDirector">Program Director</SelectItem>
                        <SelectItem value="teamAdministrator">Team Administrator</SelectItem>
                    </SelectContent>
                </Select>
                        <Button onClick={() => handleSignOut()} className="cursor-pointer text-slate-100 bg-red-600 m-2 w-full rounded-sm hover:bg-red-700">Sign Out</Button>
                    </HoverCardContent>
                </HoverCard>
            </div>
        </div>
    )
}