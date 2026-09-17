'use client'
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserInfo } from "../auth/getUserInfo/getUserInfo";
import Navbar from "@/components/ui/navbar";
import { Card, CardTitle } from "@/components/ui/card";
import User from "./user";
import { toast } from "@/components/ui/toast";

export default function Page() {
    interface UserData {
        id: string;
        name: string;
        role: string;
        profilePicture: string;
        slack_userid: string;
    }

    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const router = useRouter();
    const [users, setUsers] = useState<UserData[] | null>(null);
    const roles = [
        "teamAdministrator",
        "programDirector",
        "president",
        "treasurer",
        "mentorLead",
        "mentor",
        "studentLead",
        "student",
    ];

    async function loadUsers() {
        const res = await fetch('/api/admin/getUsers', { cache: 'no-store' });
        if (!res.ok) {
            console.error('Failed to load users:', res.status);
            toast.add({
                title: "Failed to load users",
            });
            setUsers([]);
            return;
        }
        const data: UserData[] = await res.json();

        const sorted = [...data].sort(
            (a, b) => roles.indexOf(a.role) - roles.indexOf(b.role)
        );

        setUsers(sorted);
    }

    async function loadUser() {
        try {
            const user = await getUserInfo();
            setCurrentUser(user);
        } catch (err) {
            console.error("Failed to load user:", err);
            if (err instanceof Error && err.message === "Not authenticated") {
                router.push("/login?notAuthed=true");
            }
            else {
                router.push("/login");
            }
        } finally {
            setUserLoading(false);
        }
    }

    useEffect(() => {
        loadUser();
        loadUsers();
    }, []);

    function setRole(newRole: string) {
        setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
    }

    return (
        <div>
            <Navbar user={currentUser ?? { id: "", name: "", role: "", profilePicture: "" }} updateUserRole={setRole} />
            <Card className="bg-mist-600 p-0 m-3">
                <div className="bg-mist-800 p-2">
                    <CardTitle className="text-zinc-100 text-2xl font-bold">Manage My Team</CardTitle>
                </div>
                <div className="p-2 pt-0 flex flex-col gap-2">
                    {users?.map((user) => (
                        <User key={user.id} id={user.id} name={user.name} role={user.role} profilePicture={user.profilePicture} onRoleGranted={loadUsers}/>
                    ))}
                </div>
            </Card>
        </div>
    )
}