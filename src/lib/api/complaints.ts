import { api } from "./client";

// Must mirror the backend enum (complaints.schemas.ts): safety | fraud |
// rudeness | no_show | other. Sending anything else is rejected server-side.
export type ComplaintCategory = "safety" | "fraud" | "rudeness" | "no_show" | "other";

export interface SubmitComplaintInput {
  category: ComplaintCategory;
  description: string;
  targetUserId?: string;
  targetTripId?: string;
}

export async function submitComplaint(input: SubmitComplaintInput, images?: File[]): Promise<void> {
  const form = new FormData();
  form.append("category", input.category);
  form.append("description", input.description);
  if (input.targetUserId) form.append("targetUserId", input.targetUserId);
  if (input.targetTripId) form.append("targetTripId", input.targetTripId);
  images?.forEach((f) => form.append("attachments", f));
  await api.post("/complaints", form);
}
