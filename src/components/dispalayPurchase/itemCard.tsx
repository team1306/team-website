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
    comments: string;
}

export default function Item({ id, name, cost, quantity, link, comments}: Item) {
    const [containsNote, setcontainsNote] = useState(comments !== "");
    const [nameValue, setNameValue] = useState(name);
    const [quantityValue, setQuantityValue] = useState(String(quantity));
    const [costValue, setcostValue] = useState(String(cost));
    const [linkValue, setLinkValue] = useState(String(link));
    const [notes, setNotes] = useState(String(comments));

    if (containsNote) {
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
