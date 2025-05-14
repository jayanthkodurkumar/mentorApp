// /app/api/checkout/route.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { priceId, appointmentDetails } = await req.json();
  // console.log(appointmentDetails);
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
        appointment_id: appointmentDetails.id,
      },
      success_url:
        "https://mentor-cc32062is-jayanths-projects-fcae55a8.vercel.app/",
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
