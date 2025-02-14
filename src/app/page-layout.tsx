"use client";

import { Footer } from "@/components/landing/Footer";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 overflow-auto scrollbar-hide">
        {children}
      </div>
      <Footer />
    </div>
  );
} 