import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, SearchCheck } from "lucide-react";
import type { UserType } from "@momentum/shared";
import { OpportunityCard } from "../../components/availability/OpportunityCard";
import { RequestDialog } from "../../components/availability/RequestDialog";
import type { RequestTarget } from "../../components/availability/RequestDialog";
import { WizardProgress } from "../../components/availability/WizardProgress";
import { useChatWithAgent } from "../../components/site/ChatWithAgent";
import { PageSpinner } from "../../components/ui/Spinner";
import { ApiError, api } from "../../lib/api";
import { AVAILABILITY_PATH } from "../../lib/site";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAuthStore } from "../../store/auth";

/** What each user type is shown (spec §17). */
const RESULTS_LEAD: Record<UserType, string> = {
  tenant: "Labour accommodation available for lease that matches your requirements.",
  landlord: "Tenant and operator demand, and management opportunities, that match your property.",
  management_company: "Properties and management opportunities that match your requirements.",
  buyer: "Properties available for acquisition that match your requirements.",
  seller: "Buyer and investor demand that matches your property.",
};

/**
 * Step 4: MATCHED OPPORTUNITIES. The API only answers for the caller's own completed
 * enquiry (403 NOT_QUALIFIED otherwise), so this page cannot be reached by skipping steps.
 */
export default function MatchesPage() {
  usePageMeta({ title: "Matched Opportunities", noindex: true });
  const { enquiryId = "" } = useParams();
  const { token, role } = useAuthStore();
  const { openChat } = useChatWithAgent();
  const [requestTarget, setRequestTarget] = useState<RequestTarget | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["availability-matches", enquiryId],
    queryFn: () => api.availability.matches(enquiryId, token!),
    enabled: !!token && role === "customer",
    retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 2,
  });

  if (!token || role !== "customer") return <Navigate to={AVAILABILITY_PATH} replace />;

  return (
    <>
      <section className="border-b border-charcoal-100 bg-navy-50/60">
        <div className="container-site max-w-4xl py-10">
          <WizardProgress current="results" />
        </div>
        <div className="container-site pb-14 md:pb-16">
          <span className="eyebrow">Availability</span>
          <h1 className="heading-1 mt-4 uppercase">Matched Opportunities</h1>
          <span className="gold-rule mt-6" aria-hidden />
          {data && (
            <>
              <p className="lead mt-6 max-w-2xl">{RESULTS_LEAD[data.enquiry.user_type]}</p>
              <p className="mt-3 text-sm text-charcoal-500">
                Your enquiry reference: <strong className="text-navy-900">{data.enquiry.reference_no}</strong>
              </p>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container-site">
          {isPending ? (
            <PageSpinner />
          ) : error ? (
            <ResultsError error={error} />
          ) : data.matches.length === 0 ? (
            <div className="card mx-auto max-w-2xl text-center hover:shadow-card">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-700">
                <SearchCheck className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="heading-3 mt-6">Thank you. Your enquiry has been received.</h2>
              <p className="mt-4 leading-relaxed text-charcoal-500">
                We have no listed opportunity that matches your requirements right now. An agent will review your
                enquiry and contact you with suitable options.
              </p>
              <button type="button" onClick={() => openChat()} className="btn-primary mt-8">
                <MessageCircle className="h-4 w-4" /> Chat With an Agent
              </button>
            </div>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {data.matches.map((m) => (
                <li key={m.id}>
                  <OpportunityCard opportunity={m} enquiryId={enquiryId} onRequest={setRequestTarget} />
                </li>
              ))}
            </ul>
          )}

          {data && (
            <div className="mt-16 flex flex-col items-center gap-3 border-t border-charcoal-100 pt-10 text-center sm:flex-row sm:justify-center">
              <p className="text-sm text-charcoal-500">Looking for something different?</p>
              <Link to={AVAILABILITY_PATH} className="btn-secondary">
                Start a new enquiry <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <RequestDialog enquiryId={enquiryId} target={requestTarget} onClose={() => setRequestTarget(null)} />
    </>
  );
}

function ResultsError({ error }: { error: Error }) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const expired = error instanceof ApiError && error.status === 401;
  const notQualified = error instanceof ApiError && (error.code === "NOT_QUALIFIED" || error.status === 403);

  return (
    <div className="mx-auto max-w-xl text-center">
      <h2 className="heading-3">
        {expired ? "Your session has expired" : notQualified ? "Complete your enquiry first" : "Something went wrong"}
      </h2>
      <p className="mt-4 text-charcoal-500">
        {expired
          ? "For your security, please verify your mobile again to continue."
          : notQualified
            ? "Matched opportunities are shown once your enquiry is complete."
            : "Your matches could not be loaded. Please try again shortly."}
      </p>
      <Link to={AVAILABILITY_PATH} onClick={expired ? clearAuth : undefined} className="btn-availability mt-8">
        Availability <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
