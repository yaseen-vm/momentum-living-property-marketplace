import { PageHeader } from "../../components/site/PageHeader";
import { RichText } from "../../components/site/RichText";
import { PageSpinner } from "../../components/ui/Spinner";
import { useContent } from "../../lib/content";
import { usePageMeta } from "../../lib/usePageMeta";

const PAGES = {
  privacy: {
    key: "legal_privacy",
    title: "Privacy Policy",
    description: "How Momentum Living collects, uses and protects your information.",
  },
  terms: {
    key: "legal_terms",
    title: "Terms & Conditions",
    description: "Terms of use for the Momentum Living website.",
  },
} as const;

/** Privacy Policy and Terms (spec §22). Wording is admin-supplied; placeholders until then. */
export default function LegalPage({ page }: { page: keyof typeof PAGES }) {
  const { key, title, description } = PAGES[page];
  usePageMeta({ title, description });
  const { data, isPending } = useContent(key);

  return (
    <>
      <PageHeader eyebrow="Legal" title={title}>
        {data.updated_on && !isPending && <p className="mt-6 text-sm text-charcoal-500">Last updated: {data.updated_on}</p>}
      </PageHeader>
      <section className="section">
        <div className="container-site max-w-3xl">
          {isPending ? <PageSpinner /> : <RichText text={data.body_markdown} />}
        </div>
      </section>
    </>
  );
}
