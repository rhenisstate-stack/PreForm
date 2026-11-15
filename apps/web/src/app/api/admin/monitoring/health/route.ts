import { NextResponse } from "next/server";
import { adminMonitoringService } from "@/lib/api-services";
import { checkRemoteBackendConnectivity } from "@/lib/backend-diagnostics";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const [res, remoteDiagnostics] = await Promise.all([
    adminMonitoringService.getHealth(auth.session),
    checkRemoteBackendConnectivity(),
  ]);

  if (res.success && res.data && typeof res.data === "object") {
    return NextResponse.json({ ...res.data, remoteDiagnostics }, { status: res.status });
  }

  return NextResponse.json(
    {
      success: remoteDiagnostics.connectivityStatus === "reachable",
      error: res.error,
      remoteDiagnostics,
    },
    { status: res.status === 200 ? 200 : res.status }
  );
}
