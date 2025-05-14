"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // make sure you have this component
import { supabase } from "../config/dfConfig";

export default function Onboarding({ userData, toggleStatus }) {
  const router = useRouter();

  const [fullName, setFullName] = useState(userData.full_name);
  const [role, setRole] = useState("mentee");
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [meetingLink, setMeetingLink] = useState(""); // new state
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (userData?.full_name) {
      setFullName(userData.full_name);
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data: insertedUser, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_id: userData?.clerk_id,
        full_name: fullName,
        role: role,
        job_role: role === "mentor" ? jobRole : null,
        country: country,
        bio,
        company: company,
        meet_url: role === "mentor" ? meetingLink : null,
        price: role === "mentor" ? parseInt(price) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.log(insertError);
      return;
    }

    const mentorId = insertedUser?.id;

    if (role === "mentor") {
      try {
        const res = await fetch("/api/create-stripe-product", {
          method: "POST",
          body: JSON.stringify({
            fullName,
            price,
            mentorId,
          }),
        });

        const result = await res.json();

        if (res.ok) {
          const { error: priceInsertError } = await supabase
            .from("price_id")
            .insert({
              mentor_id: mentorId,
              price_id: result.price_id,
            });

          if (priceInsertError) {
            console.log("Failed to insert price_id:", priceInsertError);
          }
        } else {
          console.error("Stripe API failed:", result.error);
        }

        // Schedule setup...
        const defaultSchedules = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].map((day) => ({
          mentor_id: mentorId,
          day_of_week: day,
          start_time: "16:00",
          end_time: "20:00",
          status: "available",
        }));

        const { error: scheduleError } = await supabase
          .from("mentor_schedules")
          .insert(defaultSchedules);

        if (scheduleError) {
          console.log("Schedule insertion failed:", scheduleError);
        }
      } catch (err) {
        console.error("Failed to create mentor product/price:", err);
      }
    }

    toggleStatus();
    router.push("/");
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100">
      <h2 className="text-3xl font-bold text-center text-gray-900">Welcome!</h2>
      <p className="text-center text-gray-500">Let’s get you started.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            className="text-black"
            id="fullName"
            type="text"
            value={fullName ?? "N/A"}
            disabled
          />
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <Label>Role</Label>
          <RadioGroup
            value={role}
            onValueChange={setRole}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mentor" id="mentor" />
              <Label htmlFor="mentor">Mentor</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mentee" id="mentee" />
              <Label htmlFor="mentee">Mentee</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Mentor Fields */}
        {role === "mentor" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="jobRole">Job Role</Label>
              <Input
                id="jobRole"
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="Enter your job role"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input
                id="meetingLink"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Enter your meeting link"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Session Price (in USD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter your session price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell mentees about your background, experience, and how you can help."
              />
            </div>
          </>
        )}

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Enter your company name"
          />
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Enter your country"
          />
        </div>

        {/* Mentee Bio */}
        {role === "mentee" && (
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Enter a brief bio about yourself"
            />
          </div>
        )}

        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
