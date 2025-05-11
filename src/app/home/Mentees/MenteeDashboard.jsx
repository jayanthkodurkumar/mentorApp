"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/app/config/dfConfig";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MenteeDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [mentors, setMentors] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUserAndMentors = async () => {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
        return;
      }

      setCurrentUser(userData);

      if (userData.role === "mentee") {
        const { data: mentorData, error: mentorError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "mentor");

        if (mentorError) {
          console.error("Error fetching mentors:", mentorError);
        } else {
          setMentors(mentorData);
        }
      }
    };

    if (user) {
      fetchUserAndMentors();
    }
  }, [user]);

  if (!currentUser) {
    return <div>Loading dashboard...</div>;
  }

  const handleBook = (id) => {
    // console.log("button clicked");
    router.push(`/book-appointment/${id}/create`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">
        Schedule a call with our mentors
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {mentors.map((mentor) => (
          <Card key={mentor.id} className="p-4 shadow-md">
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage
                  src={mentor.profile_picture || "/default-avatar.png"}
                  alt={mentor.full_name}
                />
                <AvatarFallback>
                  {mentor.full_name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{mentor.full_name}</h3>
              <p className="text-sm text-gray-600">{mentor.designation}</p>
              <p className="text-sm text-gray-500">{mentor.company}</p>
              <p className="text-sm text-gray-500">{mentor.country}</p>
              <p className="mt-2 text-sm text-gray-700">{mentor.bio}</p>
            </CardContent>
            <Button onClick={() => handleBook(mentor.id)} variant="primary">
              Book
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
