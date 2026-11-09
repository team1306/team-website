import { useState } from "react"
import { Button } from "./ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";
import { useEffect } from "react";
import { Card, CardTitle, CardDescription } from "./ui/card";
import { Input } from "@base-ui/react";
import { Field, FieldLabel } from "./ui/field";
import { Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"
import { ItemData, PurchaseData } from "./orders/page";
import { isAmazonVendor } from "@/lib/orderPolicy";


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
    outsideOrderingDay: boolean;
}

export default function PurchaseItems({ orders, onPurchased }: PurchaseItemsProps) {
    const approvedOrders = orders.filter(order => order.status.toLowerCase() === "approved");
    const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago", weekday: "short",
    }).format(new Date());
    const isOrderingDay = weekday === "Mon" || weekday === "Thu";

    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [orderedIds, setOrderedIds] = useState<Set<string>>(
        () => new Set(
            approvedOrders
                .flatMap(order => order.items)
                .filter(item => item.ordered)
                .map(item => item.id)
        )
    );
    const [feesByVendor, setFeesByVendor] = useState<Record<string, VendorFees>>({});

    function getItemsForVendor(vendorName: string): DisplayItem[] {
        return getOrdersForVendor(vendorName)
            .flatMap(order => order.items.map(item => ({
                ...item,
                orderName: order.title,
                outsideOrderingDay: !isOrderingDay && !isAmazonVendor(order.vendor) && order.expidited !== "approved",
            })));
    }

    function getOrdersForVendor(vendorName: string): PurchaseData[] {
        return approvedOrders.filter(order => order.vendor === vendorName);
    }

    function getPartialOrders(): PurchaseData[] {
        return approvedOrders.filter(order => {
            const selectedCount = order.items.filter(item => orderedIds.has(item.id)).length;
            return selectedCount > 0 && selectedCount < order.items.length;
        });
    }

    const partialOrders = getPartialOrders();
    const hasSelectedItems = approvedOrders.some(order => order.items.some(item => orderedIds.has(item.id)));

    const vendors = Array.from(new Set(
        approvedOrders
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
        if (submitting) return;
        setError("");

        const partial = getPartialOrders();
        if (partial.length > 0) {
            setError(`Select every item for: ${partial.map(order => order.title).join(", ")}`);
            return;
        }

        const touchedOrderIds = new Set(
            approvedOrders
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

            const updatedIds = new Set<string>((data.updated ?? []).map((result: { id: string }) => result.id));
            if (updatedIds.size > 0) {
                const purchasedItemIds = new Set(orders.filter(order => updatedIds.has(order.id)).flatMap(order => order.items.map(item => item.id)));
                setOrderedIds(previous => new Set([...previous].filter(id => !purchasedItemIds.has(id))));
                // Remove fees already charged so retrying failed orders doesn't charge them again.
                setFeesByVendor(previous => {
                    const next = { ...previous };
                    for (const vendor of vendors) {
                        const selected = payloadOrders.filter(update => orders.some(order => order.id === update.id && order.vendor === vendor));
                        const total = selected.reduce((sum, update) => sum + update.feeShare, 0);
                        const charged = selected.filter(update => updatedIds.has(update.id)).reduce((sum, update) => sum + update.feeShare, 0);
                        const fees = previous[vendor] ?? EMPTY_FEES;
                        const remaining = total > 0 ? Math.max(0, 1 - charged / total) : 1;
                        next[vendor] = { ...fees, tax: String((Number(fees.tax) || 0) * remaining), shipping: String((Number(fees.shipping) || 0) * remaining) };
                    }
                    return next;
                });
                onPurchased();
            }
            if (!res.ok || data.errors?.length > 0) {
                const failures = (data.errors ?? []).map((failure: { id: string; error: string }) =>
                    `${orders.find(order => order.id === failure.id)?.title ?? failure.id}: ${failure.error}`);
                setError([updatedIds.size > 0 ? `${updatedIds.size} order(s) purchased.` : '', ...failures, failures.length === 0 ? data.error || "Failed to save purchases" : ''].filter(Boolean).join('\n'));
                return;
            }

            setFeesByVendor({});
            setOpen(false);
        } catch (err) {
            setError("Failed to save purchases");
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 767px)");
        setIsMobile(mql.matches);

        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    return (
        <div>
            <Button onClick={() => setOpen(true)} className="cursor-pointer text-base w-full p-3 bg-emerald-600 hover:bg-emerald-700 md:w-fit">Purchase Items</Button>
            <Drawer open={open} onOpenChange={setOpen} swipeDirection={isMobile ? "down" : "right"} modal={false}>
                <DrawerContent className="bg-mist-800 border-0 p-0 m-0 rounded-none rounded-tl-lg rounded-bl-lg w-full md:w-1/3">
                    <div className="bg-mist-700 w-full h-fit flex">
                        <DrawerTitle className="text-zinc-100 text-2xl m-1 ml-2">Items to Purchase</DrawerTitle>
                    </div>
                    <div className="">
                        <ScrollArea className="h-screen w-full p-2 pr-3">
                            {vendors.map(vendorName => (
                                <Vendor
                                    key={vendorName}
                                    vendorName={vendorName}
                                    items={getItemsForVendor(vendorName)}
                                    orderedIds={orderedIds}
                                    fees={feesByVendor[vendorName] ?? EMPTY_FEES}
                                    toggleItemPurchased={toggleItemPurchased}
                                    onFeeChange={(field, value) => updateFee(vendorName, field, value)}
                                />
                            ))}
                            <Card className="bg-mist-700 pb-0 p-0 mb-10 p-2">
                                {error && <p role="alert" className="text-red-300 whitespace-pre-line">{error}</p>}
                                <CardTitle className="text-zinc-100 text-2xl font-bold">Total Spending: ${calculateTotalCost().toFixed(2)}</CardTitle>
                                <Button onClick={() => submitPurchases()} disabled={submitting || !hasSelectedItems || partialOrders.length > 0} className="">Purchase Items</Button>
                            </Card>
                        </ScrollArea>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
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
        <Card className="bg-mist-700 pb-0 p-0 mb-3">
            <CardTitle className={`text-zinc-100 text-base p-1 bg-mist-500 ${complete() ? "bg-emerald-600" : "bg-mist-500"}`}>{vendorName}</CardTitle>
            <div className="p-1 pt-0">
                <div className="flex flex-col gap-1">
                    {items.map(item => (
                        <Item key={item.id} id={item.id} ItemName={item.ItemName} orderName={item.orderName} ItemCost={item.ItemCost} ItemQuantity={item.ItemQuantity} ItemLink={item.ItemLink} ordered={orderedIds.has(item.id)} outsideOrderingDay={item.outsideOrderingDay} toggleItemPurchased={toggleItemPurchased}></Item>
                    ))}
                </div>
            </div>
            <div className="bg-mist-600 w-full p-1 flex gap-4">
                <Field className="w-1/4 h-fit">
                    <FieldLabel className="text-sm text-zinc-100">Tax<span className="text-destructive">*</span>: </FieldLabel>
                    <div className="relative mt-1 mr-2 w-full">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">$</span>
                        <Input type="text" inputMode="decimal" placeholder="0.00" value={fees.tax} onValueChange={(value) => onFeeChange("tax", value)} className="bg-mist-800 rounded-md pl-5 text-sm text-zinc-100 w-full"></Input>
                    </div>
                </Field>
                <Field className="w-1/4 h-fit">
                    <FieldLabel className="text-sm text-zinc-100">Shipping<span className="text-destructive">*</span>: </FieldLabel>
                    <div className="relative mt-1 mr-2 w-full">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">$</span>
                        <Input type="text" inputMode="decimal" placeholder="0.00" value={fees.shipping} onValueChange={(value) => onFeeChange("shipping", value)} className="bg-mist-800 rounded-md pl-5 text-sm text-zinc-100 w-full"></Input>
                    </div>
                </Field>
                <Field className="w-1/2 h-fit">
                    <FieldLabel className="text-sm text-zinc-100">Order Number: </FieldLabel>
                    <Input type="text" placeholder="" value={fees.orderNumber} onValueChange={(value) => onFeeChange("orderNumber", value)} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1 w-full"></Input>
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
    outsideOrderingDay: boolean;
    toggleItemPurchased: (id: string) => void
}


function Item({ id, ItemName, orderName, ItemCost, ItemQuantity, ItemLink, toggleItemPurchased, ordered, outsideOrderingDay }: item) {

    return (
        <Card onClick={() => toggleItemPurchased(id)} className={`p-1 gap-0 cursor-pointer ${outsideOrderingDay ? "bg-amber-700" : ordered ? "bg-emerald-600" : "bg-mist-500"} ${ordered ? "ring-2 ring-emerald-400" : ""}`}>
            <div className="flex">
                <CardTitle className="text-zinc-100">{ItemName}~{orderName}</CardTitle>
                <Button className="bg-zinc-100 text-black text-lg hover:bg-zinc-300 ml-auto" onClick={(e) => { e.stopPropagation(); window.open(ItemLink, "_blank") }}><Globe /></Button>
            </div>
            <CardDescription className="text-zinc-200">x{ItemQuantity} at ${ItemCost.toFixed(2)}</CardDescription>
        </Card>
    )
}