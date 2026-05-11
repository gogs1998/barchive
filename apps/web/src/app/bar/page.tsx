import type { Metadata } from "next";
import { BarIQApp } from "@/components/BarIQApp";

export const metadata: Metadata = {
  title: "BarIQ — Bar Mode",
  description: "Full-screen bartender mode. Browse, build, and manage cocktails in service.",
};

export default function BarPage() {
  return <BarIQApp />;
}
