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
    userRole: string;
    rejected?: boolean
    onApproved?: () => void;
    itemID: string;
    disable?: boolean;
    tierTwo?: boolean;
}

export default function Approver({ approverName, approverPicture, requiredRole, approved, userRole, rejected, onApproved, itemID, disable, tierTwo }: approvalInfo) {
    const userCanApprove = () => {
        if (requiredRole == "mentor" && (userRole == "mentor" || userRole == "mentorLead" || userRole == "programDirector")) {
            return (true);
        }
        if (requiredRole == "mentorLead" && (userRole == "mentorLead" || userRole == "programDirector")) {
            return (true);
        }
        if (requiredRole == "studentLead" && (userRole == "studentLead" || userRole == "president") && !tierTwo) {
            return (true);
        }
        if (requiredRole == "studentLead" && userRole == "studentLead"&& tierTwo) {
            return (true);
        }
        if (requiredRole == "president" && userRole == "president") {
            return (true);
        }
        else {
            return (false);
        }
    }

    async function approve() {
        const res = await fetch('/api/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itemID: itemID,
                approvalRole: requiredRole
            })
        });

        if (onApproved) { onApproved(); }
    }

    const cleanUserRole = () => {
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

    if (!approved && userCanApprove() && userRole != "nProgramDirector" && !rejected && !disable) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex items-center justify-start">
                    <div>
                        <CardTitle className="text-base font-bold text-zinc-100">{cleanUserRole()}</CardTitle>
                        <CardDescription className="text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                    </div>
                    <Button onClick={approve} className="cursor-pointer text-base ml-auto bg-green-900 text-zinc-100 hover:bg-green-950 p-3 mr-2">Approve</Button>
                </div>
            </Card>
        );
    }
    else if (!approved && userCanApprove() && userRole != "nProgramDirector" && !rejected && disable) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex items-center justify-start">
                    <div>
                        <CardTitle className="text-base font-bold text-zinc-100">{cleanUserRole()}</CardTitle>
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
                    <CardTitle className="text-base font-bold text-zinc-100">{cleanUserRole()}</CardTitle>
                </div>
            </Card>
        );
    }
    else if (rejected) {
        return (
            <Card className="bg-red-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="">
                    <CardTitle className="text-base font-bold text-zinc-100">{cleanUserRole()}</CardTitle>
                </div>
            </Card>
        );
    }
    else {
        return (
            <Card className="bg-green-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{cleanUserRole()}</CardTitle>
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
