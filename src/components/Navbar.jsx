"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/config/dfConfig";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user } = useUser();
  const pathname = usePathname(); // ← Get current path
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("users")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

      if (data) setUserInfo(data);
      else console.error("Error fetching user role:", error);
    };

    fetchUser();
  }, [user]);

  if (!userInfo) return null;

  return (
    <nav className="flex gap-3 items-center ml-6">
      {/* Conditionally show Home button */}
      {pathname !== "/" && (
        <Link href="/">
          <Button variant="ghost" className="text-sm">
            Home
          </Button>
        </Link>
      )}

      {userInfo.role === "mentor" && (
        <Link href={`/${userInfo.id}/my-schedule`}>
          <Button variant="ghost" className="text-sm">
            My Schedule
          </Button>
        </Link>
      )}

      {userInfo.role === "mentee" && (
        <Link href={`/${userInfo.id}/my-appointments`}>
          <Button variant="ghost" className="text-sm">
            My Appointments
          </Button>
        </Link>
      )}
    </nav>
  );
}
