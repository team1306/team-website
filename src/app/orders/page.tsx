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

interface Vendor {
    vendorName: string;
    orders: PurchaseData[];
    userRole: string;
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

export default function Orders() {
    const searchParams = useSearchParams();
    const user = searchParams.get("user");

    const [userRole, setUserRole] = useState(String(user)); //Change User Role
    const [statusFilter, setStatusFilter] = useState(['needsAproval', 'aproved', 'purchased', 'recived', 'rejected',]);

    const items: ItemData[] = [
        { id: "cb18f07d-38ee-48ec-8387-695d7604c4c3", ItemName: "Kraken X60", ItemCost: 217.99, ItemQuantity: 4, ItemLink: "", comments: "", userRole: userRole },
        { id: "5dd9856a-5b17-4dbb-b093-34300f479808", ItemName: "Kraken X44", ItemCost: 217.99, ItemQuantity: 6, ItemLink: "", comments: "Backordered Until Late Fall", userRole: userRole },
    ];

    const Purchases: PurchaseData[] = [
        { id: "CTRE Restock", cost: 2179.90, requestor: "Example User", catagory: "Robot", requestedDate: "2026-07-06", status: "needsAproval", items: items, vendor: "CTRE" },
        { id: "Season Registration", cost: 1258, requestor: "Example User", catagory: "Competition", requestedDate: "2026-06-12", status: "aproved", items: items, vendor: "Other - FIRST" },
        { id: "Molex Crimping Tool", cost: 499, requestor: "Example User", catagory: "Tools", requestedDate: "2026-06-12", status: "purchased", items: items, vendor: "Digi-Key" },
        { id: "BIOCORE Scoring Elements", cost: 169, requestor: "Example User", catagory: "Field", requestedDate: "2026-06-12", status: "recived", items: items, vendor: "Andy Mark" },
        { id: "Outreach Barrier Spray Paint", cost: 50, requestor: "Example User", catagory: "Outreach", requestedDate: "2026-06-12", status: "rejected", items: items, vendor: "Other - Hardware Store" },
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
                            <ToggleGroupItem value="purchased" className="cursor-pointer border-pink-400 text-pink-400 border-3 text-base font-bold hover:bg-pink-500 hover:text-black group aria-pressed:bg-pink-400 aria-pressed:text-black">Purchased</ToggleGroupItem>
                            <ToggleGroupItem value="recived" className="cursor-pointer border-green-400 text-green-400 border-3 text-base font-bold hover:bg-green-500 hover:text-black group aria-pressed:bg-green-400 aria-pressed:text-black">Received</ToggleGroupItem>
                            <ToggleGroupItem value="rejected" className="cursor-pointer border-red-400 text-red-400 border-3 text-base font-bold hover:bg-red-500 hover:text-black group aria-pressed:bg-red-400 aria-pressed:text-black">Rejected</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </Card>
                <VendorCard vendorName="CTRE" orders={getOrdersBySupplier("CTRE")} userRole={userRole} />
                <VendorCard vendorName="Digi-Key" orders={getOrdersBySupplier("Digi-Key")} userRole={userRole} />
                <VendorCard vendorName="Digi-Key" orders={getOrdersBySupplier("Andy Mark")} userRole={userRole} />
                <VendorCard vendorName="Other" orders={getOrdersBySupplier("Other")} userRole={userRole} />
            </div>
        </div>
    );
}

export function VendorCard({ vendorName, orders, userRole }: Vendor) {
    return (
        <div>
            {(orders.length != 0) && (
                <Card className="bg-slate-800 p-0 rounded-xl mb-4">
                    <div className="flex m-0">
                        <CardTitle className="text-zinc-100 text-3xl font-bold ml-4 mb-0 p-0 mt-3">{vendorName}</CardTitle>
                        {(userRole == "programDirector") && (
                            <Button className="ml-auto text-lg p-2 bg-emerald-600 mt-2 mr-2 hover:bg-emerald-700 cursor-pointer">Order Items</Button>
                        )}
                    </div>
                    <div className="pl-2 pr-2 pb-2">
                        {orders.map((purchase) => (<div key={purchase.id} className="mb-3"><Purchase key={purchase.id} itemName={purchase.id} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={purchase.requestedDate} status={purchase.status} items={purchase.items} vendor={purchase.vendor} userRole={userRole} /></div>))}
                    </div>
                </Card>
            )}
        </div>
    );
}