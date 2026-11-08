'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StickyNote, Globe } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"

interface Item {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    link: string;
    onUpdate: (updatedItem: ItemData) => void;
    defaultEdit?: boolean;
    isKrakenMode?: boolean;
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments?: string;
    userRole?: string;
}

const KRAKEN_DIVISOR = 217.99;

export default function Item({ id, name, cost, quantity, link, defaultEdit, onUpdate, isKrakenMode = false }: Item) {
    const editMode = defaultEdit;
    const [containsNote, setcontainsNote] = useState(false);

    const [nameValue, setNameValue] = useState(name);
    const [quantityValue, setQuantityValue] = useState(String(quantity));
    const [costValue, setcostValue] = useState(String(cost));
    const [linkValue, setLinkValue] = useState(String(link));
    const [notes, setNotes] = useState(String(""));

    const updateField = (field: "name" | "quantity" | "cost" | "link" | "notes", value: string) => {
        if (field === "name") setNameValue(value);
        if (field === "quantity") setQuantityValue(value);
        if (field === "cost") setcostValue(value);
        if (field === "link") setLinkValue(value);
        if (field === "notes") setNotes(value);
        onUpdate({
            id,
            ItemName: field === "name" ? value : nameValue,
            ItemCost: Number(field === "cost" ? value : costValue),
            ItemQuantity: Number(field === "quantity" ? value : quantityValue),
            ItemLink: field === "link" ? value : linkValue,
            comments: field === "notes" ? value : notes,
        });
    };

    const unitPriceText = () => {
        if (isKrakenMode) {
            return `${(Number(costValue) / KRAKEN_DIVISOR).toFixed(2)} Krakens each`;
        }
        return `$${Number(costValue).toFixed(2)}`;
    }

    if (editMode) {
        return (
            <div className="purchase-item-editor">
                <label className="purchase-edit-field">
                    <span>Item name</span>
                    <Input value={nameValue} placeholder="Item name" onValueChange={(value) => updateField("name", String(value))} />
                </label>
                <div className="purchase-edit-grid">
                    <label className="purchase-edit-field">
                        <span>Quantity</span>
                        <Input type="number" min="1" step="1" value={quantityValue} onValueChange={(value) => updateField("quantity", String(value))} />
                    </label>
                    <label className="purchase-edit-field">
                        <span>Unit price ($)</span>
                        <Input type="number" min="0" step="0.01" value={costValue} onValueChange={(value) => updateField("cost", String(value))} />
                    </label>
                </div>
                <label className="purchase-edit-field">
                    <span>Item link</span>
                    <Input type="url" placeholder="https://example.com" value={linkValue} onValueChange={(value) => updateField("link", String(value))} />
                </label>
                <Button type="button" variant="outline" className="h-11 w-fit" aria-expanded={containsNote} onClick={() => setcontainsNote(!containsNote)}>
                    <StickyNote aria-hidden="true" /> {containsNote ? "Hide notes" : "Add notes"}
                </Button>
                {containsNote && (
                    <label className="purchase-edit-field">
                        <span>Notes</span>
                        <Input value={notes} placeholder="Optional item notes" onValueChange={(value) => updateField("notes", String(value))} />
                    </label>
                )}
            </div>
        );
    }

    if (containsNote && !editMode) {
        return (
            <Card className="bg-mist-700 h-fit gap-0 p-0 mb-2">
                <div className="pl-2 pt-2">
                    <div className="flex">
                        <CardTitle className="text-lg text-zinc-100 font-bold mb-1">{nameValue}</CardTitle>
                        <div className="flex ml-auto">
                            <Button className="mr-2 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => window.open(linkValue, "_blank")}><Globe /></Button>
                        </div>
                    </div>
                    <CardDescription className={isKrakenMode ? "text-sm text-blue-500" : "text-sm text-zinc-300"}>{isKrakenMode ? unitPriceText() : `x${quantityValue} at ${unitPriceText()}`}</CardDescription>
                </div>
                <Card className=" mt-2 p-1 mb-0 bg-red-900 rounded-t-none rounded-b-md">
                    <h1 className="text-sm font-jetbrains text-zinc-100">{notes}</h1>
                </Card>
            </Card>
        );
    }

    return (
        <Card className="purchase-detail-item bg-mist-700 h-fit gap-0 mb-2">
            <div className="flex min-w-0 items-center gap-3">
                <CardTitle className="min-w-0 flex-1 break-words text-base text-zinc-100 font-bold">{nameValue}</CardTitle>
                {linkValue && (
                    <Button className="shrink-0 bg-zinc-100 text-black hover:bg-zinc-300" onClick={() => window.open(linkValue, "_blank")} aria-label={`Open ${nameValue} link`}><Globe /></Button>
                )}
            </div>
            <CardDescription className={isKrakenMode ? "text-sm text-blue-500" : "text-sm text-zinc-300"}>{isKrakenMode ? unitPriceText() : `x${quantityValue} at ${unitPriceText()}`}</CardDescription>
        </Card>
    );
}
