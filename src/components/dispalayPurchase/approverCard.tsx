'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface approvalInfo {
    approverName: string;
    approverPicture: string;
    requiredRole: string;
    approved: boolean;
    rejected?: boolean;
}

export function approvalRoleLabel(requiredRole: string) {
    switch (requiredRole) {
        case "mentorLead":
            return "Lead Mentor";
        case "studentLead":
            return "Student Lead";
        case "mentor":
            return "Mentor";
        case "president":
            return "President";
        case "nProgramDirector":
            return "Expedite (Program Director)";
        case "programDirector":
            return "Program Director";
    }
}

export default function Approver({ approverName, approverPicture, requiredRole, approved, rejected }: approvalInfo) {
    const roleLabel = approvalRoleLabel(requiredRole);
    if (!approved && !rejected) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 p-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{roleLabel}</CardTitle>
            </Card>
        );
    }
    else if (rejected) {
        return (
            <Card className="bg-red-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="">
                    <CardTitle className="text-base font-bold text-zinc-100">{roleLabel}</CardTitle>
                </div>
            </Card>
        );
    }
    else {
        return (
            <Card className="bg-green-900 h-fit gap-0 p-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{roleLabel}</CardTitle>
                <div className="flex items-center justify-start">
                    <Avatar className="size-10">
                        <AvatarImage src={approverPicture} />
                        <AvatarFallback>!</AvatarFallback>
                    </Avatar>
                    <CardDescription className="font-heading text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                </div>
            </Card>
        );
    }
}
