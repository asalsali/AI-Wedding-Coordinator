import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ToneStyle } from "@/types";
import PreviewClient from "./PreviewClient";

export default async function PreviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch couple record
  const { data: couple } = await supabase
    .from("couples")
    .select("id, your_name, partner_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!couple) {
    redirect("/onboarding");
  }

  // Fetch profile and FAQs in parallel
  const [profileResult, faqsResult] = await Promise.all([
    supabase
      .from("wedding_profiles")
      .select(
        "tone, venue_name, venue_address, wedding_date, ceremony_time, dress_code, parking_info"
      )
      .eq("couple_id", couple.id)
      .maybeSingle(),
    supabase
      .from("faqs")
      .select("question, answer, display_order")
      .eq("couple_id", couple.id)
      .order("display_order"),
  ]);

  const p = profileResult.data;

  // If no profile exists at all, send them back to onboarding
  if (!p) {
    redirect("/onboarding");
  }

  const previewData = {
    yourName: (couple.your_name as string | null) ?? "",
    partnerName: (couple.partner_name as string | null) ?? "",
    tone: (p.tone as ToneStyle | null) ?? null,
    weddingDate: (p.wedding_date as string | null) ?? "",
    venueName: (p.venue_name as string | null) ?? "",
    venueAddress: (p.venue_address as string | null) ?? "",
    ceremonyTime: (p.ceremony_time as string | null) ?? "",
    dressCode: (p.dress_code as string | null) ?? "",
    parkingInfo: (p.parking_info as string | null) ?? "",
    faqs: (
      (faqsResult.data ?? []) as Array<{
        question: string;
        answer: string;
      }>
    ).map((f) => ({
      question: f.question,
      answer: f.answer,
    })),
  };

  return <PreviewClient data={previewData} />;
}
