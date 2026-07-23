'use client'
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/ui/navbar";
import Purchase from "@/components/dispalayPurchase/purchaseCard";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import CreatePurchase from "@/components/createPurchase/createPurchase";
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
import { Globe } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Suspense } from "react";

interface Vendor {
    vendorName: string;
    orders: PurchaseData[];
    userRole: string;
    cleanOrders: PurchaseData[];
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments: string;
    userRole: string;
}

interface PurchaseData {
    id: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: string;
    status: string;
    items: ItemData[];
    vendor: string;
}

const systemCoreOrder: ItemData[] = [
    { id: "cb18f07d-38ee-48ec-8387-695d7604c4c3", ItemName: "System Core", ItemCost: 699.99, ItemQuantity: 2, ItemLink: "https://andymark.com/", comments: "Not Avalible Until Season, Estimated Price", userRole: "programDirector" }
];

const items: ItemData[] = [
    { id: "cb18f07d-38ee-48ec-8387-695d7604c4c3", ItemName: "Kraken X60", ItemCost: 217.99, ItemQuantity: 4, ItemLink: "https://store.ctr-electronics.com/", comments: "", userRole: "programDirector" },
    { id: "5dd9856a-5b17-4dbb-b093-34300f479808", ItemName: "Kraken X44", ItemCost: 217.99, ItemQuantity: 6, ItemLink: "https://store.ctr-electronics.com/", comments: "Backordered Until Late Fall", userRole: "programDirector" },
];

export default function Orders() {

    return (
        <Suspense fallback={null}>
            <Page />
        </Suspense>
    );
}

