import { handleApiError, ok } from "@/lib/api";
import {
  ensureInitialAuthSeed,
  getCurrentUser,
} from "@/modules/auth/services/auth.service";

export async function GET() {
  try {
    await ensureInitialAuthSeed();
    const user = await getCurrentUser();
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
