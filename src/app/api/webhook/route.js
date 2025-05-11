// app/api/webhook/route.js
import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // Important for raw Stripe payload
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const rawBody = await buffer(req);
  const sig = req.headers["stripe-signature"];

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
    const {
      mentor_id,
      mentee_id,
      appointment_date,
      start_time,
      category,
      notes,
      status,
    } = session.metadata; // Retrieve metadata
    console.log("METADATA:", session.metadata);
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        mentor_id: mentor_id,
        mentee_id: mentee_id,
        appointment_date: appointment_date,
        start_time: start_time,
        category: category,
        notes: notes,
        status: status,
      });

    // 2. Create bill
    // const { error: billError } = await supabase.from("bills").insert({
    //   email: customer_email,
    //   amount: amount_total / 100, // convert from cents
    //   stripe_session_id,
    //   paid: true,
    // });

    if (appointmentError) {
      console.error("Error inserting to Supabase:", appointmentError);
      return new Response("Error inserting to DB", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
