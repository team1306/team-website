'use client'
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cog, Swords, Wrench, Volleyball, Handshake, ChevronUp, ChevronDown } from "lucide-react"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { useState } from "react"
import Item from "../dispalayPurchase/itemCard"
import Approver from "./approverCard"
import { Button } from "../ui/button"

type request = {
    itemName: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: String;
    status: String
    items: ItemData[];
    shippingCost: number;
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments: string;
}


export default function Purchase({ itemName, cost, requestor, catagory, requestedDate, status, items, shippingCost }: request) {
    const [open, setOpen] = useState(false);
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
            <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit" onClick={() => setOpen(true)}>
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
                <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                    <DrawerContent className="[--drawer-inset:0px] rounded-tl-md rounded-tr-none border-0 w-1/4 bg-mist-600">
                        <Card className="p-0 mb-2 bg-mist-800 rounded-t-sm rounded-b-none rounded-tr-none gap-0">
                            <div className="flex items-center justify-start mt-1 pb-0">
                                <CardTitle className="ml-2 text-2xl p-2 font-jetbrains font-bold text-zinc-100">{itemName}</CardTitle>
                                <div>
                                    {statusBadge()}
                                </div>
                            </div>
                            <CardDescription className="text-sm pl-4 text-zinc-100 mb-2">Requested By: {requestor}</CardDescription>
                        </Card>
                        <Card className="bg-mist-800 mt-2 m-1 p-0 rounded-2xl gap-0">
                            <div className="p-2 flex gap-2">
                                <div>
                                    <Button className="bg-mist-700 text-zinc-100 text-base hover:bg-mist-900 mr-1">Duplicate</Button>
                                    <Button variant="destructive" className="bg-red-700 text-zinc-100 text-base hover:bg-red-900 mr-1">Delete</Button>
                                    <Button variant="destructive" className="bg-red-700 text-zinc-100 text-base hover:bg-red-900">Reject</Button>
                                </div>
                                <div className="ml-auto mr-2">
                                    <Button className="bg-emerald-600/75 text-zinc-100 text-base hover:bg-emerald-700/50 mr-1"><ChevronUp/></Button>
                                    <Button className="bg-red-600/75 text-zinc-100 text-base hover:bg-red-700/50"><ChevronDown/></Button>
                                </div>
                            </div>
                        </Card>
                        <Card className="bg-mist-800 mt-2 m-1 p-0 rounded-2xl gap-0">
                            <CardTitle className="text-lg ml-4 text-zinc-100 font-bold mt-3">Items</CardTitle>
                            <div className="p-2 pb-0">
                                {items.map((item) => (
                                    <Item
                                        key={item.id}
                                        id={item.id}
                                        name={item.ItemName}
                                        cost={item.ItemCost}
                                        quantity={item.ItemQuantity}
                                        link={item.ItemLink}
                                        comments={item.comments}
                                        onDelete={() => { }}
                                        onUpdate={() => { }}
                                    />
                                ))}
                            </div>
                        </Card>
                        <Card className="bg-mist-800 mt-2 m-1 p-0 rounded-2xl gap-0">
                            <CardTitle className="text-lg ml-4 text-zinc-100 font-bold mt-3">Approvers</CardTitle>
                            <div className="p-2">
                                <Approver approverName="Example User" approverPicture="" requiredRole="Student Lead" approved={true} userCanApprove={false} />
                                <Approver approverName="" approverPicture="" requiredRole="Lead Mentor" approved={false} userCanApprove={true} />
                                <Approver approverName="Example User" approverPicture="" requiredRole="President" approved={true} userCanApprove={false} />
                            </div>
                        </Card>
                    </DrawerContent>
                </Drawer>
            </Card>
        </div>
    )
}