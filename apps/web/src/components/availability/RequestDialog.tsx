import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import type { LeadRequestKind } from "@momentum/shared";
import { Modal } from "../ui/Modal";
import { ApiError, api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { Field, inputClass } from "./Field";

const MAX_MESSAGE = 1000;

const TITLES: Record<LeadRequestKind, string> = {
  info: "Request Information",
  viewing: "Request a Viewing",
};

export interface RequestTarget {
  kind: LeadRequestKind;
  opportunity: { id: string; title: string; reference_no: string | null };
}

interface RequestDialogProps {
  enquiryId: string;
  /** The opportunity and request kind, or `null` when closed. */
  target: RequestTarget | null;
  onClose: () => void;
}

/** Request Information / Request Viewing (spec §18–19). Attaches the request to the enquirer's lead. */
export function RequestDialog({ enquiryId, target, onClose }: RequestDialogProps) {
  return (
    <Modal open={target !== null} onClose={onClose} title={target ? TITLES[target.kind] : undefined}>
      {target && (
        <RequestForm key={`${target.opportunity.id}:${target.kind}`} enquiryId={enquiryId} target={target} onClose={onClose} />
      )}
    </Modal>
  );
}

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function RequestForm({ enquiryId, target, onClose }: { enquiryId: string; target: RequestTarget; onClose: () => void }) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const { kind, opportunity } = target;

  const mutation = useMutation({
    mutationFn: () =>
      api.availability.createRequest(
        enquiryId,
        {
          listing_id: opportunity.id,
          kind,
          message: message.trim() || undefined,
          preferred_date: kind === "viewing" && date ? new Date(`${date}T00:00:00`).getTime() : undefined,
        },
        token!
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["availability-matches", enquiryId] });
      void queryClient.invalidateQueries({ queryKey: ["availability-opportunity", opportunity.id, enquiryId] });
    },
  });

  // A repeat request is already on the lead, so it reads as sent.
  const alreadySent = mutation.error instanceof ApiError && mutation.error.status === 409;
  if (mutation.isSuccess || alreadySent) {
    return (
      <div className="py-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold-600" aria-hidden />
        <h3 className="heading-3 mt-4">{alreadySent ? "Request already received" : "Thank you. Your request has been sent."}</h3>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-500">
          An agent will contact you on your verified mobile number about{" "}
          <strong className="text-navy-900">{opportunity.reference_no ?? opportunity.title}</strong>.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-6">
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-5"
    >
      <p className="text-sm text-charcoal-500">
        {kind === "viewing" ? "Ask an agent to arrange a viewing of " : "Ask an agent for more information about "}
        <strong className="text-navy-900">{opportunity.title}</strong>
        {opportunity.reference_no && <> (Ref. {opportunity.reference_no})</>}.
      </p>

      {kind === "viewing" && (
        <Field label="Preferred date" htmlFor="request-date" hint="The agent will confirm a time with you.">
          <input
            id="request-date"
            type="date"
            min={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass(false)}
          />
        </Field>
      )}

      <Field label="Message" htmlFor="request-message" hint={`${message.length} / ${MAX_MESSAGE}`}>
        <textarea
          id="request-message"
          rows={4}
          maxLength={MAX_MESSAGE}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={kind === "viewing" ? "Anything the agent should know before the visit" : "What would you like to know?"}
          className={inputClass(false)}
        />
      </Field>

      {mutation.error && (
        <p role="alert" className="field-error">
          {mutation.error instanceof ApiError && mutation.error.status === 429
            ? "You have sent several requests recently. Please try again later or chat with an agent."
            : mutation.error.message || "Your request could not be sent. Please try again."}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}
