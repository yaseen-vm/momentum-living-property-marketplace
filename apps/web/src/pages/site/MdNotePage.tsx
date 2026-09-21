import { Link } from "react-router-dom";
import { ArrowLeft, Quote } from "lucide-react";
import { ContactCta } from "../../components/site/ContactCta";
import { RichText } from "../../components/site/RichText";
import { PageSpinner } from "../../components/ui/Spinner";
import { useContent } from "../../lib/content";
import { usePageMeta } from "../../lib/usePageMeta";

/** A personal message, styled as a letter to set it apart from the other pages (spec §8). */
export default function MdNotePage() {
  usePageMeta({
    title: "A Note From the Managing Director",
    description: "A personal message from the Managing Director of Momentum Living.",
  });
  const { data: note, isPending } = useContent("md_note");
  const { data: md } = useContent("md_profile");

  if (isPending) return <PageSpinner />;

  return (
    <>
      <section className="section bg-gold-50/60">
        <div className="container-site max-w-3xl">
          <Link
            to="/managing-director"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" /> Managing Director
          </Link>

          <article className="relative mt-8 rounded-2xl border border-gold-200 bg-white px-6 py-12 shadow-card sm:px-12 md:px-16 md:py-16">
            <Quote className="absolute -top-5 left-8 h-10 w-10 rounded-full bg-gold-400 p-2 text-navy-950" aria-hidden />
            <h1 className="heading-2">{note.heading}</h1>
            <span className="gold-rule mt-6" aria-hidden />
            <RichText text={note.body} className="mt-8 font-serif text-lg md:text-xl" />
            <footer className="mt-12 border-t border-charcoal-100 pt-8">
              <p className="font-serif text-2xl italic text-navy-900">{note.signature_name}</p>
              <p className="mt-1 text-sm text-charcoal-500">{md.title}</p>
            </footer>
          </article>
        </div>
      </section>

      <ContactCta />
    </>
  );
}
