import { Resend } from "resend";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  const { mentor_name, status, mentee_email, appointment_date } =
    await req.json();

  // Validate input
  if (!mentor_name || !status || !mentee_email || !appointment_date) {
    return new Response(JSON.stringify({ error: "All fields are required." }), {
      status: 400,
    });
  }

  try {
    // Send the email using Resend
    // console.log(mentor_name);
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: mentee_email,
      subject: "Your appointment status has changed.",
      html: `<p>Your appointment with ${mentor_name} on ${appointment_date} has been ${status}.</p>`,
    });
    // console.log("Email sent response:", emailResponse);

    return new Response(
      JSON.stringify({ message: "Notification sent successfully." }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification." }),
      { status: 500 }
    );
  }
}
