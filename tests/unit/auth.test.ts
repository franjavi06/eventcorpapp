import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/modules/auth/lib/password";
import {
  createSessionToken,
  verifySessionToken,
} from "@/modules/auth/lib/session";

describe("auth utilities (password + session)", () => {
  it("genera hashes scrypt con salt único y verifica la contraseña", async () => {
    const h1 = await hashPassword("Secreto123!");
    const h2 = await hashPassword("Secreto123!");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("Secreto123!", h1)).toBe(true);
    expect(await verifyPassword("Incorrecta", h1)).toBe(false);
    expect(await verifyPassword("Secreto123!", "formato-invalido")).toBe(false);
  });

  it("firma y verifica tokens de sesión y rechaza tokens alterados o expirados", () => {
    const token = createSessionToken({
      id: "user-1",
      username: "admin",
      nombre: "Admin",
      roles: ["ADMIN"],
    });

    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-1");
    expect(payload?.username).toBe("admin");
    expect(payload?.roles).toEqual(["ADMIN"]);

    // Token alterado
    expect(verifySessionToken(`${token}x`)).toBeNull();

    // Token expirado
    const expired = createSessionToken(
      { id: "user-1", username: "admin", nombre: "Admin", roles: ["ADMIN"] },
      -10,
    );
    expect(verifySessionToken(expired)).toBeNull();
  });
});
