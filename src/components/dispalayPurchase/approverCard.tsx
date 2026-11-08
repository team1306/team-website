'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useState } from "react";

interface approvalInfo {
    approverName: string;
    approverPicture: string;
    approverID?: string;
    requiredRole: string;
    approved: boolean;
    user: UserData;
    rejected?: boolean
    onWithdrawn?: () => void;
    itemID: string;
    disable?: boolean;
    disableWithdraw?: boolean;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
}

export default function Approver({ approverName, approverPicture, approverID, requiredRole, approved, user, rejected, onWithdrawn, itemID, disable, disableWithdraw }: approvalInfo) {
    const [withdrawing, setWithdrawing] = useState(false);

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

    if (!approved && !rejected) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 p-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
            </Card>
        );
    }
    else if (rejected) {
        return (
            <Card className="bg-red-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="">
                    <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
                </div>
            </Card>
        );
    }
    else {
        return (
            <Card className="bg-green-900 h-fit gap-0 p-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
                <div className="flex items-center justify-start">
                    <Avatar className="size-10">
                        <AvatarImage src={approverPicture} />
                        <AvatarFallback>!</AvatarFallback>
                    </Avatar>
                    <CardDescription className="font-heading text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                </div>
                {!!approverID && approverID === user.id && !disable && !disableWithdraw && (
                    <Button disabled={withdrawing} onClick={withdraw} className="cursor-pointer text-base w-full mt-2 bg-red-700 text-zinc-100 hover:bg-red-800 p-3">Withdraw</Button>
                )}
            </Card>
        );
    }
}