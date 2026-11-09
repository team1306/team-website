'use client'
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button"
import {
Dialog,
DialogClose,
DialogContent,
DialogTitle,
DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { Plus,X } from "lucide-react"
import { useEffect,useState } from "react"
import Item,{ validateItem } from "./itemCard"

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
}

interface FormErrors {
    name?: string;
    category?: string;
    supplier?: string;
    otherSupplier?: string;
    items?: string;
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    comments?: string;
}

interface CategoryData {
    categoryID: string;
    categoryName: string;
    categoryPhase: string;
    categoryBudget: number;
    categorySpent: number;
    enabled: boolean;
}

type CreatePurchaseProps = {
    onPurchaseCreated?: () => void;
    user: UserData;
    overrideOpen: (value: boolean) => void;
    isOpen: boolean;
};

export default function CreatePurchase({ onPurchaseCreated, user, overrideOpen, isOpen }: CreatePurchaseProps) {
    const [items, setItems] = useState<ItemData[]>([]);
    const [name, setName] = useState(String(""));
    const [catagory, setCatagory] = useState(String(""));
    const [supplierPicker, setSupplierPicker] = useState(String(""));
    const [otherSupplier, setOtherSupplier] = useState(String(""));
    const [errors, setErrors] = useState<FormErrors>({});
    const [showItemErrors, setShowItemErrors] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        fetchCategories();
    }, []);

    const orderTotal = items.reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0);
    const selectedCategoryBudget = categories.find((c) => c.categoryID === catagory)?.categoryBudget ?? 0;
    const selectedCategorySpent = categories.find((c) => c.categoryID === catagory)?.categorySpent ?? 0;

    function clearError(key: keyof FormErrors) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    function handleNameChange(value: string) {
        setName(value);
        clearError("name");
    }

    function handleCategoryChange(value: string) {
        setCatagory(value);
        clearError("category");
    }

    function handleSupplierChange(value: string) {
        setSupplierPicker(value);
        clearError("supplier");
        clearError("otherSupplier");
    }

    function handleOtherSupplierChange(value: string) {
        setOtherSupplier(value);
        clearError("otherSupplier");
    }

    function resetForm() {
        setItems([]);
        setName("");
        setCatagory("");
        setSupplierPicker("");
        setOtherSupplier("");
        setErrors({});
        setShowItemErrors(false);
    }

    function discard() {
        resetForm();
        overrideOpen(false);
    }

    function handleOpenChange(next: boolean) {
        overrideOpen(next);
        if (!next) {
            setErrors({});
            setShowItemErrors(false);
        }
    }

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                ItemName: "",
                ItemCost: 0,
                ItemQuantity: 1,
                ItemLink: "",
            },
        ]);
        clearError("items");
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
        clearError("items");
    };

    const updateItem = (
        id: string,
        updates: Partial<{ name: string; cost: number; quantity: number; link: string; comments: string }>
    ) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        ...(updates.quantity !== undefined && { ItemQuantity: updates.quantity }),
                        ...(updates.cost !== undefined && { ItemCost: updates.cost }),
                        ...(updates.name !== undefined && { ItemName: updates.name }),
                        ...(updates.link !== undefined && { ItemLink: updates.link }),
                        ...(updates.comments !== undefined && { comments: updates.comments }),
                    }
                    : item
            )
        );
        clearError("items");
    };

    function supplier() {
        if (supplierPicker == "Other" && otherSupplier.trim() !== "") {
            return ("Other - " + otherSupplier.trim());
        }
        return supplierPicker;
    }

    function validate(): FormErrors {
        const found: FormErrors = {};

        if (name.trim() === "") {
            found.name = "Request name is required";
        }

        const selected = categories.find((c) => c.categoryID === catagory);
        if (!selected || !selected.enabled) {
            found.category = "Select a category";
        }

        if (supplierPicker === "") {
            found.supplier = "Select a supplier";
        } else if (supplierPicker === "Other" && otherSupplier.trim() === "") {
            found.otherSupplier = "Enter the vendor name";
        }

        if (items.length === 0) {
            found.items = "Add at least one item";
        } else {
            const hasInvalidItem = items.some(
                (item) => Object.keys(validateItem(item.ItemName, item.ItemCost, item.ItemQuantity, item.ItemLink)).length > 0
            );
            if (hasInvalidItem) {
                found.items = "Fix the highlighted items";
            }
        }

        return found;
    }

    async function submitPurchase() {
        if (submitting) return;

        const found = validate();
        setErrors(found);
        setShowItemErrors(true);

        if (Object.keys(found).length > 0) {
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/order/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: name.trim(),
                    requestor: user.id,
                    category: catagory,
                    items: items.map((item) => ({ ...item, ItemName: item.ItemName.trim(), ItemLink: item.ItemLink.trim() })),
                    vendor: supplier(),
                }),
            });

            if (res.ok) {
                toast.add({
                    title: "Request created",
                });
                onPurchaseCreated?.();
                resetForm();
                overrideOpen(false);
            } else {
                toast.add({
                    type: "error", title: "Could not create request", description: "Your draft is saved here. Please try again.",
                });
            }
        } catch (err) {
            console.error(err);
            toast.add({
                type: "error", title: "Could not create request", description: "Your draft is saved here. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button />}><Plus data-icon="inline-start" />New request</DialogTrigger>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
          <div className="flex items-start justify-between gap-4 border-b p-6"><div className="space-y-1"><DialogTitle>New purchase request</DialogTitle><p className="text-sm text-muted-foreground">Add the details your approvers need.</p></div><DialogClose render={<Button variant="ghost" size="icon" aria-label="Close new request" />}><X /></DialogClose></div>
          <div className="min-h-0 space-y-6 overflow-y-auto p-6">
            <label className="purchase-edit-field"><span>Request name</span><Input value={name} onValueChange={handleNameChange} placeholder="e.g. Drivetrain parts" aria-invalid={!!errors.name}/>{errors.name && <span className="text-xs text-destructive">{errors.name}</span>}</label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="purchase-edit-field"><span id="request-category-label">Budget category</span><Select value={catagory} onValueChange={v=>handleCategoryChange(String(v ?? ""))}><SelectTrigger aria-labelledby="request-category-label" aria-invalid={!!errors.category} className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{categories.filter(c=>c.enabled).map(c=><SelectItem key={c.categoryID} value={c.categoryID}>{c.categoryName} · {c.categoryPhase}</SelectItem>)}</SelectContent></Select>{errors.category && <span className="text-xs text-destructive">{errors.category}</span>}</div>
              <div className="purchase-edit-field"><span id="request-vendor-label">Supplier</span><Select value={supplierPicker} onValueChange={v=>handleSupplierChange(String(v ?? ""))}><SelectTrigger aria-labelledby="request-vendor-label" aria-invalid={!!errors.supplier} className="w-full"><SelectValue placeholder="Select a supplier" /></SelectTrigger><SelectContent>{["WCP","CTRE","Digi-Key","AndyMark","Mouser","Amazon","Other"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>{errors.supplier && <span className="text-xs text-destructive">{errors.supplier}</span>}</div>
            </div>
            {supplierPicker==="Other" && <label className="purchase-edit-field"><span>Supplier name</span><Input required placeholder="Enter supplier name" value={otherSupplier} onValueChange={handleOtherSupplierChange} aria-invalid={!!errors.otherSupplier}/>{errors.otherSupplier && <span className="text-xs text-destructive">{errors.otherSupplier}</span>}</label>}
            <section className="space-y-4 border-t pt-6"><div className="flex items-center justify-between"><h3 className="font-semibold">Items</h3><Button variant="outline" size="sm" onClick={addItem}><Plus data-icon="inline-start" />Add item</Button></div>
              {items.length===0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Add a product, its quantity, and a link to the supplier.</div>}
              {items.map(item=><Item key={item.id} id={item.id} name={item.ItemName} cost={item.ItemCost} quantity={item.ItemQuantity} link={item.ItemLink} comments={item.comments} onDelete={deleteItem} onUpdate={updateItem} defaultEdit showErrors={showItemErrors} />)}
              {errors.items && <p role="alert" className="text-sm text-destructive">{errors.items}</p>}
            </section>
            {catagory && <div className="rounded-lg bg-muted p-4 text-sm"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Budget remaining after this request</span><span className="font-medium tabular-nums">{(selectedCategoryBudget-selectedCategorySpent-orderTotal).toLocaleString("en-US",{style:"currency",currency:"USD"})}</span></div></div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 p-6"><div><p className="text-xs text-muted-foreground">Request total</p><p className="text-xl font-semibold tabular-nums">{orderTotal.toLocaleString("en-US",{style:"currency",currency:"USD"})}</p></div><div className="flex gap-2"><Button variant="outline" onClick={discard} disabled={submitting}>Discard</Button><Button onClick={submitPurchase} disabled={submitting} aria-busy={submitting}>{submitting && <Spinner data-icon="inline-start" aria-hidden="true" />}{submitting ? "Submitting…" : "Submit request"}</Button></div></div>
        </DialogContent>
      </Dialog>
    );
}
