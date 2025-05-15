"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/app/config/dfConfig";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ViewMentorsList() {
  const router = useRouter();
  const { user } = useUser();
  const [mentors, setMentors] = useState([]);
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState(""); // job role filter
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
          setFilteredMentors(mentorData);
        }
      }
    };

    if (user) {
      fetchUserAndMentors();
    }
  }, [user]);

  useEffect(() => {
    const filtered = mentors.filter((mentor) => {
      const matchesName = mentor.full_name
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const matchesRole = jobFilter ? mentor.job_role === jobFilter : true; // if no filter, match all
      return matchesName && matchesRole;
    });
    setFilteredMentors(filtered);
  }, [search, jobFilter, mentors]);

  const handleBook = (id) => {
    router.push(`/book-appointment/${id}/create`);
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-40 text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h2 className="text-3xl font-semibold mb-8 text-center md:text-left">
        Schedule a Call with Our Mentors
      </h2>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:space-x-6 mb-10">
        <Input
          type="text"
          placeholder="Search mentors by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 md:mb-0 md:flex-1"
        />

        <Select
          onValueChange={(val) => setJobFilter(val === "all" ? "" : val)}
          defaultValue="all"
          className="w-full md:w-72"
        >
          <SelectTrigger aria-label="Filter by Job Role">
            <SelectValue placeholder="Filter by Job Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Software Development">
              Software Development
            </SelectItem>
            <SelectItem value="Product Management">
              Product Management
            </SelectItem>
            <SelectItem value="Product Design">Product Design</SelectItem>
            <SelectItem value="Sales and Marketing">
              Sales and Marketing
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mentors Grid */}
      {filteredMentors.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No mentors found matching your criteria.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMentors.map((mentor) => (
            <Card
              key={mentor.id}
              className="flex flex-col justify-between p-6 shadow-lg hover:shadow-xl transition-shadow rounded-lg"
            >
              <CardContent className="flex flex-col items-center text-center space-y-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={mentor.profile_picture || "/default-avatar.png"}
                    alt={mentor.full_name}
                  />
                  <AvatarFallback>
                    {mentor.full_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">{mentor.full_name}</h3>
                <p className="text-sm font-medium text-primary">
                  {mentor.job_role}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mentor.company}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mentor.country}
                </p>
                <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                  {mentor.bio}
                </p>
              </CardContent>
              <Button
                onClick={() => handleBook(mentor.id)}
                variant="secondary"
                className="mt-4 w-full"
              >
                Book
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
