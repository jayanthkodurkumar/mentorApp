import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { fullName, price, mentorId } = body;

    const product = await stripe.products.create({
      name: fullName,
      metadata: {
        mentor_id: mentorId,
      },
    });

    const stripePrice = await stripe.prices.create({
      unit_amount: parseInt(price) * 100,
      currency: "usd",
      product: product.id,
    });

    return NextResponse.json({ price_id: stripePrice.id }, { status: 200 });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
