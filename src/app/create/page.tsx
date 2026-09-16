'use client'
import Navbar from "@/components/ui/navbar"
import { useState } from "react";
import { getUserInfo } from "../auth/getUserInfo/getUserInfo";
import { useRouter } from 'next/navigation'
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { StickyNotePlus, Plus, ArrowDown } from "lucide-react"
import { Card, CardAction, CardDescription, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Input } from "@base-ui/react"
import { ScrollArea } from "@/components/ui/scroll-area";
import Item from "@/components/createPurchase/itemCard";
import { toast } from "@/components/ui/toast";
import { useEffect } from "react";


export default function Page() {
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const router = useRouter();

    interface UserData {
        id: string;
        name: string;
        role: string;
        profilePicture: string;
    }

    interface ItemData {
        id: string;
        ItemName: string;
        ItemCost: number;
        ItemQuantity: number;
        ItemLink: string;
    }

    interface CategoryData {
        categoryID: string;
        categoryName: string;
        categoryPhase: string;
        categoryBudget: number;
        categorySpent: number;
        enabled: boolean;
    }

    function setRole(newRole: string) {
        setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
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

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                ItemName: "New Item",
                ItemCost: 0,
                ItemQuantity: 0,
                ItemLink: "",
            },
        ]);
        console.log(items);
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateItem = (
        id: string,
        updates: Partial<{ name: string; cost: number; quantity: number; link: string }>
    ) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        ...(updates.quantity !== undefined && { ItemQuantity: updates.quantity }),
                        ...(updates.cost !== undefined && { ItemCost: updates.cost }),
                        ...(updates.name !== undefined && { ItemName: updates.name }),
                        ...(updates.link !== undefined && { ItemLink: updates.link }),
                    }
                    : item
            )
        );
    };

    const [items, setItems] = useState<ItemData[]>([]);
    const [name, setName] = useState(String(""));
    const [catagory, setCatagory] = useState(String(""));
    const [supplierPicker, setSupplierPicker] = useState(String(""));
    const [otherSupplier, setOtherSupplier] = useState(String(""));

    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [selectedCatagory, setSelectedCatagory] = useState<CategoryData[]>([]);

    function supplier() {
        if (supplierPicker == "Other" && !otherSupplier) {
            return ("Other - " + otherSupplier);
        }
        else {
            return (supplierPicker);
        }
    }

    async function submitPurchase() {
        const res = await fetch('/api/order/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: name,
                requestor: "Test Mobile User",
                category: catagory,
                items: items,
                vendor: supplier(),
            }),
        });

        const data = await res.json();

        if (res.ok) {
            toast.add({
                title: "Item Created",
            });
            router.push("/");
        } else {
            toast.add({
                title: "Error",
            });
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
        }
    }

    useEffect(() => {
        fetchCategories();
    }, []);

    const orderTotal = items.reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0);
    const selectedCategoryBudget = categories.find((c) => c.categoryID === catagory)?.categoryBudget ?? 0;
    const selectedCategorySpent = categories.find((c) => c.categoryID === catagory)?.categorySpent ?? 0;

    function budgetHue(): number {
        if (selectedCategoryBudget <= 0) return 220;
        const percent = ((selectedCategorySpent + orderTotal) / selectedCategoryBudget) * 100;
        if (percent >= 100) return 0;
        if (percent >= 75) return 20;
        if (percent >= 50) return 50;
        return 120;
    }

    function budgetRemainPercent(): number {
        if (selectedCategoryBudget <= 0) return 0;
        return Math.round(((selectedCategoryBudget - selectedCategorySpent - orderTotal) / selectedCategoryBudget) * 100);
    }

    return (
        <div className="">
            <Navbar user={currentUser ?? { id: "", name: "", role: "", profilePicture: "" }} updateUserRole={setRole} />
            <div className="p-3">
                <Card className="w-full gap-0 bg-mist-600 text-zinc-100 pt-0 pb-0 rounded-md mb-3">
                    <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                        <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Budget</CardTitle>
                    </Card>
                    <div className="p-1 w-full">
                        <h1 style={{ color: `hsl(${budgetHue()}, 70%, 50%)` }} className="text-5xl font-bold mt-4">${(selectedCategoryBudget - selectedCategorySpent - orderTotal).toFixed(2)}</h1>
                        <h2 className="text-lg mt-2">Remains in Robot ({Math.round(((selectedCategoryBudget - selectedCategorySpent - orderTotal) / selectedCategoryBudget) * 100)}%)</h2>
                    </div>
                </Card>
                <Card className="w-full gap-0 bg-mist-600 text-zinc-100 pt-0">
                    <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                        <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Info</CardTitle>
                    </Card>
                    <div className="p-2 w-full">
                        <Field>
                            <FieldLabel>Request Name: <span className="text-destructive">*</span></FieldLabel>
                            <Input value={name} onValueChange={(value) => setName(value)} id="name" autoComplete="off" placeholder="ex: CTRE Restock" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-xs p-1 w-full" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field className="w-full">
                                <FieldLabel className="mt-2">Catagory:<span className="text-destructive">*</span></FieldLabel>
                                <Select value={catagory} onValueChange={(value) => setCatagory(String(value))}>
                                    <SelectTrigger className="cursor-pointer w-full">
                                        <SelectValue className="text-zinc-100" placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent className="w-fit ml-4">
                                        {categories.map((selectcategory) => (
                                            <SelectItem key={selectcategory.categoryID} disabled={selectcategory.enabled === false} value={selectcategory.categoryID}>{selectcategory.categoryID}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field className="mt-2">
                                <FieldLabel>Supplier:</FieldLabel>
                                <Select value={supplierPicker} onValueChange={(value) => setSupplierPicker(String(value))}>
                                    <SelectTrigger className="cursor-pointer w-full">
                                        <SelectValue className="text-zinc-100" placeholder="Select a supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WCP">WCP</SelectItem>
                                        <SelectItem value="CTRE">CTRE</SelectItem>
                                        <SelectItem value="Digi-Key">Digi-Key</SelectItem>
                                        <SelectItem value="Mouser">Mouser</SelectItem>
                                        <SelectItem value="Amazon">Amazon</SelectItem>
                                        <SelectItem value="Multiple">Multiple</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(supplierPicker == "Other") && (
                                    <Input value={otherSupplier} onValueChange={(otherSupplier) => setOtherSupplier(otherSupplier)} id="value" autoComplete="off" placeholder="Other Vendor Name" className="bg-input/20 border-1 border-zinc-100 rounded-md mt-1 text-sm p-1 w-full" />
                                )}
                            </Field>
                        </div>
                    </div>
                </Card>
                <Card className="w-full mt-3 gap-0 bg-mist-600 text-zinc-100 flex-1 flex flex-col min-h-0 pt-0">
                    <Card className="mb-0 p-0 bg-mist-800 rounded-t-md rounded-b-none">
                        <div className="flex m-1">
                            <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Items</CardTitle>
                            <Button className="cursor-pointer ml-auto mr-2 bg-emerald-500 text-sm hover:bg-emerald-600" onClick={addItem}><Plus />Add</Button>
                        </div>
                    </Card>
                    <div className="p-2 w-full flex-1 overflow-auto min-h-0">
                        <ScrollArea className="h-[310px] w-full rounded-md pr-4">
                            {items.map((item) => (
                                <Item id={item.id} key={item.id} name={item.ItemName} cost={item.ItemCost} quantity={item.ItemQuantity} link={item.ItemLink} onDelete={deleteItem} onUpdate={updateItem} defaultEdit={true} />
                            ))}
                        </ScrollArea>
                    </div>
                </Card>
                <Card className="w-full mt-3 gap-0 bg-mist-600 text-zinc-100 p-2 rounded-md border-t border-zinc-700 sticky bottom-0 left-0 z-10">
                    <h2>Order Total:</h2>
                    <div className="flex items-center">
                        <h1 style={{ color: `hsl(${budgetHue()}, 70%, 50%)` }} className="text-2xl font-bold">${orderTotal.toFixed(2)}</h1>
                        <Button onClick={() => { submitPurchase(); }} className="cursor-pointer w-fit text-base bg-zinc-100 text-black border-0 ml-auto hover:bg-zinc-300">Create</Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}