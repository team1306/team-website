import { useState } from "react"
import { Button } from "./ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";
import { useEffect } from "react";
import { Card, CardTitle, CardDescription } from "./ui/card";
import { Input } from "@base-ui/react";
import { Field, FieldLabel } from "./ui/field";
import { Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"
import { ItemData, PurchaseData } from "@/app/page";

interface Approver {
    approved: boolean;
    approverName: string;
    requiredRole: string;
    approverPicture: string;
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

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 767px)");
        setIsMobile(mql.matches);

        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);


    return (
        <div>
            <Button onClick={() => setOpen(true)} className="cursor-pointer text-base w-fit p-3 bg-emerald-600 hover:bg-emerald-700">Purchase Items</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection={isMobile ? "down" : "down"} modal={false}>
                <DrawerContent className="bg-mist-800 border-0 p-0 m-0 rounded-none rounded-tl-lg rounded-bl-lg w-full md:w-1/3 md:w-full">
                    <div className="bg-mist-700 w-full h-fit flex">
                        <DrawerTitle className="text-zinc-100 text-2xl m-1 ml-2">Items to Purchase</DrawerTitle>
                    </div>
                    <div className="">
                    <ScrollArea className="h-screen w-full p-2 pr-3">
                        {vendors.map(vendorName => (
                            <Vendor key={vendorName} vendorName={vendorName} items={getItemsForVendor(vendorName)} />
                        ))}
                        <Card className="bg-mist-700 pb-0 p-0 mb-10 p-2">
                            <CardTitle className="text-zinc-100 text-2xl font-bold">Total Spending: $200</CardTitle>
                            <Button className="">Submit</Button>
                        </Card>
                    </ScrollArea>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

function Vendor({ items, vendorName }: { items: ItemData[]; vendorName: string }) {
    const [shippingCost, setShippingCost] = useState(Number());
    const [tax, setTax] = useState(Number());
    const [vendorItems, setVendorItems] = useState<ItemData[]>(items);

    function toggleItemPurchased(id: string) {
        setVendorItems(prevItems =>
            prevItems.map(item =>
                item.id === id ? { ...item, ordered: !item.ordered } : item
            )
        );
    }

    function complete(): boolean {
        return vendorItems.length > 0 && vendorItems.every(item => item.ordered);
    }

    return (
        <Card className="bg-mist-700 pb-0 p-0 mb-3">
            <CardTitle className={`text-zinc-100 text-base p-1 bg-mist-500 ${complete() ? "bg-emerald-600" : "bg-mist-500"}`}>{vendorName}</CardTitle>
            <div className="p-1 pt-0">
                <div className="flex flex-col gap-1">
                    {vendorItems.map(item => (
                        <Item key={item.id} id={item.id} ItemName={item.ItemName} ItemCost={item.ItemCost} ItemQuantity={item.ItemQuantity} ItemLink={item.ItemLink} ordered={item.ordered||false} toggleItemPurchased={toggleItemPurchased}></Item>
                    ))}
                </div>
            </div>
            <div className="bg-mist-600 w-full p-1 flex gap-4">
                <Field className="w-1/4 h-fit">
                        <FieldLabel className="text-sm text-zinc-100">Tax<span className="text-destructive">*</span>: </FieldLabel>
                        <Input type="text" placeholder="" value={tax} onValueChange={(value) => setTax(Number(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1 w-full"></Input>
                </Field>
                <Field className="w-1/4 h-fit">
                        <FieldLabel className="text-sm text-zinc-100">Shipping<span className="text-destructive">*</span>: </FieldLabel>
                        <Input type="text" placeholder="" value={shippingCost} onValueChange={(value) => setShippingCost(Number(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1 w-full"></Input>
                </Field>
                <Field className="w-1/2 h-fit">
                        <FieldLabel className="text-sm text-zinc-100">Order Number: </FieldLabel>
                        <Input type="text" placeholder="" value={shippingCost} onValueChange={(value) => setShippingCost(Number(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1 w-full"></Input>
                </Field>
            </div>
        </Card>
    )
}


interface item {
    key: string;
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    ordered: boolean;
    toggleItemPurchased: (id: string) => void
}


function Item({ id, ItemName, ItemCost, ItemQuantity, ItemLink, toggleItemPurchased, ordered }: item) {

    return (
        <Card onClick={() => toggleItemPurchased(id)} className={`p-1 gap-0 cursor-pointer ${ordered ? "bg-emerald-600" : "bg-mist-500"}`}>
            <div className="flex">
            <CardTitle className="text-zinc-100">{ItemName}</CardTitle>
            <Button className="bg-zinc-100 text-black text-lg hover:bg-zinc-300 ml-auto" onClick={(e) => {e.stopPropagation(); window.open(ItemLink, "_blank")}}><Globe /></Button>
            </div>
            <CardDescription className="text-zinc-200">x{ItemQuantity} at ${ItemCost.toFixed(2)}</CardDescription>
        </Card>
    )
}