"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "./config/dfConfig";
import Onboarding from "./home/Onboarding";
import MenteeDashboard from "./home/Mentees/MenteeDashboard";
import MentorDashboard from "./home/Mentors/MentorDashboard";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [userOnboarded, setUserOnboarded] = useState(false);
  const [loadingUserStatus, setLoadingUserStatus] = useState(true);
  const [userRole, setUserRole] = useState("Unknown");
  // console.log(user);
  const toggleStatus = () => {
    setUserOnboarded(!userOnboarded);
  };
  // console.log(user);

  const isUserOnboarded = async () => {
    const userId = user.id;
    console.log(userId);
    const { data, error } = await supabase
      .from("users")
      .select("clerk_id,role")
      .eq("clerk_id", userId);

    if (error) {
      console.error("Supabase error:", error.message);
      return;
    }

    if (data.length === 0) {
      console.log("User not onboarded.");
      setUserOnboarded(false);
    } else {
      console.log("User found in DB:", data[0]);
      setUserRole(data[0]?.role);
      setUserOnboarded(true);
    }
    setLoadingUserStatus(false);
  };
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      isUserOnboarded();
    }
  }, [user, isLoaded, isSignedIn]);

  const userDataProps = {
    clerk_id: user?.id,
    full_name: user?.fullName,
  };

  if (!isLoaded || loadingUserStatus) {
    return <div>Loading...</div>; // <-- Only show loading until check finishes
  }

  if (userOnboarded == false) {
    return (
      <div>
        <Onboarding userData={userDataProps} toggleStatus={toggleStatus} />
      </div>
    );
  }

  return (
    <div>
      {userRole === "mentor" ? <MentorDashboard /> : <MenteeDashboard />}
    </div>
  );
}
