import { NextRequest } from "next/server";
import { GET as getHandler, POST as postHandler, DELETE as deleteHandler } from "@/app/api/profile/image/route";

export async function GET(request: NextRequest) {
  return getHandler(request);
}

export async function POST(request: NextRequest) {
  return postHandler(request);
}

export async function PUT(request: NextRequest) {
  return postHandler(request);
}

export async function DELETE(request: NextRequest) {
  return deleteHandler(request);
}
