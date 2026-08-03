'use client'
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cog, Swords, Wrench, Volleyball, Handshake, EllipsisVertical, Pencil } from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import Item from "../dispalayPurchase/itemCard"
import Approver from "./approverCard"
import { Button } from "../ui/button"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Input } from "@base-ui/react/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { ScrollArea } from "@/components/ui/scroll-area"

type request = {
    id: string;
    itemName: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: string;
    status: string;
    items: ItemData[];
    vendor: string;
    userRole: string;
    onPurchaseEdited: () => void;
    approvers: Approver[];
    reason?: string;
    expidited: string;
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments?: string;
    userRole?: string
}

interface Approver {
    approved: boolean;
    approverName: string;
    requiredRole: string;
    approverPicture: string;
}


export default function Purchase({ id, itemName, cost, requestor, catagory, requestedDate, status, items, vendor, userRole, onPurchaseEdited, approvers, reason, expidited }: request) {
    async function updateStatus(id: string, newStatus: string) {
        try {
            const res = await fetch('/api/setStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    status: newStatus,
                })
            });

            const data = await res.json();
            onPurchaseEdited();

        } catch (err) {
            console.error('error:', err);
        }
    }

    const [open, setOpen] = useState(false);
    const [itemsArray, setItems] = useState(items)
    const [expieditedRequsted, setExpieditedRequsted] = useState(false);
    const [expieditedRejected, setExpieditedRejected] = useState(false);
    const [expiedited, setExpiedited] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [overideStatusOpen, setOverideStatusOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [onHoldOpen, setOnHoldOpen] = useState(false);

    const calculatePrice = () => {
        return itemsArray.reduce((total, item) => total + item.ItemCost * item.ItemQuantity, 0);
    }

    console.log(id);
    console.log(approvers);

    //track request info
    const [name, setName] = useState(itemName);
    const [requestCost, setRequestCost] = useState(calculatePrice());
    const [itemCatagory, setItemCaragory] = useState(catagory);
    const [orderVendor, setOrderVendor] = useState(vendor);
    const [statusReason, setReason] = useState(reason || "");

    const CategoryTitle = () => {
        switch (itemCatagory) {
            case "Robot":
                return (
                    <div className="flex items-center gap-2">
                        <Cog className="size-4 text-yellow-600" />
                        <h2 className="text-base font-bold text-yellow-600">{itemCatagory}</h2>
                    </div>
                )
            case "Competition":
                return (
                    <div className="flex items-center gap-2">
                        <Swords className="size-4 text-emerald-600" />
                        <h2 className="text-base font-bold text-emerald-600">{itemCatagory}</h2>
                    </div>
                )
            case "Tools":
                return (
                    <div className="flex items-center gap-2">
                        <Wrench className="size-4 text-rose-600" />
                        <h2 className="text-base font-bold text-rose-600">{itemCatagory}</h2>
                    </div>
                )
            case "Field":
                return (
                    <div className="flex items-center gap-2">
                        <Volleyball className="size-4 text-lime-600" />
                        <h2 className="text-base font-bold text-lime-600">{itemCatagory}</h2>
                    </div>
                )
            case "Outreach":
                return (
                    <div className="flex items-center gap-2">
                        <Handshake className="size-4 text-cyan-600" />
                        <h2 className="text-base font-bold text-cyan-600">{itemCatagory}</h2>
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
            case "approved":
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
            case "onHold":
                return (
                    <Badge className="text-sm ml-2 w-fit h-fit border-3 border-orange-400 bg-transparent font-bold text-orange-400">On Hold</Badge>
                )
        }
    }

    const isTierTwo = () => {
        if (calculatePrice() > 250) {
            return (true);
        }
        else {
            return (false);
        }
    }

    const calcPercent = () => {
        return (Math.round(((4000 - calculatePrice()) / 4000) * 100))
    }

    const purchaseApprovers = () => {
        const approvalDisabled = status === "onHold" || status === "rejected";
        return (
            <div>
                {approvers.map((approver) => (
                    <Approver
                        key={approver.requiredRole}
                        approverName={approver.approverName}
                        approverPicture={approver.approverPicture}
                        requiredRole={approver.requiredRole}
                        approved={approver.approved}
                        userRole={userRole}
                        onApproved={onPurchaseEdited}
                        itemID={id}
                        disable={approvalDisabled}
                        tierTwo={isTierTwo()}
                    />
                ))}
                {(expidited == "approved") && (
                    <Approver approverName="Program Director" approverPicture="" requiredRole="programDirector" approved={true} userRole={userRole} itemID={id} disable={approvalDisabled} />
                )}
                {(expidited == "requested") && (
                    <Approver approverName="Program Director" approverPicture="" requiredRole="nProgramDirector" approved={false} userRole={userRole} itemID={id} disable={approvalDisabled} />
                )}
                {(expidited == "rejected") && (
                    <Approver approverName="Program Director" approverPicture="" requiredRole="nProgramDirector" approved={false} userRole={userRole} rejected={true} itemID={id} disable={approvalDisabled} />
                )}
            </div>
        )
    }

    const updateItem = (updatedItem: ItemData) => {
        setItems((prev) =>
            prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
    };

    async function updateExpidite(id: string, newStatus: string) {
        try {
            const res = await fetch('/api/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    expidited: newStatus
                })
            });

            const data = await res.json();
            onPurchaseEdited();

        } catch (err) {
            console.error('error:', err);
        }
    }

    function getNextPurchaseDate() {
        const today = new Date();
        const dayOfWeek = today.getDay();

        const daysUntilMonday = ((1 - dayOfWeek + 7) % 7) || 0;
        const daysUntilThursday = ((4 - dayOfWeek + 7) % 7) || 0;

        const soonest = Math.min(daysUntilMonday, daysUntilThursday);

        const result = new Date(today);
        result.setDate(today.getDate() + soonest);

        const mm = String(result.getMonth() + 1).padStart(2, '0');
        const dd = String(result.getDate()).padStart(2, '0');
        const yy = String(result.getFullYear()).slice(-2);

        return `${mm}/${dd}/${yy}`;
    }

    async function editPurchase(overrideStatus?: string) {
        const updatedData = {
            id: id,
            title: name,
            category: itemCatagory,
            vendor: orderVendor,
            items: itemsArray,
            reason: statusReason,
            status: overrideStatus,
        };

        await fetch('/api/edit', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
        });

        onPurchaseEdited();
    }

    const MAX_VISIBLE_ITEMS = 4;
    const ITEM_HEIGHT = 78;

    const scrollAreaHeight =
        itemsArray.length > MAX_VISIBLE_ITEMS
            ? MAX_VISIBLE_ITEMS * ITEM_HEIGHT
            : itemsArray.length * ITEM_HEIGHT;

    const needsScroll = itemsArray.length > MAX_VISIBLE_ITEMS;

    const itemList = (
        <div className="p-2 pb-0 ">
            {itemsArray.map((item) => (
                <Item
                    key={`${item.id}-${editMode}`}
                    id={item.id}
                    name={item.ItemName}
                    cost={item.ItemCost}
                    quantity={item.ItemQuantity}
                    link={item.ItemLink}
                    defaultEdit={editMode}
                    onUpdate={updateItem}
                />
            ))}
        </div>
    );

    return (
        <div>
            <Card className="p-2 bg-mist-700 h-fit cursor-pointer" onClick={() => setOpen(true)}>
                <div className="flex gap-3 items-stretch">
                    <div>
                        <div className="flex">
                            <CardTitle className="text-2xl font-bold text-zinc-100">{name || "Untitled Request"}</CardTitle>
                            {statusBadge()}
                            {(expidited == "requested") && (
                                <Badge className="text-sm ml-2 w-fit h-fit border-3 border-violet-500 bg-transparent font-bold text-violet-500">Expedited Requested</Badge>
                            )}
                            {(expidited == "approved") && (
                                <Badge className="text-sm ml-2 w-fit h-fit border-3 border-green-400 bg-transparent font-bold text-green-400">Expedited</Badge>
                            )}
                        </div>
                        <CardDescription className="text-sm text-zinc-300 mt-1">Requested By: {requestor} on {requestedDate}</CardDescription>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-28 h-fit mt-2 pt-1 pb-1 ml-auto">
                        <h3 className="text-xs font-bold text-zinc-100">Cost:</h3>
                        <h2 className="text-base font-bold text-zinc-100">${requestCost.toFixed(2)}</h2>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-42 h-fit mt-2 pt-1 pb-1">
                        <h3 className="text-xs font-bold text-zinc-100">Category:</h3>
                        <div className="flex items-center gap-2">
                            {CategoryTitle()}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button className="cursor-pointer bg-transparent hover:bg-transparent"><EllipsisVertical className="text-zinc-100 size-5 mb-1" /></Button>} />
                        <DropdownMenuContent className="w-fit bg-mist-500">
                            <DropdownMenuGroup>
                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                {(!editMode) && (
                                    <DropdownMenuItem onClick={() => setEditMode(true)}>Edit</DropdownMenuItem>
                                )}
                                {(expidited == "NULL") && (<DropdownMenuItem onClick={() => updateExpidite(id, "requested")}>Request Expedite</DropdownMenuItem>)}
                                {(status == "needsAproval") && (
                                    <DropdownMenuItem onClick={(e) => { setOnHoldOpen(true); }} className="text-amber-500">On Hold</DropdownMenuItem>
                                )}
                                {(status == "onHold") && (
                                    <DropdownMenuItem onClick={(e) => { setReason(""); editPurchase("needsAproval"); }} className="text-amber-500">Needs Approval</DropdownMenuItem>
                                )}
                                {(status != "rejected") && (
                                    <DropdownMenuItem variant="destructive" onClick={(e) => { setRejectOpen(true); }}>Reject</DropdownMenuItem>
                                )}
                            </DropdownMenuGroup>
                            {(userRole == "president" || userRole == "programDirector") && (
                                <div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-zinc-100">Admin Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setOverideStatusOpen(true)}>Overide Status</DropdownMenuItem>
                                        {(userRole == "programDirector") && (
                                            <DropdownMenuItem onClick={() => { updateExpidite(id, "approved") }}>Expedite</DropdownMenuItem>
                                        )}
                                        {((expidited == "requested" || expidited == "approved") && userRole == "programDirector") && (
                                            <DropdownMenuItem onClick={() => { updateExpidite(id, "rejected") }}>Reject Expedite</DropdownMenuItem>
                                        )}
                                        {(userRole == "programDirector") && (
                                            <DropdownMenuItem onClick={() => { updateStatus(id, "purchased"); }}>Mark as Ordered</DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem variant="destructive" >Delete</DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                    <DrawerContent className="[--drawer-inset:0px] rounded-tl-md rounded-tr-none border-0 w-1/4 bg-mist-600">
                        <Card className="p-0 mb-2 bg-mist-800 rounded-t-sm rounded-bl-sm rounded-b-none rounded-tr-none gap-0">
                            {(editMode) && (
                                <div className="bg-amber-600 flex">
                                    <h1 className="text-zinc-100 text-lg ml-2 mt-1">Edit Mode</h1>
                                    <Button className="cursor-pointer ml-auto bg-zinc-100 text-black text-lg hover:bg-zinc-300 rounded-lg ml-auto text-sm mt-1 mb-1 mr-2" onClick={() => { setEditMode(false); editPurchase("needsAproval"); }}>Save</Button>
                                </div>
                            )}
                            <div className="mt-1 pb-0">
                                {(editMode) && (
                                    <Input type="url" placeholder="Request Title" value={name} onValueChange={(value) => setName(String(value))} className="bg-mist-700 rounded-md text-2xl ml-2 text-zinc-100 p-0 m-2 pl-2 font-bold"></Input>
                                )}
                                {(!editMode) && (
                                    <div className="flex items-center justify-start mt-1 pb-0">
                                        <CardTitle className="ml-2 text-2xl p-2 font-jetbrains font-bold text-zinc-100">{name}</CardTitle>
                                        <div className="ml-atuo mr-2">
                                            {statusBadge()}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex">
                                <CardDescription className="text-sm pl-4 text-zinc-100 mb-2">Requested By: {requestor}</CardDescription>
                                <div className="ml-auto">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger render={<Button className="cursor-pointer bg-transparent hover:bg-transparent"><EllipsisVertical className="text-zinc-100 size-5 mb-1" /></Button>} />
                                        <DropdownMenuContent className="w-fit bg-mist-500">
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                                {(!editMode) && (
                                                    <DropdownMenuItem onClick={() => setEditMode(true)}>Edit</DropdownMenuItem>
                                                )}
                                                {(expidited == "NULL") && (<DropdownMenuItem onClick={() => updateExpidite(id, "requested")}>Request Expedite</DropdownMenuItem>)}
                                                {(status == "needsAproval") && (
                                                    <DropdownMenuItem onClick={(e) => { setOnHoldOpen(true); }} className="text-amber-500">On Hold</DropdownMenuItem>
                                                )}
                                                {(status == "onHold") && (
                                                    <DropdownMenuItem onClick={(e) => { setReason(""); editPurchase("needsAproval"); }} className="text-amber-500">Needs Approval</DropdownMenuItem>
                                                )}
                                                {(status != "rejected") && (
                                                    <DropdownMenuItem variant="destructive" onClick={(e) => { setRejectOpen(true); }}>Reject</DropdownMenuItem>
                                                )}
                                            </DropdownMenuGroup>
                                            {(userRole == "president" || userRole == "programDirector") && (
                                                <div>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuLabel className="text-zinc-100">Admin Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setOverideStatusOpen(true)}>Overide Status</DropdownMenuItem>
                                                        {(userRole == "programDirector") && (
                                                            <DropdownMenuItem onClick={() => { updateExpidite(id, "approved") }}>Expedite</DropdownMenuItem>
                                                        )}
                                                        {((expidited == "requested" || expidited == "approved") && userRole == "programDirector") && (
                                                            <DropdownMenuItem onClick={() => { updateExpidite(id, "rejected") }}>Reject Expedite</DropdownMenuItem>
                                                        )}
                                                        {(userRole == "programDirector") && (
                                                            <DropdownMenuItem onClick={() => { updateStatus(id, "purchased"); }}>Mark as Ordered</DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem variant="destructive" >Delete</DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </div>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Dialog open={overideStatusOpen} onOpenChange={setOverideStatusOpen}>
                                        <DialogContent className="bg-mist-400 p-4">
                                            <DialogTitle className="font-jetbrains text-xl font-bold">Change Status</DialogTitle>
                                            <h1 className="text-zinc-100 mb-2">Current Status: {statusBadge()}</h1>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "needsAproval"); }} className="text-xs p-3 font-bold text-zinc-100 bg-amber-500 hover:bg-amber-600 cursor-pointer">Needs Approval</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "approved"); }} className="text-base p-3 font-bold text-zinc-100 bg-blue-500 hover:bg-blue-600 cursor-pointer">Approved</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "purchased"); }} className="text-base p-3 font-bold text-zinc-100 bg-pink-500 hover:bg-pink-600 cursor-pointer">Purchased</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "recived"); }} className="text-base p-3 font-bold text-zinc-100 bg-green-500 hover:bg-green-600 cursor-pointer">Received</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "onHold"); }} className="text-base p-3 font-bold text-orange-100 bg-orange-500 hover:bg-orange-600 cursor-pointer">On Hold</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "rejected"); }} className="text-base p-3 font-bold text-zinc-100 bg-red-500 hover:bg-red-600 cursor-pointer">Rejected</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                                        <DialogContent className="bg-mist-400 p-4">
                                            <DialogTitle className="font-jetbrains text-xl font-bold">Reject Order</DialogTitle>
                                            <Input type="text" value={statusReason} onValueChange={(value) => setReason(String(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                                            <div className="flex">
                                                <Button onClick={() => { setRejectOpen(false); editPurchase("rejected"); }} className="bg-destructive/50 text-zinc-100 hover::bg-red-600 w-fit p-2 ml-auto" variant="destructive">Reject</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={onHoldOpen} onOpenChange={setOnHoldOpen}>
                                        <DialogContent className="bg-mist-400 p-4">
                                            <DialogTitle className="font-jetbrains text-xl font-bold">Mark Order on Hold</DialogTitle>
                                            <Input type="text" value={statusReason} onValueChange={(value) => setReason(String(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                                            <div className="flex">
                                                <Button onClick={() => { setOnHoldOpen(false); editPurchase("onHold"); }} className="bg-amber-500 text-zinc-100 hover::bg-amber-600 w-fit p-2 ml-auto">Mark On Hold</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            {(reason && status === "rejected") && (
                                <div className="bg-red-600 flex rounded-bl-sm">
                                    <h1 className="text-zinc-100 text-lg ml-2 mt-1 mb-1">Rejected: {reason}</h1>
                                </div>
                            )}
                            {(reason && status === "onHold") && (
                                <div className="bg-orange-600 flex rounded-bl-sm">
                                    <h1 className="text-zinc-100 text-lg ml-2 mt-1 mb-1">On Hold: {reason}</h1>
                                </div>
                            )}
                        </Card>
                        {(editMode) && (
                            <Card className="bg-mist-800 mt-2 m-1 m-1 p-2 rounded-2xl gap-0">
                                <CardTitle className="text-lg ml-2 text-zinc-100 font-bold">Edit Request Info</CardTitle>
                                <div className="flex">
                                    <div className="pl-2 pr-2 flex-1 mt-1">
                                        <h1 className="text-zinc-100 text-xs">Catagory:</h1>
                                        <Select required value={itemCatagory} onValueChange={(value) => setItemCaragory(String(value))}>
                                            <SelectTrigger className="cursor-pointer w-full mt-2 mb-2">
                                                <SelectValue className="text-zinc-100" placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Robot">Robot</SelectItem>
                                                <SelectItem value="Competition">Competition</SelectItem>
                                                <SelectItem value="Tools">Tools</SelectItem>
                                                <SelectItem value="Field">Field</SelectItem>
                                                <SelectItem value="Outreach">Outreach</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="pl-2 pr-2 flex-1 mt-1">
                                        <Select required value={orderVendor} onValueChange={(value) => setOrderVendor(String(value))}>
                                            <h1 className="text-zinc-100 text-xs">Supplier:</h1>
                                            <SelectTrigger className="cursor-pointer w-full mt-2 mb-2">
                                                <SelectValue className="text-zinc-100" placeholder="Select a supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="WCP">WCP</SelectItem>
                                                <SelectItem value="CTRE">CTRE</SelectItem>
                                                <SelectItem value="Digi-Key">Digi-Key</SelectItem>
                                                <SelectItem value="Amazon">Andy Mark</SelectItem>
                                                <SelectItem value="Mouser">Mouser</SelectItem>
                                                <SelectItem value="Amazon">Amazon</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {(status == 'needsAproval' || status == 'approved') && (
                            <Card className="bg-mist-800 mt-2 m-1 m-1 p-0 rounded-xl gap-0">
                                {(status == 'approved' && expidited != "approved") && (
                                    <h1 className="text-emerald-500 text-xl font-bold p-1 pl-3">Will be Ordered: {getNextPurchaseDate()}</h1>
                                )}
                                {(status == 'needsAproval' && expidited != "approved") && (
                                    <h1 className="text-yellow-600 text-xl font-bold p-1 pl-3">Can be Ordered: {getNextPurchaseDate()}</h1>
                                )}
                                {(expidited == "approved" && status == "needsAproval") && (
                                    <h1 className="text-yellow-600 text-xl font-bold p-1 pl-3">Expidited: Needs Approval(s)</h1>
                                )}
                                {(expidited == "approved" && status == "approved") && (
                                    <h1 className="text-emerald-500 text-xl font-bold p-1 pl-3">Expidited: Can be Ordered Now</h1>
                                )}
                            </Card>
                        )}
                        <Card className="bg-mist-800 mt-2 m-1 m-1 p-0 rounded-xl gap-0">
                            <div className="flex p-2 pb-0">
                                {(!editMode) && (
                                    <CardTitle className="text-lg ml-2 text-zinc-100 font-bold">Items</CardTitle>
                                )}
                                {(editMode) && (
                                    <CardTitle className="text-lg ml-2 text-zinc-100 font-bold">Edit Items</CardTitle>
                                )}
                                <div className="flex ml-auto">
                                </div>
                            </div>
                            {needsScroll ? (
                                <ScrollArea style={{ height: `${MAX_VISIBLE_ITEMS * ITEM_HEIGHT}px` }} className="w-full rounded-md pr-3">
                                    {itemList}
                                </ScrollArea>
                            ) : (
                                itemList
                            )}
                            {(editMode) && (
                                <div className="p-2 bg-mist-700 m-2 rounded-md mt-3">
                                    <Progress
                                        className=""
                                        max={4000}
                                        value={calculatePrice()}
                                    >
                                        <div className="flex w-full">
                                            <ProgressLabel className="text-zinc-100 text-sm mr-auto">Remaining Budget</ProgressLabel>
                                            {(calcPercent() > 10) && (
                                                <h1 className="ml-auto text-green-500 text-sm">{calcPercent()}%% Remains</h1>
                                            )}
                                            {(calcPercent() < 10 && !(calcPercent() < 0)) && (
                                                <h1 className="ml-auto text-orange-500 text-sm">{calcPercent()}%% Remains</h1>
                                            )}
                                            {(calcPercent() < 0) && (
                                                <h1 className="ml-auto text-red-500 text-sm">{calcPercent()}%% Remains</h1>
                                            )}
                                        </div>
                                    </Progress>
                                </div>
                            )}
                            <div className="flex p-2">
                                <h1 className="text-2xl text-zinc-100 font-bold">${calculatePrice().toFixed(2)}</h1>
                                <div className="ml-auto">
                                </div>
                            </div>
                        </Card>
                        {(!editMode) && (
                            <Card className="bg-mist-800 mt-2 m-1 p-0 rounded-xl gap-0">
                                <CardTitle className="text-lg ml-4 text-zinc-100 font-bold mt-3">Approvers</CardTitle>
                                <div className="p-2">
                                    {purchaseApprovers()}
                                </div>
                            </Card>
                        )}
                    </DrawerContent>
                </Drawer>
            </Card>
        </div>
    )
}