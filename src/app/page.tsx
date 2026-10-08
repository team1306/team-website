'use client'
import { useState, useEffect } from "react";
import { getUserInfo } from "./auth/getUserInfo/getUserInfo";
import { useRouter } from 'next/navigation'
import Navbar from "@/components/ui/navbar";


import Home from "./orders/page";
import Budget from "./budget/page";
import Admin from "./admin/page";
import Create from "./create/page";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

const EMPTY_USER: UserData = { id: "", name: "", role: "", profilePicture: "", slack_userid: "" };

export default function App() {
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState("/");
    const router = useRouter();

    async function loadUser() {
        try {
            const user = await getUserInfo();
            setCurrentUser(user);
        } catch (err) {
            console.error("Failed to load user:", err);
            if (err instanceof Error && err.message === "Not authenticated") {
                router.push("/login?notAuthed=true");
            } else {
                router.push("/login");
            }
        } finally {
            setUserLoading(false);
        }
    }

    useEffect(() => {
        loadUser();
    }, []);

    const user = currentUser ?? EMPTY_USER;

    function onCreate(){
        setCurrentPage('/create');
    }

    function onDiscard(){
        setCurrentPage('/');
    }

    return (
        <div>
            <Navbar user={user} setCurrentPage={setCurrentPage} />
            {currentPage === "/" && <Home onCreate={onCreate} currentUser={user} />}
            {currentPage === "/budget" && <Budget currentUser={user} />}
            {currentPage === "/admin" && <Admin currentUser={user} />}
            {currentPage === "/create" && <Create onDiscard={onDiscard} currentUser={user} />}
        </div>
    )
}