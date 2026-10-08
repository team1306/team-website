'use client'
import Navbar from "../../components/ui/navbar";
import Purchase from "../../components/dispalayPurchase/purchaseCard";
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search, ChevronDown } from "lucide-react";
import CreatePurchase from "../../components/createPurchase/createPurchase";
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
import { getUserInfo } from "../auth/getUserInfo/getUserInfo";
import { useRouter } from 'next/navigation'
import PurchaseItems from "@/components/purchaseItems";
import { Switch } from "@/components/ui/switch";

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

function fieldScore(text: string, token: string): number {
  const t = text.toLowerCase();
  if (!t) return 0;
  if (t === token) return 100;
  if (t.startsWith(token)) return 90;
  const idx = t.indexOf(token);
  if (idx !== -1) {
    return /[^a-z0-9]/.test(t[idx - 1]) ? 80 : 60;
  }
  if (token.length < 3) return 0;
  let pos = -1;
  let first = -1;
  for (const ch of token) {
    pos = t.indexOf(ch, pos + 1);
    if (pos === -1) return 0;
    if (first === -1) first = pos;
  }
  const span = pos - first + 1;
  if (span > token.length * 2) return 0;
  return 20;
}

function searchScore(purchase: PurchaseData, query: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;

  const fields: [string, number][] = [
    [purchase.title ?? "", 3],
    [(purchase.items ?? []).map((item) => item.ItemName).join(" "), 2],
    [purchase.vendor ?? "", 1.5],
    [purchase.requestor ?? "", 1],
    [purchase.catagory ?? "", 1],
    [purchase.reason ?? "", 0.5],
    [String(purchase.id ?? ""), 1],
  ];

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [text, weight] of fields) {
      const score = fieldScore(text, token) * weight;
      if (score > best) best = score;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

type HomeProps = {
  currentUser: UserData;
  onCreate: () => void;
};

export default function Home({ currentUser, onCreate }: HomeProps) {
  const router = useRouter();

  const [purchases, setPurchases] = useState<PurchaseData[]>([]);

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [catagoryFilter, setCatagoryFilter] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold'])
  const [nameFilter, setNameFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [searchBarValue, setSearchBarValue] = useState("");

  const [krakenMode, setKrakenMode] = useState(false);

  async function loadPurchases(): Promise<PurchaseData[]> {
    const res = await fetch('/api/order/getOrders', { cache: 'no-store' });
    const data = await res.json();
    const loadedPurchases = data.parsed ?? [];
    setPurchases(loadedPurchases);
    return loadedPurchases;
  }

  async function loadCategories(): Promise<CategoryData[]> {
    const res = await fetch('/api/budget/getCategories', { cache: 'no-store' });
    const data: CategoryData[] = await res.json();
    const loadedCategories = data ?? [];
    setCategories(loadedCategories);
    return loadedCategories;
  }

  function getVisibleCategories(categoryList: CategoryData[] = categories, purchaseList: PurchaseData[] = purchases) {
    return categoryList
      .filter((category) =>
        category.enabled ||
        purchaseList.some((purchase) => purchase.catagory === category.categoryID)
      )
      .sort((a, b) => {
        const aParts = a.categoryID.split("-");
        const bParts = b.categoryID.split("-");

        const aGroup = aParts.slice(1).join("-");
        const bGroup = bParts.slice(1).join("-");

        const groupCompare = aGroup.localeCompare(bGroup, undefined, { numeric: true });
        if (groupCompare !== 0) return groupCompare;

        return aParts[0].localeCompare(bParts[0], undefined, { numeric: true });
      });
  }

  function clearFilters() {
    setCatagoryFilter(getVisibleCategories().map((c) => c.categoryID));
    setStatusFilter(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold']);
    setSearchBarValue("");
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const [loadedPurchases, loadedCategories] = await Promise.all([
        loadPurchases(),
        loadCategories()
      ]);

      const visibleCategories = getVisibleCategories(loadedCategories, loadedPurchases);
      setCatagoryFilter(visibleCategories.map((category) => category.categoryID));

      setLoading(false);
    }
    init();
  }, []);

  function filterPurchases(): PurchaseData[] {
    const hasQuery = nameFilter.trim().length > 0;

    const scored = purchases
      .filter((purchase) => {
        const categoryMatch = catagoryFilter.includes(purchase.catagory);
        const effectiveStatus = purchase.status === 'selfPurchased' ? 'purchased' : purchase.status;
        const statusMatch = statusFilter.includes(effectiveStatus);
        return categoryMatch && statusMatch;
      })
      .map((purchase) => ({ purchase, score: searchScore(purchase, nameFilter) }))
      .filter((entry) => entry.score > 0);

    scored.sort((a, b) => {
      if (hasQuery && b.score !== a.score) return b.score - a.score;
      return Number(b.purchase.id) - Number(a.purchase.id);
    });

    return scored.map((entry) => entry.purchase);
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

  const visibleCategories = getVisibleCategories();
  const ALL_CATEGORY_IDS = visibleCategories.map((c) => c.categoryID);

  function toggleCategory(categoryID: string) {
    setCatagoryFilter((prev) =>
      prev.includes(categoryID) ? prev.filter((c) => c !== categoryID) : [...prev, categoryID]
    );
  }

  function toggleAllCategories() {
    setCatagoryFilter((prev) => (prev.length === ALL_CATEGORY_IDS.length ? [] : ALL_CATEGORY_IDS));
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const [isOpen, setIsOpen] = useState(false);

  function overrideOpen(newValue: boolean) {
    if ((isOpen == false) && (newValue == true) && (isMobile == true)) {
      onCreate();
    } else {
      setIsOpen(newValue);
    }
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
            {visibleCategories.map((cat) => (
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

  const filteredPurchases = filterPurchases();

  if (!loading) {
    return (
      <div className="bg-background min-h-screen">
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
              <CreatePurchase user={currentUser} onPurchaseCreated={loadPurchases} isOpen={isOpen} overrideOpen={overrideOpen}></CreatePurchase>
            </div>
          </div>
          <div className="flex gap-4">
            {renderCategoryFilter()}
            <div className="">
              <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Status:</h1>
              <ToggleGroup multiple value={statusToggleValue} onValueChange={handleStatusFilterChange}>
                <ToggleGroupItem value="all" className="cursor-pointer border-zinc-400 text-zinc-400 border-3 text-sm font-bold hover:border-zinc-400 hover:bg-zinc-500 hover:text-black group aria-pressed:bg-zinc-400 aria-pressed:text-black">All</ToggleGroupItem>
                <ToggleGroupItem value="needsAproval" className="cursor-pointer border-amber-600 text-zinc-100 border-3 text-sm font-bold hover:bg-amber-700 hover:text-zinc-100 group aria-pressed:bg-amber-600 aria-pressed:text-zinc-100">Needs Approval</ToggleGroupItem>
                <ToggleGroupItem value="approved" className="cursor-pointer border-blue-600 text-zinc-100 border-3 text-sm font-bold hover:bg-blue-700 hover:text-zinc-100 group aria-pressed:bg-blue-600 aria-pressed:text-zinc-100">Approved</ToggleGroupItem>
                <ToggleGroupItem value="purchased" className="cursor-pointer border-pink-600 text-zinc-100 border-3 text-sm font-bold hover:bg-pink-700 hover:text-zinc-100 group aria-pressed:bg-pink-600 aria-pressed:text-zinc-100">Purchased</ToggleGroupItem>
                <ToggleGroupItem value="recived" className="cursor-pointer border-green-600 text-zinc-100 border-3 text-sm font-bold hover:bg-green-700 hover:text-zinc-100 group aria-pressed:bg-green-600 aria-pressed:text-zinc-100">Received</ToggleGroupItem>
                <ToggleGroupItem value="rejected" className="cursor-pointer border-red-600 text-zinc-100 border-3 text-sm font-bold hover:bg-red-700 hover:text-zinc-100 group aria-pressed:bg-red-600 aria-pressed:text-zinc-100">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="onHold" className="cursor-pointer border-orange-600 text-zinc-100 border-3 text-sm font-bold hover:border-orange-600 hover:bg-orange-700 hover:text-zinc-100 group aria-pressed:bg-orange-600 aria-pressed:text-zinc-100">On Hold</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card>
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 block md:hidden sticky top-0 z-10">
          <div className="justify-between items-start">
            <div className="flex mb-2 w-full">
              <Field className="w-full">
                <div className="relative flex items-center w-full">
                  <Search className="absolute left-2 size-4 text-zinc-400 pointer-events-none" />
                  <Input className="bg-mist-500 text-base text-zinc-100 pl-8 w-full min-w-0 rounded-lg" value={searchBarValue} onValueChange={(value) => setSearchBarValue(String(value))} type="text" id="searchBar" aria-label="Search" placeholder="Type to search..." />
                </div>
              </Field>
            </div>
            <div className="ml-auto flex gap-2 mt-2">
              {(currentUser.role == "programDirector" || currentUser.role == "teamAdministrator") && (
                <PurchaseItems orders={purchases} onPurchased={loadPurchases} />
              )}
              <CreatePurchase isOpen={isOpen} overrideOpen={overrideOpen} user={currentUser} onPurchaseCreated={loadPurchases}></CreatePurchase>
            </div>
          </div>
        </Card>
        {filteredPurchases.length === 0 ? (
          <div className="w-full text-center mt-6">
            <div className="w-fit bg-mist-800 p-3 rounded-lg mx-auto">
              <h1 className="text-zinc-100 text-3xl bg-mist-600 p-3 rounded-md w-fit mx-auto">:(</h1>
              <h1 className="text-zinc-100 text-2xl w-fit mx-aut p-2">No Items Found</h1>
              <Button onClick={() => { clearFilters() }} className="bg-mist-500 text-base rounded-lg hover:bg-mist-400 cursor-pointer ml-4">Clear All Filters</Button>
              <Switch className="bg-red-600 size-lg" logo="/public/kraken.png"></Switch>

            </div>
          </div>
        ) : (
          filteredPurchases.map((purchase) => (
            <div key={purchase.id} className="m-3 mt-4">
              <Purchase key={purchase.id} id={purchase.id} itemName={purchase.title} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={formatDate(purchase.requestedDate)} status={purchase.status} items={purchase.items} vendor={purchase.vendor} user={currentUser} onPurchaseEdited={loadPurchases} approvers={purchase.approvers} reason={purchase.reason} expidited={purchase.expidited} />
            </div>
          ))
        )}
      </div>
    );
  }
  if (loading || !currentUser) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
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
                <ToggleGroupItem value="all" className="cursor-pointer border-zinc-400 text-zinc-400 border-3 text-sm font-bold hover:border-zinc-400 hover:bg-zinc-500 hover:text-black group aria-pressed:bg-zinc-400 aria-pressed:text-black">All</ToggleGroupItem>
                <ToggleGroupItem value="needsAproval" className="cursor-pointer border-amber-400 text-amber-400 border-3 text-sm font-bold hover:bg-amber-500 hover:text-black group aria-pressed:bg-amber-400 aria-pressed:text-black">Needs Approval</ToggleGroupItem>
                <ToggleGroupItem value="approved" className="cursor-pointer border-blue-400 text-blue-400 border-3 text-sm font-bold hover:bg-blue-500 hover:text-black group aria-pressed:bg-blue-400 aria-pressed:text-black">Approved</ToggleGroupItem>
                <ToggleGroupItem value="purchased" className="cursor-pointer border-pink-400 text-pink-400 border-3 text-sm font-bold hover:bg-pink-500 hover:text-black group aria-pressed:bg-pink-400 aria-pressed:text-black">Purchased</ToggleGroupItem>
                <ToggleGroupItem value="recived" className="cursor-pointer border-green-400 text-green-400 border-3 text-sm font-bold hover:bg-green-500 hover:text-black group aria-pressed:bg-green-400 aria-pressed:text-black">Received</ToggleGroupItem>
                <ToggleGroupItem value="rejected" className="cursor-pointer border-red-400 text-red-400 border-3 text-sm font-bold hover:bg-red-500 hover:text-black group aria-pressed:bg-red-400 aria-pressed:text-black">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="onHold" className="cursor-pointer border-orange-400 text-orange-400 border-3 text-sm font-bold hover:border-orange-400 hover:bg-orange-500 hover:text-black group aria-pressed:bg-orange-400 aria-pressed:text-black">On Hold</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card>
        <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0 block md:hidden sticky top-0 z-10">
          <div className="justify-between items-start">
            <div className="flex mb-2 w-full">
              <Field className="w-full">
                <div className="relative flex items-center w-full">
                  <Search className="absolute left-2 size-4 text-zinc-400 pointer-events-none" />
                  <Input className="bg-mist-500 text-base text-zinc-100 pl-8 w-full min-w-0 rounded-lg" value={searchBarValue} onValueChange={(value) => setSearchBarValue(String(value))} type="text" id="searchBar" aria-label="Search" placeholder="Type to search..." />
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
}