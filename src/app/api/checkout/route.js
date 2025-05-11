// /app/api/checkout/route.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { priceId, appointmentDetails } = await req.json();
  // console.log(appointmentDetails);
  const origin = req.headers.get("origin");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_PRICEID,
          quantity: 1,
        },
      ],
      metadata: {
        mentor_id: appointmentDetails.mentor_id,
        mentee_id: appointmentDetails.mentee_id,
        appointment_date: appointmentDetails.appointment_date,
        start_time: appointmentDetails.start_time,
        category: appointmentDetails.category,
        notes: appointmentDetails.notes,
        status: appointmentDetails.status,
      },
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
