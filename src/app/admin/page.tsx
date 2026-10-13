'use client'
import { Card, CardTitle } from "@/components/ui/card";
import User from "./user";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

interface AdminPage {
    currentUser: UserData;
    users: UserData[];
    loadUsers: () => void;
}

export default function Admin({ currentUser, users, loadUsers }: AdminPage) {

    return (
        <div>
            <Card className="bg-mist-600 p-0 m-3">
                <div className="bg-mist-800 p-2">
                    <CardTitle className="text-zinc-100 text-2xl font-bold">Manage My Team</CardTitle>
                </div>
                <div className="p-2 pt-0 flex flex-col gap-2">
                    {users?.map((user) => (
                        <User key={user.id} id={user.id} name={user.name} role={user.role} profilePicture={user.profilePicture} onRoleGranted={loadUsers} />
                    ))}
                </div>
            </Card>
        </div>
    )
}