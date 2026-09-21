import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePageMeta } from "../../lib/usePageMeta";

interface PagePendingProps {
  title: string;
  description: string;
}

/**
 * Holding page for navigation targets that are not built yet, so every nav and
 * footer link resolves. Each route is replaced by its real page in a later stage.
 */
export default function PagePending({ title, description }: PagePendingProps) {
  usePageMeta({ title, description, noindex: true });

  return (
    <section className="section bg-navy-50/60">
      <div className="container-site max-w-3xl text-center">
        <span className="eyebrow">Momentum Living</span>
        <h1 className="heading-2 mt-4">{title}</h1>
        <span className="gold-rule mx-auto mt-6" aria-hidden />
        <p className="lead mx-auto mt-6 max-w-xl">{description}</p>
        <p className="mt-4 text-sm text-charcoal-400">This page is being prepared.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-secondary">
            Back to Home
          </Link>
          <Link to="/contact" className="btn-primary">
            Contact Us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
