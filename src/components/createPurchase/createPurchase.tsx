'use client'
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Field,
    FieldLabel,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { StickyNotePlus, Plus } from "lucide-react"
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Input } from "@base-ui/react"
import { useState, useEffect } from "react";
import Item, { validateItem } from "./itemCard";
import { toast } from "@/components/ui/toast"
import { ScrollArea } from "@/components/ui/scroll-area"

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
}

interface FormErrors {
    name?: string;
    category?: string;
    supplier?: string;
    otherSupplier?: string;
    items?: string;
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

type CreatePurchaseProps = {
    onPurchaseCreated?: () => void;
    user: UserData;
    overrideOpen: (value: boolean) => void;
    isOpen: boolean;
};

export default function CreatePurchase({ onPurchaseCreated, user, overrideOpen, isOpen }: CreatePurchaseProps) {
    const [items, setItems] = useState<ItemData[]>([]);
    const [name, setName] = useState(String(""));
    const [catagory, setCatagory] = useState(String(""));
    const [supplierPicker, setSupplierPicker] = useState(String(""));
    const [otherSupplier, setOtherSupplier] = useState(String(""));
    const [errors, setErrors] = useState<FormErrors>({});
    const [showItemErrors, setShowItemErrors] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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
        fetchCategories();
    }, []);

    const orderTotal = items.reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0);
    const selectedCategoryBudget = categories.find((c) => c.categoryID === catagory)?.categoryBudget ?? 0;
    const selectedCategorySpent = categories.find((c) => c.categoryID === catagory)?.categorySpent ?? 0;

    const data = [
        { name: "Spent", value: selectedCategorySpent },
        { name: "Remains", value: Math.max(0, selectedCategoryBudget - selectedCategorySpent - orderTotal) },
        { name: "Order Cost", value: orderTotal },
    ];
    const COLORS = ["#e7000b", "#00bc7d", "#bc7d00ff"];

    function clearError(key: keyof FormErrors) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    function handleNameChange(value: string) {
        setName(value);
        clearError("name");
    }

    function handleCategoryChange(value: string) {
        setCatagory(value);
        clearError("category");
    }

    function handleSupplierChange(value: string) {
        setSupplierPicker(value);
        clearError("supplier");
        clearError("otherSupplier");
    }

    function handleOtherSupplierChange(value: string) {
        setOtherSupplier(value);
        clearError("otherSupplier");
    }

    function resetForm() {
        setItems([]);
        setName("");
        setCatagory("");
        setSupplierPicker("");
        setOtherSupplier("");
        setErrors({});
        setShowItemErrors(false);
    }

    function discard() {
        resetForm();
        overrideOpen(false);
    }

    function handleOpenChange(next: boolean) {
        overrideOpen(next);
        if (!next) {
            setErrors({});
            setShowItemErrors(false);
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
        clearError("items");
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
        clearError("items");
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
        clearError("items");
    };

    function supplier() {
        if (supplierPicker == "Other" && otherSupplier.trim() !== "") {
            return ("Other - " + otherSupplier.trim());
        }
        return supplierPicker;
    }

    function validate(): FormErrors {
        const found: FormErrors = {};

        if (name.trim() === "") {
            found.name = "Request name is required";
        }

        const selected = categories.find((c) => c.categoryID === catagory);
        if (!selected || !selected.enabled) {
            found.category = "Select a category";
        }

        if (supplierPicker === "") {
            found.supplier = "Select a supplier";
        } else if (supplierPicker === "Other" && otherSupplier.trim() === "") {
            found.otherSupplier = "Enter the vendor name";
        }

        if (items.length === 0) {
            found.items = "Add at least one item";
        } else {
            const hasInvalidItem = items.some(
                (item) => Object.keys(validateItem(item.ItemName, item.ItemCost, item.ItemQuantity, item.ItemLink)).length > 0
            );
            if (hasInvalidItem) {
                found.items = "Fix the highlighted items";
            }
        }

        return found;
    }

    async function submitPurchase() {
        if (submitting) return;

        const found = validate();
        setErrors(found);
        setShowItemErrors(true);

        if (Object.keys(found).length > 0) {
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/order/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: name.trim(),
                    requestor: user.id,
                    category: catagory,
                    items: items.map((item) => ({ ...item, ItemName: item.ItemName.trim(), ItemLink: item.ItemLink.trim() })),
                    vendor: supplier(),
                }),
            });

            if (res.ok) {
                toast.add({
                    title: "Item Created",
                });
                onPurchaseCreated?.();
                resetForm();
                overrideOpen(false);
            } else {
                toast.add({
                    title: "Error",
                });
            }
        } catch (err) {
            console.error(err);
            toast.add({
                title: "Error",
            });
        } finally {
            setSubmitting(false);
        }
    }

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
        <div>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger render={<Button className="cursor-pointer text-xl w-fit p-3"><StickyNotePlus className="mr-1" />New Request</Button>}></DialogTrigger>
                <DialogContent className="bg-red-900 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-2xl lg:w-[min(88rem,calc(100vw-2rem))] lg:max-w-none max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                    <h1 className="text-2xl text-zinc-100 font-bold">New Order</h1>
                    <div className="flex flex-col lg:flex-row gap-2 items-stretch w-full min-w-0">
                        <Card className="w-full min-w-0 lg:flex-[24_1_0%] gap-0 bg-mist-600 text-zinc-100 pt-0">
                            <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Budget</CardTitle>
                            </Card>
                            <div className="p-2 w-full">
                                <h1 style={{ color: `hsl(${budgetHue()}, 70%, 50%)` }} className="text-4xl sm:text-5xl font-bold mt-4">${(selectedCategoryBudget - selectedCategorySpent - orderTotal).toFixed(2)}</h1>
                                <h2 className="text-lg mt-2">Remains in Robot ({budgetRemainPercent()}%)</h2>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            isAnimationActive={true}
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <div className="w-full min-w-0 lg:flex-[32_1_0%]">
                            <Card className="w-full gap-0 bg-mist-600 text-zinc-100 pt-0">
                                <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                    <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Info</CardTitle>
                                </Card>
                                <div className="p-2 w-full">
                                    <Field>
                                        <FieldLabel>Request Name: <span className="text-destructive">*</span></FieldLabel>
                                        <Input value={name} onValueChange={(value) => handleNameChange(value)} id="name" autoComplete="off" placeholder="ex: CTRE Restock" className={`bg-input/20 ${errors.name ? "border-2 border-red-600" : "border-1 border-zinc-100"} rounded-md mt-1 text-xs p-1 w-full`} />
                                    </Field>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field className="w-full min-w-0">
                                            <FieldLabel className="mt-2">Catagory:<span className="text-destructive">*</span></FieldLabel>
                                            <Select value={catagory} onValueChange={(value) => handleCategoryChange(String(value))}>
                                                <SelectTrigger className={`cursor-pointer w-full ${errors.category ? "border-2 border-red-600" : ""}`}>
                                                    <SelectValue className="text-zinc-100" placeholder="Select a category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.filter((selectcategory) => selectcategory.enabled).map((selectcategory) => (
                                                        <SelectItem key={selectcategory.categoryID} value={selectcategory.categoryID}>{selectcategory.categoryID}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field className="mt-2 min-w-0">
                                            <FieldLabel>Supplier: <span className="text-destructive">*</span></FieldLabel>
                                            <Select value={supplierPicker} onValueChange={(value) => handleSupplierChange(String(value))}>
                                                <SelectTrigger className={`cursor-pointer w-full ${errors.supplier ? "border-2 border-red-600" : ""}`}>
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
                                                <Input value={otherSupplier} onValueChange={(value) => handleOtherSupplierChange(value)} id="value" autoComplete="off" placeholder="Other Vendor Name" className={`bg-input/20 ${errors.otherSupplier ? "border-2 border-red-600" : "border-1 border-zinc-100"} rounded-md mt-1 text-sm p-1 w-full`} />
                                            )}
                                        </Field>
                                    </div>
                                </div>
                            </Card>
                            <Card className="w-full gap-0 bg-mist-600 text-zinc-100 mt-2 pb-0 pt-0">
                                <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                    <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Best Practices</CardTitle>
                                </Card>
                                <CardDescription className="ml-2 pb-5 text-zinc-100">Purchasing Guidelines</CardDescription>
                            </Card>
                        </div>
                        <div className="flex flex-col gap-2 w-full min-w-0 lg:flex-[28_1_0%]">
                            <Card className="w-full gap-0 bg-mist-600 text-zinc-100 flex-1 flex flex-col min-h-0 pt-0">
                                <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                    <div className="flex m-1">
                                        <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Items</CardTitle>
                                        <Button className="cursor-pointer ml-auto mr-2 bg-emerald-500 text-sm hover:bg-emerald-600" onClick={addItem}><Plus />Add</Button>
                                    </div>
                                </Card>
                                <div className="p-2 w-full flex-1 overflow-auto min-h-0">
                                    <ScrollArea className="h-[240px] sm:h-[310px] w-full rounded-md pr-4">
                                        {items.map((item) => (
                                            <Item id={item.id} key={item.id} name={item.ItemName} cost={item.ItemCost} quantity={item.ItemQuantity} link={item.ItemLink} onDelete={deleteItem} onUpdate={updateItem} defaultEdit={true} showErrors={showItemErrors} />
                                        ))}
                                    </ScrollArea>
                                </div>
                            </Card>
                            <Card className="w-full gap-0 bg-mist-600 text-zinc-100 p-2 flex-none">
                                <h2>Order Total:</h2>
                                <div className="flex">
                                    <h1 style={{ color: `hsl(${budgetHue()}, 70%, 50%)` }} className="text-2xl font-bold">${orderTotal.toFixed(2)}</h1>
                                    <div className="ml-auto flex gap-2">
                                        <Button onClick={() => discard()} className="cursor-pointer w-fit text-base bg-red-700 text-zinc-100 border-0 hover:bg-red-800">Discard</Button>
                                        <Button onClick={() => submitPurchase()} disabled={submitting} className="cursor-pointer w-fit text-base bg-zinc-100 text-black border-0 hover:bg-zinc-300">Create</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}