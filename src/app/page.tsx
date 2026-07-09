'use client'
import Navbar from "../components/ui/navbar";
import Purchase from "../components/dispalayPurchase/purchaseCard";
import { Card} from "@/components/ui/card";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group"
import { Cog, Swords, Wrench, Volleyball, Handshake,} from "lucide-react"
import CreatePurchase from "../components/createPurchase/createPurchase";
import { useState } from "react";

export default function Home() {
  const [userRole, setUserRole] = useState(String("studentLead"));//Change User Role
  interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments: string;
    userRole: string;
}

  const items: ItemData[] = [
    { id: "cb18f07d-38ee-48ec-8387-695d7604c4c3", ItemName: "Kraken X60", ItemCost: 217.99, ItemQuantity: 4, ItemLink: "", comments: "", userRole: userRole},
    { id: "5dd9856a-5b17-4dbb-b093-34300f479808", ItemName: "Kraken X44", ItemCost: 217.99, ItemQuantity: 6, ItemLink: "", comments: "Backordered Until Late Fall", userRole: userRole},
  ];

  return (
    <div className="bg-background min-h-screen">
      <Navbar userName="Andrew Example User" userRole={userRole} userPicture=""></Navbar>
      <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Catagory:</h1>
            <ToggleGroup multiple defaultValue={['Robot', "Competition", "Tools", "Field", "Outreach"]}>
              <ToggleGroupItem value="Robot" className="border-yellow-600 text-yellow-600 border-3 text-base font-bold hover:bg-yellow-500 hover:text-black group aria-pressed:bg-yellow-600 aria-pressed:text-black"><Cog className="size-4 text-yellow-600 group-hover:text-black group-aria-pressed:text-black" /> Robot</ToggleGroupItem>
              <ToggleGroupItem value="Competition" className="border-emerald-600 text-emerald-600 border-3 text-base font-bold hover:bg-emerald-500 hover:text-black group aria-pressed:bg-emerald-600 aria-pressed:text-black"><Swords className="size-4 text-emerald-600 group-hover:text-black group-aria-pressed:text-black" /> Competition</ToggleGroupItem>
              <ToggleGroupItem value="Tools" className="border-rose-600 text-rose-600 border-3 text-base font-bold hover:bg-rose-500 hover:text-black group aria-pressed:bg-rose-600 aria-pressed:text-black"><Wrench className="size-4 text-rose-600 group-hover:text-black group-aria-pressed:text-black" /> Tools</ToggleGroupItem>
              <ToggleGroupItem value="Field" className="border-lime-600 text-lime-600 border-3 text-base font-bold hover:bg-lime-500 hover:text-black group aria-pressed:bg-lime-600 aria-pressed:text-black"><Volleyball className="size-4 text-lime-600 group-hover:text-black group-aria-pressed:text-black" /> Field</ToggleGroupItem>
              <ToggleGroupItem value="Outreach" className="border-cyan-600 text-cyan-600 border-3 text-base font-bold hover:bg-cyan-500 hover:text-black group aria-pressed:bg-cyan-600 aria-pressed:text-black"><Handshake className="size-4 text-cyan-600 group-hover:text-black group-aria-pressed:text-black" /> Outreach</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="ml-auto">
              <CreatePurchase></CreatePurchase>
          </div>
        </div>
      </Card>
      <Purchase itemName="CTRE Restock" cost={2179.90} requestor="Example User" catagory="Robot" requestedDate="2026-07-06" status="needsAproval" items={items} shippingCost={20.00} userRole={userRole}/>
      <Purchase itemName="Season Registration" cost={1258} requestor="Example User" catagory="Competition" requestedDate="2026-06-12" status="aproved" items={items} shippingCost={20.00} userRole={userRole}/>
      <Purchase itemName="Molex Crimping Tool" cost={499} requestor="Example User" catagory="Tools" requestedDate="2026-06-12" status="purchased" items={items} shippingCost={20.00} userRole={userRole}/>
      <Purchase itemName="BIOCORE Scoring Elements" cost={169} requestor="Example User" catagory="Field" requestedDate="2026-06-12" status="recived" items={items} shippingCost={20.00} userRole={userRole}/>
      <Purchase itemName="Outreach Barrier Spray Paint" cost={50} requestor="Example User" catagory="Outreach" requestedDate="2026-06-12" status="rejected" items={items} shippingCost={20.00} userRole={userRole}/>
    </div>
  );
}
