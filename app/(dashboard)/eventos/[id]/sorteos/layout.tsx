import { SorteoFullscreenContainer } from "@/modules/sorteos/components/sorteo-fullscreen-container";

export default function SorteosLayout({
  children,
}: LayoutProps<"/eventos/[id]/sorteos">) {
  return <SorteoFullscreenContainer>{children}</SorteoFullscreenContainer>;
}
