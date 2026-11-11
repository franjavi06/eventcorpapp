import { ok } from "@/lib/api";
import {
  requestIsSecure,
  sessionCookieOptions,
} from "@/modules/auth/lib/session";

export async function POST(request: Request) {
  const res = ok({ loggedOut: true });
  res.cookies.set({
    ...sessionCookieOptions(0, requestIsSecure(request)),
    value: "",
  });
  return res;
}
