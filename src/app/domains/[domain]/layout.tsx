"use client";

import { Header } from "@/components/landing/Header";

export default function DomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] flex-col">
      <Header />
      <main className="flex-1 overflow-auto scrollbar-hide">
        {children}
      </main>
    </div>
  );
} 