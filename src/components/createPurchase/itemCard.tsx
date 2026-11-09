'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"

export interface ItemErrors {
    name?: string;
    cost?: string;
    quantity?: string;
    link?: string;
}

export function isValidLink(value: string): boolean {
    try {
        const url = new URL(value.trim());
        const okProtocol = url.protocol === "http:" || url.protocol === "https:";
        return okProtocol && url.hostname.includes(".") && !url.hostname.startsWith(".") && !url.hostname.endsWith(".");
    } catch {
        return false;
    }
}

export function validateItem(name: string, cost: number, quantity: number, link: string): ItemErrors {
    const errors: ItemErrors = {};

    if (name.trim() === "") {
        errors.name = "Item name is invalid";
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        errors.quantity = "Quantity is invalid";
    }

    if (!Number.isFinite(cost) || cost <= 0) {
        errors.cost = "Cost is invalid";
    }

    if (!isValidLink(link)) {
        errors.link = "Link is invalid";
    }

    return errors;
}

function sanitizeNumber(value: string): string {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

function sanitizeWholeNumber(value: string): string {
    return value.replace(/[^0-9]/g, "");
}

interface Item {
 id: string; name: string; cost: number; quantity: number; link: string; comments?: string;
 onDelete: (id:string)=>void;
 onUpdate: (id:string, updates:Partial<{name:string;cost:number;quantity:number;link:string;comments:string}>)=>void;
 defaultEdit?:boolean; showErrors?:boolean;
}
export default function Item({id,name,cost,quantity,link,comments="",onDelete,onUpdate,showErrors}:Item) {
 const errors = showErrors ? validateItem(name,cost,quantity,link) : {};
 return <div className="space-y-4 rounded-lg border p-4">
   <div className="flex items-start gap-3"><label className="purchase-edit-field flex-1"><span>Item name</span><Input value={name} onValueChange={v=>onUpdate(id,{name:String(v)})} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} placeholder="e.g. Kraken X60 motor" />{errors.name && <span id={`${id}-name-error`} className="text-xs text-destructive">Enter an item name.</span>}</label><Button type="button" variant="ghost" size="icon" className="mt-6" aria-label="Remove item" onClick={()=>onDelete(id)}><Trash2 /></Button></div>
   <div className="purchase-edit-grid"><label className="purchase-edit-field"><span>Quantity</span><Input type="number" min="1" step="1" value={quantity || ""} onValueChange={v=>onUpdate(id,{quantity:Number(v)})} aria-invalid={!!errors.quantity}/>{errors.quantity && <span className="text-xs text-destructive">Enter a whole number above zero.</span>}</label><label className="purchase-edit-field"><span>Unit price ($)</span><Input type="number" min="0.01" step="0.01" value={cost || ""} onValueChange={v=>onUpdate(id,{cost:Number(v)})} aria-invalid={!!errors.cost}/>{errors.cost && <span className="text-xs text-destructive">Enter a price above zero.</span>}</label></div>
   <label className="purchase-edit-field"><span>Product link</span><Input type="url" value={link} onValueChange={v=>onUpdate(id,{link:String(v)})} placeholder="https://" aria-invalid={!!errors.link}/>{errors.link && <span className="text-xs text-destructive">Enter a complete product URL.</span>}</label>
   <label className="purchase-edit-field"><span>Notes <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={comments} onValueChange={v=>onUpdate(id,{comments:String(v)})} placeholder="Size, color, or other specifications" /></label>
 </div>;
}
