import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "./(auth)/context/AuthContext";
import NetworkProvider from "./allservice/network/NetworkProvider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://sharo.in"),

  title: {
    default: "SHARO",
    template: "%s | SHARO",
  },

  description:
    "SHARO is a modern business management platform for engineering, construction and growing companies. Manage employees, attendance, payroll, projects, expenses and operations from one powerful workspace.",

  applicationName: "SHARO",

  authors: [
    {
      name: "SHARO",
      url: "https://sharo.in",
    },
  ],

  creator: "SHARO",

  publisher: "SHARO",

  keywords: [
    "SHARO",
    "Business Management",
    "HRMS",
    "Attendance Management",
    "Payroll Software",
    "Employee Management",
    "Project Management",
    "Construction ERP",
    "Engineering ERP",
    "Expense Management",
    "Workforce Management",
    "Business Software",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
    ],

    apple: "/apple-touch-icon.png",

    shortcut: "/favicon.ico",
  },

  manifest: "/site.webmanifest",

  openGraph: {
    title: "SHARO",

    description:
      "Business Management Platform for Engineering & Construction Companies.",

    url: "https://sharo.in",

    siteName: "SHARO",

    locale: "en_US",

    type: "website",

    images: [
      {
        url: "/og-image.png",

        width: 1200,

        height: 630,

        alt: "SHARO",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "SHARO",

    description:
      "Business Management Platform for Engineering & Construction Companies.",

    images: ["/og-image.png"],
  },

  alternates: {
    canonical: "https://sharo.in",
  },

  category: "Business",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#eef2f7] text-[#071330]">

        <AuthProvider>

          <NetworkProvider>

            {children}
            <Toaster
              position="top-center"
              reverseOrder={false}
            />

          </NetworkProvider>


        </AuthProvider>

      </body>
    </html>
  );
}