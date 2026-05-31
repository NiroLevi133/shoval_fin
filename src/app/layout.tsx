import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "FitMeal AI",
  description: "תזונה חכמה עם AI אישי",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="bg-gray-50 font-[family-name:var(--font-rubik)]">
        <UserProvider>
          <div className="app-container">
            {children}
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
