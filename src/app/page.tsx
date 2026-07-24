'use client'
import Navbar from "../components/ui/navbar";
import Purchase from "../components/dispalayPurchase/purchaseCard";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Cog, Swords, Wrench, Volleyball, Handshake, } from "lucide-react"
import CreatePurchase from "../components/createPurchase/createPurchase";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
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
}

export function Page() {
  const searchParams = useSearchParams();
  const user = searchParams.get("user");

  const [userRole, setUserRole] = useState(String(user));
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);

  const [catagoryFilter, setCatagoryFilter] = useState(['Robot', "Competition", "Tools", "Field", "Outreach"])
  const [statusFilter, setStatusFilter] = useState(['needsAproval', 'aproved', 'purchased', 'recived', 'rejected', 'onHold'])

  useEffect(() => {
    async function loadPurchases() {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      setPurchases(data.parsed ?? []);
    }
    loadPurchases();
  }, []);

  function filterPurchases(): PurchaseData[] {
    return purchases.filter((purchase) => {
      const categoryMatch = catagoryFilter.includes(purchase.catagory);
      const statusMatch = statusFilter.includes(purchase.status);
      return categoryMatch && statusMatch;
    });
  }

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US');
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
          <Purchase key={purchase.id} itemName={purchase.title} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={formatDate(purchase.requestedDate)} status={purchase.status} items={purchase.items} vendor={purchase.vendor} userRole={userRole} />
        </div>
      ))}
    </div>
  );
}