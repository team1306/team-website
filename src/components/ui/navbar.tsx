'use client'

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { LayoutDashboard,LogOut,ShieldCheck,WalletCards } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

interface NavbarProps {
    user: UserData;
    currentPage: string;
    setCurrentPage: (page: string) => void;
}

const roleLabels: Record<string, string> = {
    teamAdministrator: "Team administrator",
    programDirector: "Program director",
    president: "President",
    treasurer: "Treasurer",
    mentorLead: "Mentor lead",
    mentor: "Mentor",
    studentLead: "Student lead",
    student: "Student",
};

export default function Navbar({ user, currentPage, setCurrentPage }: NavbarProps) {
    const router = useRouter();
    const supabase = createClient();
    const [signingOut, setSigningOut] = useState(false);

    const canManageTeam = ["president", "programDirector", "teamAdministrator"].includes(user.role);

    function navigate(page: string) {
        setCurrentPage(page);
    }

    async function signOut() {
        setSigningOut(true);
        await supabase.auth.signOut();
        router.push("/login");
    }

    const initials = user.name
        ? user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
        : "TB";

    return (
        <header className="border-b bg-card/50">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-6 px-4 py-4 md:px-8">
                <div className="flex shrink-0 items-center gap-3">
                    <Image src="/badgerbots.svg" alt="Badgerbots" width={48} height={48} />
                    <div className="font-mono text-sm font-semibold leading-relaxed text-muted-foreground">Purchasing app</div>
                </div>
                <nav className="order-3 flex w-full flex-wrap gap-1 md:order-none md:w-auto" aria-label="Main navigation">
                    {[{path:"/",label:"Purchases",Icon:LayoutDashboard},{path:"/budget",label:"Budget",Icon:WalletCards},...(canManageTeam ? [{path:"/admin",label:"Team access",Icon:ShieldCheck}] : [])].map(({path,label,Icon}) => (
                        <Button key={path} variant={currentPage === path ? "secondary" : "ghost"} aria-current={currentPage === path ? "page" : undefined} onClick={() => navigate(path)}><Icon data-icon="inline-start" />{label}</Button>
                    ))}
                </nav>
                <div className="ml-auto flex min-w-0 items-center gap-3">
                    <div className="hidden text-right text-sm lg:block"><p className="font-medium">{user.name || "Loading account…"}</p><p className="text-xs text-muted-foreground">{roleLabels[user.role] || ""}</p></div>
                    <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium" aria-hidden="true">{initials}</span>
                    <Button variant="ghost" size="icon" onClick={signOut} disabled={signingOut} aria-busy={signingOut} aria-label="Sign out">{signingOut ? <Spinner aria-hidden="true" /> : <LogOut />}</Button>
                </div>
            </div>
        </header>
    );
}
