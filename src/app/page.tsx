'use client'
import Navbar from "../components/ui/navbar";
import Purchase from "../components/dispalayPurchase/purchaseCard";
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Cog, Swords, Wrench, Volleyball, Handshake, Search } from "lucide-react"
import CreatePurchase from "../components/createPurchase/createPurchase";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@base-ui/react";
import { getUserInfo } from "./auth/getUserInfo/getUserInfo";
import { useRouter } from 'next/navigation'
import PurchaseItems from "@/components/purchaseItems";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}

interface UserData {
  id: string;
  name: string;
  role: string;
  profilePicture: string;
}

export interface ItemData {
  id: string;
  ItemName: string;
  ItemCost: number;
  ItemQuantity: number;
  ItemLink: string;
  comments: string;
  userRole: string;
  ordered?: boolean;
}

interface Approver {
  approved: boolean;
  approverName: string;
  requiredRole: string;
  approverPicture: string;
}

export interface PurchaseData {
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

export function Page() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();

  async function loadUser() {
    try {
      const user = await getUserInfo();
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to load user:", err);
      if (err instanceof Error && err.message === "Not authenticated") {
        router.push("/login?notAuthed=true");
      }
      else {
        router.push("/login");
      }
    } finally {
      setUserLoading(false);
    }
  }

  const searchParams = useSearchParams();
  const user = searchParams.get("user");

  const [purchases, setPurchases] = useState<PurchaseData[]>([]);

