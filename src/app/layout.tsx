import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Every page reads live data from PostgreSQL, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "A local-first tracker for job applications, interviews and outcomes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets the "dark" class before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
