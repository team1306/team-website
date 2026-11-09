import { ProductLink } from "@/components/productLink";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useEffect,useState } from "react";
import { ItemData,PurchaseData } from "./orders/page";
import { Button } from "./ui/button";
import { Card,CardDescription,CardTitle } from "./ui/card";
import { Drawer,DrawerClose,DrawerContent,DrawerTitle } from "./ui/drawer";
import { Field,FieldLabel } from "./ui/field";


interface PurchaseItemsProps {
    orders: PurchaseData[];
    onPurchased: () => void;
}

interface VendorFees {
    tax: string;
    shipping: string;
    orderNumber: string;
}

const EMPTY_FEES: VendorFees = { tax: "", shipping: "", orderNumber: "" };

interface DisplayItem extends ItemData {
    orderName: string;
}

export default function PurchaseItems({ orders, onPurchased }: PurchaseItemsProps) {
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [orderedIds, setOrderedIds] = useState<Set<string>>(
        () => new Set(
            orders
                .flatMap(order => order.items)
                .filter(item => item.ordered)
                .map(item => item.id)
        )
    );
    const [feesByVendor, setFeesByVendor] = useState<Record<string, VendorFees>>({});

    function getItemsForVendor(vendorName: string): DisplayItem[] {
        return orders
            .filter(order => order.status.toLowerCase() === "approved" && order.vendor === vendorName)
            .flatMap(order => order.items.map(item => ({ ...item, orderName: order.title })));
    }

    function getOrdersForVendor(vendorName: string): PurchaseData[] {
        return orders.filter(order => order.status.toLowerCase() === "approved" && order.vendor === vendorName);
    }

    function getPartialOrders(): PurchaseData[] {
        return orders.filter(order => {
            if (order.status.toLowerCase() !== "approved") return false;
            const selectedCount = order.items.filter(item => orderedIds.has(item.id)).length;
            return selectedCount > 0 && selectedCount < order.items.length;
        });
    }

    const partialOrders = getPartialOrders();

    const vendors = Array.from(new Set(
        orders
            .filter(order => order.status.toLowerCase() === "approved")
            .map(order => order.vendor)
    ));

    function toggleItemPurchased(id: string) {
        setOrderedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function updateFee(vendorName: string, field: keyof VendorFees, value: string) {
        setFeesByVendor(prev => ({
            ...prev,
            [vendorName]: { ...(prev[vendorName] ?? EMPTY_FEES), [field]: value },
        }));
    }

    function calculateTotalCost(): number {
        return vendors.reduce((total, vendorName) => {
            const selectedItems = getItemsForVendor(vendorName).filter(item => orderedIds.has(item.id));

            if (selectedItems.length === 0) return total;

            const itemsTotal = selectedItems.reduce(
                (sum, item) => sum + item.ItemCost * item.ItemQuantity,
                0
            );
            const fees = feesByVendor[vendorName] ?? EMPTY_FEES;
            const tax = Number(fees.tax) || 0;
            const shipping = Number(fees.shipping) || 0;

            return total + itemsTotal + tax + shipping;
        }, 0);
    }

    async function submitPurchases() {
        setError("");

        const partial = getPartialOrders();
        if (partial.length > 0) {
            setError(`Select every item for: ${partial.map(order => order.title).join(", ")}`);
            return;
        }

        const touchedOrderIds = new Set(
            orders
                .flatMap(order => order.items)
                .filter(item => orderedIds.has(item.id))
                .map(item => item.id)
        );

        if (touchedOrderIds.size === 0) {
            setError("Check off at least one item before submitting");
            return;
        }

        const payloadOrders: { id: string; orderedItemIds: string[]; feeShare: number; orderNumber?: string }[] = [];

        for (const vendorName of vendors) {
            const vendorOrders = getOrdersForVendor(vendorName);
            const fees = feesByVendor[vendorName] ?? EMPTY_FEES;
            const feeTotal = (Number(fees.tax) || 0) + (Number(fees.shipping) || 0);

            const vendorSelectedTotal = vendorOrders.reduce((sum, order) => {
                return sum + order.items
                    .filter(item => orderedIds.has(item.id))
                    .reduce((itemSum, item) => itemSum + item.ItemCost * item.ItemQuantity, 0);
            }, 0);

            for (const order of vendorOrders) {
                const orderSelectedIds = order.items
                    .filter(item => orderedIds.has(item.id))
                    .map(item => item.id);

                if (orderSelectedIds.length === 0) continue;

                const orderSelectedTotal = order.items
                    .filter(item => orderedIds.has(item.id))
                    .reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0);

                const feeShare = vendorSelectedTotal > 0
                    ? feeTotal * (orderSelectedTotal / vendorSelectedTotal)
                    : 0;

                payloadOrders.push({
                    id: order.id,
                    orderedItemIds: orderSelectedIds,
                    feeShare,
                    orderNumber: fees.orderNumber || undefined,
                });
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/order/bulkPurchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: payloadOrders }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to save purchases");
                return;
            }

            onPurchased();
            setOpen(false);
        } catch (err) {
            setError("Failed to save purchases");
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 767px)");
        // Initialize the responsive drawer direction from the current viewport.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMobile(mql.matches);

        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    return <div>
      <Button variant="outline" onClick={()=>setOpen(true)}>Purchase items</Button>
      <Drawer open={open} onOpenChange={setOpen} swipeDirection={isMobile ? "down" : "right"}>
        <DrawerContent className="purchase-detail-drawer">
          <div className="flex items-center justify-between border-b p-6"><DrawerTitle>Purchase items</DrawerTitle><DrawerClose render={<Button variant="ghost" size="icon" aria-label="Close purchase items"/>}><X /></DrawerClose></div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">{vendors.length ? vendors.map(vendorName=><Vendor key={vendorName} vendorName={vendorName} items={getItemsForVendor(vendorName)} orderedIds={orderedIds} fees={feesByVendor[vendorName] ?? EMPTY_FEES} toggleItemPurchased={toggleItemPurchased} onFeeChange={(field,value)=>updateFee(vendorName,field,value)}/>) : <p className="text-sm text-muted-foreground">No approved items are ready to purchase.</p>}</div>
          <div className="space-y-3 border-t p-6">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{partialOrders.length>0 && <p className="text-sm text-muted-foreground">Select every item in a request to mark it purchased.</p>}<div className="flex flex-wrap items-center justify-between gap-4"><p className="font-semibold">Total: {calculateTotalCost().toLocaleString("en-US",{style:"currency",currency:"USD"})}</p><Button onClick={submitPurchases} disabled={submitting || partialOrders.length>0 || vendors.length===0} aria-busy={submitting}>{submitting && <Spinner data-icon="inline-start" aria-hidden="true" />}{submitting ? "Saving…" : "Purchase selected items"}</Button></div></div>
        </DrawerContent>
      </Drawer>
    </div>;
}

