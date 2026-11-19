import type { Metadata } from "next";
import { LazyUsHistory } from "@/components/lazy";

export const metadata: Metadata = {
  title: "The United States, Year by Year",
  description:
    "An interactive map of US states, territories and overseas holdings from 1776 to today.",
};

export default function UsHistoryPage() {
  return (
    <main>
      <LazyUsHistory />
    </main>
  );
}
