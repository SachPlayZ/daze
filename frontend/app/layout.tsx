import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--font-daze-sans", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-daze-serif", subsets: ["latin"], weight: "400" });
export const metadata: Metadata = { title: "Daze — Every moment changes your game.", description: "Live World Cup fantasy powered by verified TxLINE data." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${sans.variable} ${serif.variable}`} data-theme="light"><body>{children}</body></html>; }
