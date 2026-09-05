'use client'
import Navbar from "@/components/ui/navbar"
import { useRouter } from 'next/navigation'
import { getUserInfo } from "../auth/getUserInfo/route";
import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export default function Page(){
    interface UserData {
        id: string;
        name: string;
        role: string;
        profilePicture: string;
        slack_userid: string;
      }

      const [currentUser, setCurrentUser] = useState<UserData | null>(null);
      const [userLoading, setUserLoading] = useState(true);
      const router = useRouter();

      function setRole(newRole: string) {
        setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
      }

      async function loadUser() {
        try {
          const user = await getUserInfo();
          setCurrentUser(user);
        } catch (err) {
          console.error("Failed to load user:", err);
          router.push("/login");
        } finally {
          setUserLoading(false);
        }
      }

      useEffect(() => {
        loadUser();
      }, []);
    
    return(
        <div>
            <Navbar user={currentUser ?? { id: "", name: "", role: "", profilePicture: "" }} updateUserRole={setRole}/>
            <Card className="p-2 bg-mist-700 m-3">
                <CardDescription className="text-mist-200 text-base mb-0">Total Phase Spending:</CardDescription>
                <CardTitle className="text-mist-100 text-3xl font-bold mt-0">$2,000.00</CardTitle>
            </Card>
        </div>
    )
}