export function Page() {
    const searchParams = useSearchParams();
    const user = searchParams.get("user");
    const [userRole, setUserRole] = useState(String(user)); //Change User Role

    const [statusFilter, setStatusFilter] = useState(['needsAproval', 'aproved', 'rejected', 'onHold']);

    const Purchases: PurchaseData[] = [
        { id: "CTRE Restock", cost: 2179.90, requestor: "Example User", catagory: "Robot", requestedDate: "2026-07-06", status: "needsAproval", items: items, vendor: "CTRE" },
        { id: "Season Registration", cost: 1258, requestor: "Example User", catagory: "Competition", requestedDate: "2026-06-12", status: "aproved", items: items, vendor: "Other - FIRST" },
        { id: "Molex Crimping Tool", cost: 499, requestor: "Example User", catagory: "Tools", requestedDate: "2026-06-12", status: "purchased", items: items, vendor: "Digi-Key" },
        { id: "BIOCORE Scoring Elements", cost: 169, requestor: "Example User", catagory: "Field", requestedDate: "2026-06-12", status: "recived", items: items, vendor: "Andy Mark" },
        { id: "Outreach Barrier Spray Paint", cost: 50, requestor: "Example User", catagory: "Outreach", requestedDate: "2026-06-12", status: "needsAproval", items: items, vendor: "Other - Hardware Store" },
        { id: "System Core", cost: 699.99, requestor: "Example User", catagory: "Robot", requestedDate: "2026-07-20", status: "onHold", items: systemCoreOrder, vendor: "Other" },
    ];

    function getOrdersBySupplier(vendor: string): PurchaseData[] {
        return Purchases.filter((purchase) => {
            const vendorMatch = vendor === "Other"
                ? purchase.vendor.startsWith("Other")
                : purchase.vendor === vendor;

            const statusMatch = statusFilter.includes(purchase.status);

            return vendorMatch && statusMatch;
        });
    }

    function getOrdersBySupplierClean(vendor: string): PurchaseData[] {
        return Purchases.filter((purchase) => {
            const vendorMatch = vendor === "Other"
                ? purchase.vendor.startsWith("Other")
                : purchase.vendor === vendor;

            return vendorMatch;
        });
    }

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Navbar userName="Example User" userRole={userRole} userPicture="" />
            <div className="p-2 pt-5">
                <Card className="bg-slate-800 p-2 rounded-xl mb-8">
                    <div className="flex">
                        <div className="flex items-center mt-2 mb-2">
                            <CardTitle className="text-zinc-100 text-3xl font-bold ml-1 mb-0 p-0">Next Ordering Day: 7/20</CardTitle>
                            <Badge className="text-base ml-3 w-fit h-fit border-3 border-orange-400 bg-transparent font-bold text-orange-400">2 Days Left</Badge>
                        </div>
                        <div className="ml-auto">
                            <CreatePurchase />
                        </div>
                    </div>
                    <div className="ml-1 mb-1">
                        <h1 className="text-zinc-100 text-base mb-2">Filter by Status:</h1>
                        <ToggleGroup multiple value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                            <ToggleGroupItem value="needsAproval" className="cursor-pointer border-amber-400 text-amber-400 border-3 text-base font-bold hover:bg-amber-500 hover:text-black group aria-pressed:bg-amber-400 aria-pressed:text-black">Needs Approval</ToggleGroupItem>
                            <ToggleGroupItem value="aproved" className="cursor-pointer border-blue-400 text-blue-400 border-3 text-base font-bold hover:bg-blue-500 hover:text-black group aria-pressed:bg-blue-400 aria-pressed:text-black">Approved</ToggleGroupItem>
                            <ToggleGroupItem value="rejected" className="cursor-pointer border-red-400 text-red-400 border-3 text-base font-bold hover:bg-red-500 hover:text-black group aria-pressed:bg-red-400 aria-pressed:text-black">Rejected</ToggleGroupItem>
                            <ToggleGroupItem value="onHold" className="cursor-pointer border-orange-400 text-orange-400 border-3 text-base font-bold hover:bg-orange-500 hover:text-black group aria-pressed:bg-orange-400 aria-pressed:text-black">On Hold</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </Card>
                <VendorCard vendorName="CTRE" orders={getOrdersBySupplier("CTRE")} userRole={userRole} cleanOrders={getOrdersBySupplierClean("CTRE")} />
                <VendorCard vendorName="Digi-Key" orders={getOrdersBySupplier("Digi-Key")} userRole={userRole} cleanOrders={getOrdersBySupplierClean("Digi-Key")} />
                <VendorCard vendorName="Andy Mark" orders={getOrdersBySupplier("Andy Mark")} userRole={userRole} cleanOrders={getOrdersBySupplierClean("Andy Mark")} />
                <VendorCard vendorName="Other" orders={getOrdersBySupplier("Other")} userRole={userRole} cleanOrders={getOrdersBySupplierClean("Other")} />
            </div>
        </div>
    )
}

