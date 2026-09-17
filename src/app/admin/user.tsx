import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EllipsisVertical } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react";
import { Input } from "@base-ui/react";
import { Button } from "@/components/ui/button";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    onRoleGranted: () => void;
}

export default function User({ id, name, role, profilePicture, onRoleGranted }: UserData) {
    const [newName, setNewName] = useState("");
    const [open, setOpen] = useState(false);

    const roleBadge = () => {
        switch (role) {
            case "student":
                return (
                    <Badge className="rounded-md text-base bg-red-600">Student</Badge>
                )
            case "mentor":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Mentor</Badge>
                )
            case "mentorLead":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Lead Mentor</Badge>
                )
            case "treasurer":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Treasurer</Badge>
                )
            case "studentLead":
                return (
                    <Badge className="rounded-md text-base bg-emerald-600">Student Lead</Badge>
                )
            case "president":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">President</Badge>
                )
            case "programDirector":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">Program Director</Badge>
                )
            case "teamAdministrator":
                return (
                    <Badge className="rounded-md text-base bg-violet-600">Team Adminstrator</Badge>
                )
        }
    }

    function cleanName(wierdRole: string) {
        switch (wierdRole) {
            case "student":
                return ("Student");
            case "studentLead":
                return ("Student Lead");
            case "mentor":
                return ("Mentor");
            case "mentorLead":
                return ("Lead Mentor");
            case "treasurer":
                return ("Treasurer");
            case "president":
                return ("President");
            case "programDirector":
                return ("Program Director");
            case "teamAdministrator":
                return ("Team Administrator");
        }
    }

    async function grantRole(newRole: string) {
        const res = await fetch('/api/admin/grantRole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uuid: id, role: newRole }),
        });

        if (!res.ok) {
            const responseBody = await res.json();
            console.log(responseBody);
            toast.add({
                type: "error",
                description: "Could not assign user role",
                priority: "high",
            });
            return;
        }

        toast.add({
            type: "success",
            description: `${name} is now a ${cleanName(newRole)}`,
        });

        onRoleGranted();

        return res.json();
    }

    async function updateUserName() {
        const res = await fetch('/api/admin/editName', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: id, name: newName }),
        });
      
        if (!res.ok) {
          const err = await res.json();
          toast.add({
            type: "error",
            description: "Could not change user's name",
            priority: "high",
        });
        return;
        }

        toast.add({
            type: "success",
            description: `Say hello to ${newName}`,
        });

        onRoleGranted();
      
        return res.json();
      }

    return (
        <Card className="bg-mist-800 p-2">
            <div className="flex">
                <div className="flex items-center gap-2">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={profilePicture} />
                        <AvatarFallback className="bg-red-400 text-zinc-100 items-center">EU</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-zinc-100 text-xl font-semibold">{name}</CardTitle>
                    {roleBadge()}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger className="ml-auto" nativeButton={false} render={<EllipsisVertical className="text-zinc-200 hover:text-zinc-400 size-5 cursor-pointer" />} />
                    <DropdownMenuContent className="w-fit">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Assign User Role</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => grantRole("student")}>Student</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("studentLead")}>Student Lead</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("mentor")}>Mentor</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("mentorLead")}>Lead Mentor</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("treasurer")}>Treasurer</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("president")}>President</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("programDirector")}>Program Director</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => grantRole("teamAdministrator")}>Team Administrator</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Change User Info</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setOpen(true)}>Edit Name</DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-mist-400 p-4">
                    <DialogTitle className="font-jetbrains text-xl font-bold">Change {name}'s name</DialogTitle>
                    <Input type="text" value={newName} onValueChange={(value) => setNewName(String(value))} className="bg-mist-800 rounded-md pl-2 text-sm flex-1 mr-2 text-zinc-100 mt-1"></Input>
                    <div className="flex">
                        <Button onClick={() => { setOpen(false); updateUserName(); }} className="bg-amber-500 text-zinc-100 hover::bg-amber-600 w-fit p-2 ml-auto">Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}