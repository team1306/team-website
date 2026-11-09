'use client'
import PurchaseItems from "@/components/purchaseItems";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu,DropdownMenuCheckboxItem,DropdownMenuContent,DropdownMenuSeparator,DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup,ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronDown,Package,RotateCcw,Search,SlidersHorizontal } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect,useRef,useState } from "react";
import CreatePurchase from "../../components/createPurchase/createPurchase";
import Purchase from "../../components/dispalayPurchase/purchaseCard";

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
  approverID: string;
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

type SortOption = "none" | "dateNO" | "dateON" | "priceLH" | "priceHL";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "dateNO", label: "Date (New to Old)" },
  { value: "dateON", label: "Date (Old to New)" },
  { value: "priceLH", label: "Price (Low to High)" },
  { value: "priceHL", label: "Price (High to Low)" },
];

function sortComparison(a: PurchaseData, b: PurchaseData, sortBy: SortOption): number {
  switch (sortBy) {
    case "dateNO":
      return new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime();
    case "dateON":
      return new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime();
    case "priceLH":
      return a.cost - b.cost;
    case "priceHL":
      return b.cost - a.cost;
    default:
      return 0;
  }
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

  const titleText = (purchase.title ?? "").toLowerCase();

  let total = 0;
  for (const token of tokens) {
    const score = fieldScore(titleText, token);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

type HomeProps = {
  currentUser: UserData;
  onCreate: () => void;
  purchases: PurchaseData[];
  loadPurchases: () => void;
};

export default function Home({ currentUser, onCreate, purchases, loadPurchases }: HomeProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [catagoryFilter, setCatagoryFilter] = useState<string[]>([]);
  const categoryFilterTouched = useRef(false);
  const [statusFilter, setStatusFilter] = useState(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold'])
  const [nameFilter, setNameFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("none");

  const [loading, setLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryLoadAttempt, setCategoryLoadAttempt] = useState(0);
  const [searchBarValue, setSearchBarValue] = useState("");

  const [krakenMode, setKrakenMode] = useState(false);

  async function loadCategories(): Promise<CategoryData[]> {
    const res = await fetch('/api/budget/getCategories', { cache: 'no-store' });
    const data: unknown = await res.json();
    if (!res.ok) {
      throw new Error("Unable to load budget categories. Please try again.");
    }
    if (!Array.isArray(data) || !data.every((category) =>
      category !== null && typeof category === "object" &&
      typeof category.categoryID === "string" && typeof category.enabled === "boolean"
    )) {
      throw new Error("The server returned invalid budget categories. Please try again.");
    }
    setCategories(data);
    return data;
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
    categoryFilterTouched.current = false;
    setCatagoryFilter(getVisibleCategories().map((c) => c.categoryID));
    setStatusFilter(['needsAproval', 'approved', 'purchased', 'recived', 'rejected', 'onHold']);
    setSortBy("none");
    setSearchBarValue("");
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      setCategoryError(null);
      try {
        const loadedCategories = await loadCategories();
        const visibleCategories = getVisibleCategories(loadedCategories);
        setCatagoryFilter(visibleCategories.map((category) => category.categoryID));
      } catch (error) {
        setCategoryError(error instanceof Error ? error.message : "Unable to load budget categories. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [categoryLoadAttempt]);

  useEffect(() => {
    if (categoryFilterTouched.current) return;
    setCatagoryFilter(getVisibleCategories(categories, purchases).map((category) => category.categoryID));
  }, [categories, purchases]);

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
      if (sortBy !== "none") {
        const sortCompare = sortComparison(a.purchase, b.purchase, sortBy);
        if (sortCompare !== 0) return sortCompare;
      } else if (hasQuery && b.score !== a.score) {
        return b.score - a.score;
      }
      return Number(b.purchase.id) - Number(a.purchase.id);
    });

    return scored.map((entry) => entry.purchase);
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

  const visibleCategories = getVisibleCategories();
  const ALL_CATEGORY_IDS = visibleCategories.map((c) => c.categoryID);

  function toggleCategory(categoryID: string) {
    categoryFilterTouched.current = true;
    setCatagoryFilter((prev) =>
      prev.includes(categoryID) ? prev.filter((c) => c !== categoryID) : [...prev, categoryID]
    );
  }

  function toggleAllCategories() {
    categoryFilterTouched.current = true;
    setCatagoryFilter((prev) => (prev.length === ALL_CATEGORY_IDS.length ? [] : ALL_CATEGORY_IDS));
  }

  const [isOpen, setIsOpen] = useState(false);

  function overrideOpen(next: boolean) { setIsOpen(next); }

  function renderCategoryFilter() {
    const allSelected = ALL_CATEGORY_IDS.length > 0 && catagoryFilter.length === ALL_CATEGORY_IDS.length;
    return <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" />}><SlidersHorizontal data-icon="inline-start" />{allSelected ? "All categories" : `${catagoryFilter.length} categories`}<ChevronDown data-icon="inline-end" /></DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuCheckboxItem checked={allSelected} onCheckedChange={toggleAllCategories} closeOnClick={false}>All categories</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {visibleCategories.map(cat => <DropdownMenuCheckboxItem key={cat.categoryID} checked={catagoryFilter.includes(cat.categoryID)} onCheckedChange={() => toggleCategory(cat.categoryID)} closeOnClick={false}>{cat.categoryName} · {cat.categoryPhase}</DropdownMenuCheckboxItem>)}
      </DropdownMenuContent></DropdownMenu>;
  }

  const filteredPurchases = filterPurchases();
  const statuses = [{value:"all",label:"All"},{value:"needsAproval",label:"Needs approval"},{value:"approved",label:"Approved"},{value:"purchased",label:"Purchased"},{value:"recived",label:"Received"},{value:"onHold",label:"On hold"},{value:"rejected",label:"Rejected"}];
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div><h1>Purchases</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          {["programDirector","teamAdministrator"].includes(currentUser.role) && <PurchaseItems orders={purchases} onPurchased={loadPurchases} />}
          <CreatePurchase user={currentUser} onPurchaseCreated={loadPurchases} isOpen={isOpen} overrideOpen={overrideOpen} />
        </div>
      </div>
      <Card className="gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search purchases" placeholder="Search purchases…" value={searchBarValue} onValueChange={v=>setSearchBarValue(String(v))} className="pl-9" /></div>
          {renderCategoryFilter()}
          <Select value={sortBy} onValueChange={v=>setSortBy((v as SortOption) ?? "none")}><SelectTrigger aria-label="Sort purchases" className="w-44"><SelectValue>{(value:string)=>SORT_OPTIONS.find(o=>o.value===value)?.label ?? "Sort purchases"}</SelectValue></SelectTrigger><SelectContent>{SORT_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="icon" aria-label="Refresh purchases" onClick={()=>loadPurchases()}><RotateCcw /></Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <ToggleGroup multiple variant="outline" spacing={2} value={statusToggleValue} onValueChange={handleStatusFilterChange} aria-label="Filter by status" className="flex-wrap justify-start">{statuses.map(s=><ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>)}</ToggleGroup>
          <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><Switch checked={krakenMode} onCheckedChange={setKrakenMode} />Kraken mode</label><Button variant="ghost" size="sm" onClick={clearFilters}>Reset filters</Button></div>
        </div>
      </Card>
      {categoryError && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{categoryError}<Button variant="outline" className="ml-3" onClick={()=>setCategoryLoadAttempt(n=>n+1)}>Retry</Button></div>}
      {loading ? <div className="flex justify-center py-20"><Spinner className="size-6" /></div> : <>
        <p className="text-sm text-muted-foreground">{filteredPurchases.length} {filteredPurchases.length===1 ? "request" : "requests"}</p>
        {filteredPurchases.length===0 ? <div className="purchase-empty-state" role="status"><Package className="size-8" /><h2>{purchases.length ? "No matching requests" : "No purchase requests yet"}</h2><p>{purchases.length ? "Try another search or reset your filters." : "Create a request to get started."}</p>{!!purchases.length && <Button variant="outline" onClick={clearFilters}>Reset filters</Button>}</div> : <div className="space-y-3">{filteredPurchases.map(purchase=><Purchase key={purchase.id} id={purchase.id} itemName={purchase.title} cost={purchase.cost} requestor={purchase.requestor} catagory={purchase.catagory} requestedDate={formatDate(purchase.requestedDate)} status={purchase.status} items={purchase.items} vendor={purchase.vendor} user={currentUser} onPurchaseEdited={loadPurchases} approvers={purchase.approvers} reason={purchase.reason} expidited={purchase.expidited} isKrakenMode={krakenMode} hasOtherApprovedVendorOrders={purchases.some(other=>other.id!==purchase.id && other.status==="approved" && other.vendor.trim().toLowerCase()===purchase.vendor.trim().toLowerCase())} />)}</div>}
      </>}
    </div>
  );
}
