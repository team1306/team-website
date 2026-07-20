'use client'
import Navbar from "../components/ui/navbar";
import Purchase from "../components/dispalayPurchase/purchaseCard";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Cog, Swords, Wrench, Volleyball, Handshake, } from "lucide-react"
import CreatePurchase from "../components/createPurchase/createPurchase";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();
  const user = searchParams.get("user");

  const [userRole, setUserRole] = useState(String(user));//Change User Role
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

  const [catagoryFilter, setCatagoryFilter] = useState(['Robot', "Competition", "Tools", "Field", "Outreach"])
  const [statusFilter, setStatusFilter] = useState(['needsAproval', 'aproved', 'purchased', 'recived', 'rejected', 'onHold'])

  const items: ItemData[] = [
    { id: "cb18f07d-38ee-48ec-8387-695d7604c4c3", ItemName: "Kraken X60", ItemCost: 217.99, ItemQuantity: 4, ItemLink: "", comments: "", userRole: userRole },
    { id: "5dd9856a-5b17-4dbb-b093-34300f479808", ItemName: "Kraken X44", ItemCost: 217.99, ItemQuantity: 6, ItemLink: "", comments: "Backordered Until Late Fall", userRole: userRole },
  ];

  const systemCoreOrder: ItemData[] = [
    { id: "cb18f07d-38ee-48ec-8387-695d7604c4c3", ItemName: "System Core", ItemCost: 699.99, ItemQuantity: 2, ItemLink: "https://andymark.com/", comments: "Not Avalible Until Season, Estimated Price", userRole: userRole }
  ];

  const Purchases: PurchaseData[] = [
    { id: "CTRE Restock", cost: 2179.90, requestor: "Example User", catagory: "Robot", requestedDate: "2026-07-06", status: "needsAproval", items: items, vendor: "CTRE" },
    { id: "Season Registration", cost: 1258, requestor: "Example User", catagory: "Competition", requestedDate: "2026-06-12", status: "aproved", items: items, vendor: "Other - FIRST" },
    { id: "Molex Crimping Tool", cost: 499, requestor: "Example User", catagory: "Tools", requestedDate: "2026-06-12", status: "purchased", items: items, vendor: "Digi-Key" },
    { id: "BIOCORE Scoring Elements", cost: 169, requestor: "Example User", catagory: "Field", requestedDate: "2026-06-12", status: "recived", items: items, vendor: "Andy Mark" },
    { id: "Outreach Barrier Spray Paint", cost: 50, requestor: "Example User", catagory: "Outreach", requestedDate: "2026-06-12", status: "rejected", items: items, vendor: "Other - Hardware Store" },
    { id: "System Core", cost: 699.99, requestor: "Example User", catagory: "Robot", requestedDate: "2026-07-20", status: "onHold", items: systemCoreOrder, vendor: "Andy Mark" },
  ];

  function filterPurchases(): PurchaseData[] {
    return Purchases.filter((purchase) => {
      const categoryMatch = catagoryFilter.includes(purchase.catagory);
      const statusMatch = statusFilter.includes(purchase.status);

      return categoryMatch && statusMatch;
    });
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar userName="Example User" userRole={userRole} userPicture=""></Navbar>
      <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0">
        <div className="flex justify-between items-start">
          <div className="flex gap-6">
            <div>
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Catagory:</h1>
              <ToggleGroup multiple value={catagoryFilter} onValueChange={(value) => setCatagoryFilter(value)}>
                <ToggleGroupItem value="Robot" className="cursor-pointer border-yellow-600 text-yellow-600 border-3 text-base font-bold hover:bg-yellow-500 hover:text-black group aria-pressed:bg-yellow-600 aria-pressed:text-black"><Cog className="size-4 text-yellow-600 group-hover:text-black group-aria-pressed:text-black" /> Robot</ToggleGroupItem>
                <ToggleGroupItem value="Competition" className="cursor-pointer border-emerald-600 text-emerald-600 border-3 text-base font-bold hover:bg-emerald-500 hover:text-black group aria-pressed:bg-emerald-600 aria-pressed:text-black"><Swords className="size-4 text-emerald-600 group-hover:text-black group-aria-pressed:text-black" /> Competition</ToggleGroupItem>
                <ToggleGroupItem value="Tools" className="cursor-pointer border-rose-600 text-rose-600 border-3 text-base font-bold hover:bg-rose-500 hover:text-black group aria-pressed:bg-rose-600 aria-pressed:text-black"><Wrench className="size-4 text-rose-600 group-hover:text-black group-aria-pressed:text-black" /> Tools</ToggleGroupItem>
                <ToggleGroupItem value="Field" className="cursor-pointer border-lime-600 text-lime-600 border-3 text-base font-bold hover:bg-lime-500 hover:text-black group aria-pressed:bg-lime-600 aria-pressed:text-black"><Volleyball className="size-4 text-lime-600 group-hover:text-black group-aria-pressed:text-black" /> Field</ToggleGroupItem>
                <ToggleGroupItem value="Outreach" className="cursor-pointer border-cyan-600 text-cyan-600 border-3 text-base font-bold hover:bg-cyan-500 hover:text-black group aria-pressed:bg-cyan-600 aria-pressed:text-black"><Handshake className="size-4 text-cyan-600 group-hover:text-black group-aria-pressed:text-black" /> Outreach</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Status:</h1>
              <ToggleGroup multiple value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <ToggleGroupItem value="needsAproval" className="cursor-pointer border-amber-400 text-amber-400 border-3 text-base font-bold hover:bg-amber-500 hover:text-black group aria-pressed:bg-amber-400 aria-pressed:text-black">Needs Approval</ToggleGroupItem>
                <ToggleGroupItem value="aproved" className="cursor-pointer border-blue-400 text-blue-400 border-3 text-base font-bold hover:bg-blue-500 hover:text-black group aria-pressed:bg-blue-400 aria-pressed:text-black">Approved</ToggleGroupItem>
                <ToggleGroupItem value="purchased" className="cursor-pointer border-pink-400 text-pink-400 border-3 text-base font-bold hover:bg-pink-500 hover:text-black group aria-pressed:bg-pink-400 aria-pressed:text-black">Purchased</ToggleGroupItem>
                <ToggleGroupItem value="recived" className="cursor-pointer border-green-400 text-green-400 border-3 text-base font-bold hover:bg-green-500 hover:text-black group aria-pressed:bg-green-400 aria-pressed:text-black">Received</ToggleGroupItem>
                <ToggleGroupItem value="rejected" className="cursor-pointer border-red-400 text-red-400 border-3 text-base font-bold hover:bg-red-500 hover:text-black group aria-pressed:bg-red-400 aria-pressed:text-black">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="onHold" className="cursor-pointer border-orange-400 text-orange-400 border-3 text-base font-bold hover:bg-orange-500 hover:text-black group aria-pressed:bg-orange-400 aria-pressed:text-black">On Hold</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <div className="ml-auto">
            <CreatePurchase></CreatePurchase>
          </div>
        </div>
      </Card>
      {filterPurchases().map((purchase) => (
        <div key={purchase.id} className="m-3 mt-4">
          <Purchase key={purchase.id} itemName={purchase.id} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={purchase.requestedDate} status={purchase.status} items={purchase.items} vendor={purchase.vendor} userRole={userRole} />
        </div>
      ))}
    </div>
  );
}
