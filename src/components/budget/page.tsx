'use client'
import { ExportPurchases } from "@/components/exportPurchases";
import { Button } from "@/components/ui/button";
import { Card,CardDescription,CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
Drawer,
DrawerClose,
DrawerContent,
DrawerTitle,
} from "@/components/ui/drawer";
import { Field,FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { EllipsisVertical,StickyNotePlus,X } from "lucide-react";
import { useState } from "react";

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

interface BudgetPage {
    currentUser: UserData;
    categories: CategoryData[];
    fetchCategories: () => void;
}

export default function Budget({ currentUser, categories, fetchCategories }: BudgetPage){


    function getCategories(phase: string): CategoryData[] {
        return categories.filter((category) => category.categoryPhase === phase);
    }

    const findTotalSpent = (): number => categories.reduce((sum, category) => sum + category.categorySpent, 0);

    const findTotalBudget = (): number => categories.reduce((sum, category) => sum + category.categoryBudget, 0);

    const totalBudget = findTotalBudget();
    const totalSpent = findTotalSpent();
    const canManage = canManageBudget(currentUser);

    const seasonProgress = totalBudget > 0 ? Math.min(Math.max((totalSpent / totalBudget) * 100, 0), 100) : 0;

    return <div className="space-y-6">
      <div className="page-heading"><div><h1>Budget</h1><p>Track spending across your team’s season.</p></div>{canManage && <div className="flex flex-wrap gap-2"><ExportPurchases /><NewCatagory currentUser={currentUser} onCreate={fetchCategories}/></div>}</div>
      <div className="grid gap-4 sm:grid-cols-3">{[{label:"Season budget",value:totalBudget},{label:"Total spent",value:totalSpent},{label:"Remaining",value:totalBudget-totalSpent}].map(stat=><Card key={stat.label} className="gap-2 p-6"><CardDescription>{stat.label}</CardDescription><p className="text-2xl font-semibold tabular-nums">{formatMoney(stat.value)}</p></Card>)}</div>
      {ALLOWED_PHASES.map(phase=><section key={phase} className="space-y-3"><h2 className="text-lg font-semibold">{phase}</h2>{getCategories(phase).length ? <div className="space-y-3">{getCategories(phase).map(category=><BudgetCategory key={category.categoryID} {...category} currentUser={currentUser} onEdited={fetchCategories}/>)}</div> : <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No budget categories for {phase.toLowerCase()} yet.</div>}</section>)}
    </div>;
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
            <Button onClick={() => { setFieldErrors({}); setError(""); setOpen(true); }} ><StickyNotePlus data-icon="inline-start" />New Category</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" >
                <DrawerContent className="[--drawer-content-width:min(100vw,28rem)] [--drawer-content-height:100dvh] rounded-r-none">
                    <div className="flex items-center justify-between border-b p-6">
                        <DrawerTitle className="text-lg font-semibold">New Budget Category</DrawerTitle><DrawerClose render={<Button variant="ghost" size="icon" aria-label="Close category form" />}><X /></DrawerClose>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-6">
                        <Field>
                            <FieldLabel>Category Name: <span className="text-destructive">*</span></FieldLabel>
                            <Input aria-label="Category name" value={name} onValueChange={(value) => handleNameChange(value)} id="name" autoComplete="off" placeholder="New Budget Category Name"  />
                            {fieldErrors.name && <p className="text-destructive text-xs mt-1">{fieldErrors.name}</p>}
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Phase: <span className="text-destructive">*</span></FieldLabel>
                            <Select value={phase} onValueChange={(value) => handlePhaseChange(value || "")} id="phase">
                                <SelectTrigger aria-label="Category phase" className="w-full">
                                    <SelectValue className="text-foreground" placeholder="Select a Phase" />
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
                            <Input aria-label="Category budget" value={budgetInput} onValueChange={(value) => handleBudgetChange(value)} id="budget" autoComplete="off" placeholder="New Category Total Budget"  />
                            {fieldErrors.budget && <p className="text-destructive text-xs mt-1">{fieldErrors.budget}</p>}
                        </Field>
                        <Field className="mt-3">
                            <div className="flex gap-1">
                                <FieldLabel>Category Enabled:</FieldLabel>
                                <Checkbox aria-label="Category enabled" checked={enabled} onCheckedChange={(checked) => setEnabled(Boolean(checked))} />
                            </div>
                        </Field>
                        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
                    </div>
                    <Button onClick={() => createCategory()} className="mx-6 mb-6">Create Category</Button>
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
        const baseCSS = "p-5";
        if (!enabled) {
            return (baseCSS + " opacity-75 grayscale");
        }
        else {
            return (baseCSS);
        }
    }

    const spentPercent = categoryBudget > 0 ? Math.min(Math.max((categorySpent / categoryBudget) * 100, 0), 100) : 0;

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
            <div className="flex flex-wrap items-center gap-4">
                <div className="gap-0">
                    <CardTitle className="text-base font-medium">{categoryName}</CardTitle>
                </div>
                <div className="budget-meter min-w-48 flex-1" role="progressbar" aria-label={`${categoryName} budget spent`} aria-valuenow={Math.round(spentPercent)} aria-valuemin={0} aria-valuemax={100}>
                    <span className="budget-meter-fill" style={{ width: `${spentPercent}%` }} />
                    <h1 className="text-sm font-medium">{formatMoney(categorySpent)}<span className="mx-2">/</span>{formatMoney(categoryBudget)}</h1>
                </div>
                {canManageBudget(currentUser) && (
                    <Button variant="ghost" size="icon" aria-label={`Edit ${categoryName}`} onClick={()=>{resetFields();setOpen(true);}}><EllipsisVertical /></Button>
                )}
            </div>
            <Drawer open={open} onOpenChange={(next) => { if (!next) resetFields(); setOpen(next); }} swipeDirection="right" >
                <DrawerContent className="[--drawer-content-width:min(100vw,28rem)] [--drawer-content-height:100dvh] rounded-r-none">
                    <div className="flex items-center justify-between border-b p-6">
                        <DrawerTitle className="text-lg font-semibold">Edit Category</DrawerTitle><DrawerClose render={<Button variant="ghost" size="icon" aria-label="Close category form" />}><X /></DrawerClose>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-6">
                        <Field>
                            <FieldLabel>Category Name: <span className="text-destructive">*</span></FieldLabel>
                            <Input aria-label="Category name" value={name} onValueChange={(value) => handleNameChange(value)} id="name" autoComplete="off" placeholder="New Budget Category Name"  />
                            {fieldErrors.name && <p className="text-destructive text-xs mt-1">{fieldErrors.name}</p>}
                        </Field>
                        <Field className="mt-3">
                            <FieldLabel>Category Phase: <span className="text-destructive">*</span></FieldLabel>
                            <Select value={phase} onValueChange={(value) => handlePhaseChange(value || "")} id="phase">
                                <SelectTrigger aria-label="Category phase" className="w-full">
                                    <SelectValue className="text-foreground" placeholder="Select a Phase" />
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
                            <Input aria-label="Category budget" value={budgetInput} onValueChange={(value) => handleBudgetChange(value)} id="budget" autoComplete="off" placeholder="New Category Total Budget"  />
                            {fieldErrors.budget && <p className="text-destructive text-xs mt-1">{fieldErrors.budget}</p>}
                        </Field>
                        <Field className="mt-3">
                            <div className="flex gap-1">
                                <FieldLabel>Category Enabled:</FieldLabel>
                                <Checkbox aria-label="Category enabled" checked={newenabled} onCheckedChange={(checked) => setEnabled(Boolean(checked))} />
                            </div>
                        </Field>
                        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
                    </div>
                    <Button onClick={() => editCategory()} className="mx-6 mb-6">Save</Button>
                </DrawerContent>
            </Drawer>
        </Card>
    )
}
