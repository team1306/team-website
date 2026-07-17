'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Save, StickyNote, Globe } from "lucide-react"
import { useState } from "react"
import { Input } from "@base-ui/react/input"

interface Item {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    link: string;
    onUpdate: (updatedItem: ItemData) => void;
    defaultEdit?: boolean;
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

export default function Item({ id, name, cost, quantity, link, defaultEdit, onUpdate }: Item) {
    //internal state tracking
    const [editMode, setEditMode] = useState(defaultEdit);
    const [containsNote, setcontainsNote] = useState(false);

    //Tracking for input values
    const [nameValue, setNameValue] = useState(name);
    const [quantityValue, setQuantityValue] = useState(String(quantity));
    const [costValue, setcostValue] = useState(String(cost));
    const [linkValue, setLinkValue] = useState(String(link));
    const [notes, setNotes] = useState(String(""));

    const saveItem = () => {
        onUpdate({
            id,
            ItemName: nameValue,
            ItemCost: Number(costValue),
            ItemQuantity: Number(quantityValue),
            ItemLink: linkValue,
            comments: notes,
        });
    }

    if (editMode && !containsNote) {
        return (
            <Card className="bg-mist-700 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex">
                <CardTitle className="text-lg text-zinc-100 font-bold mb-1"><Input className="bg-mist-800 rounded-md pl-2" type="text" value={nameValue} placeholder="Item Name" onValueChange={(value) => { setNameValue(String(value)); onUpdate({ id, ItemName: String(value), ItemCost: Number(costValue), ItemQuantity: Number(quantityValue), ItemLink: linkValue, comments: notes }); }} /></CardTitle>
                    <div className="flex ml-auto">
                        <Button type="submit" className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => setcontainsNote(true)}><StickyNote /></Button>
                        <Button className="mr-2 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive"><Trash2 /></Button>
                    </div>
                </div>
                <CardDescription className="text-sm text-zinc-300">x<Input className="bg-mist-800 rounded-md pl-2 w-12 [appearance:textfield] ml-1" value={quantityValue} type="number" onValueChange={(value) => { setQuantityValue(String(value)); onUpdate({ id, ItemName: nameValue, ItemCost: Number(costValue), ItemQuantity: Number(value), ItemLink: linkValue, comments: notes }); }} /> at $<Input className="bg-mist-800 rounded-md pl-2 w-24 [appearance:textfield] ml-1" value={costValue} type="number" onValueChange={(value) => { setcostValue(String(value)); onUpdate({ id, ItemName: nameValue, ItemCost: Number(value), ItemQuantity: Number(quantityValue), ItemLink: linkValue, comments: notes }); }} /></CardDescription>
                <div className="flex items-center gap-1 mt-1">
                    <h1 className="shrink-0 text-sm text-zinc-100 mt-1">Link:</h1>
                    <Input type="url" placeholder="https://example.com" value={linkValue} onValueChange={(value) => setLinkValue(String(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                </div>
            </Card>
        );
    }

    if (editMode && containsNote) {
        return (
            <Card className="bg-mist-700 h-fit gap-0 p-0 mb-2">
                <div className="pl-2 pt-2">
                    <div className="flex">
                        <CardTitle className="text-lg text-zinc-100 font-bold mb-1"><Input className="bg-mist-800 rounded-md pl-2" type="text" value={nameValue} placeholder="Item Name" onValueChange={(value) => setNameValue(String(value))} /></CardTitle>
                        <div className="flex ml-auto">
                            <Button type="submit" className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => setEditMode(false)}><Save /></Button>
                            <Button type="submit" className="mr-1 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive" onClick={() => { setcontainsNote(false); setNotes(""); }}><StickyNote /></Button>
                            <Button className="mr-2 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive"><Trash2 /></Button>
                        </div>
                    </div>
                    <CardDescription className="text-sm text-zinc-300">x<Input className="bg-mist-800 rounded-md pl-2 w-12 [appearance:textfield] ml-1" value={quantityValue} type="number"/> at $<Input className="bg-mist-800 rounded-md pl-2 w-24 [appearance:textfield] ml-1" value={costValue} type="number"/></CardDescription>
                    <div className="flex items-center gap-1 mt-1">
                        <h1 className="shrink-0 text-sm text-zinc-100 mt-1">Link:</h1>
                        <Input type="url" placeholder="https://example.com" value={linkValue} onValueChange={(value) => setLinkValue(String(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                    </div>
                </div>
                <Card className=" mt-2 p-1 mb-0 bg-red-900 rounded-t-none rounded-b-md">
                    <Input type="text" placeholder="Notes" value={notes} onValueChange={(value) => setNotes(String(value))} className="bg-mist-800 rounded-md p-1 text-sm flex-1 text-zinc-100"></Input>
                </Card>
            </Card>
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
                    <CardDescription className="text-sm text-zinc-300">x{quantityValue} at ${costValue}</CardDescription>
                </div>
                <Card className=" mt-2 p-1 mb-0 bg-red-900 rounded-t-none rounded-b-md">
                    <h1 className="text-sm font-jetbrains text-zinc-100">{notes}</h1>
                </Card>
            </Card>
        );
    }

    return (
        <Card className="bg-mist-700 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
            <div className="flex">
                <CardTitle className="text-lg text-zinc-100 font-bold mb-1">{nameValue}</CardTitle>
                <div className="flex ml-auto">
                    <Button className="mr-2 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => window.open(linkValue, "_blank")}><Globe /></Button>
                </div>
            </div>
            <CardDescription className="text-sm text-zinc-300">x{quantityValue} at ${costValue}</CardDescription>
        </Card>
    );
}