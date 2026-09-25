'use client'
import Navbar from "../components/ui/navbar";
import Purchase from "../components/dispalayPurchase/purchaseCard";
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search, ChevronDown } from "lucide-react";
import CreatePurchase from "../components/createPurchase/createPurchase";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
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

interface CategoryData {
  categoryID: string;
  categoryName: string;
  categoryPhase: string;
  categoryBudget: number;
  categorySpent: number;
  enabled: boolean;
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

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [catagoryFilter, setCatagoryFilter] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold'])
  const [nameFilter, setNameFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [searchBarValue, setSearchBarValue] = useState("");

  async function loadPurchases() {
    const res = await fetch('/api/order/getOrders', { cache: 'no-store' });
    const data = await res.json();
    setPurchases(data.parsed ?? []);
  }

  async function loadCategories() {
    const res = await fetch('/api/budget/getCategories', { cache: 'no-store' });
    const data: CategoryData[] = await res.json();
    setCategories(data ?? []);
    setCatagoryFilter((data ?? []).map((c) => c.categoryID));
  }

  function clearFilters() {
    setCatagoryFilter(categories.map((c) => c.categoryID));
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
      await Promise.all([loadPurchases(), loadCategories()]);
      setLoading(false);
    }
    init();
  }, []);

  function filterPurchases(): PurchaseData[] {
    return purchases.filter((purchase) => {
      const categoryMatch = catagoryFilter.includes(purchase.catagory);
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
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const ALL_CATEGORY_IDS = categories.map((c) => c.categoryID);

  function toggleCategory(categoryID: string) {
    setCatagoryFilter((prev) =>
      prev.includes(categoryID) ? prev.filter((c) => c !== categoryID) : [...prev, categoryID]
    );
  }

  function toggleAllCategories() {
    setCatagoryFilter((prev) => (prev.length === ALL_CATEGORY_IDS.length ? [] : ALL_CATEGORY_IDS));
  }

  function renderCategoryFilter() {
    const allSelected = ALL_CATEGORY_IDS.length > 0 && catagoryFilter.length === ALL_CATEGORY_IDS.length;
    const label = catagoryFilter.length === 0
      ? "No categories"
      : allSelected
        ? "All categories"
        : `${catagoryFilter.length} of ${ALL_CATEGORY_IDS.length} selected`;

    return (
      <div ref={categoryDropdownRef} className="relative">
        <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Catagory:</h1>
        <Button
          onClick={() => setCategoryDropdownOpen((open) => !open)}
          className="bg-mist-500 text-base text-zinc-100 rounded-lg hover:bg-mist-400 cursor-pointer flex items-center gap-2 min-w-48 justify-between"
        >
          {label}
          <ChevronDown className="size-4" />
        </Button>
        {categoryDropdownOpen && (
          <div className="absolute z-50 mt-1 w-64 max-h-80 overflow-y-auto bg-mist-700 border border-mist-500 rounded-lg p-2 shadow-lg">
            <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-mist-500 cursor-pointer font-bold text-zinc-100 text-sm">
              <Checkbox checked={allSelected} onCheckedChange={toggleAllCategories} />
              All
            </label>
            <div className="border-t border-mist-500 my-1" />
            {categories.map((cat) => (
              <label key={cat.categoryID} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-mist-500 cursor-pointer text-zinc-100 text-sm">
                <Checkbox
                  checked={catagoryFilter.includes(cat.categoryID)}
                  onCheckedChange={() => toggleCategory(cat.categoryID)}
                />
                {cat.categoryID}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!loading && currentUser) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar updateUserRole={setRole} user={currentUser} />
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 hidden md:block overflow-visible">
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
            {renderCategoryFilter()}
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
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 hidden md:block w-full overflow-visible">
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
            {renderCategoryFilter()}
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