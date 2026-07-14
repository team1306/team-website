'use client'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { Card, CardAction, CardDescription, CardTitle} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Item from "./itemCard";

export default function CreatePurchase() {
    interface ItemData {
        id: string;
        ItemName: string;
        ItemCost: number;
        ItemQuantity: number;
        ItemLink: string;
    }

    const [items, setItems] = useState<ItemData[]>([]);
    const orderTotal = items.reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0);

    const data = [
        { name: "Spent", value: 0 },
        { name: "Remains", value: (4000 - orderTotal) },
        { name: "Order Cost", value: orderTotal },
    ];
    const COLORS = ["#e7000b", "#00bc7d", "#bc7d00ff"];

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
    return (
        <Dialog>
            <DialogTrigger render={<Button className="text-lg w-fit p-3"><StickyNotePlus className="mr-1" />New Request</Button>}></DialogTrigger>
            <DialogContent className="bg-red-900 w-fit max-w-fit sm:max-w-fit">
                <h1 className="text-2xl text-zinc-100 font-bold">New Purchase</h1>
                <div className="flex gap-2 items-stretch">
                    <Card className="w-sm gap-0 bg-mist-600 text-zinc-100 pt-0">
                        <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                            <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Budget</CardTitle>
                        </Card>
                        <div className="p-2 w-full">
                            <h1 className="text-5xl font-bold text-emerald-400 mt-4">${(4000 - orderTotal).toFixed(2)}</h1>
                            <h2 className="text-lg mt-2">Remains in Robot ({Math.round(((4000 - orderTotal) / 4000) * 100)}%)</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
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
                    <div>
                        <Card className="w-lg gap-0 bg-mist-600 text-zinc-100 pt-0">
                            <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Info</CardTitle>
                            </Card>
                            <div className="p-2 w-full">
                                <Field>
                                    <FieldLabel>Request Name: <span className="text-destructive">*</span></FieldLabel>
                                    <Input id="name" autoComplete="off" placeholder="ex: CTRE Restock" className="w-full" />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field className="w-full">
                                        <FieldLabel className="mt-2">Catagory <span className="text-destructive">*</span></FieldLabel>
                                        <Select>
                                            <SelectTrigger className="w-full">
                                                <SelectValue className="text-zinc-100" placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Roobt">Roobt</SelectItem>
                                                <SelectItem value="Competition">Competition</SelectItem>
                                                <SelectItem value="Tools">Tools</SelectItem>
                                                <SelectItem value="Field">Field</SelectItem>
                                                <SelectItem value="Outreach">Outreach</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field className="mt-2">
                                        <FieldLabel>Supplier:<span className="text-destructive">*</span></FieldLabel>
                                        <Select>
                                            <SelectTrigger className="w-full">
                                                    <SelectValue className="text-zinc-100" placeholder="Select a supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="WCP">WCP</SelectItem>
                                                <SelectItem value="CTRE">CTRE</SelectItem>
                                                <SelectItem value="Digi-Key">Digi-Key</SelectItem>
                                                <SelectItem value="Mouser">Mouser</SelectItem>
                                                <SelectItem value="Amazon">Amazon</SelectItem>
                                                <SelectItem value="Amazon">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                            </div>
                        </Card>
                        <Card className="w-lg gap-0 bg-mist-600 text-zinc-100 mt-2 pb-0 pt-0">
                            <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Best Practices</CardTitle>
                            </Card>
                            <CardDescription className="ml-2 pb-5 text-zinc-100">Purchasing Guidelines</CardDescription>
                        </Card>
                    </div>
                    <div className="flex flex-col gap-2 h-full">
                        <Card className="w-md gap-0 bg-mist-600 text-zinc-100 flex-1 flex flex-col min-h-0 pt-0">
                            <Card className="p-1 mb-0 bg-mist-800 rounded-t-md rounded-b-none">
                                <div className="flex m-1">
                                    <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Items</CardTitle>
                                    <Button className="ml-auto mr-2 bg-emerald-500 text-sm hover:bg-emerald-600" onClick={addItem}><Plus />Add</Button>
                                </div>
                            </Card>
                            <div className="p-2 w-full flex-1 overflow-auto min-h-0">
                                {items.map((item) => (
                                    <Item id={item.id} key={item.id} name={item.ItemName} cost={item.ItemCost} quantity={item.ItemQuantity} link={item.ItemLink} onDelete={deleteItem} onUpdate={updateItem} defaultEdit={true} />
                                ))}
                            </div>
                        </Card>
                        <Card className="w-md gap-0 bg-mist-600 text-zinc-100 p-2 flex-none">
                            <h2>Order Total:</h2>
                            <div className="flex">
                                <h1 className="text-2xl text-emerald-400 font-bold">${orderTotal.toFixed(2)}</h1>
                                <Button className="w-fit text-base bg-zinc-100 text-black border-0 ml-auto hover:bg-zinc-300">Submit</Button>
                            </div>

                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}