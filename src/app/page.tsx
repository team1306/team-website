'use client'
import Navbar from "./navbar";
import Purchase from "./purchaseCard";

export default function Home() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar userName="Example User" userRole="president" userPicture=""></Navbar>
      <Purchase itemName="Season Registration" cost={6500} requestor="Example User" catagory="Competition" requestedDate="2026-06-10" status="needsAproval"/>
      <Purchase itemName="CTRE Restock" cost={1258} requestor="Example User" catagory="Robot" requestedDate="2026-06-12" status="aproved"/>
      <Purchase itemName="Molex Crimping Tool" cost={499} requestor="Example User" catagory="Tools" requestedDate="2026-06-12" status="purchased"/>
      <Purchase itemName="BIOCORE Scoring Elements" cost={169} requestor="Example User" catagory="Field" requestedDate="2026-06-12" status="recived"/>
      <Purchase itemName="Outreach Barrier Spray Paint" cost={50} requestor="Example User" catagory="Outreach" requestedDate="2026-06-12" status="rejected"/>
    </div>
  );
}
