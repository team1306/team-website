'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";
import { useRef, useState } from "react";

interface approvalInfo {
    approverName: string;
    approverPicture: string;
    approverID?: string;
    requiredRole: string;
    approved: boolean;
    user: UserData;
    rejected?: boolean
    onApproved?: () => void | Promise<void>;
    onWithdrawn?: () => void;
    itemID: string;
    disable?: boolean;
    disableWithdraw?: boolean;
    tierTwo?: boolean;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
}

export default function Approver({ approverName, approverPicture, approverID, requiredRole, approved, user, rejected, onApproved, onWithdrawn, itemID, disable, disableWithdraw, tierTwo }: approvalInfo) {
    const [approving, setApproving] = useState(false);
    const approvalInFlight = useRef(false);
    const [approvalError, setApprovalError] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);

    const userCanApprove = () => {
        if (requiredRole == "mentor" && (user.role == "mentor" || user.role == "mentorLead" || user.role == "programDirector")) {
            return (true);
        }
        if (requiredRole == "mentorLead" && (user.role == "mentorLead" || user.role == "programDirector")) {
            return (true);
        }
        if (requiredRole == "studentLead" && (user.role == "studentLead" || user.role == "president") && !tierTwo) {
            return (true);
        }
        if (requiredRole == "studentLead" && user.role == "studentLead" && tierTwo) {
            return (true);
        }
        if (requiredRole == "president" && user.role == "president") {
            return (true);
        }
        if (user.role == "teamAdministrator" && requiredRole != "nProgramDirector") {
            return (true);
        }
        else {
            return (false);
        }
    }

    async function approve() {
        if (approvalInFlight.current) return;
        approvalInFlight.current = true;
        setApproving(true);
        setApprovalError("");
        try {
            const res = await fetch('/api/order/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemID, approvalRole: requiredRole }),
            });
            if (!res.ok) throw new Error("Approval failed");
            await onApproved?.();
        } catch {
            setApprovalError("Could not complete approval. Please try again.");
        } finally {
            approvalInFlight.current = false;
            setApproving(false);
        }
    }

    async function withdraw() {
        if (withdrawing) { return; }
        setWithdrawing(true);
        try {
            const res = await fetch('/api/order/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemID: itemID,
                    approvalRole: requiredRole,
                })
            });

            if (res.ok && onWithdrawn) { onWithdrawn(); }
        } finally {
            setWithdrawing(false);
        }
    }

    const cleanuser = () => {
        switch (requiredRole) {
            case "mentorLead":
                return ("Lead Mentor");
            case "studentLead":
                return ("Student Lead");
            case "mentor":
                return ("Mentor");
            case "president":
                return ("President");
            case "nProgramDirector":
                return ("Expedite (Program Director)");
            case "programDirector":
                return ("Program Director");
        }
    }

    const canApprove = userCanApprove() && user.role !== "nProgramDirector";

    return (
        <Card className="h-fit gap-3">
            <div className="flex items-center justify-between gap-3">
                <CardTitle className="min-w-0 text-base font-bold text-foreground">{cleanuser()}</CardTitle>
                <Badge variant="outline" className="ml-auto w-36 shrink-0 justify-center whitespace-normal text-center text-foreground">
                    {rejected ? "Rejected" : approved ? "Approved" : "Awaiting approval"}
                </Badge>
            </div>
            {!approved && !rejected && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardDescription className="min-w-0 flex-1">
                        {disable ? "Approval is currently unavailable." : `Still needs ${cleanuser()?.toLowerCase()} approval.`}
                    </CardDescription>
                    {canApprove && (
                        <Button disabled={disable || approving} onClick={approve}
                            aria-busy={approving}
                            aria-label={approving ? `Approving as ${cleanuser()}` : `Approve as ${cleanuser()}`}
                            className="purchase-approve-button ml-auto shrink-0">
                            {approving && <Spinner aria-hidden="true" />}
                            <span aria-live="polite">{approving ? "Approving…" : "Approve"}</span>
                        </Button>
                    )}
                </div>
            )}
            {approvalError && <p role="alert" className="text-sm text-destructive">{approvalError}</p>}
            {approved && (
                <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                        <AvatarImage src={approverPicture} />
                        <AvatarFallback>{approverName?.charAt(0) || "✓"}</AvatarFallback>
                    </Avatar>
                    <CardDescription className="min-w-0 flex-1 text-foreground">{approverName}</CardDescription>
                    {!!approverID && approverID === user.id && !disable && !disableWithdraw && (
                        <Button disabled={withdrawing} onClick={withdraw} variant="outline" className="ml-auto">
                            {withdrawing ? "Withdrawing…" : "Withdraw"}
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
}
