// src/app/api/webhook/route.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  // Get the raw body using native Web API
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const headers = req.headers;
  // console.log("Headers:", headers);

  // console.log("SIGNATURE", sig);
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle successful checkout session
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const { customer_details, amount_total, id: stripe_session_id } = session;
    // console.log("sessopm", session);
    // 1. Create appointment
    const { appointment_id, date, time, mentor_name, meet_url } =
      session.metadata;

    console.log("METADATA:", session.metadata);

    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "booked" }) // or confirmed if that's your status
        .eq("id", appointment_id)
        .select();

      if (error) {
        console.error("Error updating appointment:", error);
        return new Response("Error updating appointment", { status: 500 });
      }

      console.log("Appointment payment marked successfully:", data);

      // 2. Create bill if you want to uncomment this later

      const formattedAmount = (amount_total / 100).toFixed(2); // in USD
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: customer_details.email,
        subject: `Hoorayy!!! Your Meeting with ${mentor_name} is Confirmed & Payment Received`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
  <div style="background-color: #4f46e5; color: #fff; padding: 20px;">
    <h2 style="margin: 0;">Payment Recieved</h2>
  </div>

  <div style="padding: 20px;">
    <h3 style="margin-top: 0; color: #333;">Receipt Details</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Appointment ID:</strong></td>
        <td style="padding: 8px 0;">${appointment_id}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Mentor:</strong></td>
        <td style="padding: 8px 0;">${mentor_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
        <td style="padding: 8px 0;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
        <td style="padding: 8px 0;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Meeting Link:</strong></td>
        <td style="padding: 8px 0;"><a href="${meet_url}" style="color: #4f46e5;">Join Meeting</a></td>
      </tr>
      <tr style="border-top: 1px solid #e0e0e0;">
        <td style="padding: 12px 0; color: #333;"><strong>Amount Paid:</strong></td>
        <td style="padding: 12px 0;"><strong>$${formattedAmount} USD</strong></td>
      </tr>
    </table>

    <p style="margin-top: 20px; font-size: 13px; color: #888;">
      If you have any questions, feel free to reply to this email. We're here to help!
    </p>
  </div>

  <div style="background-color: #f9f9f9; text-align: center; padding: 10px; font-size: 12px; color: #aaa;">
    &copy; ${new Date().getFullYear()} Mentor Platform. All rights reserved.
  </div>
</div>

        `,
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return new Response("Server Error", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
