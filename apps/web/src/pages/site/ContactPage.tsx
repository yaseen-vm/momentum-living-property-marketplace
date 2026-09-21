import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { CompanyContactList } from "../../components/site/CompanyContactList";
import { PageHeader } from "../../components/site/PageHeader";
import { useChatWithAgent } from "../../components/site/ChatWithAgent";
import { PageSpinner } from "../../components/ui/Spinner";
import { useContent } from "../../lib/content";
import { AVAILABILITY_PATH, BRAND } from "../../lib/site";
import { usePageMeta } from "../../lib/usePageMeta";

export default function ContactPage() {
  usePageMeta({
    title: "Contact",
    description: "Contact Momentum Living about labour accommodation: phone, WhatsApp, email, office address and working hours.",
  });
  const { data: company, isPending } = useContent("company");
  const { openChat } = useChatWithAgent();

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={`Contact ${BRAND.name}`}
        lead="Speak to our team about a requirement, a property or a partnership."
      />

      <section className="section">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="heading-3">Company details</h2>
            <div className="mt-8">{isPending ? <PageSpinner /> : <CompanyContactList company={company} />}</div>
          </div>

          <aside className="space-y-6 lg:col-span-5">
            <div className="card">
              <h2 className="heading-3">Chat With an Agent</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-500">
                Choose an agent and reach them on WhatsApp, by phone or by email.
              </p>
              <button type="button" onClick={() => openChat()} className="btn-primary mt-6 w-full">
                <MessageCircle className="h-4 w-4" /> Chat With an Agent
              </button>
            </div>
            <div className="card border-gold-200 bg-gold-50/60">
              <h2 className="heading-3">Start an Enquiry</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-500">
                Tell us what you need and we will match you with suitable opportunities.
              </p>
              <Link to={AVAILABILITY_PATH} className="btn-availability mt-6 w-full">
                Availability <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
