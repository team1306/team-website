'use client'
import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
} from "@/components/ui/drawer"
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@base-ui/react";
import { Button } from "@/components/ui/button";
import { StickyNotePlus, EllipsisVertical } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ExportPurchases } from "@/components/exportPurchases";

const ALLOWED_PHASES = ["Offseason", "Season", "Champs"];
const MANAGER_ROLES = ["treasurer", "president", "programDirector", "teamAdministrator"];

interface FieldErrors {
    name?: string;
    phase?: string;
    budget?: string;
    permission?: string;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

interface CategoryData {
    categoryID: string;
    categoryName: string;
    categoryPhase: string;
    categoryBudget: number;
    categorySpent: number;
    enabled: boolean;
}

function canManageBudget(user: UserData | null | undefined): boolean {
    return !!user && MANAGER_ROLES.includes(user.role);
}

function validateCategory(name: string, phase: string, budgetInput: string, currentUser: UserData | null): { errors: FieldErrors; budget: number } {
    const errors: FieldErrors = {};

    if (!canManageBudget(currentUser)) {
        errors.permission = "You do not have permission to manage budget categories";
    }

    if (name.trim() === "") {
        errors.name = "Category name is required";
    }

    if (!ALLOWED_PHASES.includes(phase)) {
        errors.phase = "Select a category phase";
    }

    const trimmedBudget = budgetInput.trim();
    const parsedBudget = Number(trimmedBudget);
    if (trimmedBudget === "" || !Number.isFinite(parsedBudget) || parsedBudget <= 0) {
        errors.budget = "Budget must be a number greater than 0";
    }

    return { errors, budget: parsedBudget };
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

export default function Budget({ currentUser }: { currentUser: UserData }){
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [loading, setLoading] = useState(true);

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
        fetchCategories();
    }, []);

    function getCategories(phase: string): CategoryData[] {
        return categories.filter((category) => category.categoryPhase === phase);
    }

    const findTotalSpent = (): number => categories.reduce((sum, category) => sum + category.categorySpent, 0);

    const findTotalBudget = (): number => categories.reduce((sum, category) => sum + category.categoryBudget, 0);

    const totalBudget = findTotalBudget();
    const totalSpent = findTotalSpent();
    const canManage = canManageBudget(currentUser);

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
            <Card className="p-2 bg-mist-700 m-3 gap-0">
                <CardDescription className="text-mist-200 text-2xl mb-0 font-bold">Total Season Spending:</CardDescription>
                <div className="rounded-md mt-2 mb-2" style={budgetFill()}>
                    <h1 className="text-lg font-bold text-zinc-100 p-1">{formatMoney(totalSpent)}/{formatMoney(totalBudget)}</h1>
                </div>
            </Card>
            <Card className="p-2 bg-mist-700 m-3">
                <div className="flex">
                    <CardDescription className="text-mist-200 text-2xl font-bold mb-0">Budget Categories:</CardDescription>
                    {canManage && (
                        <div className="ml-auto flex gap-2">
                            <ExportPurchases />
                            <NewCatagory currentUser={currentUser} onCreate={fetchCategories} />
                        </div>
                    )}
                </div>
                {loading && <p className="text-zinc-100">Loading...</p>}
                <Card className="bg-mist-600 p-2 gap-2">
                    <CardTitle className="text-zinc-100 text-lg font-semibold p-0">Offseason</CardTitle>
                    {getCategories("Offseason").map((category) => (
                        <BudgetCategory key={category.categoryID} {...category} currentUser={currentUser} onEdited={fetchCategories} />
                    ))}
                </Card>
                <Card className="bg-mist-600 p-2 gap-2">
                    <CardTitle className="text-zinc-100 text-lg font-semibold p-0">Season</CardTitle>
                    {getCategories("Season").map((category) => (
                        <BudgetCategory key={category.categoryID} {...category} currentUser={currentUser} onEdited={fetchCategories} />
                    ))}
                </Card>
                <Card className="bg-mist-600 p-2 gap-2">
                    <CardTitle className="text-zinc-100 text-lg font-semibold p-0">Champs</CardTitle>
                    {getCategories("Champs").map((category) => (
                        <BudgetCategory key={category.categoryID} {...category} currentUser={currentUser} onEdited={fetchCategories} />
                    ))}
                </Card>
            </Card>
        </div>
    )
}

