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

  const format12Hour = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(+hour, +minute);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const fetchMenteeId = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

      if (error) {
        console.log("Error fetching mentee ID:", error.message);
      } else {
        setMenteeId(data?.id);
      }
    };

    if (user) {
      fetchMenteeId();
    }
  }, [user]);

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
    const slots = [];
    let startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);

    while (startTime < endTime) {
      const time = startTime.toTimeString().slice(0, 5); // HH:MM
      if (!bookedSlots.includes(time)) {
        slots.push(time);
      }
      startTime.setMinutes(startTime.getMinutes() + 30);
    }
    return slots;
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedDate) return;

      const weekday = selectedDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      const { data, error } = await supabase
        .from("mentor_schedules")
        .select("start_time, end_time")
        .eq("mentor_id", mentorId)
        .eq("day_of_week", weekday)
        .single();

      const { data: bookedData, error: bookedError } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("mentor_id", mentorId)
        .eq("appointment_date", selectedDate.toISOString().slice(0, 10));

      if (bookedError) {
        console.log("Error fetching booked slots:", bookedError.message);
        return;
      }

      const booked = bookedData.map((a) => a.start_time.slice(0, 5));
      setBookedSlots(booked);

      if (error) {
        console.log("Error fetching schedule:", error.message);
        setSlots([]);
      } else if (data) {
        const slotList = generateTimeSlots(
          data.start_time,
          data.end_time,
          booked
        );
        setSlots(slotList);
      } else {
        setSlots([]);
      }
    };

    fetchSchedule();
  }, [selectedDate, mentorId]);

  const handleBookAppointment = async () => {
    if (!user) {
      console.log("User is not logged in");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from("appointments").insert([
      {
        mentor_id: mentorId,
        mentee_id: menteeId,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        category,
        mentee_notes: notes,
        status: "pending",
      },
    ]);

    setLoading(false);

    if (error) {
      console.log("Error booking appointment:", error.message);
    } else {
      setDialogOpen(false);
      setSelectedSlot(null);
      setCategory("");
      setNotes("");
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto">
      {/* Mentor Details + Calendar */}
      <Card className="md:w-1/3 w-full shadow-lg border border-gray-200">
        <CardContent className="space-y-6">
          {mentor ? (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {mentor.full_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mentor.job_role} at{" "}
                  <span className="font-semibold">{mentor.company}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Country: {mentor.country}
                </p>
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                  {mentor.bio}
                </p>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border border-gray-300 shadow-sm"
              />
            </>
          ) : (
            <p className="text-center py-10 text-muted-foreground">
              Loading mentor details...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Slots and Booking */}
      <Card className="md:w-2/3 w-full shadow-lg border border-gray-200 flex flex-col">
        <CardContent className="flex flex-col flex-grow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            {selectedDate
              ? `Available Slots for ${selectedDate.toDateString()}`
              : "Please select a date"}
          </h2>

          <ScrollArea className="flex-grow border border-gray-300 rounded-md p-3">
            <div className="grid grid-cols-3 gap-3">
              {selectedDate && slots.length > 0 ? (
                slots.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => {
                        if (!isBooked) {
                          setSelectedSlot(slot);
                          setDialogOpen(true);
                        }
                      }}
                      className={`
                        py-2 px-3 rounded-md text-sm font-medium
                        transition
                        ${
                          isBooked
                            ? "bg-gray-300 cursor-not-allowed text-gray-600"
                            : isSelected
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-white hover:bg-blue-100 text-gray-900"
                        }
                      `}
                      aria-pressed={isSelected}
                    >
                      {format12Hour(slot)}
                    </button>
                  );
                })
              ) : selectedDate ? (
                <p className="text-center text-muted-foreground col-span-3 mt-8">
                  No slots available for this day.
                </p>
              ) : (
                <p className="text-center text-muted-foreground col-span-3 mt-8">
                  Select a date to view available slots.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Book Slot at {selectedSlot ? format12Hour(selectedSlot) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category" className="mb-1">
                Category
              </Label>
              <Select
                onValueChange={(value) => setCategory(value)}
                value={category}
                id="category"
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="career">Career Advice</SelectItem>
                  <SelectItem value="technical">Technical Help</SelectItem>
                  <SelectItem value="personal">Personal Guidance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes" className="mb-1">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for the mentor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedSlot || !category || loading}
              onClick={handleBookAppointment}
            >
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
