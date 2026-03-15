import { Manrope, Noto_Sans_Tamil } from "next/font/google";

export const inter = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const notoSansTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  display: "swap",
  variable: "--font-tamil",
  weight: ["400", "500", "600", "700"],
  preload: false,
});
