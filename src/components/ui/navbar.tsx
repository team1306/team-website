'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, ShieldCheck, WalletCards } from "lucide-react";
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
        <header className="app-topbar simple-topbar">
            <div className="topnav-brand">
                <Image src="/badgerbots.svg" alt="Badgerbots" width={46} height={46} />
                <div>
                    <strong>Purchasing</strong>
                    <span>Team 1306</span>
                </div>
            </div>

            <nav className="topnav-links" aria-label="Main navigation">
                <button className={`topnav-link ${currentPage === "/" || currentPage === "/create" ? "is-active" : ""}`} onClick={() => navigate("/")}>
                    <LayoutDashboard size={16} />
                    Purchases
                </button>
                <button className={`topnav-link ${currentPage === "/budget" ? "is-active" : ""}`} onClick={() => navigate("/budget")}>
                    <WalletCards size={16} />
                    Budget
                </button>
                {canManageTeam && (
                    <button className={`topnav-link ${currentPage === "/admin" ? "is-active" : ""}`} onClick={() => navigate("/admin")}>
                        <ShieldCheck size={16} />
                        Team access
                    </button>
                )}
            </nav>

            <div className="topnav-user">
                <div className="topnav-user-info">
                    <strong>{user.name || "Test user"}</strong>
                    <span>{roleLabels[user.role] || "Team member"}</span>
                </div>
                {user.profilePicture ? (
                    <Image className="topnav-avatar" src={user.profilePicture} alt="" width={34} height={34} />
                ) : (
                    <span className="topnav-avatar topnav-initials" aria-hidden="true">{initials}</span>
                )}
                <button className="topnav-signout" onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out">
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}
