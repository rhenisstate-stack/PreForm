import { NextResponse } from "next/server";
import { adminQuestionsService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

interface RouteParams {
  params: Promise<{ mediaId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required to access question exhibits." }, { status: 401 });
  }

  const { mediaId } = await params;
  const apiRes = await adminQuestionsService.getQuestionMediaBinary(mediaId, session);

  if (apiRes.success && apiRes.data) {
    const etag = apiRes.headers.get("etag") || `"${Date.now()}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=86400, must-revalidate",
        },
      });
    }

    const contentType = apiRes.headers.get("content-type") || "image/png";
    const blob = apiRes.data as Blob;
    const buffer = Buffer.from(await blob.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        ETag: etag,
        "Cache-Control": "public, max-age=86400, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return NextResponse.json(
    { success: false, error: apiRes.error || "Question media not found." },
    { status: apiRes.status || 404 }
  );
}
