"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/app/config/dfConfig";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ViewAppointments = () => {
  const { user } = useUser();
  const [userId, setUserId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("booked");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

      if (!error && data) {
        setUserId(data.id);
      } else {
        console.log("Error fetching user_id:", error?.message);
      }
    };
    fetchUserId();
  }, [user]);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!userId) return;
      setLoading(true);

      const { data: appointmentsData, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select("*")
          .eq("mentee_id", userId)
          .eq("status", statusFilter)
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true });

      if (appointmentsError) {
        console.error(
          "Error fetching appointments:",
          appointmentsError.message
        );
        setLoading(false);
        return;
      }

      // Fetch mentor names individually and merge them
      const enrichedAppointments = await Promise.all(
        appointmentsData.map(async (appt) => {
          let mentorName = "Unknown";
          if (appt.mentor_id) {
            const { data: mentorUser, error: mentorError } = await supabase
              .from("users")
              .select("full_name")
              .eq("id", appt.mentor_id)
              .single();

            if (!mentorError && mentorUser?.full_name) {
              mentorName = mentorUser.full_name;
            }
          }

          return { ...appt, mentor_name: mentorName };
        })
      );

      setAppointments(enrichedAppointments);
      setLoading(false);
    };

    fetchAppointments();
  }, [userId, statusFilter]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Appointments</h2>
      <Tabs defaultValue="booked" onValueChange={setStatusFilter}>
        <TabsList className="mb-4">
          {["booked", "accepted", "pending", "cancelled", "declined"].map(
            (status) => (
              <TabsTrigger key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </TabsTrigger>
            )
          )}
        </TabsList>

        <TabsContent value={statusFilter}>
          {loading ? (
            <Loading />
          ) : (
            <AppointmentTable
              appointments={appointments}
              status={statusFilter}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Loading = () => (
  <div className="flex justify-center items-center py-10">
    <Loader2 className="animate-spin" />
  </div>
);

const AppointmentTable = ({ appointments, status }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [openDialogId, setOpenDialogId] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(+hour, +minute);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleCheckout = async (appointment) => {
    setLoadingId(appointment.id);
    const priceId = "price_1RNdptRw14aFggGHsJXLYfLL";

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, appointmentDetails: appointment }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert("Failed to create Stripe session.");

    setLoadingId(null);
  };

  const handleCancel = async (appointmentId) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", mentee_notes: cancelNote })
      .eq("id", appointmentId);

    if (error) {
      alert("Failed to cancel appointment.");
      console.log("Cancel error:", error.message);
    } else {
      alert("Appointment cancelled.");
      window.location.reload();
    }

    setOpenDialogId(null);
    setCancelNote("");
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Mentor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appt) => (
            <TableRow key={appt.id}>
              <TableCell>{appt.appointment_date}</TableCell>
              <TableCell>{formatTime(appt.start_time)}</TableCell>
              <TableCell>{appt.mentor_name}</TableCell>
              <TableCell className="capitalize">{appt.status}</TableCell>
              <TableCell className="flex gap-2">
                {appt.status === "accepted" && (
                  <Button
                    onClick={() => handleCheckout(appt)}
                    disabled={loadingId === appt.id}
                  >
                    {loadingId === appt.id ? "Redirecting..." : "Pay Now"}
                  </Button>
                )}
                {appt.status === "pending" && (
                  <Dialog
                    open={openDialogId === appt.id}
                    onOpenChange={(open) =>
                      setOpenDialogId(open ? appt.id : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive">Cancel</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Appointment</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        placeholder="Add a note for cancellation (optional)"
                        value={cancelNote}
                        onChange={(e) => setCancelNote(e.target.value)}
                      />
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={() => handleCancel(appt.id)}
                        >
                          Submit Cancellation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <Dialog
                  open={selectedAppointment?.id === appt.id}
                  onOpenChange={(open) =>
                    setSelectedAppointment(open ? appt : null)
                  }
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">View Details</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Appointment Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <p>
                        <strong>Date:</strong> {appt.appointment_date}
                      </p>
                      <p>
                        <strong>Time:</strong> {formatTime(appt.start_time)}
                      </p>
                      <p>
                        <strong>Mentor:</strong> {appt.mentor_name}
                      </p>
                      <p>
                        <strong>Category:</strong> {appt.category}
                      </p>
                      <p>
                        <strong>Status:</strong> {appt.status}
                      </p>
                      {appt.mentor_notes && (
                        <p>
                          <strong>Mentor Notes:</strong> {appt.mentor_notes}
                        </p>
                      )}
                      {appt.mentee_notes && (
                        <p>
                          <strong>Your Notes:</strong> {appt.mentee_notes}
                        </p>
                      )}
                      {status == "booked" && (
                        <p>
                          <strong>Meeting Link:</strong> {appt.meet_url}
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {appointments.length === 0 && (
        <div className="text-gray-500 mt-4">No appointments found.</div>
      )}
    </>
  );
};

export default ViewAppointments;
