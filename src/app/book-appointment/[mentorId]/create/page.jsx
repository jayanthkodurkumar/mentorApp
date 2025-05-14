"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/app/config/dfConfig";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useUser } from "@clerk/nextjs";

export default function BookAppointment() {
  const router = useRouter();
  const params = useParams();
  const mentorId = params.mentorId;
  const { user } = useUser();
  const [mentor, setMentor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [menteeId, setMenteeId] = useState(null);
  const [loading, setLoading] = useState(false);

  // console.log(user);
  const format12Hour = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(+hour, +minute);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Fetch mentee details from Clerk user ID
  useEffect(() => {
    const fetchMenteeId = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", user.id) // Assuming the users table stores clerk_id
        .single();

      if (error) {
        console.log("Error fetching mentee ID:", error.message);
      } else {
        setMenteeId(data?.id); // Set the mentee ID
      }
    };

    if (user) {
      fetchMenteeId();
    }
  }, [user]);

  // Fetch mentor details
  useEffect(() => {
    const fetchMentor = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, job_role, country, bio, company")
        .eq("id", mentorId)
        .single();

      if (error) {
        console.log("Error fetching mentor:", error.message);
      } else {
        setMentor(data);
      }
    };

    if (mentorId) {
      fetchMentor();
    }
  }, [mentorId]);
  const generateTimeSlots = (start, end, bookedSlots) => {
    // console.log(bookedSlots);
    const slots = [];
    let startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);

    while (startTime < endTime) {
      const time = startTime.toTimeString().slice(0, 5); // HH:MM

      // Only add the slot if it's not already booked
      if (!bookedSlots.includes(time)) {
        slots.push(time);
      }

      startTime.setMinutes(startTime.getMinutes() + 30);
    }

    return slots;
  };
  // Fetch mentor schedule and booked slots
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedDate) return;

      const weekday = selectedDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      // Fetch schedule
      const { data, error } = await supabase
        .from("mentor_schedules")
        .select("start_time, end_time")
        .eq("mentor_id", mentorId)
        .eq("day_of_week", weekday)
        .single();

      // Fetch booked slots
      const { data: bookedData, error: bookedError } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("mentor_id", mentorId)
        .eq("appointment_date", selectedDate.toISOString().slice(0, 10));

      if (bookedError) {
        console.log("Error fetching booked slots:", bookedError.message);
        return;
      }

      const booked = bookedData.map((a) => a.start_time.slice(0, 5)); // Format to HH:MM
      setBookedSlots(booked);

      if (error) {
        console.log("Error fetching schedule:", error.message);
        setSlots([]);
      } else if (data) {
        const slotList = generateTimeSlots(
          data.start_time,
          data.end_time,
          booked
        ); // use `booked` here, not `bookedSlots`
        setSlots(slotList);
      } else {
        setSlots([]);
      }
    };

    fetchSchedule();
  }, [selectedDate, mentorId]);

  // Handle appointment booking
  const handleBookAppointment = async () => {
    if (!user) {
      console.log("User is not logged in");
      return;
    }

    // Insert appointment into the appointments table
    const { data, error } = await supabase.from("appointments").insert([
      {
        mentor_id: mentorId,
        mentee_id: menteeId,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        category: category,
        mentee_notes: notes,
        status: "pending", // Set status as pending initially
      },
    ]);

    if (error) {
      console.log("Error booking appointment:", error.message);
    } else {
      console.log("Appointment booked:", data);
      // Reset form fields after booking
      setDialogOpen(false);
      setSelectedSlot(null);
      setCategory("");
      setNotes("");
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col md:flex-row p-4 gap-4">
      {/* Mentor Details */}
      <Card className="md:w-1/3 w-full">
        <CardContent className="p-4 space-y-4">
          {mentor ? (
            <>
              <div>
                <h2 className="text-xl font-semibold">{mentor.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {mentor.job_role} at {mentor.company}
                </p>
                <p className="text-sm">Country: {mentor.country}</p>
                <p className="text-sm">Bio: {mentor.bio}</p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </>
          ) : (
            <p>Loading mentor details...</p>
          )}
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card className="md:w-2/3 w-full h-[400px]">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2">
            {selectedDate
              ? `Available Slots for ${selectedDate.toDateString()}`
              : "Please select a date"}
          </h2>
          <ScrollArea className="h-[300px] pr-2">
            <div className="flex flex-col gap-2">
              {selectedDate && slots.length > 0 ? (
                slots.map((slot, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      if (!bookedSlots.includes(slot)) {
                        setSelectedSlot(slot);
                        setDialogOpen(true);
                      }
                    }}
                    className={`border rounded-md p-2 cursor-pointer transition ${
                      bookedSlots.includes(slot)
                        ? "bg-gray-300 cursor-not-allowed"
                        : "hover:bg-muted"
                    }`}
                  >
                    {format12Hour(slot)}
                  </div>
                ))
              ) : selectedDate ? (
                <p>No slots available for this day.</p>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Slot at {selectedSlot}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Category</Label>
              <Select onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="career">Career Guidance</SelectItem>
                  <SelectItem value="tech">Tech Interview</SelectItem>
                  <SelectItem value="resume">Resume Review</SelectItem>
                  <SelectItem value="general">General Advice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea
                placeholder="Write a note to your mentor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleBookAppointment} disabled={loading}>
              {loading ? "Processing..." : "Book Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
