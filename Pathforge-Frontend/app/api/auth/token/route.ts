import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("authjs.session-token")?.value;

  if (!token) {
    return Response.json({ token: null }, { status: 401 });
  }

  return Response.json({ token });
}
