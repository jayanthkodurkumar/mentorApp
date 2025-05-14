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
        subject: "Appointment Confirmed & Payment Received",
        html: `
          <h2>Thank you for your payment!</h2>
          <p>Your appointment has been confirmed.</p>
          <ul>
              <li><strong>Appointment ID:</strong> ${appointment_id}</li>
              <li><strong>Mentor:</strong> ${mentor_name}</li>
              <li><strong>Date:</strong> ${date}</li>
              <li><strong>Time:</strong> ${time}</li>
              <li><strong>Meeting Link:</strong> <a href="${meet_url}">Join Meeting</a></li>
              <li><strong>Amount Paid:</strong> $${formattedAmount} USD</li>
          </ul>
        `,
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return new Response("Server Error", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
