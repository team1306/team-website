'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

type item = {
    name: string;
    cost: number;
    quanity: number;
    link: string;
}

export default function Item({ name, cost, quanity, link }: item) {
    return (
        <Card className="bg-mist-700 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
            <div className="flex">
                <CardTitle className="text-lg text-zinc-100 font-bold mb-1">{name}</CardTitle>
                <Button className="ml-auto mr-2 text bg-red-900/60 text-red-400 text-lg hover:bg-red-700/45" variant="destructive"><Trash2 /></Button>
            </div>
            <CardDescription className="text-sm text-zinc-300">x{quanity} at ${cost}</CardDescription>
        </Card>
    )
}