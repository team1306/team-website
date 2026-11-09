'use client'
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

    return <div className="space-y-6"><div className="page-heading"><div><h1>Team access</h1><p>Manage team members and their purchasing permissions.</p></div></div><div className="space-y-3">{users.length ? users.map(user=><User key={user.id} id={user.id} name={user.name} role={user.role} profilePicture={user.profilePicture} onRoleGranted={loadUsers}/>) : <div className="purchase-empty-state">No team members to display.</div>}</div></div>;
}
