import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { DetailsStep } from "../../components/availability/DetailsStep";
import { OtpStep } from "../../components/availability/OtpStep";
import { RequirementsStep } from "../../components/availability/RequirementsStep";
import { UserTypeStep } from "../../components/availability/UserTypeStep";
import { WizardProgress } from "../../components/availability/WizardProgress";
import { ApiError, api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAuthStore } from "../../store/auth";
import { useAvailabilityWizard } from "../../store/availabilityWizard";

/**
 * AVAILABILITY journey (spec §12–17): user type → details → OTP → requirements, then
 * the results page. No inventory is requested until the enquiry is complete.
 */
export default function AvailabilityPage() {
  usePageMeta({
    title: "Availability",
    description: "Tell us what you need and we will match you with suitable labour accommodation opportunities.",
    noindex: true,
  });
  const navigate = useNavigate();
  const wizard = useAvailabilityWizard();
  const { token, clearAuth } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Each step starts at the top of the wizard, not wherever the previous one was scrolled.
  useEffect(() => {
    setError(null);
    topRef.current?.scrollIntoView({ block: "start" });
  }, [wizard.step]);

  /** A 401 means the enquirer token expired: verify the mobile again. */
  function handleAuthError(e: unknown): boolean {
    if (e instanceof ApiError && e.status === 401) {
      clearAuth();
      wizard.goTo("verify");
      return true;
    }
    return false;
  }

  async function createEnquiry(authToken: string) {
    if (!wizard.details) {
      wizard.goTo("details");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.availability.createEnquiry(wizard.details, authToken);
      wizard.enquiryCreated(res.enquiry_id, res.reference_no);
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof Error ? e.message : "We could not save your details.");
    } finally {
      setBusy(false);
    }
  }

  async function submitRequirements(requirements: Record<string, unknown>) {
    const enquiryId = wizard.enquiryId;
    if (!enquiryId || !token) {
      wizard.goTo("verify");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.availability.submitRequirements(enquiryId, requirements, token);
      finish(enquiryId);
    } catch (e) {
      // Already completed (e.g. a double submit): the results are ready either way.
      if (e instanceof ApiError && e.code === "CONFLICT") finish(enquiryId);
      else if (!handleAuthError(e)) setError(e instanceof Error ? e.message : "We could not submit your requirements.");
    } finally {
      setBusy(false);
    }
  }

  function finish(enquiryId: string) {
    wizard.reset();
    navigate(`/availability/results/${enquiryId}`);
  }

  const canStartOver = wizard.step !== "type";

  return (
    <section className="section bg-navy-50/40">
      <div ref={topRef} className="container-site max-w-4xl scroll-mt-24">
        <div className="text-center">
          <span className="eyebrow">Availability</span>
          <h1 className="sr-only">Availability enquiry</h1>
        </div>
        <div className="mt-8">
          <WizardProgress current={wizard.step} />
        </div>

        <div className="card mt-10 hover:shadow-card md:p-12">
          {wizard.step === "type" && <UserTypeStep selected={wizard.userType} onSelect={wizard.chooseUserType} />}

          {wizard.step === "details" && wizard.userType && (
            <DetailsStep
              userType={wizard.userType}
              initial={wizard.details}
              initialMobile={wizard.mobile}
              onBack={() => wizard.goTo("type")}
              onSubmit={wizard.saveDetails}
            />
          )}

          {wizard.step === "verify" && wizard.mobile && (
            <>
              <OtpStep mobile={wizard.mobile} onChangeNumber={() => wizard.goTo("details")} onVerified={createEnquiry} />
              {(busy || error) && (
                <div className="mx-auto mt-6 max-w-md text-center">
                  {busy && <p className="text-sm text-charcoal-500">Saving your details…</p>}
                  {error && (
                    <>
                      <p role="alert" className="field-error">
                        {error}
                      </p>
                      {token && (
                        <button type="button" onClick={() => createEnquiry(token)} className="btn-primary mt-4">
                          Try again
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {wizard.step === "requirements" && wizard.userType && (
            <RequirementsStep
              userType={wizard.userType}
              companyName={wizard.details?.company_name}
              referenceNo={wizard.referenceNo}
              submitting={busy}
              error={error}
              onSubmit={submitRequirements}
            />
          )}

          {/* Stale session state (e.g. storage cleared mid-step): restart cleanly. */}
          {((wizard.step !== "type" && !wizard.userType) || (wizard.step === "verify" && !wizard.mobile)) && (
            <div className="text-center">
              <p className="text-charcoal-500">Your enquiry session has expired.</p>
              <button type="button" onClick={wizard.reset} className="btn-primary mt-6">
                Start again
              </button>
            </div>
          )}
        </div>

        {canStartOver && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={wizard.reset}
              className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-500 hover:text-navy-800"
            >
              <RotateCcw className="h-4 w-4" /> Start over
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
