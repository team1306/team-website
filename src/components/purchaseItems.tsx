import { useState } from "react"
import { Button } from "./ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";
import { useEffect } from "react";
import { Card, CardTitle, CardDescription } from "./ui/card";
import { Input } from "@base-ui/react";
import { Field, FieldLabel } from "./ui/field";

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments: string;
    userRole: string;
}

interface Approver {
    approved: boolean;
    approverName: string;
    requiredRole: string;
    approverPicture: string;
}

interface PurchaseData {
    id: string;
    title: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: string;
    status: string;
    items: ItemData[];
    vendor: string;
    reason: string;
    approvers: Approver[];
    expidited: string;
}

interface PurchaseItemsProps {
    orders: PurchaseData[];
}

export default function PurchaseItems({ orders }: PurchaseItemsProps) {
    const [open, setOpen] = useState(false);
    const [purchases, setPurchases] = useState<PurchaseData[]>([]);

    useEffect(() => {
        setPurchases(orders);
    }, []);

    function getItemsForVendor(vendorName: string): ItemData[] {
        return orders
            .filter(order => order.status.toLowerCase() === "approved" && order.vendor === vendorName)
            .flatMap(order => order.items);
    }

    const vendors = Array.from(new Set(
        orders
            .filter(order => order.status.toLowerCase() === "approved")
            .map(order => order.vendor)
    ));


    return (
        <div>
            <Button onClick={() => setOpen(true)} className="cursor-pointer text-base w-fit p-3 bg-emerald-600 hover:bg-emerald-700">Purchase Items</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                <DrawerContent className="bg-mist-800 border-0 p-0 m-0 rounded-none rounded-tl-lg rounded-bl-lg">
                    <div className="bg-mist-700 w-full h-fit flex">
                        <DrawerTitle className="text-zinc-100 text-2xl m-1 ml-2">Items to Purchase</DrawerTitle>
                    </div>
                    <div className="p-2">
                        {vendors.map(vendorName => (
                            <Vendor key={vendorName} vendorName={vendorName} items={getItemsForVendor(vendorName)} />
                        ))}
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

function Vendor({ items, vendorName }: { items: ItemData[]; vendorName: string }) {
    const [shippingCost, setShippingCost] = useState(Number())
    const [tax, setTax] = useState(Number())


    return (
        <Card className="bg-mist-700 pb-0 p-0 mb-3">
            <div className="p-1">
                <CardTitle className="text-zinc-100 text-base mb-1">{vendorName}</CardTitle>
                <div className="flex flex-col gap-1">
                    {items.map(item => (
                        <Item key={item.id} ItemName={item.ItemName} ItemCost={item.ItemCost} ItemQuantity={item.ItemQuantity} ItemLink={item.ItemLink} comments={item.comments}></Item>
                    ))}
                </div>
            </div>
            <div className="bg-mist-600 w-full p-1">
                <Field>
                    <div className="flex gap-1 items-center">
                        <FieldLabel className="text-sm text-zinc-100">Tax: </FieldLabel>
                        <Input type="text" placeholder="" value={tax} onValueChange={(value) => setTax(Number(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                    </div>
                </Field>
                <Field>
                    <div className="flex gap-1 items-center mt-1">
                        <FieldLabel className="text-sm text-zinc-100">Shipping Cost: </FieldLabel>
                        <Input type="text" placeholder="" value={shippingCost} onValueChange={(value) => setShippingCost(Number(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                    </div>
                </Field>
            </div>
        </Card>
    )
}


interface item {
    key: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments: string;
}


function Item({ ItemName, ItemCost, ItemQuantity }: item) {
    const [purchased, setPurchased] = useState(false)

    function togglePurchased() {
        setPurchased(prev => !prev);
    }

    return (
        <Card onClick={togglePurchased} className={`p-1 gap-0 cursor-pointer ${purchased ? "bg-emerald-600" : "bg-mist-500"}`}>
            <CardTitle className="text-zinc-100">{ItemName}</CardTitle>
            <CardDescription className="text-zinc-200">x{ItemQuantity} at ${ItemCost.toFixed(2)}</CardDescription>
        </Card>
    )
}