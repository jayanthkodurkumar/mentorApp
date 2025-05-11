"use client";

import React, { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "../config/dfConfig";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Onboarding({ userData, toggleStatus }) {
  const router = useRouter();

  const [fullName, setFullName] = useState(userData.full_name);
  const [role, setRole] = useState("mentee");
  const [jobRole, setJobRole] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");

  console.log("USER", userData);

  useEffect(() => {
    if (userData?.full_name) {
      setFullName(userData.full_name);
    }
  }, [userData]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("users").insert({
      clerk_id: userData?.clerk_id,
      full_name: fullName,
      role: role,
      job_role: role === "mentor" ? jobRole : null,
      country: country,
      bio: role === "mentee" ? bio : null,
      company: company,
    });

    if (error) {
      console.log(error);
    } else {
      toggleStatus();
      router.push("/");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100">
      <h2 className="text-3xl font-bold text-center text-gray-900">Welcome!</h2>
      <p className="text-center text-gray-500">Let’s get you started.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name Input */}
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

        {/* Job Role Input (for mentors only) */}
        {role === "mentor" && (
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
        )}

        {/* Company Input */}
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

        {/* Country Input */}
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

        {/* Bio Input (for mentees only) */}
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

        {/* Submit Button */}
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
