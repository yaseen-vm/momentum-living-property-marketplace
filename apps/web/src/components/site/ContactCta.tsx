import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useChatWithAgent } from "./ChatWithAgent";
import { AVAILABILITY_PATH, BRAND } from "../../lib/site";

interface ContactCtaProps {
  title?: string;
  text?: string;
}

/** Closing call to action on corporate pages: chat, contact, or start an enquiry. */
export function ContactCta({
  title = `Speak to ${BRAND.name}`,
  text = "Talk to one of our agents, or tell us what you need and we will come back with suitable options.",
}: ContactCtaProps) {
  const { openChat } = useChatWithAgent();

  return (
    <section className="bg-navy-900">
      <div className="container-site py-16 md:py-20">
        <div className="grid gap-8 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7">
            <h2 className="heading-2 text-white">{title}</h2>
            <p className="mt-4 max-w-xl text-navy-100">{text}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-5 md:justify-end">
            <button type="button" onClick={() => openChat()} className="btn bg-white text-navy-900 hover:bg-navy-50">
              <MessageCircle className="h-4 w-4" /> Chat With an Agent
            </button>
            <Link to={AVAILABILITY_PATH} className="btn-availability">
              Start an Enquiry <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