  const [catagoryFilter, setCatagoryFilter] = useState(['Robot', "Competition", "Tools", "Field", "Outreach"])
  const [statusFilter, setStatusFilter] = useState(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold'])
  const [nameFilter, setNameFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [searchBarValue, setSearchBarValue] = useState("");

  async function loadPurchases() {
    const res = await fetch('/api/order/getOrders', { cache: 'no-store' });
    const data = await res.json();
    setPurchases(data.parsed ?? []);
  }

  function clearFilters() {
    setCatagoryFilter(['Robot', "Competition", "Tools", "Field", "Outreach"]);
    setStatusFilter(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold']);
    setSearchBarValue("");
  }

  function setRole(newRole: string) {
    setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadUser();
      await loadPurchases();
      setLoading(false);
    }
    init();
  }, []);

  function filterPurchases(): PurchaseData[] {
    return purchases.filter((purchase) => {
      const categoryMatch = purchases; //Temp Overide Until Fix
      const statusMatch = statusFilter.includes(purchase.status);
      const nameMatch = fuzzyMatch(purchase.title, nameFilter);
      return categoryMatch && statusMatch && nameMatch;
    });
  }

  function fuzzyMatch(text: string, query: string): boolean {
    if (!query) return true;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    if (t.includes(q)) return true;
    let ti = 0;
    for (let qi = 0; qi < q.length; qi++) {
      ti = t.indexOf(q[qi], ti);
      if (ti === -1) return false;
      ti++;
    }
    return true;
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      setNameFilter(searchBarValue);
    }, 200);
    return () => clearTimeout(handle);
  }, [searchBarValue]);

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US');
  }

  const ALL_STATUSES = ['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold'];

  function handleStatusFilterChange(newValue: string[]) {
    const wasAllOn = ALL_STATUSES.every((s) => statusFilter.includes(s));
    const clickedAll = newValue.includes("all") && !wasAllOn;
    const unclickedAll = !newValue.includes("all") && wasAllOn && newValue.length > 0;

    if (clickedAll) {
      setStatusFilter(ALL_STATUSES);
      return;
    }

    const realStatuses = newValue.filter((v) => v !== "all");

    if (unclickedAll || (wasAllOn && realStatuses.length === 0 && newValue.length === 0)) {
      setStatusFilter([]);
      return;
    }

    if (wasAllOn && realStatuses.length < ALL_STATUSES.length) {
      const clickedStatus = ALL_STATUSES.find((s) => !realStatuses.includes(s));
      setStatusFilter(clickedStatus ? [clickedStatus] : realStatuses);
      return;
    }

    setStatusFilter(realStatuses);
  }

  const statusToggleValue = ALL_STATUSES.every((s) => statusFilter.includes(s))
    ? [...statusFilter, "all"]
    : statusFilter;

  if (!loading && currentUser) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar updateUserRole={setRole} user={currentUser} />
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 hidden md:block">
          <div className="flex justify-between items-start">
            <div className="flex mb-2">
              <Field>
                <div className="flex gap-2">
                  <FieldLabel className="text-base text-zinc-100" htmlFor="searchBar">Search: </FieldLabel>
                  <div className="relative flex items-center">
                    <Search className="absolute left-2 size-4 text-zinc-400 pointer-events-none" />
                    <Input className="bg-mist-500 text-base text-zinc-100 pl-8 w-96 rounded-lg" value={searchBarValue} onValueChange={(value) => setSearchBarValue(String(value))} type="text" id="searchBar" placeholder="Type to search..." />
                  </div>
                </div>
              </Field>
              <Button onClick={() => { clearFilters() }} className="bg-mist-500 text-base rounded-lg hover:bg-mist-400 cursor-pointer ml-4">Clear All Filters</Button>
            </div>
            <div className="ml-auto flex gap-2">
              {(currentUser.role == "programDirector" || currentUser.role == "teamAdministrator") && (
                <PurchaseItems orders={purchases} onPurchased={loadPurchases} />
              )}
              <CreatePurchase user={currentUser} onPurchaseCreated={loadPurchases}></CreatePurchase>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Catagory:</h1>
              <ToggleGroup multiple value={catagoryFilter} onValueChange={(value) => setCatagoryFilter(value)}>
                <ToggleGroupItem value="Robot" className="cursor-pointer border-yellow-600 text-yellow-600 border-3 text-sm font-bold hover:bg-yellow-500 hover:text-black group aria-pressed:bg-yellow-600 aria-pressed:text-black"><Cog className="size-4 text-yellow-600 group-hover:text-black group-aria-pressed:text-black" /> Robot</ToggleGroupItem>
                <ToggleGroupItem value="Competition" className="cursor-pointer border-emerald-600 text-emerald-600 border-3 text-sm font-bold hover:bg-emerald-500 hover:text-black group aria-pressed:bg-emerald-600 aria-pressed:text-black"><Swords className="size-4 text-emerald-600 group-hover:text-black group-aria-pressed:text-black" /> Competition</ToggleGroupItem>
                <ToggleGroupItem value="Tools" className="cursor-pointer border-rose-600 text-rose-600 border-3 text-sm font-bold hover:bg-rose-500 hover:text-black group aria-pressed:bg-rose-600 aria-pressed:text-black"><Wrench className="size-4 text-rose-600 group-hover:text-black group-aria-pressed:text-black" /> Tools</ToggleGroupItem>
                <ToggleGroupItem value="Field" className="cursor-pointer border-lime-600 text-lime-600 border-3 text-sm font-bold hover:bg-lime-500 hover:text-black group aria-pressed:bg-lime-600 aria-pressed:text-black"><Volleyball className="size-4 text-lime-600 group-hover:text-black group-aria-pressed:text-black" /> Field</ToggleGroupItem>
                <ToggleGroupItem value="Outreach" className="cursor-pointer border-cyan-600 text-cyan-600 border-3 text-sm font-bold hover:bg-cyan-500 hover:text-black group aria-pressed:bg-cyan-600 aria-pressed:text-black"><Handshake className="size-4 text-cyan-600 group-hover:text-black group-aria-pressed:text-black" /> Outreach</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="">
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Status:</h1>
              <ToggleGroup multiple value={statusToggleValue} onValueChange={handleStatusFilterChange}>
                <ToggleGroupItem value="needsAproval" className="cursor-pointer border-amber-400 text-amber-400 border-3 text-sm font-bold hover:bg-amber-500 hover:text-black group aria-pressed:bg-amber-400 aria-pressed:text-black">Needs Approval</ToggleGroupItem>
                <ToggleGroupItem value="approved" className="cursor-pointer border-blue-400 text-blue-400 border-3 text-sm font-bold hover:bg-blue-500 hover:text-black group aria-pressed:bg-blue-400 aria-pressed:text-black">Approved</ToggleGroupItem>
                <ToggleGroupItem value="purchased" className="cursor-pointer border-pink-400 text-pink-400 border-3 text-sm font-bold hover:bg-pink-500 hover:text-black group aria-pressed:bg-pink-400 aria-pressed:text-black">Purchased</ToggleGroupItem>
                <ToggleGroupItem value="recived" className="cursor-pointer border-green-400 text-green-400 border-3 text-sm font-bold hover:bg-green-500 hover:text-black group aria-pressed:bg-green-400 aria-pressed:text-black">Received</ToggleGroupItem>
                <ToggleGroupItem value="rejected" className="cursor-pointer border-red-400 text-red-400 border-3 text-sm font-bold hover:bg-red-500 hover:text-black group aria-pressed:bg-red-400 aria-pressed:text-black">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="onHold" className="cursor-pointer border-orange-400 text-orange-400 border-3 text-sm font-bold hover:border-orange-400 hover:bg-orange-500 hover:text-black group aria-pressed:bg-orange-400 aria-pressed:text-black">On Hold</ToggleGroupItem>
                <ToggleGroupItem value="all" className="cursor-pointer border-zinc-400 text-zinc-400 border-3 text-sm font-bold hover:border-zinc-400 hover:bg-zinc-500 hover:text-black group aria-pressed:bg-zinc-400 aria-pressed:text-black">All</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card>
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 block md:hidden sticky top-0 z-10">
          <div className="justify-between items-start">
            <div className="flex mb-2">
              <Field>
                <div className="flex gap-2">
                  <FieldLabel className="text-base text-zinc-100" htmlFor="searchBar">Search: </FieldLabel>
                  <div className="relative flex items-center">
                    <Search className="absolute left-2 size-4 text-zinc-400 pointer-events-none" />
                    <Input className="bg-mist-500 text-base text-zinc-100 pl-8 w-96 rounded-lg" value={searchBarValue} onValueChange={(value) => setSearchBarValue(String(value))} type="text" id="searchBar" placeholder="Type to search..." />
                  </div>
                </div>
              </Field>
            </div>
            <div className="ml-auto flex gap-2 mt-2">
              <PurchaseItems orders={purchases} onPurchased={loadPurchases} />
              <CreatePurchase user={currentUser} onPurchaseCreated={loadPurchases}></CreatePurchase>
            </div>
          </div>
        </Card>
        {[...filterPurchases()].sort((a, b) => Number(b.id) - Number(a.id)).map((purchase) => (
          <div key={purchase.id} className="m-3 mt-4">
            <Purchase key={purchase.id} id={purchase.id} itemName={purchase.title} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={formatDate(purchase.requestedDate)} status={purchase.status} items={purchase.items} vendor={purchase.vendor} user={currentUser} onPurchaseEdited={loadPurchases} approvers={purchase.approvers} reason={purchase.reason} expidited={purchase.expidited} />
          </div>
        ))}
      </div>
    );
  }
  if (loading || !currentUser) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <Navbar updateUserRole={setRole} user={currentUser ?? { id: "", name: "", role: "", profilePicture: "" }} />
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 hidden md:block w-full">
          <div className="flex justify-between items-start">
            <div className="flex mb-2">
              <Field>
                <div className="flex gap-2">
                  <FieldLabel className="text-base text-zinc-100" htmlFor="searchBar">Search: </FieldLabel>
                  <div className="relative flex items-center">
                    <Search className="absolute left-2 size-4 text-zinc-400 pointer-events-none" />
                    <Input className="bg-mist-500 text-base text-zinc-100 pl-8 w-96 rounded-lg" value={searchBarValue} onValueChange={(value) => setSearchBarValue(String(value))} type="text" id="searchBar" placeholder="Type to search..." />
                  </div>
                </div>
              </Field>
              <Button onClick={() => { clearFilters() }} className="bg-mist-500 text-base rounded-lg hover:bg-mist-400 cursor-pointer ml-4">Clear All Filters</Button>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Catagory:</h1>
              <ToggleGroup multiple value={catagoryFilter} onValueChange={(value) => setCatagoryFilter(value)}>
                <ToggleGroupItem value="Robot" className="cursor-pointer border-yellow-600 text-yellow-600 border-3 text-sm font-bold hover:bg-yellow-500 hover:text-black group aria-pressed:bg-yellow-600 aria-pressed:text-black"><Cog className="size-4 text-yellow-600 group-hover:text-black group-aria-pressed:text-black" /> Robot</ToggleGroupItem>
                <ToggleGroupItem value="Competition" className="cursor-pointer border-emerald-600 text-emerald-600 border-3 text-sm font-bold hover:bg-emerald-500 hover:text-black group aria-pressed:bg-emerald-600 aria-pressed:text-black"><Swords className="size-4 text-emerald-600 group-hover:text-black group-aria-pressed:text-black" /> Competition</ToggleGroupItem>
                <ToggleGroupItem value="Tools" className="cursor-pointer border-rose-600 text-rose-600 border-3 text-sm font-bold hover:bg-rose-500 hover:text-black group aria-pressed:bg-rose-600 aria-pressed:text-black"><Wrench className="size-4 text-rose-600 group-hover:text-black group-aria-pressed:text-black" /> Tools</ToggleGroupItem>
                <ToggleGroupItem value="Field" className="cursor-pointer border-lime-600 text-lime-600 border-3 text-sm font-bold hover:bg-lime-500 hover:text-black group aria-pressed:bg-lime-600 aria-pressed:text-black"><Volleyball className="size-4 text-lime-600 group-hover:text-black group-aria-pressed:text-black" /> Field</ToggleGroupItem>
                <ToggleGroupItem value="Outreach" className="cursor-pointer border-cyan-600 text-cyan-600 border-3 text-sm font-bold hover:bg-cyan-500 hover:text-black group aria-pressed:bg-cyan-600 aria-pressed:text-black"><Handshake className="size-4 text-cyan-600 group-hover:text-black group-aria-pressed:text-black" /> Outreach</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="">
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Status:</h1>
              <ToggleGroup multiple value={statusToggleValue} onValueChange={handleStatusFilterChange}>
                <ToggleGroupItem value="needsAproval" className="cursor-pointer border-amber-400 text-amber-400 border-3 text-sm font-bold hover:bg-amber-500 hover:text-black group aria-pressed:bg-amber-400 aria-pressed:text-black">Needs Approval</ToggleGroupItem>
                <ToggleGroupItem value="approved" className="cursor-pointer border-blue-400 text-blue-400 border-3 text-sm font-bold hover:bg-blue-500 hover:text-black group aria-pressed:bg-blue-400 aria-pressed:text-black">Approved</ToggleGroupItem>
                <ToggleGroupItem value="purchased" className="cursor-pointer border-pink-400 text-pink-400 border-3 text-sm font-bold hover:bg-pink-500 hover:text-black group aria-pressed:bg-pink-400 aria-pressed:text-black">Purchased</ToggleGroupItem>
                <ToggleGroupItem value="recived" className="cursor-pointer border-green-400 text-green-400 border-3 text-sm font-bold hover:bg-green-500 hover:text-black group aria-pressed:bg-green-400 aria-pressed:text-black">Received</ToggleGroupItem>
                <ToggleGroupItem value="rejected" className="cursor-pointer border-red-400 text-red-400 border-3 text-sm font-bold hover:bg-red-500 hover:text-black group aria-pressed:bg-red-400 aria-pressed:text-black">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="onHold" className="cursor-pointer border-orange-400 text-orange-400 border-3 text-sm font-bold hover:border-orange-400 hover:bg-orange-500 hover:text-black group aria-pressed:bg-orange-400 aria-pressed:text-black">On Hold</ToggleGroupItem>
                <ToggleGroupItem value="all" className="cursor-pointer border-zinc-400 text-zinc-400 border-3 text-sm font-bold hover:border-zinc-400 hover:bg-zinc-500 hover:text-black group aria-pressed:bg-zinc-400 aria-pressed:text-black">All</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card>
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 block md:hidden sticky top-0 z-10">
          <div className="justify-between items-start">
            <div className="flex mb-2">
              <Field>
                <div className="flex gap-2">
                  <FieldLabel className="text-base text-zinc-100" htmlFor="searchBar">Search: </FieldLabel>
                  <ButtonGroup className="flex items-stretch gap-1">
                    <Input className="bg-mist-500 text-base text-zinc-100 pl-1 w-fit rounded-lg" value={searchBarValue} onValueChange={(value) => setSearchBarValue(String(value))} type="text" id="searchBar" placeholder="Type to search..." />
                    <Button onClick={() => { setNameFilter(searchBarValue) }} className="bg-mist-400 text-base rounded-lg hover:bg-mist-500 cursor-pointer"><Search /></Button>
                  </ButtonGroup>
                </div>
              </Field>
            </div>
          </div>
        </Card>

        <div className="flex-1 flex items-center justify-center">
          <Spinner className="text-zinc-100 size-8" />
        </div>
      </div>
    );
  }
  if (filterPurchases().length == 0) {
    <h1>Hello World</h1>
  }
}