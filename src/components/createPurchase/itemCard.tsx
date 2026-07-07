'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Pencil, Save, Globe, StickyNote } from "lucide-react"
import { useState } from "react"
import { Input } from "@base-ui/react/input"

interface Item {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    link: string;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<{ name: string; cost: number; quantity: number; link: string }>) => void;
}

export default function Item({ id, name, cost, quantity, link, onDelete, onUpdate}: Item) {
    const [editMode, setEditMode] = useState(true);
    const [containsNote, setcontainsNote] = useState(false);
    const [nameValue, setNameValue] = useState(name);
    const [quantityValue, setQuantityValue] = useState(String(quantity));
    const [costValue, setcostValue] = useState(String(cost));
    const [linkValue, setLinkValue] = useState(String(link));
    const [notes, setNotes] = useState(String(""));

    const handleQuantityChange = (value: string) => {
        setQuantityValue(value);
        onUpdate(id, { quantity: Number(value) || 0 });
    };

    const handleCostChange = (value: string) => {
        setcostValue(value);
        onUpdate(id, { cost: Number(value) || 0 });
    };

    if (editMode && !containsNote) {
        return (
            <Card className="bg-mist-700 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex">
                    <CardTitle className="text-lg text-zinc-100 font-bold mb-1"><Input className="bg-mist-800 rounded-md pl-2" type="text" value={nameValue} placeholder="Item Name" onValueChange={(value) => setNameValue(String(value))} /></CardTitle>
                    <div className="flex ml-auto">
                        <Button type="submit" className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => setEditMode(false)}><Save /></Button>
                        <Button type="submit" className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => setcontainsNote(true)}><StickyNote /></Button>
                        <Button className="mr-2 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive" onClick={() => onDelete(id)}><Trash2 /></Button>
                    </div>
                </div>
                <CardDescription className="text-sm text-zinc-300">x<Input className="bg-mist-800 rounded-md pl-2 w-12 [appearance:textfield] ml-1" value={quantityValue} type="number" onValueChange={(value) => handleQuantityChange(String(value))} /> at $<Input className="bg-mist-800 rounded-md pl-2 w-24 [appearance:textfield] ml-1" value={costValue} type="number" onValueChange={(value) => handleCostChange(String(value))} /></CardDescription>
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
                            <Button className="mr-2 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive" onClick={() => onDelete(id)}><Trash2 /></Button>
                        </div>
                    </div>
                    <CardDescription className="text-sm text-zinc-300">x<Input className="bg-mist-800 rounded-md pl-2 w-12 [appearance:textfield] ml-1" value={quantityValue} type="number" onValueChange={(value) => handleQuantityChange(String(value))} /> at $<Input className="bg-mist-800 rounded-md pl-2 w-24 [appearance:textfield] ml-1" value={costValue} type="number" onValueChange={(value) => handleCostChange(String(value))} /></CardDescription>
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

    if (containsNote) {
        return (
            <Card className="bg-mist-700 h-fit gap-0 p-0 mb-2">
                <div className="pl-2 pt-2">
                    <div className="flex">
                        <CardTitle className="text-lg text-zinc-100 font-bold mb-1">{nameValue}</CardTitle>
                        <div className="flex ml-auto">
                            <Button className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => window.open(linkValue, "_blank")}><Globe /></Button>
                            <Button className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" variant="destructive" onClick={() => setEditMode(true)}><Pencil /></Button>
                            <Button className="mr-2 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive" onClick={() => onDelete(id)}><Trash2 /></Button>
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
                    <Button className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" onClick={() => window.open(linkValue, "_blank")}><Globe /></Button>
                    <Button className="mr-1 bg-zinc-100 text-black text-lg hover:bg-zinc-300" variant="destructive" onClick={() => setEditMode(true)}><Pencil /></Button>
                    <Button className="mr-2 bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive" onClick={() => onDelete(id)}><Trash2 /></Button>
                </div>
            </div>
            <CardDescription className="text-sm text-zinc-300">x{quantityValue} at ${costValue}</CardDescription>
        </Card>
    );
}
