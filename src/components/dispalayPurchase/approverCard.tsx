'use client'

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

interface approvalInfo {
    approverName: string;
    approverPicture: string;
    requiredRole: string;
    approved: boolean;
    userCanApprove: boolean;
}

export default function Approver({ approverName, approverPicture, requiredRole, approved, userCanApprove }: approvalInfo) {
    if (!approved && userCanApprove) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <div className="flex items-center justify-start">
                    <div>
                    <CardTitle className="text-base font-bold text-zinc-100">{requiredRole}</CardTitle>
                    <CardDescription className="text-xl font-bold text-zinc-100 ml-2">{approverName}</CardDescription>
                    </div>
                    <Button className="text-base ml-auto bg-green-900 text-zinc-100 hover:bg-green-950 p-3 mr-2">Approve</Button>
                </div>
            </Card>
        );
    }
    else if (!approved && !userCanApprove) {
        return (
            <Card className="bg-yellow-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
            <div className="">
                    <CardTitle className="text-base font-bold text-zinc-100">{requiredRole}</CardTitle>
                </div>
            </Card>
        );
    }
    else {
        return (
            <Card className="bg-green-900 h-fit gap-0 pl-2 pt-2 pb-2 mb-2">
                <CardTitle className="text-base font-bold text-zinc-100">{requiredRole}</CardTitle>
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
