'use client'
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/ui/navbar";
import Purchase from "@/components/dispalayPurchase/purchaseCard";
import { Badge } from "@/components/ui/badge";

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
        return Purchases.filter((purchase) => purchase.vendor === vendor);
    }

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Navbar userName="Example User" userRole={userRole} userPicture="" />
            <div className="p-2 pt-5">
                <Card className="bg-mist-800 p-2 rounded-xl mb-8">
                    <div className="flex items-center mt-2 mb-2">
                        <CardTitle className="text-zinc-100 text-3xl font-bold ml-1 mb-0 p-0">Next Ordering Day: 7/20</CardTitle>
                        <Badge className="text-base ml-3 w-fit h-fit border-3 border-orange-400 bg-transparent font-bold text-orange-400">Ordering Soon</Badge>
                    </div>
                </Card>
                <VendorCard vendorName="CTRE" orders={getOrdersBySupplier("CTRE")} userRole={userRole} />
                <VendorCard vendorName="Digi-Key" orders={getOrdersBySupplier("Digi-Key")} userRole={userRole} />
                <VendorCard vendorName="Digi-Key" orders={getOrdersBySupplier("Andy Mark")} userRole={userRole} />
            </div>
        </div>
    );
}

export function VendorCard({ vendorName, orders, userRole }: Vendor) {
    return (
        <Card className="bg-mist-800 p-2 rounded-xl mb-6">
            <div className="flex">
                <CardTitle className="text-zinc-100 text-3xl font-bold ml-1 mb-0 p-0 mt-2">{vendorName}</CardTitle>
                <Button className="ml-auto text-lg p-2 bg-emerald-600 mt-1 mr-1 hover:bg-emerald-700 cursor-pointer">Mark Ordered</Button>
                </div>
            <div className="p-0">
                {orders.map((purchase) => (<Purchase key={purchase.id} itemName={purchase.id} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={purchase.requestedDate} status={purchase.status} items={purchase.items} vendor={purchase.vendor} userRole={userRole} />))}
            </div>
        </Card>
    );
}