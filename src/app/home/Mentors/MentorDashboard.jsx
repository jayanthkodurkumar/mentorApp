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
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

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

  const notifyMentee = async (
    mentor_name,
    status,
    mentee_email,
    appointment_date
  ) => {
    console.log(mentor_name);
    try {
      const response = await axios.post("/api/emailnotification", {
        mentor_name,
        status,
        mentee_email,
        appointment_date,
      });

      console.log("Notification sent:", response.data.message);
    } catch (error) {
      console.log(
        "Error sending notification:",
        error.response?.data?.error || error.message
      );
    }
  };
  // Function to update appointment status and notify mentee
  const updateStatus = async (id, newStatus) => {
    // Fetch the appointment details using the appointment ID
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("mentor_id, mentee_id, appointment_date")
      .eq("id", id)
      .single();

    if (apptError || !appointment) {
      alert("Error fetching appointment data");
      return;
    }

    // Fetch the mentor's and mentee's details from the users table
    const { data: mentorData, error: mentorError } = await supabase
      .from("users")
      .select("full_name, email")
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

    // Update the status of the appointment in the database
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Failed to update status");
      return;
    }

    // Send the email notification to the mentee
    notifyMentee(
      mentorData.full_name,
      newStatus,
      menteeData.email,
      appointment.appointment_date
    );

    // Update the local state (appointments) to reflect the new status
    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === id ? { ...appt, status: newStatus } : appt
      )
    );
    setSelectedAppt(null);
  };

  const completeAppointment = async () => {
    const { error } = await supabase
      .from("appointments")
      .update({
        status: "completed",
        mentor_notes: mentorNotes,
      })
      .eq("id", selectedAppt.id);

    if (error) {
      alert("Failed to complete appointment");
      return;
    }

    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === selectedAppt.id
          ? { ...appt, status: "completed", mentor_notes: mentorNotes }
          : appt
      )
    );

    setShowCompleteDialog(false);
    setSelectedAppt(null);
    setMentorNotes("");
  };

  const groupedAppointments = {
    pending: [],
    confirmed: [],
    cancelled: [],
    declined: [],
    completed: [],
  };

  appointments.forEach((appt) => {
    if (groupedAppointments[appt.status]) {
      groupedAppointments[appt.status].push(appt);
    }
  });

  if (loading) return <div className="p-4">Loading appointments...</div>;

  const renderTable = (list) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Mentee</TableHead>
            <TableHead>Status</TableHead>
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
                <TableCell>{appt.mentee_name}</TableCell>
                <TableCell className="capitalize">{appt.status}</TableCell>
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
                            <strong>Notes:</strong>{" "}
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
                            <span className="capitalize">{appt.status}</span>
                          </p>
                          {appt.mentor_notes && (
                            <p>
                              <strong>Mentor Notes:</strong> {appt.mentor_notes}
                            </p>
                          )}
                        </div>
                        <DialogFooter className="mt-4">
                          {appt.status === "pending" && (
                            <>
                              <Button
                                onClick={() =>
                                  updateStatus(appt.id, "confirmed")
                                }
                              >
                                Accept Request
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  updateStatus(appt.id, "declined")
                                }
                              >
                                Decline Request
                              </Button>
                            </>
                          )}
                          {appt.status === "confirmed" && (
                            <>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  updateStatus(appt.id, "cancelled")
                                }
                              >
                                Cancel Appointment
                              </Button>
                              <Button
                                onClick={() => setShowCompleteDialog(true)}
                              >
                                Complete Appointment
                              </Button>
                            </>
                          )}
                        </DialogFooter>

                        {showCompleteDialog && (
                          <Dialog
                            open={showCompleteDialog}
                            onOpenChange={setShowCompleteDialog}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Complete Appointment</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 text-sm">
                                <p>
                                  Please enter your notes for the appointment:
                                </p>
                                <textarea
                                  className="w-full p-2 border rounded-md"
                                  rows={4}
                                  value={mentorNotes}
                                  onChange={(e) =>
                                    setMentorNotes(e.target.value)
                                  }
                                  placeholder="Enter mentor notes..."
                                />
                              </div>
                              <DialogFooter className="mt-4">
                                <Button onClick={completeAppointment}>
                                  Submit & Complete
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowCompleteDialog(false);
                                    setMentorNotes("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Appointments</h2>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Requests</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {renderTable(groupedAppointments.pending)}
        </TabsContent>
        <TabsContent value="confirmed">
          {renderTable(groupedAppointments.confirmed)}
        </TabsContent>
        <TabsContent value="cancelled">
          {renderTable(groupedAppointments.cancelled)}
        </TabsContent>
        <TabsContent value="declined">
          {renderTable(groupedAppointments.declined)}
        </TabsContent>
        <TabsContent value="completed">
          {renderTable(groupedAppointments.completed)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MentorDashboard;
