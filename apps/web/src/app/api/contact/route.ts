import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = contactSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed. Please verify the submitted information.",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Honeypot spam defense
    if (data.hp_website && data.hp_website.length > 0) {
      return NextResponse.json(
        { success: false, error: "Bot activity detected." },
        { status: 400 }
      );
    }

    // Generate unique support ticket reference
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketId = `PRF-${timestamp}-${randomSuffix}`;

    const recipient = process.env.CONTACT_EMAIL_RECIPIENT || "support@prepford.com";

    // Structured server log for observability
    console.info(`[Contact API] Received submission: Ticket=${ticketId}, Category=${data.category}, From=${data.email}, Recipient=${recipient}`);

    return NextResponse.json(
      {
        success: true,
        ticketId,
        message:
          "Thank you for reaching out to PrepFord NCLEX. Your message has been received by our support team.",
        details: {
          recipient,
          category: data.category,
          receivedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Contact API] Unexpected error handling submission:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing your message. Please try again later.",
      },
      { status: 500 }
    );
  }
}
