// /app/api/checkout/route.js
import { supabase } from "@/app/config/dfConfig";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const formatTime = (timeStr) => {
  const [hour, minute] = timeStr.split(":");
  const date = new Date();
  date.setHours(+hour, +minute);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};
export async function POST(req) {
  const { priceId, appointmentDetails, email } = await req.json();
  try {
    // console.log("EMAIL", email);
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    const customer =
      existingCustomers.data.length > 0
        ? existingCustomers.data[0]
        : await stripe.customers.create({ email });
    const { data: mentorData, error: priceError } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", appointmentDetails.mentor_id)
      .single();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_intent_data: {
        receipt_email: customer.email,
      },

      metadata: {
        appointment_id: appointmentDetails.id,
        date: appointmentDetails.appointment_date, // format as YYYY-MM-DD
        time: formatTime(appointmentDetails.start_time), // format as HH:mm
        mentor_name: mentorData.full_name,
        meet_url: appointmentDetails.meet_url,
      },

      success_url: "http://localhost:3000/",
      cancel_url:
        "https://mentor-cc32062is-jayanths-projects-fcae55a8.vercel.app/cancel",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
    });
  } catch (err) {
    console.log("SERVER ERRROR:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
