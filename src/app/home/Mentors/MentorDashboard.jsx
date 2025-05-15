"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/app/config/dfConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import axios from "axios";

const format12Hour = (timeStr) => {
  const [hour, minute] = timeStr.split(":");
  const date = new Date();
  date.setHours(+hour, +minute);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const MentorDashboard = () => {
  const { user } = useUser();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [mentorNotes, setMentorNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [groupedAppointments, setGroupedAppointments] = useState({
    upcoming: [],
    pending: [],
    accepted: [],
    cancelled: [],
    declined: [],
    completed: [],
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchAppointments = async () => {
      setLoading(true);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

      if (userError || !userData) {
        console.error("Error fetching mentor UUID:", userError);
        setLoading(false);
        return;
      }

      const mentorUUID = userData.id;

      const { data: appts, error: apptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("mentor_id", mentorUUID);

      if (apptError) {
        console.error("Error fetching appointments:", apptError);
        setLoading(false);
        return;
      }

      const withMenteeNames = await Promise.all(
        appts.map(async (appt) => {
          const { data: menteeData } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", appt.mentee_id)
            .single();

          return {
            ...appt,
            mentee_name: menteeData?.full_name || "Unknown",
          };
        })
      );

      setAppointments(withMenteeNames);
      setLoading(false);
    };

    fetchAppointments();
  }, [user?.id]);

  useEffect(() => {
    const now = new Date();

    const groups = {
      upcoming: [],
      pending: [],
      accepted: [],
      cancelled: [],
      declined: [],
      completed: [],
    };

    appointments.forEach((appt) => {
      const appointmentDateTime = new Date(
        `${appt.appointment_date}T${appt.start_time}`
      );

      if (appt.status === "booked" && appointmentDateTime >= now) {
        groups.upcoming.push(appt);
      } else if (groups[appt.status]) {
        groups[appt.status].push(appt);
      }
    });

    setGroupedAppointments(groups);
  }, [appointments]);

  const notifyMentee = async (
    mentor_name,
    status,
    mentee_email,
    appointment_date,
    mentor_notes = ""
  ) => {
    try {
      const response = await axios.post("/api/emailnotification", {
        mentor_name,
        status,
        mentee_email,
        appointment_date,
        mentor_notes,
      });

      console.log("Notification sent:", response.data.message);
    } catch (error) {
      console.log(
        "Error sending notification:",
        error.response?.data?.error || error.message
      );
    }
  };

  const updateStatus = async (id, newStatus, notes = "") => {
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("mentor_id, mentee_id, appointment_date")
      .eq("id", id)
      .single();

    if (apptError || !appointment) {
      alert("Error fetching appointment data");
      return;
    }

    const { data: mentorData, error: mentorError } = await supabase
      .from("users")
      .select("full_name, email, meet_url")
      .eq("id", appointment.mentor_id)
      .single();

    const { data: menteeData, error: menteeError } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", appointment.mentee_id)
      .single();

    if (mentorError || !mentorData || menteeError || !menteeData) {
      alert("Error fetching user details");
      return;
    }

    const updates = {
      status: newStatus,
      mentor_notes: notes,
      ...(newStatus === "accepted" && { meet_url: mentorData.meet_url }),
    };

    const { error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id);

    if (error) {
      alert("Failed to update status");
      return;
    }

    notifyMentee(
      mentorData.full_name,
      newStatus,
      menteeData.email,
      appointment.appointment_date,
      notes
    );

    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === id
          ? { ...appt, status: newStatus, mentor_notes: notes }
          : appt
      )
    );
    setSelectedAppt(null);
    setMentorNotes("");
    setShowCancelDialog(false);
  };

  const handleCancelAppointment = () => {
    if (!mentorNotes.trim()) {
      alert("Please provide a reason for cancellation");
      return;
    }
    updateStatus(selectedAppt.id, "cancelled", mentorNotes);
  };

  const renderTable = (list, tabName) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Mentee Name</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                No appointments.
              </TableCell>
            </TableRow>
          ) : (
            list.map((appt) => (
              <TableRow key={appt.id}>
                <TableCell>{appt.appointment_date}</TableCell>
                <TableCell>{format12Hour(appt.start_time)}</TableCell>
                <TableCell>{appt.mentee_name}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedAppt(appt)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    {selectedAppt?.id === appt.id && (
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Appointment Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Mentee:</strong> {appt.mentee_name}
                          </p>
                          <p>
                            <strong>Mentee Notes:</strong>{" "}
                            {appt.mentee_notes || "No notes provided."}
                          </p>
                          <p>
                            <strong>Date:</strong> {appt.appointment_date}
                          </p>
                          <p>
                            <strong>Start Time:</strong>{" "}
                            {format12Hour(appt.start_time)}
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            {appt.status.charAt(0).toUpperCase() +
                              appt.status.slice(1)}
                          </p>

                          {tabName === "pending" &&
                            appt.status === "pending" && (
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    updateStatus(appt.id, "accepted")
                                  }
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    updateStatus(appt.id, "declined")
                                  }
                                >
                                  Decline
                                </Button>
                              </div>
                            )}

                          {tabName === "accepted" &&
                            appt.status === "accepted" && (
                              <Button
                                variant="destructive"
                                onClick={() => setShowCancelDialog(true)}
                                className="mt-4"
                              >
                                Cancel Appointment
                              </Button>
                            )}
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Please provide a reason for cancelling this appointment:</p>
            <textarea
              className="w-full border rounded p-2 min-h-[100px]"
              placeholder="Enter your reason for cancellation..."
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={!mentorNotes.trim()}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (loading) return <div className="p-4">Loading appointments...</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mentor Dashboard</h1>
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {renderTable(groupedAppointments.upcoming, "upcoming")}
        </TabsContent>
        <TabsContent value="pending">
          {renderTable(groupedAppointments.pending, "pending")}
        </TabsContent>
        <TabsContent value="accepted">
          {renderTable(groupedAppointments.accepted, "accepted")}
        </TabsContent>
        <TabsContent value="cancelled">
          {renderTable(groupedAppointments.cancelled, "cancelled")}
        </TabsContent>
        <TabsContent value="declined">
          {renderTable(groupedAppointments.declined, "declined")}
        </TabsContent>
        <TabsContent value="completed">
          {renderTable(groupedAppointments.completed, "completed")}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MentorDashboard;
