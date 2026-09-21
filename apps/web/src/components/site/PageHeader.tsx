interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}

/** Page-top band shared by corporate pages: the page's only H1. */
export function PageHeader({ eyebrow, title, lead, children }: PageHeaderProps) {
  return (
    <section className="border-b border-charcoal-100 bg-navy-50/60">
      <div className="container-site py-14 md:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="heading-1 mt-4">{title}</h1>
          <span className="gold-rule mt-6" aria-hidden />
          {lead && <p className="lead mt-6 max-w-2xl">{lead}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
