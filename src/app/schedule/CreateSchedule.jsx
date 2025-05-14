"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "../config/dfConfig";
import { useUser } from "@clerk/nextjs";

const CreateSchedule = () => {
  const { user } = useUser();
  const [mentorId, setMentorId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [meetUrl, setMeetUrl] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState(null);
  const [editTimes, setEditTimes] = useState({ start_time: "", end_time: "" });
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);

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
    const fetchMentorData = async () => {
      if (!user?.id) return;
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id, meet_url")
        .eq("clerk_id", user.id)
        .single();

      if (userError) {
        console.error(userError);
        return;
      }

      setMentorId(userRecord.id);
      setMeetUrl(userRecord.meet_url || "");
      setEditUrl(userRecord.meet_url || "");

      const { data: scheduleData, error: scheduleError } = await supabase
        .from("mentor_schedules")
        .select("*")
        .eq("mentor_id", userRecord.id);

      if (scheduleError) {
        console.error(scheduleError);
      } else {
        setSchedules(scheduleData);
      }
    };

    fetchMentorData();
  }, [user]);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus =
      currentStatus === "available" ? "unavailable" : "available";
    const { error } = await supabase
      .from("mentor_schedules")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleEditMeetUrl = async () => {
    if (!editUrl.trim()) {
      toast.error("Meeting URL cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ meet_url: editUrl })
      .eq("id", mentorId);

    if (!error) {
      setMeetUrl(editUrl);
      setUrlDialogOpen(false);
      toast.success("Meeting URL updated");
    } else {
      toast.error("Failed to update Meeting URL");
    }
  };

  const handleEditTimes = async () => {
    const schedule = schedules.find((s) => s.day_of_week === selectedDay);
    const { error } = await supabase
      .from("mentor_schedules")
      .update({
        start_time: editTimes.start_time,
        end_time: editTimes.end_time,
      })
      .eq("id", schedule.id);

    if (!error) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === schedule.id
            ? {
                ...s,
                start_time: editTimes.start_time,
                end_time: editTimes.end_time,
              }
            : s
        )
      );
      setTimeDialogOpen(false);
      toast.success("Time updated");
    } else {
      toast.error("Failed to update time");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Meeting Link</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700 truncate max-w-xs">
            {meetUrl || "Not set"}
          </p>
          <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Edit Meeting URL</DialogTitle>
              <Label htmlFor="meet-url">Meeting URL</Label>
              <Input
                id="meet-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="Enter new meeting URL"
              />
              <Button className="mt-4 w-full" onClick={handleEditMeetUrl}>
                Save
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Weekly Schedule</h2>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between border p-3 rounded-lg"
            >
              <div>
                <p className="font-medium capitalize">{schedule.day_of_week}</p>
                <p className="text-sm text-gray-500">
                  {format12Hour(schedule.start_time)} -{" "}
                  {format12Hour(schedule.end_time)}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    schedule.status === "available"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {schedule.status}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={schedule.status === "available"}
                  onCheckedChange={() =>
                    handleToggleStatus(schedule.id, schedule.status)
                  }
                />
                <Dialog
                  open={timeDialogOpen && selectedDay === schedule.day_of_week}
                  onOpenChange={(open) => {
                    if (open) {
                      setSelectedDay(schedule.day_of_week);
                      setEditTimes({
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                      });
                    } else {
                      setTimeDialogOpen(false);
                    }
                    setTimeDialogOpen(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle>
                      Edit Time for {schedule.day_of_week}
                    </DialogTitle>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={editTimes.start_time}
                      onChange={(e) =>
                        setEditTimes((prev) => ({
                          ...prev,
                          start_time: e.target.value,
                        }))
                      }
                    />
                    <Label htmlFor="end-time" className="mt-2">
                      End Time
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={editTimes.end_time}
                      onChange={(e) =>
                        setEditTimes((prev) => ({
                          ...prev,
                          end_time: e.target.value,
                        }))
                      }
                    />
                    <Button className="mt-4 w-full" onClick={handleEditTimes}>
                      Save
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreateSchedule;
