'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useState } from "react";

interface approvalInfo {
    approverName: string;
    approverPicture: string;
    requiredRole: string;
    approved: boolean;
    user: UserData;
    rejected?: boolean
    onApproved?: () => void;
    itemID: string;
    disable?: boolean;
    tierTwo?: boolean;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
  }

export default function Approver({ approverName, approverPicture, requiredRole, approved, user, rejected, onApproved, itemID, disable, tierTwo }: approvalInfo) {
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
        if (requiredRole == "studentLead" && user.role == "studentLead"&& tierTwo) {
            return (true);
        }
        if (requiredRole == "president" && user.role == "president") {
            return (true);
        }
        else {
            return (false);
        }
    }

    async function approve() {
        const res = await fetch('/api/order/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itemID: itemID,
                approvalRole: requiredRole,
            })
        });

        if (onApproved) { onApproved(); }
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

    if (!approved && userCanApprove() && user.role != "nProgramDirector" && !rejected && !disable) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex items-center justify-start">
                    <div>
                        <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
                        <CardDescription className="text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                    </div>
                    <Button onClick={approve} className="cursor-pointer text-base ml-auto bg-green-900 text-zinc-100 hover:bg-green-950 p-3 mr-2">Approve</Button>
                </div>
            </Card>
        );
    }
    else if (!approved && userCanApprove() && user.role != "nProgramDirector" && !rejected && disable) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex items-center justify-start">
                    <div>
                        <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
                        <CardDescription className="text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                    </div>
                    <Button disabled onClick={approve} className="cursor-pointer text-base ml-auto bg-green-900 text-zinc-100 hover:bg-green-950 p-3 mr-2">Approve</Button>
                </div>
            </Card>
        );
    }
    else if (!approved && !userCanApprove() && !rejected) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="">
                    <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
                </div>
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
            <Card className="bg-green-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{cleanuser()}</CardTitle>
                <div className="flex items-center justify-start">
                    <Avatar className="size-10">
                        <AvatarImage src={approverPicture} />
                        <AvatarFallback>!</AvatarFallback>
                    </Avatar>
                    <CardDescription className="text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                </div>
            </Card>
        );
    }
}
