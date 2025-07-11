"use client";

import Navigation from "../../components/navigation";

export default function AccountGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {children}
    </div>
  );
} 