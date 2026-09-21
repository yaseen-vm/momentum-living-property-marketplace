import { Languages, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import type { PublicAgent } from "@momentum/shared";
import { ContactCta } from "../../components/site/ContactCta";
import { PageHeader } from "../../components/site/PageHeader";
import { useChatWithAgent } from "../../components/site/ChatWithAgent";
import { PageSpinner } from "../../components/ui/Spinner";
import { mailHref, telHref, whatsappHref } from "../../lib/contact";
import { useAgents } from "../../lib/content";
import { usePageMeta } from "../../lib/usePageMeta";

export default function AgentsPage() {
  usePageMeta({
    title: "Our Agents",
    description: "Meet the Momentum Living agents who handle labour accommodation enquiries from first call to completion.",
  });
  const { agents, isPending, isError } = useAgents();

  return (
    <>
      <PageHeader
        eyebrow="Our People"
        title="Our Agents"
        lead="Every enquiry is handled by a dedicated agent. Choose who you would like to speak with."
      />

      <section className="section">
        <div className="container-site">
          {isPending ? (
            <PageSpinner />
          ) : isError ? (
            <p className="text-center text-charcoal-500">Agent profiles could not be loaded. Please try again shortly.</p>
          ) : agents.length === 0 ? (
            <p className="text-center text-charcoal-500">Agent profiles are being prepared.</p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <AgentCard agent={agent} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ContactCta />
    </>
  );
}

function AgentCard({ agent }: { agent: PublicAgent }) {
  const { openChat } = useChatWithAgent();
  const whatsapp = whatsappHref(agent.whatsapp, `Hello ${agent.name}, I would like to discuss labour accommodation.`);
  const phone = telHref(agent.phone);
  const email = mailHref(agent.email);

  return (
    <article className="card flex h-full flex-col p-0 md:p-0">
      <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-navy-50">
        {agent.photo_url ? (
          <img src={agent.photo_url} alt={`Photo of ${agent.name}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-300">
            <UserRound className="h-16 w-16" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h2 className="font-serif text-xl text-navy-900">{agent.name}</h2>
        <p className="mt-1 text-sm font-medium text-gold-700">{agent.position}</p>
        {agent.specialization && <p className="mt-3 text-sm text-charcoal-500">{agent.specialization}</p>}
        {agent.languages.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-charcoal-500">
            <Languages className="h-4 w-4 shrink-0 text-charcoal-400" aria-hidden />
            {agent.languages.join(", ")}
          </p>
        )}
        {agent.bio && <p className="mt-4 text-sm leading-relaxed text-charcoal-600">{agent.bio}</p>}

        {(phone || email) && (
          <ul className="mt-5 space-y-2 text-sm">
            {phone && (
              <li>
                <a href={phone} className="flex items-center gap-2 text-navy-800 hover:text-gold-700">
                  <Phone className="h-4 w-4 text-gold-600" aria-hidden /> {agent.phone}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={email} className="flex items-center gap-2 break-all text-navy-800 hover:text-gold-700">
                  <Mail className="h-4 w-4 shrink-0 text-gold-600" aria-hidden /> {agent.email}
                </a>
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row">
          <button type="button" onClick={() => openChat(agent.id)} className="btn-primary flex-1">
            Chat With Agent
          </button>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
