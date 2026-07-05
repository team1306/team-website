'use client'
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cog, Swords, Wrench, Volleyball, Handshake } from "lucide-react"

type request = {
    itemName: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: String;
    status: String
}

export default function Purchase({ itemName, cost, requestor, catagory, requestedDate, status }: request) {
    const CategoryTitle = () => {
        switch (catagory) {
            case "Robot":
                return (
                    <div className="flex items-center gap-2">
                        <Cog className="size-4 text-yellow-600" />
                        <h2 className="text-base font-bold text-yellow-600">{catagory}</h2>
                    </div>
                )
            case "Competition":
                return (
                    <div className="flex items-center gap-2">
                        <Swords className="size-4 text-emerald-600" />
                        <h2 className="text-base font-bold text-emerald-600">{catagory}</h2>
                    </div>
                )
            case "Tools":
                return (
                    <div className="flex items-center gap-2">
                        <Wrench className="size-4 text-rose-600" />
                        <h2 className="text-base font-bold text-rose-600">{catagory}</h2>
                    </div>
                )
            case "Field":
                return (
                    <div className="flex items-center gap-2">
                        <Volleyball className="size-4 text-lime-600" />
                        <h2 className="text-base font-bold text-lime-600">{catagory}</h2>
                    </div>
                )
            case "Outreach":
                return (
                    <div className="flex items-center gap-2">
                        <Handshake className="size-4 text-cyan-600" />
                        <h2 className="text-base font-bold text-cyan-600">{catagory}</h2>
                    </div>
                )

        }
    }

    const statusBadge = () => {
        switch (status) {
            case "needsAproval":
                return (
                    <Badge className="text-sm ml-2 w-fit h-fit border-3 border-amber-400 bg-transparent font-bold text-amber-400">Needs Approval</Badge>
                )
            case "aproved":
                return (
                    <Badge className="text-sm ml-2 w-fit h-fit border-3 border-blue-400 bg-transparent font-bold text-blue-400">Approved</Badge>
                )
            case "purchased":
                return (
                    <Badge className="text-sm ml-2 w-fit h-fit border-3 border-pink-400 bg-transparent font-bold text-pink-400">Purchased</Badge>
                )
            case "recived":
                return (
                    <Badge className="text-sm ml-2 w-fit h-fit border-3 border-green-400 bg-transparent font-bold text-green-400">Received</Badge>
                )
            case "rejected":
                return (
                    <Badge className="text-sm ml-2 w-fit h-fit border-3 border-red-400 bg-transparent font-bold text-red-400">Rejected</Badge>
                )
        }
    }

    return (
        <div>
            <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit">
                <div className="flex gap-3 items-stretch">
                    <div>
                        <div className="flex">
                            <CardTitle className="text-2xl font-bold text-zinc-100">{itemName}</CardTitle>
                            {statusBadge()}
                        </div>
                        <CardDescription className="text-sm text-zinc-300 mt-1">Requested By: {requestor} on {requestedDate}</CardDescription>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-22 h-fit mt-2 pt-1 pb-1 ml-auto">
                        <h3 className="text-xs font-bold text-zinc-100">Cost:</h3>
                        <h2 className="text-base font-bold text-zinc-100">${cost}</h2>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-42 h-fit mt-2 pt-1 pb-1">
                        <h3 className="text-xs font-bold text-zinc-100">Category:</h3>
                        <div className="flex items-center gap-2">
                            {CategoryTitle()}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}