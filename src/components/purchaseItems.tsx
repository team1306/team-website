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

interface PurchaseItemsProps {
    orders: PurchaseData[];
}

interface VendorFees {
    tax: string;
    shipping: string;
    orderNumber: string;
}

const EMPTY_FEES: VendorFees = { tax: "", shipping: "", orderNumber: "" };

export default function PurchaseItems({ orders }: PurchaseItemsProps) {
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [orderedIds, setOrderedIds] = useState<Set<string>>(
        () => new Set(
            orders
                .flatMap(order => order.items)
                .filter(item => item.ordered)
                .map(item => item.id)
        )
    );
    const [feesByVendor, setFeesByVendor] = useState<Record<string, VendorFees>>({});

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

    function toggleItemPurchased(id: string) {
        setOrderedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function updateFee(vendorName: string, field: keyof VendorFees, value: string) {
        setFeesByVendor(prev => ({
            ...prev,
            [vendorName]: { ...(prev[vendorName] ?? EMPTY_FEES), [field]: value },
        }));
    }

    function calculateTotalCost(): number {
        return vendors.reduce((total, vendorName) => {
            const selectedItems = getItemsForVendor(vendorName).filter(item => orderedIds.has(item.id));

            if (selectedItems.length === 0) return total;

            const itemsTotal = selectedItems.reduce(
                (sum, item) => sum + item.ItemCost * item.ItemQuantity,
                0
            );
            const fees = feesByVendor[vendorName] ?? EMPTY_FEES;
            const tax = Number(fees.tax) || 0;
            const shipping = Number(fees.shipping) || 0;

            return total + itemsTotal + tax + shipping;
        }, 0);
    }

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
            <Drawer open={open} onOpenChange={setOpen} swipeDirection={isMobile ? "down" : "right"} modal={false}>
                <DrawerContent className="bg-mist-800 border-0 p-0 m-0 rounded-none rounded-tl-lg rounded-bl-lg w-full md:w-1/3">
                    <div className="bg-mist-700 w-full h-fit flex">
                        <DrawerTitle className="text-zinc-100 text-2xl m-1 ml-2">Items to Purchase</DrawerTitle>
                    </div>
                    <div className="">
                        <ScrollArea className="h-screen w-full p-2 pr-3">
                            {vendors.map(vendorName => (
                                <Vendor
                                    key={vendorName}
                                    vendorName={vendorName}
                                    items={getItemsForVendor(vendorName)}
                                    orderedIds={orderedIds}
                                    fees={feesByVendor[vendorName] ?? EMPTY_FEES}
                                    toggleItemPurchased={toggleItemPurchased}
                                    onFeeChange={(field, value) => updateFee(vendorName, field, value)}
                                />
                            ))}
                            <Card className="bg-mist-700 pb-0 p-0 mb-10 p-2">
                                <CardTitle className="text-zinc-100 text-2xl font-bold">Total Spending: ${calculateTotalCost().toFixed(2)}</CardTitle>
                                <Button className="">Submit</Button>
                            </Card>
                        </ScrollArea>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

interface VendorProps {
    items: ItemData[];
    vendorName: string;
    orderedIds: Set<string>;
    fees: VendorFees;
    toggleItemPurchased: (id: string) => void;
    onFeeChange: (field: keyof VendorFees, value: string) => void;
}

function Vendor({ items, vendorName, orderedIds, fees, toggleItemPurchased, onFeeChange }: VendorProps) {
    function complete(): boolean {
        return items.length > 0 && items.every(item => orderedIds.has(item.id));
    }

    return (
        <Card className="bg-mist-700 pb-0 p-0 mb-3">
            <CardTitle className={`text-zinc-100 text-base p-1 bg-mist-500 ${complete() ? "bg-emerald-600" : "bg-mist-500"}`}>{vendorName}</CardTitle>
            <div className="p-1 pt-0">
                <div className="flex flex-col gap-1">
                    {items.map(item => (
                        <Item key={item.id} id={item.id} ItemName={item.ItemName} ItemCost={item.ItemCost} ItemQuantity={item.ItemQuantity} ItemLink={item.ItemLink} ordered={orderedIds.has(item.id)} toggleItemPurchased={toggleItemPurchased}></Item>
                    ))}
                </div>
            </div>
            <div className="bg-mist-600 w-full p-1 flex gap-4">
                <Field className="w-1/4 h-fit">
                    <FieldLabel className="text-sm text-zinc-100">Tax<span className="text-destructive">*</span>: </FieldLabel>
                    <div className="relative mt-1 mr-2 w-full">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">$</span>
                        <Input type="text" inputMode="decimal" placeholder="0.00" value={fees.tax} onValueChange={(value) => onFeeChange("tax", value)} className="bg-mist-800 rounded-md pl-5 text-sm text-zinc-100 w-full"></Input>
                    </div>
                </Field>
                <Field className="w-1/4 h-fit">
                    <FieldLabel className="text-sm text-zinc-100">Shipping<span className="text-destructive">*</span>: </FieldLabel>
                    <div className="relative mt-1 mr-2 w-full">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">$</span>
                        <Input type="text" inputMode="decimal" placeholder="0.00" value={fees.shipping} onValueChange={(value) => onFeeChange("shipping", value)} className="bg-mist-800 rounded-md pl-5 text-sm text-zinc-100 w-full"></Input>
                    </div>
                </Field>
                <Field className="w-1/2 h-fit">
                    <FieldLabel className="text-sm text-zinc-100">Order Number: </FieldLabel>
                    <Input type="text" placeholder="" value={fees.orderNumber} onValueChange={(value) => onFeeChange("orderNumber", value)} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1 w-full"></Input>
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
                <Button className="bg-zinc-100 text-black text-lg hover:bg-zinc-300 ml-auto" onClick={(e) => { e.stopPropagation(); window.open(ItemLink, "_blank") }}><Globe /></Button>
            </div>
            <CardDescription className="text-zinc-200">x{ItemQuantity} at ${ItemCost.toFixed(2)}</CardDescription>
        </Card>
    )
}