import type { Metadata } from "next";
import { LazyUnfurl } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Unfurl",
  description: "A daily flag puzzle: the flag is hidden under tiles, and each wrong guess lifts more.",
};

export default function UnfurlPage() {
  return (
    <main>
      <LazyUnfurl />
    </main>
  );
}
