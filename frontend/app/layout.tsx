import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard Deteksi Kerawanan Pangan",
  description: "Dashboard monitoring hasil deteksi kerawanan pangan bulanan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "rounded-[18px] border border-slate-200/80 bg-white/95 shadow-[0_22px_55px_rgba(15,23,42,0.14)] backdrop-blur",
              title: "text-sm font-semibold text-slate-900",
              description: "text-sm leading-6 text-slate-500",
              closeButton:
                "border border-slate-200 bg-white text-slate-400 transition hover:text-slate-700",
            },
          }}
        />
      </body>
    </html>
  );
}
