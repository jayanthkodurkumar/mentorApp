// src/app/api/webhook/route.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// No config export in App Router format

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

    const { customer_email, amount_total, id: stripe_session_id } = session;

    // 1. Create appointment
    const { appointment_id } = session.metadata; // Retrieve metadata
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
      /*
      const { error: billError } = await supabase.from("bills").insert({
        email: customer_email,
        amount: amount_total / 100, // convert from cents
        stripe_session_id,
        paid: true,
      });
      */
    } catch (error) {
      console.error("Unexpected error:", error);
      return new Response("Server Error", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
