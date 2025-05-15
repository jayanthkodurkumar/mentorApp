import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MentorAge",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          <header className="flex items-center justify-between h-16 px-6 border-b bg-white shadow-sm">
            {/* Left: App Name or Logo */}
            <div className="text-xl font-semibold tracking-tight">
              MentorAge
            </div>

            {/* Right: Navbar buttons + User icon */}
            <div className="flex items-center gap-4">
              <SignedIn>
                <Navbar />
              </SignedIn>

              <SignedOut>
                <SignInButton />
                <SignUpButton />
              </SignedOut>

              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>

          <main className="px-6 py-4">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
