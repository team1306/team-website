'use client'
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge"
import { Card,CardDescription,CardTitle } from "@/components/ui/card"
import {
Dialog,
DialogContent,
DialogDescription,
DialogTitle
} from "@/components/ui/dialog"
import {
Drawer,
DrawerContent,
DrawerTitle
} from "@/components/ui/drawer"
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuGroup,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from "@/components/ui/select"
import { EllipsisVertical,X } from "lucide-react"
import { useEffect,useState } from "react"
import Item from "../dispalayPurchase/itemCard"
import { Button } from "../ui/button"
import Approver from "./approverCard"
import { KrakenMeter } from "./krakenMeter"

type request = {
    id: string;
    itemName: string;
    cost: number;
    requestor: string;
    catagory: string;
    requestedDate: string;
    status: string;
    items: ItemData[];
    vendor: string;
    user: UserData;
    onPurchaseEdited: () => void;
    approvers: Approver[];
    reason?: string;
    expidited: string;
    isKrakenMode: boolean;
    hasOtherApprovedVendorOrders: boolean;
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments?: string;
    userRole?: string
}

interface Approver {
    approved: boolean;
    approverID: string;
    approverName: string;
    requiredRole: string;
    approverPicture: string;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
}

const KRAKEN_DIVISOR = 217.99;

