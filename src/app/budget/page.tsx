'use client'
import Navbar from "@/components/ui/navbar"
import { useRouter } from 'next/navigation'
import { getUserInfo } from "../auth/getUserInfo/getUserInfo";
import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@base-ui/react";
import { Button } from "@/components/ui/button";
import { StickyNotePlus } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

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

    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [loading, setLoading] = useState(true);

    function setRole(newRole: string) {
        setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
    }

    async function loadUser() {
        try {
            const user = await getUserInfo();
            setCurrentUser(user);
        } catch (err) {
            console.error("Failed to load user:", err);
            router.push("/login");
        } finally {
            setUserLoading(false);
        }
    }

    async function fetchCategories() {
        try {
            const res = await fetch("/api/budget/getCategories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            const data: CategoryData[] = await res.json();
            setCategories(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUser();
        fetchCategories();
    }, []);

    function getCategories(phase: string): CategoryData[] {
        return categories.filter((category) => category.categoryPhase === phase);
    }

    const findTotalSpent = (): number => categories.reduce((sum, category) => sum + category.categorySpent, 0);

    const findTotalBudget = (): number => categories.reduce((sum, category) => sum + category.categoryBudget, 0);

    const totalBudget = findTotalBudget();
    const totalSpent = findTotalSpent();

    function budgetHue(): number {
        if (totalBudget <= 0) return 220;
        const percent = (totalSpent / totalBudget) * 100;
        if (percent >= 100) return 0;
        if (percent >= 75) return 20;
        if (percent >= 50) return 50;
        return 120;
    }

    function budgetFill(): React.CSSProperties {
        const percent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
        const remaining = 100 - percent;
        const hue = budgetHue();
        const filledColor = `hsl(${hue}, 70%, 40%)`;
        const unfilledColor = `hsl(${hue}, 70%, 20%)`;
        return {
            background: `linear-gradient(to right, ${filledColor} ${remaining}%, ${unfilledColor} ${remaining}%)`,
        };
    }

    return (
        <div>
            <Navbar user={currentUser ?? { id: "", name: "", role: "", profilePicture: "" }} updateUserRole={setRole} />
            <Card className="p-2 bg-mist-700 m-3 gap-0">
                <CardDescription className="text-mist-200 text-2xl mb-0 font-bold">Total Season Spending:</CardDescription>
                <div className="rounded-md mt-2 mb-2" style={budgetFill()}>
                    <h1 className="text-lg font-bold text-zinc-100 p-1">{formatMoney(totalSpent)}/{formatMoney(totalBudget)}</h1>
                </div>
            </Card>
            <Card className="p-2 bg-mist-700 m-3">
                <div className="flex">
                    <CardDescription className="text-mist-200 text-2xl font-bold mb-0">Budget Categories:</CardDescription>
                    <div className="ml-auto">
                        <NewCatagory onCreate={fetchCategories} />
                    </div>
                </div>
                <Card className="bg-mist-600 p-2 gap-2">
                    <CardTitle className="text-zinc-100 text-lg font-semi p-0">Offseason</CardTitle>
                    {getCategories("Offseason").map((category) => (
                        <BudgetCategory key={category.categoryID} {...category} />
                    ))}
                </Card>
                <Card className="bg-mist-600 p-2 gap-2">
                    <CardTitle className="text-zinc-100 text-lg font-semi p-0">Season</CardTitle>
                    {getCategories("Season").map((category) => (
                        <BudgetCategory key={category.categoryID} {...category} />
                    ))}
                </Card>
                <Card className="bg-mist-600 p-2 gap-2">
                    <CardTitle className="text-zinc-100 text-lg font-semi p-0">Champs</CardTitle>
                    {getCategories("Champs").map((category) => (
                        <BudgetCategory key={category.categoryID} {...category} />
                    ))}
                </Card>
            </Card>
        </div>
    )
}

function NewCatagory({ onCreate }: { onCreate: () => void }) {
    const [open, setOpen] = useState(false);

    const [name, setName] = useState("");
    const [phase, setPhase] = useState("Please select a phase");
    const [budget, setBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState("");
    const [enabled, setEnabled] = useState(false);

    const [valid, setValid] = useState(true);

    function handleBudgetChange(value: string) {
        setBudgetInput(value);

        if (value.trim() === "") {
            setBudget(0);
            return;
        }

        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            setBudget(parsed);
        }
    }


    async function createCategory() {
        if (valid) {
            const res = await fetch('/api/budget/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryName: name,
                    categoryPhase: phase,
                    categoryBudget: budget,
                    enabled: enabled,
                }),
            });

            onCreate();
            setOpen(false);
        }
    }

    return (
        <div>
            <Button onClick={() => setOpen(true)} className="cursor-pointer text-base w-fit p-3"><StickyNotePlus className="mr-1" />New Category</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                <DrawerContent className="bg-mist-600 border-0 text-zinc-100 rounded-tr-none rounded-br-none m-0 w-1/3">
                    <div className="bg-mist-700 w-full p-2">
                        <DrawerTitle className="text-zinc-100 text-xl font-jetbrains font-bold">New Budget Category</DrawerTitle>
                    </div>
                    <div className="p-2">
                        <Field>
                            <FieldLabel>Category Name: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={name} onValueChange={(value) => setName(value)} id="name" autoComplete="off" placeholder="New Budget Category Name" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Name: <span className="text-destructive">*</span></FieldLabel>
                            <Select value={phase} onValueChange={(value) => setPhase(value || "Please select a phase")} id="name">
                                <SelectTrigger className="cursor-pointer w-full">
                                    <SelectValue className="text-zinc-100" placeholder="Select a Phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Offseason">Offseason</SelectItem>
                                    <SelectItem value="Season">Season</SelectItem>
                                    <SelectItem value="Champs">Champs</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Budget: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={budgetInput} onValueChange={(value) => handleBudgetChange(value)} id="budget" autoComplete="off" placeholder="New Category Total Budget" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                        </Field>
                        <Field className="mt-3">
                            <div className="flex gap-1">
                                <FieldLabel>Category Enabled:</FieldLabel>
                                <Checkbox checked={enabled} onCheckedChange={setEnabled} />
                            </div>
                        </Field>
                    </div>
                    <Button onClick={() => createCategory()} className="cursor-pointer text-base w-full m-2 p-3">Create Category</Button>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

interface CategoryData {
    categoryID: string;
    categoryName: string;
    categoryPhase: string;
    categoryBudget: number;
    categorySpent: number;
    enabled: boolean;
}

function BudgetCategory({ categoryID, categoryName, categoryPhase, categoryBudget, categorySpent, enabled }: CategoryData) {

    const genCardCSS = () => {
        const baseCSS = "p-2 bg-mist-800 m-0";
        if (!enabled) {
            return (baseCSS + " opacity-75 grayscale");
        }
        else {
            return (baseCSS);
        }
    }

    function budgetHue(): number {
        if (categoryBudget <= 0) return 220;
        const percent = (categorySpent / categoryBudget) * 100;
        if (percent >= 100) return 0;
        if (percent >= 75) return 20;
        if (percent >= 50) return 50;
        return 120;
    }

    function budgetFill(): React.CSSProperties {
        const percent = categoryBudget > 0 ? Math.min((categorySpent / categoryBudget) * 100, 100) : 0;
        const remaining = 100 - percent;
        const hue = budgetHue();
        const filledColor = `hsl(${hue}, 70%, 40%)`;
        const unfilledColor = `hsl(${hue}, 70%, 20%)`;
        return {
            background: `linear-gradient(to right, ${filledColor} ${remaining}%, ${unfilledColor} ${remaining}%)`,
        };
    }

    return (
        <Card className={genCardCSS()}>
            <div className="flex items-center">
                <div className="gap-0">
                    <CardTitle className="text-zinc-100 text-xl m-0 font-bold">{categoryName}</CardTitle>
                </div>
                <div className="ml-4 p-2 rounded-md" style={budgetFill()}>
                    <h1 className="text-lg font-bold text-zinc-100">{formatMoney(categorySpent)}/{formatMoney(categoryBudget)}</h1>
                </div>
            </div>
        </Card>
    )
}