import { beforeEach, describe, expect, it } from "vitest";

import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import {
  createUsuario,
  ensureInitialAuthSeed,
  getInitialAdminCredentials,
  listUsuarios,
  loginUsuario,
  updateUsuario,
} from "@/modules/auth/services/auth.service";
import { cleanDatabase } from "./helpers";

describe("auth & usuarios service (Etapa 8)", () => {
  beforeEach(cleanDatabase);

  it("siembra los 4 roles y el administrador inicial y permite iniciar sesión", async () => {
    await ensureInitialAuthSeed();
    const creds = getInitialAdminCredentials();

    const admin = await loginUsuario({
      identificador: creds.username,
      password: creds.password,
    });
    expect(admin.username).toBe(creds.username);
    expect(admin.roles).toContain("ADMIN");
    expect(admin.permisos).toContain("USUARIOS_MANAGE");
    expect(admin.permisos).toContain("SORTEOS_EJECUTAR");

    // También acepta login por correo
    const porCorreo = await loginUsuario({
      identificador: creds.correo.toUpperCase(),
      password: creds.password,
    });
    expect(porCorreo.id).toBe(admin.id);
  });

  it("rechaza credenciales inválidas y cuentas desactivadas", async () => {
    const creds = getInitialAdminCredentials();
    await expect(
      loginUsuario({ identificador: creds.username, password: "mal" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const operador = await createUsuario({
      username: "checkin1",
      correo: "checkin1@eventcorp.local",
      nombre: "Operador Puerta",
      password: "Password123",
      roles: ["OPERADOR_CHECKIN"],
    });
    expect(operador.roles).toEqual(["OPERADOR_CHECKIN"]);
    expect(operador.permisos).toContain("CHECKIN_WRITE");
    expect(operador.permisos).not.toContain("USUARIOS_MANAGE");

    await updateUsuario(operador.id, { activo: false });
    await expect(
      loginUsuario({ identificador: "checkin1", password: "Password123" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("impide duplicar username/correo y autodesactivarse", async () => {
    const u = await createUsuario({
      username: "sorteos1",
      correo: "sorteos1@eventcorp.local",
      nombre: "Operador Sorteos",
      password: "Password123",
      roles: ["OPERADOR_SORTEOS"],
    });

    await expect(
      createUsuario({
        username: "sorteos1",
        correo: "otro@eventcorp.local",
        nombre: "Otro",
        password: "Password123",
        roles: ["CONSULTA"],
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      updateUsuario(u.id, { activo: false }, u.id),
    ).rejects.toBeInstanceOf(ValidationError);

    const todos = await listUsuarios();
    expect(todos.length).toBeGreaterThanOrEqual(2);
  });
});
