import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { useAgents, useContent } from "../../lib/content";
import { mailHref, telHref, whatsappHref } from "../../lib/contact";
import { AVAILABILITY_PATH, BRAND } from "../../lib/site";

/** `null` = "any available agent" (company contact details). */
type Selection = { agentId: string | null } | undefined;

interface ChatWithAgentContextValue {
  /** Opens the picker, optionally with an agent (or `null` for any agent) preselected. */
  openChat: (agentId?: string | null) => void;
}

const ChatWithAgentContext = createContext<ChatWithAgentContextValue | null>(null);

export function useChatWithAgent(): ChatWithAgentContextValue {
  const ctx = useContext(ChatWithAgentContext);
  if (!ctx) throw new Error("useChatWithAgent must be used inside <ChatWithAgentProvider>");
  return ctx;
}

/** Chat With an Agent (spec §11): pick an agent, then WhatsApp, phone or email. */
export function ChatWithAgentProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(undefined);

  const openChat = useCallback((agentId?: string | null) => {
    setSelection(agentId === undefined ? undefined : { agentId });
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openChat }), [openChat]);

  return (
    <ChatWithAgentContext.Provider value={value}>
      {children}
      <Modal open={open} onClose={close} title="Chat With an Agent">
        <ChatPicker selection={selection} onSelect={setSelection} onClose={close} />
      </Modal>
    </ChatWithAgentContext.Provider>
  );
}

interface ChatPickerProps {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
}

function ChatPicker({ selection, onSelect, onClose }: ChatPickerProps) {
  const { agents, isPending } = useAgents();
  const { data: company } = useContent("company");

  if (selection === undefined) {
    return (
      <div>
        <p className="text-sm text-charcoal-500">Choose who you would like to speak with.</p>
        <ul className="mt-4 space-y-2">
          <li>
            <AgentOption
              name="Any available agent"
              detail={`The ${BRAND.name} team`}
              onClick={() => onSelect({ agentId: null })}
            />
          </li>
          {agents.map((agent) => (
            <li key={agent.id}>
              <AgentOption
                name={agent.name}
                detail={agent.position}
                photoUrl={agent.photo_url}
                onClick={() => onSelect({ agentId: agent.id })}
              />
            </li>
          ))}
        </ul>
        {isPending && (
          <div className="mt-4 flex justify-center">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    );
  }

  const agent = selection.agentId ? agents.find((a) => a.id === selection.agentId) : undefined;
  if (selection.agentId && !agent) {
    return isPending ? (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    ) : (
      <p className="text-sm text-charcoal-500">This agent is no longer available.</p>
    );
  }

  const name = agent?.name ?? `the ${BRAND.name} team`;
  const greeting = `Hello, I would like to speak with ${agent ? agent.name : BRAND.name} about labour accommodation.`;
  const channels: ChannelProps[] = [
    { icon: MessageCircle, label: "WhatsApp", href: whatsappHref(agent ? agent.whatsapp : company.whatsapp, greeting), external: true },
    { icon: Phone, label: "Call", href: telHref(agent ? agent.phone : company.phone) },
    { icon: Mail, label: "Email", href: mailHref(agent ? agent.email : company.email) },
    // Website chat slots in here once a provider is configured (roadmap Phase 2).
  ];
  const anyAvailable = channels.some((ch) => ch.href);

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900"
      >
        <ArrowLeft className="h-4 w-4" /> Choose another agent
      </button>
      <p className="mt-4 text-sm text-charcoal-500">
        How would you like to contact <span className="font-semibold text-navy-900">{name}</span>?
      </p>
      <ul className="mt-4 space-y-2">
        {channels.map((ch) => (
          <li key={ch.label}>
            <Channel {...ch} />
          </li>
        ))}
      </ul>
      {!anyAvailable && (
        <p className="mt-4 rounded-lg bg-navy-50 p-4 text-sm text-charcoal-600">
          Contact details are being finalised. In the meantime, visit our{" "}
          <Link to="/contact" onClick={onClose} className="font-semibold text-navy-800 underline">
            Contact page
          </Link>{" "}
          or{" "}
          <Link to={AVAILABILITY_PATH} onClick={onClose} className="font-semibold text-navy-800 underline">
            start an enquiry
          </Link>
          .
        </p>
      )}
    </div>
  );
}

interface AgentOptionProps {
  name: string;
  detail: string;
  photoUrl?: string | null;
  onClick: () => void;
}

function AgentOption({ name, detail, photoUrl, onClick }: AgentOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-lg border border-charcoal-100 p-3 text-left transition-colors hover:border-gold-400 hover:bg-gold-50"
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-400">
          <UserRound className="h-5 w-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-navy-900">{name}</span>
        <span className="block truncate text-sm text-charcoal-500">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-charcoal-300" aria-hidden />
    </button>
  );
}

interface ChannelProps {
  icon: LucideIcon;
  label: string;
  href: string | null;
  external?: boolean;
}

function Channel({ icon: Icon, label, href, external }: ChannelProps) {
  const body = (
    <>
      <Icon className="h-5 w-5 shrink-0 text-gold-600" aria-hidden />
      <span className="flex-1 font-medium">{label}</span>
      {!href && <span className="text-xs text-charcoal-400">Not yet available</span>}
    </>
  );
  const base = "flex w-full items-center gap-4 rounded-lg border p-4";

  if (!href) {
    return <span className={`${base} border-charcoal-100 text-charcoal-400`}>{body}</span>;
  }
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${base} border-charcoal-100 text-navy-900 transition-colors hover:border-gold-400 hover:bg-gold-50`}
    >
      {body}
    </a>
  );
}
