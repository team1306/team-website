import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardTitle } from "@/components/ui/card";
import {
Dialog,
DialogContent,
DialogTitle
} from "@/components/ui/dialog";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuGroup,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { EllipsisVertical } from "lucide-react";
import { useState } from "react";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    onRoleGranted: () => void;
}

export default function User({ id, name, role, profilePicture, onRoleGranted }: UserData) {
    const [newName, setNewName] = useState(name);
    const [open, setOpen] = useState(false);

    const roleBadge = () => {
        switch (role) {
            case "student":
                return (
                    <Badge variant="secondary">Student</Badge>
                )
            case "mentor":
                return (
                    <Badge variant="secondary">Mentor</Badge>
                )
            case "mentorLead":
                return (
                    <Badge variant="secondary">Lead Mentor</Badge>
                )
            case "treasurer":
                return (
                    <Badge variant="secondary">Treasurer</Badge>
                )
            case "studentLead":
                return (
                    <Badge variant="secondary">Student Lead</Badge>
                )
            case "president":
                return (
                    <Badge variant="secondary">President</Badge>
                )
            case "programDirector":
                return (
                    <Badge variant="secondary">Program Director</Badge>
                )
            case "teamAdministrator":
                return (
                    <Badge variant="secondary">Team administrator</Badge>
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
        <Card className="p-5">
            <div className="flex items-center">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={profilePicture} />
                        <AvatarFallback >{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-sm font-medium">{name}</CardTitle>
                    {roleBadge()}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger className="ml-auto" render={<Button variant="ghost" size="icon" aria-label={`Manage ${name}`}><EllipsisVertical /></Button>} />
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
                <DialogContent >
                    <DialogTitle >Change {name}'s name</DialogTitle>
                    <Input aria-label="Name" type="text" value={newName} onValueChange={(value) => setNewName(String(value))} className="bg-background rounded-md pl-2 text-sm flex-1 mr-2 text-foreground mt-1"></Input>
                    <div className="flex items-center">
                        <Button onClick={() => { setOpen(false); updateUserName(); }} className="ml-auto">Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}