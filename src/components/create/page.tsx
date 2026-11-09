"use client";
import CreatePurchase from "@/components/createPurchase/createPurchase";
interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

type CreateProps = {
    currentUser: UserData;
    onDiscard: () => void;
};

export default function Create({currentUser,onDiscard}:CreateProps) {
 return <CreatePurchase user={currentUser} isOpen={true} overrideOpen={open=>{if(!open)onDiscard();}} onPurchaseCreated={onDiscard}/>;
}
