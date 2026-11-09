'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Globe,StickyNote } from "lucide-react"
import { useState } from "react"

interface Item {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    link: string;
    comments?: string;
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

export default function Item({ id, name, cost, quantity, link, comments = "", defaultEdit, onUpdate, isKrakenMode = false }: Item) {
    const editMode = defaultEdit;
    const [containsNote, setcontainsNote] = useState(false);

    const [nameValue, setNameValue] = useState(name);
    const [quantityValue, setQuantityValue] = useState(String(quantity));
    const [costValue, setcostValue] = useState(String(cost));
    const [linkValue, setLinkValue] = useState(String(link));
    const [notes, setNotes] = useState(comments);

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
                <Button type="button" variant="outline" size="sm" className="w-fit" aria-expanded={containsNote} onClick={() => setcontainsNote(!containsNote)}>
                    <StickyNote data-icon="inline-start" aria-hidden="true" /> {containsNote ? "Hide notes" : "Add notes"}
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

    return <div className="purchase-detail-item space-y-2"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-medium">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{quantity} × {isKrakenMode ? unitPriceText() : cost.toLocaleString("en-US",{style:"currency",currency:"USD"})}</p></div>{link && <Button variant="ghost" size="icon" aria-label={`Open product page for ${name}`} onClick={()=>window.open(link,"_blank","noopener,noreferrer")}><Globe /></Button>}</div>{comments && <p className="text-sm text-muted-foreground">{comments}</p>}</div>;
}
