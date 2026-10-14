import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function DbStatus() {
  const up = await checkDatabase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado del sistema</CardTitle>
        <CardDescription>Conexión a PostgreSQL vía Prisma</CardDescription>
      </CardHeader>
      <CardContent>
        {up ? (
          <Badge>Base de datos conectada</Badge>
        ) : (
          <div className="space-y-1">
            <Badge variant="destructive">Sin conexión</Badge>
            <p className="text-sm text-muted-foreground">
              Verifica DATABASE_URL en .env
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
