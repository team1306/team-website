'use client'
import Image from "next/image";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation'
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/ui/navbar";

export default function Home() {
      const searchParams = useSearchParams();
      const user = searchParams.get("user");
    
      const [userRole, setUserRole] = useState(String(user));//Change User Role

    return (
        <div className="bg-background min-h-screen flex flex-col">
            <Navbar userName="Example User" userRole={userRole} userPicture=""/>
        </div>
    );
}