interface VendorProps {
    items: DisplayItem[];
    vendorName: string;
    orderedIds: Set<string>;
    fees: VendorFees;
    toggleItemPurchased: (id: string) => void;
    onFeeChange: (field: keyof VendorFees, value: string) => void;
}

function Vendor({ items, vendorName, orderedIds, fees, toggleItemPurchased, onFeeChange }: VendorProps) {
    function complete(): boolean {
        return items.length > 0 && items.every(item => orderedIds.has(item.id));
    }

    return (
        <Card className="gap-4 p-4">
            <CardTitle className="text-base">{vendorName}</CardTitle>
            <div className="p-1 pt-0">
                <div className="flex flex-col gap-1">
                    {items.map(item => (
                        <Item key={item.id} id={item.id} ItemName={item.ItemName} orderName={item.orderName} ItemCost={item.ItemCost} ItemQuantity={item.ItemQuantity} ItemLink={item.ItemLink} ordered={orderedIds.has(item.id)} toggleItemPurchased={toggleItemPurchased}></Item>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <Field >
                    <FieldLabel className="text-sm text-foreground">Tax<span className="text-destructive">*</span>: </FieldLabel>
                    <div className="relative mt-1 mr-2 w-full">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                        <Input aria-label="Tax" type="text" inputMode="decimal" placeholder="0.00" value={fees.tax} onValueChange={(value) => onFeeChange("tax", value)} className="bg-background rounded-md pl-5 text-sm text-foreground w-full"></Input>
                    </div>
                </Field>
                <Field >
                    <FieldLabel className="text-sm text-foreground">Shipping<span className="text-destructive">*</span>: </FieldLabel>
                    <div className="relative mt-1 mr-2 w-full">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                        <Input aria-label="Shipping" type="text" inputMode="decimal" placeholder="0.00" value={fees.shipping} onValueChange={(value) => onFeeChange("shipping", value)} className="bg-background rounded-md pl-5 text-sm text-foreground w-full"></Input>
                    </div>
                </Field>
                <Field className="col-span-2">
                    <FieldLabel className="text-sm text-foreground">Order Number: </FieldLabel>
                    <Input aria-label="Order number" type="text" placeholder="" value={fees.orderNumber} onValueChange={(value) => onFeeChange("orderNumber", value)} className="bg-background rounded-md pl-2 text-sm flex-1 mr-2 text-foreground mt-1 w-full"></Input>
                </Field>
            </div>
        </Card>
    )
}


interface item {
    key: string;
    id: string;
    ItemName: string;
    orderName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    ordered: boolean;
    toggleItemPurchased: (id: string) => void
}


function Item({ id, ItemName, orderName, ItemCost, ItemQuantity, ItemLink, toggleItemPurchased, ordered }: item) {

    return (
        <Card role="checkbox" aria-checked={ordered} tabIndex={0} onKeyDown={e=>{if(e.target===e.currentTarget && (e.key==="Enter" || e.key===" ")){e.preventDefault();toggleItemPurchased(id);}}} onClick={() => toggleItemPurchased(id)} className={`p-3 gap-2 cursor-pointer focus-visible:ring-3 focus-visible:ring-ring ${ordered ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>
            <div className="flex flex-wrap items-start gap-3">
                <CardTitle className="text-foreground">{ItemName}<span className="block text-xs font-normal text-muted-foreground">{orderName}</span></CardTitle>
                <ProductLink href={ItemLink} name={ItemName} className="ml-auto" />
            </div>
            <CardDescription className="text-foreground">x{ItemQuantity} at ${ItemCost.toFixed(2)}</CardDescription>
        </Card>
    )
}