export function VendorCard({ vendorName, orders, userRole, cleanOrders }: Vendor) {
    const [open, setOpen] = useState(false);
    const [showUnapproved, setShowUnapproved] = useState(false);
    const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

    const togglePurchased = (id: string) => {
        setPurchasedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const cardStatus = (status: string, id: string) => {
        if (purchasedIds.has(id)) {
            return ("p-2 bg-emerald-800 mb-2 pb-0");
        }
        else if (showUnapproved && status == "needsAproval") {
            return ("p-2 bg-amber-600 mb-2 pb-0");
        }
        else if (showUnapproved && status == "onHold") {
            return ("p-2 bg-red-600 mb-2 pb-0");
        }
        else {
            return ("p-2 bg-mist-600 mb-2 pb-0");
        }
    }

    return (
        <div>
            {(orders.length != 0) && (
                <Card className="bg-slate-800 p-0 rounded-xl mb-4">
                    <div className="flex m-0">
                        <CardTitle className="text-zinc-100 text-3xl font-bold ml-4 mb-0 p-0 mt-3">{vendorName}</CardTitle>
                        {(userRole == "programDirector") && (
                            <Button onClick={() => setOpen(true)} className="ml-auto text-lg p-2 bg-emerald-600 mt-2 mr-2 hover:bg-emerald-700 cursor-pointer">Order Items</Button>
                        )}
                    </div>
                    <div className="pl-2 pr-2 pb-2">
                        {orders.map((purchase) => (<div key={purchase.id} className="mb-3"><Purchase key={purchase.id} itemName={purchase.id} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={purchase.requestedDate} status={purchase.status} items={purchase.items} vendor={purchase.vendor} userRole={userRole} /></div>))}
                    </div>
                    <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal={false}>
                        <DrawerContent className="p-0 m-0 bg-mist-800 border-0 rounded-tr-none rounded-br-none">
                            <DrawerHeader className="bg-mist-900 p-2 mb-1 font-bold rounded-tl-sm rounded-b-none rounded-tr-none gap-0 t">
                                <DrawerTitle className="text-zinc-100 text-2xl font-jetbrains ">Items from {vendorName}</DrawerTitle>
                                <Field orientation="horizontal" className="mt-1">
                                    <Checkbox id="showUnapproved" checked={showUnapproved} onCheckedChange={setShowUnapproved} />
                                    <FieldLabel className="text-zinc-100 text-base " htmlFor="showUnapproved">Show Unapproved Items</FieldLabel>
                                </Field>
                            </DrawerHeader>
                            <div className="p-2">
                                {cleanOrders.map((purchase) => (
                                    (purchase.status == "aproved" || (showUnapproved && (purchase.status == "needsAproval" || purchase.status == "onHold"))) && (
                                        <Card key={purchase.id} className={cardStatus(purchase.status, purchase.id)} onClick={() => togglePurchased(purchase.id)}>
                                            <CardTitle className="text-zinc-100 text-lg font-bold">{purchase.id}</CardTitle>
                                            <div>
                                                {purchase.items.map((item) => (
                                                    <Item
                                                        key={`${purchase.id}-${item.id}`}
                                                        name={item.ItemName}
                                                        cost={item.ItemCost}
                                                        quantity={item.ItemQuantity}
                                                        link={item.ItemLink}
                                                        status={purchase.status}
                                                        comments={item.comments}
                                                    />
                                                )
                                                )}
                                            </div>
                                        </Card>
                                    )
                                ))}
                            </div>
                            <DrawerFooter className="bg-mist-900 p-2 font-bold rounded-bl-small rounded-tr-small gap-0 text-zinc-100 text-2xl font-jetbrains ">
                                <Button onClick={() => setOpen(false)} className="text-base bg-red-900 font-bold hover:bg-red-950">Mark Selected As Purchased</Button>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </Card>
            )
            }
        </div >
    );
}

interface Items {
    name: string;
    cost: number;
    quantity: number;
    link: string;
    status: string;
    comments: string;
}

export function Item({ name, cost, quantity, link, status, comments }: Items) {
    const [purchased, setPurchased] = useState(false);

    return (
        <Card className="bg-mist-700 p-0 mb-2 gap-0">
            <div className="flex p-2">
                <div>
                    <CardTitle className="text-lg font-bold text-zinc-100">{name}</CardTitle>
                    <CardDescription className="text-base font-bold text-zinc-100">x{quantity} at ${cost}</CardDescription>
                </div>
                {(link) && (
                    <Button className="bg-zinc-100 text-black ml-auto hover:bg-zinc-300" onClick={(e) => { e.stopPropagation(); window.open(link, "_blank", "noopener,noreferrer"); }}><Globe /></Button>
                )}
                {(!link) && (
                    <Button disabled className="bg-red-700 text-black ml-auto hover:bg-red-700"><Globe /></Button>
                )}
            </div>
            {(comments) && (
                <div className="bg-red-900 p-1 font-bold rounded-bl-small rounded-tr-small mt-0">
                    <h1 className="text-base text-zinc-100 font-bold">{comments}</h1>
                </div>
            )}
        </Card>
    )
}