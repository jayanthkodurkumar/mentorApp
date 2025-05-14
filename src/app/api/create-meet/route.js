import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.json();
  const { appointmentId, topic, startTime, duration } = body;

  if (!appointmentId || !topic || !startTime || !duration) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const payload = {
    iss: process.env.ZOOM_API_KEY,
    exp: Math.floor(Date.now() / 1000) + 60 * 5,
  };

  const token = jwt.sign(payload, process.env.ZOOM_API_SECRET);

  try {
    const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startTime,
        duration,
        timezone: "Asia/Kolkata",
        settings: {
          join_before_host: false,
          approval_type: 0,
          registration_type: 1,
          waiting_room: true,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Zoom error:", data);
      return NextResponse.json(
        { error: "Failed to create Zoom meeting" },
        { status: 500 }
      );
    }

    const joinUrl = data.join_url;

    await supabase
      .from("appointments")
      .update({ zoom_url: joinUrl })
      .eq("id", appointmentId);

    return NextResponse.json({ joinUrl });
  } catch (err) {
    console.error("Error creating Zoom meeting:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