function NewCatagory({ currentUser, onCreate }: { currentUser: UserData | null; onCreate: () => void }) {
    const [open, setOpen] = useState(false);

    const [name, setName] = useState("");
    const [phase, setPhase] = useState("Please select a phase");
    const [budgetInput, setBudgetInput] = useState("");
    const [enabled, setEnabled] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState("");

    function handleNameChange(value: string) {
        setName(value);
        setFieldErrors(prev => ({ ...prev, name: undefined }));
    }

    function handlePhaseChange(value: string) {
        setPhase(value || "Please select a phase");
        setFieldErrors(prev => ({ ...prev, phase: undefined }));
    }

    function handleBudgetChange(value: string) {
        setBudgetInput(value);
        setFieldErrors(prev => ({ ...prev, budget: undefined }));
    }

    async function createCategory() {
        setError("");

        const { errors, budget } = validateCategory(name, phase, budgetInput, currentUser);
        setFieldErrors(errors);

        if (errors.permission) {
            setError(errors.permission);
        }

        if (Object.keys(errors).length > 0) {
            return;
        }

        try {
            const res = await fetch('/api/budget/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryName: name.trim(),
                    categoryPhase: phase,
                    categoryBudget: budget,
                    enabled: enabled,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || "Failed to create category");
                return;
            }

            onCreate();
            setName("");
            setPhase("Please select a phase");
            setBudgetInput("");
            setEnabled(false);
            setOpen(false);
        } catch (err) {
            setError("Failed to create category");
        }
    }

    return (
        <div>
            <Button onClick={() => { setFieldErrors({}); setError(""); setOpen(true); }} className="cursor-pointer text-base w-fit p-3"><StickyNotePlus className="mr-1" />New Category</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                <DrawerContent className="bg-mist-600 border-0 text-zinc-100 rounded-tr-none rounded-br-none m-0 w-1/3">
                    <div className="bg-mist-700 w-full p-2">
                        <DrawerTitle className="text-zinc-100 text-xl font-jetbrains font-bold">New Budget Category</DrawerTitle>
                    </div>
                    <div className="p-2">
                        <Field>
                            <FieldLabel>Category Name: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={name} onValueChange={(value) => handleNameChange(value)} id="name" autoComplete="off" placeholder="New Budget Category Name" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                            {fieldErrors.name && <p className="text-destructive text-xs mt-1">{fieldErrors.name}</p>}
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Phase: <span className="text-destructive">*</span></FieldLabel>
                            <Select value={phase} onValueChange={(value) => handlePhaseChange(value || "")} id="phase">
                                <SelectTrigger className="cursor-pointer w-full">
                                    <SelectValue className="text-zinc-100" placeholder="Select a Phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Offseason">Offseason</SelectItem>
                                    <SelectItem value="Season">Season</SelectItem>
                                    <SelectItem value="Champs">Champs</SelectItem>
                                </SelectContent>
                            </Select>
                            {fieldErrors.phase && <p className="text-destructive text-xs mt-1">{fieldErrors.phase}</p>}
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Budget: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={budgetInput} onValueChange={(value) => handleBudgetChange(value)} id="budget" autoComplete="off" placeholder="New Category Total Budget" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                            {fieldErrors.budget && <p className="text-destructive text-xs mt-1">{fieldErrors.budget}</p>}
                        </Field>
                        <Field className="mt-3">
                            <div className="flex gap-1">
                                <FieldLabel>Category Enabled:</FieldLabel>
                                <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(Boolean(checked))} />
                            </div>
                        </Field>
                        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
                    </div>
                    <Button onClick={() => createCategory()} className="cursor-pointer text-base w-full m-2 p-3">Create Category</Button>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

