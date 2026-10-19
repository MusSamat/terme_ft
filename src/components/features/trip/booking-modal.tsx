"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { BookForm } from "@/components/features/booking/book-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  pricePerSeat: number;
  seatsAvailable: number;
  initialSeats?: number;
}

/**
 * Booking flow as a modal (design-spec §3.3/§3.4) launched from the detail CTA.
 * Reuses BookForm — its createBooking mutation, validation and success/"sent"
 * state — verbatim, so nothing about the booking API changes.
 */
export function BookingModal({ open, onOpenChange, tripId, pricePerSeat, seatsAvailable, initialSeats }: Props) {
  const t = useTranslations("detail");
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88vh] max-w-[440px] overflow-y-auto">
        <ModalTitle className="mb-4 text-[20px] font-900">{t("book_modal_title")}</ModalTitle>
        <BookForm
          tripId={tripId}
          pricePerSeat={pricePerSeat}
          seatsAvailable={seatsAvailable}
          initialSeats={initialSeats}
          onCancel={() => onOpenChange(false)}
        />
      </ModalContent>
    </Modal>
  );
}
