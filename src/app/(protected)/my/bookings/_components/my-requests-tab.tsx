"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Minus, Users, Star, ChevronDown, Check, X, MessageCircle, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  listMyPassengerRequests,
  cancelPassengerRequest,
  updatePassengerRequest,
  listRequestResponses,
  acceptRequestResponse,
  declineRequestResponse,
  getPassengerRequest,
  type PassengerRequest,
  type RequestResponse,
} from "@/lib/api/passenger-requests";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastSuccess, toastError } from "@/components/layout/quick-toast";
import { ListCard, ListCardButton } from "@/components/ui/list-card";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";

function fmtD(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) : "";
}

import { VerifiedBadge } from "@/components/ui/verified-badge";
import { DriverAvatar } from "@/components/ui/driver-avatar";
import { Spinner } from "@/components/ui";
import { CardSkeletonList } from "@/components/ui/card-skeleton";
import { QueryError } from "@/components/ui/query-error";

// ── Response offer card ────────────────────────────────────────────────
function OfferCard({
  response,
  requestId,
  onAccepted,
}: {
  response: RequestResponse;
  requestId: string;
  onAccepted: (bookingId: string) => void;
}) {
  const qc = useQueryClient();
  const t = useTranslations("requests.my");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();

  const acceptMut = useMutation({
    mutationFn: () => acceptRequestResponse(requestId, response.id),
    onSuccess: ({ bookingId }) => {
      toastSuccess(tToasts("offer_accepted"));
      void qc.invalidateQueries({ queryKey: ["passenger-requests", "my"] });
      onAccepted(bookingId);
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const declineMut = useMutation({
    mutationFn: () => declineRequestResponse(requestId, response.id),
    onSuccess: () => {
      toastSuccess(tToasts("offer_declined"));
      void qc.invalidateQueries({ queryKey: ["request-responses", requestId] });
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const isPending = response.status === "pending";
  const isAccepted = response.status === "accepted";
  const isDeclined = response.status === "declined";

  return (
    <div className={`rounded-2xl border bg-white p-4 dark:bg-ink-900 dark:border-ink-800 ${isDeclined ? "opacity-50" : isAccepted ? "border-brand-300" : "border-ink-200"}`}>
      <div className="flex items-start gap-3">
        <DriverAvatar name={response.driver.name} src={response.driver.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-ink-900 dark:text-white">{response.driver.name}</span>
            {response.driver.verified && <VerifiedBadge />}
            {response.driver.rating !== null && (
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-accent-400 text-accent-400" aria-hidden />
                <span className="text-[12px] font-bold text-ink-600">{response.driver.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-[20px] font-extrabold text-sky-600">{response.price} {t("som")}</span>
            <span className="text-[13px] text-ink-500">
              {new Date(response.departureTime).toLocaleString("ru-RU", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {response.message && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">«{response.message}»</p>
          )}
        </div>

        {isPending && (
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              disabled={acceptMut.isPending || declineMut.isPending}
              onClick={() => acceptMut.mutate()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
              aria-label={t("accept_aria")}
            >
              {acceptMut.isPending ? <Spinner size={14} /> : <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              disabled={acceptMut.isPending || declineMut.isPending}
              onClick={() => declineMut.mutate()}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 hover:border-coral-300 hover:text-coral-600 disabled:opacity-40 transition-colors dark:bg-ink-900 dark:border-ink-700"
              aria-label={t("reject_aria")}
            >
              {declineMut.isPending ? <Spinner size={14} /> : <X className="h-4 w-4" />}
            </button>
          </div>
        )}
        {isAccepted && (
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[12px] font-bold text-brand-700">
              {t("accepted")}
            </span>
            {/* Accepting an offer creates the booking — this is the only path to
                the driver chat for the request flow. */}
            {response.bookingId && (
              <Link href={`/my/bookings/${response.bookingId}/chat`}>
                <span className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand-700 hover:bg-brand-100">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("chat_btn")}
                </span>
              </Link>
            )}
          </div>
        )}
        {isDeclined && (
          <span className="flex-shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[12px] font-bold text-ink-500">
            {t("rejected")}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Edit own request (seats / date / comment) — no price (a request has none) ──
function RequestEditModal({
  request,
  open,
  onOpenChange,
}: {
  request: PassengerRequest;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("requests.my");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();
  const qc = useQueryClient();

  // The list card carries a lean request (no comment) — fetch the full one for the form.
  const detailQuery = useQuery({
    queryKey: ["passenger-request", request.id],
    queryFn: () => getPassengerRequest(request.id),
    enabled: open,
    staleTime: 30_000,
  });

  const [seats, setSeats] = useState(request.seatsNeeded);
  const [date, setDate] = useState(request.departureDate.slice(0, 10));
  const [comment, setComment] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Seed once the detail (with comment) arrives.
  if (open && detailQuery.data && !seeded) {
    setSeats(detailQuery.data.seatsNeeded);
    setDate(detailQuery.data.departureDate.slice(0, 10));
    setComment(detailQuery.data.comment ?? "");
    setSeeded(true);
  }

  const saveMut = useMutation({
    mutationFn: () =>
      updatePassengerRequest(request.id, {
        seatsNeeded: seats,
        departureDate: new Date(`${date}T12:00:00`).toISOString(),
        comment: comment.trim() || null,
      }),
    onSuccess: () => {
      toastSuccess(tToasts("saved"));
      void qc.invalidateQueries({ queryKey: ["passenger-requests", "my"] });
      void qc.invalidateQueries({ queryKey: ["passenger-request", request.id] });
      onOpenChange(false);
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) { setSeeded(false); setConfirming(false); } }}
    >
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("edit")}</ModalTitle>
        </ModalHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-800 uppercase tracking-wide text-ink-400">{t("seats_label")}</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSeats((s) => Math.max(1, s - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 disabled:opacity-40 dark:bg-ink-800 dark:text-ink-200" disabled={seats <= 1}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[32px] text-center text-[18px] font-900 text-ink-900 dark:text-white">{seats}</span>
              <button type="button" onClick={() => setSeats((s) => Math.min(8, s + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 disabled:opacity-40 dark:bg-ink-800 dark:text-ink-200" disabled={seats >= 8}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-800 uppercase tracking-wide text-ink-400">{t("date_label")}</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-3 text-[15px] font-700 text-ink-900 outline-none focus:border-sky-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-800 uppercase tracking-wide text-ink-400">{t("comment_label")}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-3 py-2 text-[15px] font-600 text-ink-900 outline-none focus:border-sky-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            />
          </div>
          {confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-[14px] font-800 text-ink-700 dark:text-ink-200">{t("edit_confirm")}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} aria-label="cancel" className="flex h-11 flex-1 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  <X className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="h-11 flex-[2] rounded-xl bg-sky-600 text-[15px] font-900 text-white hover:bg-sky-700 disabled:opacity-50">
                  {saveMut.isPending ? "…" : t("save")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-xl bg-sky-600 py-2.5 text-[15px] font-900 text-white hover:bg-sky-700"
            >
              {t("save")}
            </button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

// ── Request with expandable offers ────────────────────────────────────
export function RequestWithOffers({
  request,
  onCancel,
  cancelLoading,
}: {
  request: PassengerRequest;
  onCancel?: () => void;
  cancelLoading?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("requests.my");
  const tCard = useTranslations("card");
  const tSeats = useTranslations("booking_card");
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isOpen = request.status === "open";

  const responsesQuery = useQuery({
    queryKey: ["request-responses", request.id],
    queryFn: () => listRequestResponses(request.id),
    enabled: expanded && isOpen,
    staleTime: 30_000,
  });
  const { data: responses, isLoading } = responsesQuery;

  const pending = responses?.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="flex flex-col gap-2">
      <ListCard
        grape
        when={fmtD(request.departureDate)}
        status={request.status}
        origin={request.originCity}
        destination={request.destinationCity}
        actorName={`${request.seatsNeeded} ${tSeats("seats_word")}`}
        actorSub={request.comment ? <span className="truncate text-[11.5px] font-700 text-ink-500">«{request.comment}»</span> : undefined}
        href={`/requests/${request.id}`}
        actions={
          isOpen ? (
            <>
              <ListCardButton grape label={tCard("edit")} icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)} />
              <ListCardButton kind="danger" label={cancelLoading ? "…" : tCard("cancel")} icon={<X className="h-4 w-4" />} onClick={onCancel} disabled={cancelLoading} />
            </>
          ) : undefined
        }
      />
      <RequestEditModal request={request} open={editOpen} onOpenChange={setEditOpen} />

      {isOpen && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between rounded-2xl border border-dashed border-sky-200 bg-sky-50 px-4 py-2.5 text-left hover:border-sky-300 hover:bg-sky-100 transition-colors"
        >
          <span className="text-[13px] font-bold text-sky-700">
            {expanded
              ? t("hide_offers")
              : pending.length > 0
              ? t("offers_count", { n: pending.length })
              : t("offers_title")}
          </span>
          <ChevronDown className={`h-4 w-4 text-sky-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {expanded && isOpen && (
        <div className="flex flex-col gap-2 pl-2">
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner size={20} /></div>
          ) : responsesQuery.isError ? (
            <QueryError error={responsesQuery.error} onRetry={() => void responsesQuery.refetch()} />
          ) : !responses?.length ? (
            <p className="py-3 text-center text-[14px] font-semibold text-ink-400">
              {t("no_offers")}
            </p>
          ) : (
            responses.map((r) => (
              <OfferCard
                key={r.id}
                response={r}
                requestId={request.id}
                onAccepted={(bookingId) => router.push(`/my/bookings?booking=${bookingId}`)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: passenger's own posted ride-requests + incoming driver offers ──
export function MyRequestsTab() {
  const qc = useQueryClient();
  const t = useTranslations("requests.my");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["passenger-requests", "my"],
    queryFn: listMyPassengerRequests,
  });

  const cancelMut = useMutation({
    mutationFn: cancelPassengerRequest,
    onSuccess: () => {
      toastSuccess(tToasts("request_cancelled"));
      void qc.invalidateQueries({ queryKey: ["passenger-requests", "my"] });
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const requests = data?.data ?? [];
  // «Мои» shows only active requests; past ones live in Profile → История.
  const open = requests.filter((r) => r.status === "open");

  if (isLoading) {
    return <CardSkeletonList variant="request" count={4} />;
  }

  if (isError) {
    return <QueryError error={error} onRetry={() => void refetch()} />;
  }

  if (open.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-sky-300 bg-sky-50 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
          <Users className="h-8 w-8 text-sky-400" />
        </div>
        <p className="text-[17px] font-bold text-ink-700 dark:text-ink-300">{t("empty_title")}</p>
        <p className="mt-1 mb-5 text-[16px] font-600 text-ink-500">{t("empty_hint")}</p>
        <Link href="/requests/create">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-2.5 text-[15px] font-bold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            {t("create_label")}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {open.length > 0 && (
        <section>
          <h2 className="mb-3 text-[14px] font-bold uppercase tracking-widest text-sky-600">
            {t("open_count", { n: open.length })}
          </h2>
          <div className="flex flex-col gap-4">
            {open.map((req) => (
              <RequestWithOffers
                key={req.id}
                request={req}
                onCancel={() => cancelMut.mutate(req.id)}
                cancelLoading={cancelMut.isPending && cancelMut.variables === req.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
