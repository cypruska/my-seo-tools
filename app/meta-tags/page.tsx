"use client";
import { AuthGate } from "@/components/auth-gate";
import MetaTagsContent from "./content";

export default function MetaTagsPage() {
  return (
    <AuthGate>
      <MetaTagsContent />
    </AuthGate>
  );
}