export default function Purchase({ id, itemName, cost, requestor, catagory, requestedDate, status, items, vendor, user, onPurchaseEdited, approvers, reason, expidited, isKrakenMode, hasOtherApprovedVendorOrders }: request) {
    async function updateStatus(id: string, newStatus: string) {
        try {
            const res = await fetch('/api/order/setStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    status: newStatus,
                })
            });

            if (!res.ok) throw new Error("Could not complete the action. Please try again.");
            onPurchaseEdited();

        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Could not complete the action.");
        }
    }

    interface CategoryData {
        categoryID: string;
        categoryName: string;
        categoryPhase: string;
        categoryBudget: number;
        categorySpent: number;
        enabled: boolean;
    }

    const [categories, setCategories] = useState<CategoryData[]>([]);

    async function fetchCategories() {
        try {
            const res = await fetch("/api/budget/getCategories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            const data: CategoryData[] = await res.json();
            setCategories(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function deletePurchase(): Promise<void> {
        const res = await fetch("/api/order/delete", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });

        if (!res.ok) {
            let message = "Failed to delete order";
            try {
                const data = await res.json();
                if (data?.error) message = data.error;
            } catch { }
            throw new Error(message);
        }

        onPurchaseEdited();
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCategories();
    }, []);

    async function duplicate() {
        try {
            const res = await fetch('/api/order/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: name,
                    requestor: user.id,
                    category: itemCatagory,
                    items: itemsArray,
                    vendor: orderVendor,
                })
            });

            if (!res.ok) throw new Error("Could not complete the action. Please try again.");
            onPurchaseEdited();

        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Could not complete the action.");
        }
    }

    const [open, setOpen] = useState(false);
    const [itemsArray, setItems] = useState(items)
    const [editMode, setEditMode] = useState(false);
    const [saving,setSaving] = useState(false);
    const [saveError,setSaveError] = useState("");
    const userRole = user?.role;

    const [overideStatusOpen, setOverideStatusOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [onHoldOpen, setOnHoldOpen] = useState(false);
    const [receivedOpen, setReceivedOpen] = useState(false);

    useEffect(() => {
        // Refresh the local edit draft when the parent receives updated purchase data.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(items);
    }, [items]);

    const calculatePrice = () => {
        return itemsArray.reduce((total, item) => total + item.ItemCost * item.ItemQuantity, 0);
    }

    const displayPrice = () => {
        const total = calculatePrice();
        if (isKrakenMode) {
            return `${(total / KRAKEN_DIVISOR).toFixed(2)} Krakens`;
        }
        return total.toLocaleString("en-US", {style:"currency",currency:"USD"});
    }


    const [name, setName] = useState(itemName);
    const [itemCatagory, setItemCaragory] = useState(catagory);
    const [orderVendor, setOrderVendor] = useState(vendor);
    const standardSuppliers = ["WCP", "CTRE", "Digi-Key", "AndyMark", "Mouser", "Amazon"];
    const isOtherSupplier = !standardSuppliers.includes(orderVendor);
    const otherSupplierName = orderVendor === "Other" ? "" : orderVendor.replace(/^Other - /, "");
    const [statusReason, setReason] = useState(reason || "");

    const selectedCategoryData = categories.find((c) => c.categoryID === itemCatagory);
    const categoryMax = selectedCategoryData?.categoryBudget ?? 4000;

    const statusBadge = () => {
        const labels:Record<string,[string,string]> = {needsAproval:["Needs approval","needs-approval"],approved:["Approved","approved"],purchased:["Purchased","purchased"],selfPurchased:["Self purchased","self-purchased"],recived:["Received","received"],rejected:["Rejected","rejected"],onHold:["On hold","on-hold"]};
        const [label,tone] = labels[status] ?? [status,"on-hold"];
        return <Badge variant="outline" className={`status-badge status-${tone}`}>{label}</Badge>;
    }

    const isTierTwo = () => {
        if (calculatePrice() > 250) {
            return (true);
        }
        else {
            return (false);
        }
    }

    const purchaseApprovers = () => {
        const expediteApprover = approvers.find((approver) => approver.requiredRole === "programDirector");
        const approvalDisabled = status === "onHold" || status === "rejected";
        const withdrawDisabled = approvalDisabled || (status !== "needsAproval" && status !== "approved");
        return (
            <div>
                {approvers.filter((approver) => approver.requiredRole !== "programDirector").map((approver) => (
                    <Approver
                        key={approver.requiredRole}
                        approverName={approver.approverName}
                        approverPicture={approver.approverPicture}
                        approverID={approver.approverID}
                        requiredRole={approver.requiredRole}
                        approved={approver.approved}
                        user={user}
                        onApproved={onPurchaseEdited}
                        onWithdrawn={onPurchaseEdited}
                        itemID={id}
                        disable={approvalDisabled}
                        disableWithdraw={withdrawDisabled}
                        tierTwo={isTierTwo()}
                    />
                ))}
                {(expidited == "approved") && (
                    <Approver approverName={expediteApprover?.approverName || "Program Director"} approverPicture={expediteApprover?.approverPicture || ""} requiredRole="programDirector" approved={true} user={user} itemID={id} disable={approvalDisabled} />
                )}
                {(expidited == "requested") && (
                    <Approver approverName="Program Director" approverPicture="" requiredRole="nProgramDirector" approved={false} user={user} itemID={id} disable={approvalDisabled} />
                )}
                {(expidited == "rejected") && (
                    <Approver approverName="Program Director" approverPicture="" requiredRole="nProgramDirector" approved={false} user={user} rejected={true} itemID={id} disable={approvalDisabled} />
                )}
            </div>
        )
    }

    const updateItem = (updatedItem: ItemData) => {
        setItems((prev) =>
            prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
        );
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 767px)");
        // Initialize the responsive drawer direction from the current viewport.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMobile(mql.matches);

        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    async function updateExpidite(id: string, newStatus: string) {
        try {
            const res = await fetch('/api/order/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    expidited: newStatus
                })
            });

            if (!res.ok) throw new Error("Could not complete the action. Please try again.");
            onPurchaseEdited();

        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Could not complete the action.");
        }
    }

    function getNextPurchaseDate() {
        const today = new Date();
        const dayOfWeek = today.getDay();

        const daysUntilMonday = ((1 - dayOfWeek + 7) % 7) || 0;
        const daysUntilThursday = ((4 - dayOfWeek + 7) % 7) || 0;

        const soonest = Math.min(daysUntilMonday, daysUntilThursday);

        const result = new Date(today);
        result.setDate(today.getDate() + soonest);

        const mm = String(result.getMonth() + 1).padStart(2, '0');
        const dd = String(result.getDate()).padStart(2, '0');
        const yy = String(result.getFullYear()).slice(-2);

        return `${mm}/${dd}/${yy}`;
    }

    function cancelEdit() {
        setName(itemName); setItems(items); setItemCaragory(catagory); setOrderVendor(vendor); setReason(reason || ""); setEditMode(false); setSaveError("");
    }
    async function editPurchase(overrideStatus?:string,clearApprovers?:boolean) {
        if(saving) return;
        if (editMode && isOtherSupplier && !otherSupplierName.trim()) {
            setSaveError("Enter a supplier name before saving.");
            return;
        }
        if (editMode && (!name.trim() || !itemCatagory || itemsArray.some(item =>
            !item.ItemName.trim() || !Number.isFinite(item.ItemCost) || item.ItemCost < 0 ||
            !Number.isInteger(item.ItemQuantity) || item.ItemQuantity < 1))) {
            setSaveError("Enter a request name, category, and valid item names, prices, and quantities.");
            return;
        }
        setSaving(true);setSaveError("");
        try {
            const res=await fetch('/api/order/edit',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,title:name,category:itemCatagory,vendor:orderVendor,items:itemsArray,reason:statusReason,status:overrideStatus,clearApprovers})});
            if(!res.ok) throw new Error("Could not save changes. Please try again.");
            await onPurchaseEdited();setEditMode(false);
        } catch(err) { setSaveError(err instanceof Error ? err.message : "Could not save changes."); }
        finally {setSaving(false);}
    }

    const MAX_VISIBLE_ITEMS = 4;
    const ITEM_HEIGHT = 78;

    const scrollAreaHeight =
        itemsArray.length > MAX_VISIBLE_ITEMS
            ? MAX_VISIBLE_ITEMS * ITEM_HEIGHT
            : itemsArray.length * ITEM_HEIGHT;

    const needsScroll = itemsArray.length > MAX_VISIBLE_ITEMS;

    const itemList = (
        <div className="purchase-detail-items">
            {itemsArray.map((item) => (
                <Item
                    key={`${item.id}-${editMode}`}
                    id={item.id}
                    name={item.ItemName}
                    cost={item.ItemCost}
                    quantity={item.ItemQuantity}
                    link={item.ItemLink}
                    comments={item.comments}
                    defaultEdit={editMode}
                    onUpdate={updateItem}
                    isKrakenMode={isKrakenMode}
                />
            ))}
        </div>
    );

    return (
        <div>
            <Card className="purchase-summary-card cursor-pointer" role="button" tabIndex={0} aria-label={`View ${itemName}`} onClick={()=>setOpen(true)} onKeyDown={e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();setOpen(true);}}}>
                <div className="purchase-summary-row">
                    <div className="min-w-0">
                        <CardTitle className="truncate text-sm font-medium">{itemName || "Untitled request"}</CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="break-words">{selectedCategoryData?.categoryName ?? catagory}{selectedCategoryData?.categoryPhase && ` · ${selectedCategoryData.categoryPhase}`}</span>
                            <span aria-hidden="true">/</span>
                            <span>{requestor} · {requestedDate}</span>
                        </CardDescription>
                    </div>
                    <div className="purchase-summary-status-and-cost">
                    <div className="purchase-summary-tags">{statusBadge()}{expidited==="requested" && <Badge variant="outline">Expedite requested</Badge>}{expidited==="approved" && <Badge variant="outline">Expedited</Badge>}</div>
                    <div className="purchase-summary-facts"><p className="text-sm font-medium">{displayPrice()}</p></div>
                    </div>
                </div>
                {isKrakenMode && <KrakenMeter amount={calculatePrice()/KRAKEN_DIVISOR} />}
            </Card>
                <Drawer open={open} onOpenChange={next=>{setOpen(next);if(!next)cancelEdit();}} swipeDirection={isMobile ? "down" : "right"}>
                    <DrawerContent className="purchase-detail-drawer overflow-hidden">
                        <div className="purchase-detail-header shrink-0">
                            {(editMode) && (
                                <div className="purchase-edit-toolbar">
                                    <DrawerTitle>Edit purchase</DrawerTitle>
                                    <div className="flex ml-auto">
                                        <Button disabled={saving} aria-busy={saving} onClick={() => { editPurchase("needsAproval", true); }}>{saving && <Spinner data-icon="inline-start" aria-hidden="true" />}{saving ? "Saving…" : "Save changes"}</Button>
                                        <Button variant="outline" size="icon" className="ml-2" disabled={saving} aria-label="Cancel edits" onClick={cancelEdit}><X aria-hidden="true" /></Button>
                                    </div>
                                </div>
                            )}
                            <div className="mt-1 pb-0">
                                {(editMode) && (
                                    <label className="purchase-edit-field mb-4"><span>Request title</span><Input type="text" placeholder="Request title" value={name} onValueChange={(value) => setName(String(value))} /></label>
                                )}
                                {(!editMode) && (
                                    <div className="purchase-detail-title-row">
                                        <DrawerTitle className="purchase-detail-title">{name}</DrawerTitle>
                                        <div className="shrink-0">
                                            {statusBadge()}
                                        </div>
                                <Button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); cancelEdit(); }} variant="ghost" size="icon" aria-label="Close purchase details" className="purchase-detail-close"><X aria-hidden="true" /></Button>
                                    </div>
                                )}
                            </div>
                            <div className="purchase-detail-meta">
                                <CardDescription className="purchase-detail-requestor">Requested By: {requestor}</CardDescription>
                                <div className="shrink-0">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Purchase actions" className="purchase-detail-actions"><EllipsisVertical aria-hidden="true" /></Button>} />
                                        <DropdownMenuContent className="w-fit">
                                            <DropdownMenuGroup>
                                                {(status == "purchased") && (
                                                    <DropdownMenuItem onClick={() => setReceivedOpen(true)}>Mark as Received</DropdownMenuItem>
                                                )}
                                                {(status == "approved" || status == "needsAproval") && (
                                                    <DropdownMenuItem onClick={() => updateStatus(id, "selfPurchased")}>Mark as Self Purchased</DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => duplicate()}>Duplicate</DropdownMenuItem>
                                                {(!editMode && (status == "needsAproval" || status == "approved")) && (
                                                    <DropdownMenuItem onClick={() => setEditMode(true)}>Edit</DropdownMenuItem>
                                                )}
                                                {(expidited == "NULL") && (<DropdownMenuItem onClick={() => updateExpidite(id, "requested")}>Request Expedite</DropdownMenuItem>)}
                                                {(status == "needsAproval") && (
                                                    <DropdownMenuItem onClick={(e) => { setOnHoldOpen(true); }} >On Hold</DropdownMenuItem>
                                                )}
                                                {(status == "onHold") && (
                                                    <DropdownMenuItem onClick={(e) => { setReason(""); editPurchase("needsAproval"); }} >Needs Approval</DropdownMenuItem>
                                                )}
                                                {(status == "needsAproval" || status == "approved") && (userRole == "studentLead" || userRole == "mentor" || userRole == "mentorLead" || userRole == "treasurer" || userRole == "president" || userRole == "programDirector" || userRole == "teamAdministrator") && (
                                                    <DropdownMenuItem variant="destructive" onClick={(e) => { setRejectOpen(true); }}>Reject</DropdownMenuItem>
                                                )}
                                            </DropdownMenuGroup>
                                            {(userRole == "president" || userRole == "programDirector" || userRole == "teamAdministrator") && (
                                                <div>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuLabel className="font-bold">Admin Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setOverideStatusOpen(true)}>Override status</DropdownMenuItem>
                                                        {(userRole == "programDirector" || userRole == "teamAdministrator") && (
                                                            <DropdownMenuItem onClick={() => { updateExpidite(id, "approved") }}>Expedite</DropdownMenuItem>
                                                        )}
                                                        {((expidited == "requested" || expidited == "approved") && (userRole == "programDirector" || userRole == "teamAdministrator")) && (
                                                            <DropdownMenuItem onClick={() => { updateExpidite(id, "rejected") }}>Reject Expedite</DropdownMenuItem>
                                                        )}
                                                        {(userRole == "programDirector" || userRole == "teamAdministrator") && (
                                                            <DropdownMenuItem onClick={() => { updateStatus(id, "purchased"); }}>Mark as Ordered</DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => { deletePurchase().catch(err=>setSaveError(err.message)); }} variant="destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </div>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Dialog open={overideStatusOpen} onOpenChange={setOverideStatusOpen}>
                                        <DialogContent >
                                            <DialogTitle className="text-lg font-semibold">Change Status</DialogTitle>
                                            <h1 className="text-foreground mb-2">Current Status: {statusBadge()}</h1>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "needsAproval"); }} variant="outline">Needs Approval</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "approved"); }} variant="outline">Approved</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "purchased"); }} variant="outline">Purchased</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "recived"); }} variant="outline">Received</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "onHold"); }} variant="outline">On Hold</Button>
                                                <Button onClick={() => { setOverideStatusOpen(false); updateStatus(id, "rejected"); }} variant="outline">Rejected</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                                        <DialogContent >
                                            <DialogTitle className="text-lg font-semibold">Reject Order</DialogTitle>
                                            <Input aria-label="Reason" type="text" value={statusReason} onValueChange={(value) => setReason(String(value))} className="bg-background rounded-md pl-2 text-sm flex-1 mr-2 text-foreground mt-1"></Input>
                                            <div className="flex">
                                                <Button onClick={() => { setRejectOpen(false); editPurchase("rejected"); }} className="ml-auto" variant="destructive">Reject</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={onHoldOpen} onOpenChange={setOnHoldOpen}>
                                        <DialogContent >
                                            <DialogTitle className="text-lg font-semibold">Mark Order on Hold</DialogTitle>
                                            <Input aria-label="Reason" type="text" value={statusReason} onValueChange={(value) => setReason(String(value))} className="bg-background rounded-md pl-2 text-sm flex-1 mr-2 text-foreground mt-1"></Input>
                                            <div className="flex">
                                                <Button onClick={() => { setOnHoldOpen(false); editPurchase("onHold"); }} className="ml-auto">Mark On Hold</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={receivedOpen} onOpenChange={setReceivedOpen}>
                                        <DialogContent >
                                            <DialogTitle className="text-lg font-semibold">Mark Order as Received</DialogTitle>
                                            <div className="gap-0 w-full p-0">
                                                <DialogDescription className="text-muted-foreground text-sm p-0 mt-1">What happened to the item?</DialogDescription>
                                                <Input aria-label="Reason" type="text" value={statusReason} onValueChange={(value) => setReason(String(value))} className="bg-background rounded-md pl-2 text-sm flex-1 mr-2 text-foreground mt-1 w-full"></Input>
                                            </div>
                                            <div className="flex">
                                                <Button onClick={() => { setReceivedOpen(false); editPurchase("recived", false); }} className="ml-auto">Mark Received</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            {(reason && status === "rejected") && (
                                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                    <h1 className="text-sm">Rejected: {reason}</h1>
                                </div>
                            )}
                            {(reason && status === "onHold") && (
                                <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                                    <h1 className="text-sm">On Hold: {reason}</h1>
                                </div>
                            )}
                            {(reason && status === "recived") && (
                                <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                                    <h1 className="text-sm">Received: {reason}</h1>
                                </div>
                            )}
                        </div>
                        {saveError && <p role="alert" className="px-6 py-3 text-sm text-destructive">{saveError}</p>}
                        <ScrollArea className="purchase-detail-scroll w-full flex-1 min-h-0">
                            {!editMode && (
                                <section className="purchase-detail-section">
                                    <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                                        <div className="min-w-0"><dt className="text-muted-foreground">Budget category</dt><dd className="mt-1 font-medium break-words">{(selectedCategoryData?.categoryName ?? itemCatagory) || "Uncategorized"}</dd>{selectedCategoryData?.categoryPhase && <dd className="mt-1 text-muted-foreground">{selectedCategoryData.categoryPhase}</dd>}</div>
                                        <div className="min-w-0"><dt className="text-muted-foreground">Supplier</dt><dd className="mt-1 font-medium break-words">{orderVendor || "Not specified"}</dd></div>
                                    </dl>
                                </section>
                            )}

                        {(editMode) && (
                            <div className="purchase-edit-info space-y-4 border-b p-6">
                                <CardTitle className="text-base text-foreground font-semibold">Request details</CardTitle>
                                <div className="purchase-edit-grid">
                                    <div className="purchase-edit-field min-w-0 flex-1">
                                        <span id={`category-label-${id}`}>Category</span>
                                        <Select required value={itemCatagory} onValueChange={(value) => setItemCaragory(String(value))}>
                                            <SelectTrigger aria-labelledby={`category-label-${id}`} className="w-full">
                                                <SelectValue className="text-foreground" placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent> {categories.filter((selectcategory) => selectcategory.enabled || selectcategory.categoryID === itemCatagory).map((selectcategory) => (<SelectItem key={selectcategory.categoryID} value={selectcategory.categoryID}>{selectcategory.categoryName}</SelectItem>))} </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="purchase-edit-field min-w-0 flex-1">
                                        <Select required value={isOtherSupplier ? "Other" : orderVendor} onValueChange={(value) => setOrderVendor(String(value ?? ""))}>
                                            <span id={`supplier-label-${id}`}>Supplier</span>
                                            <SelectTrigger aria-labelledby={`supplier-label-${id}`} className="w-full">
                                                <SelectValue className="text-foreground" placeholder="Select a supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="WCP">WCP</SelectItem>
                                                <SelectItem value="CTRE">CTRE</SelectItem>
                                                <SelectItem value="Digi-Key">Digi-Key</SelectItem>
                                                <SelectItem value="AndyMark">Andy Mark</SelectItem>
                                                <SelectItem value="Mouser">Mouser</SelectItem>
                                                <SelectItem value="Amazon">Amazon</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {isOtherSupplier && (
                                            <label className="purchase-edit-field">
                                                <span>Supplier name</span>
                                                <Input required value={otherSupplierName} placeholder="Enter supplier name"
                                                    onValueChange={(value) => { setOrderVendor("Other - " + value); setSaveError(""); }} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                            {(status == 'needsAproval' || status == 'approved') && (
                                <section className="purchase-detail-section">
                                    {(status == 'approved' && expidited != "approved") && (
                                        <h1 className="purchase-timing-banner">Will be Ordered: {getNextPurchaseDate()}</h1>
                                    )}
                                    {(status == 'needsAproval' && expidited != "approved") && (
                                        <h1 className="purchase-timing-banner">Can be Ordered: {getNextPurchaseDate()}</h1>
                                    )}
                                    {(expidited == "approved" && status == "needsAproval") && (
                                        <h1 className="purchase-timing-banner">Expedited: Needs Approval(s)</h1>
                                    )}
                                    {(expidited == "approved" && status == "approved") && (
                                        <h1 className="purchase-timing-banner">Expedited: Can be Ordered Now</h1>
                                    )}
                                </section>
                            )}
                            <section className="purchase-detail-section">
                                <div className="flex">
                                    {(!editMode) && (
                                        <CardTitle className="text-lg text-foreground font-bold">Items</CardTitle>
                                    )}
                                    {(editMode) && (
                                        <CardTitle className="text-lg text-foreground font-bold">Edit Items</CardTitle>
                                    )}
                                    <div className="flex ml-auto">
                                    </div>
                                </div>
                                {needsScroll && !editMode ? (
                                    <ScrollArea style={{ height: `${MAX_VISIBLE_ITEMS * ITEM_HEIGHT}px` }} className="w-full rounded-md pr-3">
                                        {itemList}
                                    </ScrollArea>
                                ) : (
                                    itemList
                                )}
                                {editMode && selectedCategoryData && <div className="mt-4 rounded-lg border p-4 text-sm"><p className="text-muted-foreground">Category budget remaining after this request</p><p className="mt-1 font-medium">{(categoryMax-selectedCategoryData.categorySpent-calculatePrice()).toLocaleString("en-US",{style:"currency",currency:"USD"})}</p></div>}
                                <div className="purchase-total-summary">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-muted-foreground">Total</span>
                                        <span className="text-xl font-semibold text-foreground">{calculatePrice().toLocaleString("en-US",{style:"currency",currency:"USD"})}</span>
                                    </div>
                                    {isKrakenMode && <KrakenMeter amount={calculatePrice() / KRAKEN_DIVISOR} />}
                                </div>
                            </section>
                            {(!editMode) && (
                                <section className="purchase-detail-section">
                                    <CardTitle className="text-lg text-foreground font-bold">Approvers</CardTitle>
                                    {hasOtherApprovedVendorOrders && (
                                        <div className="pt-2">
                                            <div className="purchase-vendor-warning">
                                                <p>This supplier has other approved orders.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="purchase-detail-approvers">
                                        {purchaseApprovers()}
                                    </div>
                                </section>
                            )}
                        </ScrollArea>
                    </DrawerContent>
                </Drawer>
        </div>
    )
}
