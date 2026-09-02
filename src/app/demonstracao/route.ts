import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url));
}

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("kronos_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
  return response;
}
