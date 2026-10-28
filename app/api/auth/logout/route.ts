import { ok } from "@/lib/api";
import { sessionCookieOptions } from "@/modules/auth/lib/session";

export async function POST() {
  const res = ok({ loggedOut: true });
  res.cookies.set({
    ...sessionCookieOptions(0),
    value: "",
  });
  return res;
}