function BudgetCategory({ categoryID, categoryName, categoryPhase, categoryBudget, categorySpent, enabled, currentUser, onEdited }: CategoryData & { currentUser: UserData | null; onEdited: () => void }) {

    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [name, setName] = useState(categoryName);
    const [phase, setPhase] = useState(categoryPhase);
    const [budgetInput, setBudgetInput] = useState(String(categoryBudget));
    const [newenabled, setEnabled] = useState(enabled);

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

    function handleNameChange(value: string) {
        setName(value);
        setFieldErrors(prev => ({ ...prev, name: undefined }));
    }

    function handlePhaseChange(value: string) {
        setPhase(value || "Please select a phase");
        setFieldErrors(prev => ({ ...prev, phase: undefined }));
    }

    function handleBudgetChange(value: string) {
        setBudgetInput(value);
        setFieldErrors(prev => ({ ...prev, budget: undefined }));
    }

    function resetFields() {
        setName(categoryName);
        setPhase(categoryPhase);
        setBudgetInput(String(categoryBudget));
        setEnabled(enabled);
        setError("");
        setFieldErrors({});
    }

    async function editCategory() {
        setError("");

        const { errors, budget } = validateCategory(name, phase, budgetInput, currentUser);
        setFieldErrors(errors);

        if (errors.permission) {
            setError(errors.permission);
        }

        if (Object.keys(errors).length > 0) {
            return;
        }

        const trimmedName = name.trim();
        const payload: Record<string, unknown> = { categoryID };

        if (trimmedName !== categoryName) payload.categoryName = trimmedName;
        if (phase !== categoryPhase) payload.categoryPhase = phase;
        if (budget !== categoryBudget) payload.categoryBudget = budget;
        if (newenabled !== enabled) payload.enabled = newenabled;

        if (Object.keys(payload).length === 1) {
            setOpen(false);
            return;
        }

        try {
            const res = await fetch('/api/budget/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Failed to save changes");
                return;
            }

            onEdited();
            setOpen(false);
        } catch (err) {
            setError("Failed to save changes");
        }
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
                {canManageBudget(currentUser) && (
                    <EllipsisVertical onClick={() => { resetFields(); setOpen(true); }} className="text-zinc-100 ml-auto size-5 self-start hover:text-zinc-200 cursor-pointer" />
                )}
            </div>
            <Drawer open={open} onOpenChange={(next) => { if (!next) resetFields(); setOpen(next); }} swipeDirection="right" modal={false}>
                <DrawerContent className="bg-mist-600 border-0 text-zinc-100 rounded-tr-none rounded-br-none m-0 w-1/3">
                    <div className="bg-mist-700 w-full p-2">
                        <DrawerTitle className="text-zinc-100 text-xl font-jetbrains font-bold">Edit Category</DrawerTitle>
                    </div>
                    <div className="p-2">
                        <Field>
                            <FieldLabel>Category Name: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={name} onValueChange={(value) => handleNameChange(value)} id="name" autoComplete="off" placeholder="New Budget Category Name" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                            {fieldErrors.name && <p className="text-destructive text-xs mt-1">{fieldErrors.name}</p>}
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Phase: <span className="text-destructive">*</span></FieldLabel>
                            <Select value={phase} onValueChange={(value) => handlePhaseChange(value || "")} id="phase">
                                <SelectTrigger className="cursor-pointer w-full">
                                    <SelectValue className="text-zinc-100" placeholder="Select a Phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Offseason">Offseason</SelectItem>
                                    <SelectItem value="Season">Season</SelectItem>
                                    <SelectItem value="Champs">Champs</SelectItem>
                                </SelectContent>
                            </Select>
                            {fieldErrors.phase && <p className="text-destructive text-xs mt-1">{fieldErrors.phase}</p>}
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Budget: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={budgetInput} onValueChange={(value) => handleBudgetChange(value)} id="budget" autoComplete="off" placeholder="New Category Total Budget" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                            {fieldErrors.budget && <p className="text-destructive text-xs mt-1">{fieldErrors.budget}</p>}
                        </Field>
                        <Field className="mt-3">
                            <div className="flex gap-1">
                                <FieldLabel>Category Enabled:</FieldLabel>
                                <Checkbox checked={newenabled} onCheckedChange={(checked) => setEnabled(Boolean(checked))} />
                            </div>
                        </Field>
                        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
                    </div>
                    <Button onClick={() => editCategory()} className="cursor-pointer text-base w-full m-2 p-3">Save</Button>
                </DrawerContent>
            </Drawer>
        </Card>
    )
}