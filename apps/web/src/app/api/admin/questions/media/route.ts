import { NextResponse } from "next/server";
import { adminQuestionsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export const MAX_QUESTION_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json(
        { success: false, error: "Please provide a valid image file in form-data." },
        { status: 400 }
      );
    }

    if ((file as File).size > MAX_QUESTION_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Image exceeds the maximum allowed size of 5 MB." },
        { status: 400 }
      );
    }

    const questionId = formData.get("questionId") as string | null;
    const res = await adminQuestionsService.uploadQuestionMedia(
      formData,
      auth.session,
      questionId || undefined
    );

    return NextResponse.json(
      res.data || { success: res.success, error: res.error },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("[Question Media Upload BFF] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process image upload." },
      { status: 500 }
    );
  }
}
