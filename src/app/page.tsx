'use client'
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getUserInfo } from "./auth/getUserInfo/getUserInfo";
import { useRouter } from 'next/navigation'
import Navbar from "@/components/ui/navbar";

import Home from "@/components/orders/page";
import Budget from "@/components/budget/page";
import Admin from "@/components/admin/page";
import Create from "@/components/create/page";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

export interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments: string;
    userRole: string;
    ordered?: boolean;
}

interface Approver {
    approved: boolean;
    approverID: string;
    approverName: string;
    requiredRole: string;
    approverPicture: string;
}

export interface PurchaseData {
    id: string;
    title: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: string;
    status: string;
    items: ItemData[];
    vendor: string;
    reason: string;
    approvers: Approver[];
    expidited: string;
}

interface CategoryData {
    categoryID: string;
    categoryName: string;
    categoryPhase: string;
    categoryBudget: number;
    categorySpent: number;
    enabled: boolean;
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

    const [purchases, setPurchases] = useState<PurchaseData[]>([]);
    async function loadPurchases(): Promise<PurchaseData[]> {
        const res = await fetch('/api/order/getOrders', { cache: 'no-store' });
        const data = await res.json();
        const loadedPurchases = data.parsed ?? [];
        setPurchases(loadedPurchases);
        return loadedPurchases;
    }

    const [users, setUsers] = useState<UserData[] | null>(null);
    async function loadUsers() {
        const authorized =
            currentUser?.role === "president" ||
            currentUser?.role === "programDirector" ||
            currentUser?.role === "teamAdministrator";

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

        if (!authorized) {
            return;
        }

        const res = await fetch('/api/admin/getUsers', { cache: 'no-store' });

        if (!res.ok) {
            setUsers([]);
            return;
        }

        const data: UserData[] = await res.json();

        const sorted = [...data].sort(
            (a, b) => roles.indexOf(a.role) - roles.indexOf(b.role)
        );

        setUsers(sorted);
    }

    const [categories, setCategories] = useState<CategoryData[]>([]);
    async function fetchCategories() {
        try {
            const res = await fetch("/api/budget/getCategories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            const data: CategoryData[] = await res.json();
            setCategories(data);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        // Startup loaders synchronize state with the authenticated user and APIs.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadUser();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCategories();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadPurchases();
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadUsers();
    }, [currentUser]);

    const user = currentUser ?? EMPTY_USER;

    function onCreate() {
        setCurrentPage('/create');
    }

    function onDiscard() {
        setCurrentPage('/');
    }

    function switchPage(newPage: string) {
        setCurrentPage(newPage);
    }

    return (
        <div className="app-frame">
            <Navbar user={user} currentPage={currentPage} setCurrentPage={switchPage} />
            <main className="app-main">
                {userLoading ? <div className="flex justify-center py-24"><Spinner className="size-6" /></div> : null}
                {!userLoading && currentPage === "/" && <Home onCreate={onCreate} currentUser={user} purchases={purchases} loadPurchases={loadPurchases} />}
                {!userLoading && currentPage === "/budget" && <Budget categories={categories} fetchCategories={fetchCategories} currentUser={user} />}
                {!userLoading && currentPage === "/admin" && <Admin currentUser={user} users={users ?? []} loadUsers={loadUsers} />}
                {currentPage === "/create" && <Create onDiscard={onDiscard} currentUser={user} />}
            </main>
        </div>
    )
}
