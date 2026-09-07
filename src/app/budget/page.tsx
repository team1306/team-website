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

    useEffect(() => {
        loadUser();
    }, []);

    return (
        <div>
            <Navbar user={currentUser ?? { id: "", name: "", role: "", profilePicture: "" }} updateUserRole={setRole} />
            <Card className="p-2 bg-mist-700 m-3">
                <CardDescription className="text-mist-200 text-base mb-0">Total Phase Spending:</CardDescription>
                <CardTitle className="text-mist-100 text-3xl font-bold mt-0">$2,000.00</CardTitle>
            </Card>
            <Card className="p-2 bg-mist-700 m-3">
                <CardDescription className="text-mist-200 text-base mb-0">Budget Categories:</CardDescription>
                <NewCatagory />
            </Card>
        </div>
    )
}

function NewCatagory() {
    const [open, setOpen] = useState(false);

    const [name, setName] = useState("");
    const [phase, setPhase] = useState("Please select a phase");
    const [budget, setBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState("");

    function handleBudgetChange(value: string) {
        setBudgetInput(value);
 
        if (value.trim() === "") {
            setBudget(0);
            return;
        }
    }

    return (
        <div>
            <Button onClick={() => setOpen(true)} className="cursor-pointer text-xl w-fit p-3"><StickyNotePlus className="mr-1 text-" />New Category</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                <DrawerContent className="bg-mist-600 border-0 text-zinc-100 rounded-tr-none rounded-br-none m-0 w-1/5">
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
                            <Select value={phase} onValueChange={(value) => setPhase(value||"Please select a phase")} id="name">
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
                            <Input value={budgetInput} onValueChange={(value) => setBudgetInput(value)} id="budget" autoComplete="off" placeholder="New Category Total Budget" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                        </Field>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}