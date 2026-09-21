import { clsx } from "clsx";

interface RichTextProps {
  /** Plain text from the CMS. Supports `## heading`, `- item` lists and blank-line paragraphs. */
  text: string;
  className?: string;
}

type Block = { kind: "h2" | "p"; text: string } | { kind: "ul"; items: string[] };

function parse(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      if (chunk.startsWith("## ")) return { kind: "h2", text: chunk.slice(3).trim() };
      const lines = chunk.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) return { kind: "ul", items: lines.map((l) => l.slice(2)) };
      return { kind: "p", text: lines.join(" ") };
    });
}

/**
 * Renders admin-edited copy as React text nodes. There is deliberately no HTML
 * rendering, so CMS content can never inject markup.
 */
export function RichText({ text, className }: RichTextProps) {
  return (
    <div className={clsx("space-y-5 leading-relaxed text-charcoal-600", className)}>
      {parse(text).map((block, i) => {
        if (block.kind === "h2") {
          return (
            <h2 key={i} className="heading-3 pt-4">
              {block.text}
            </h2>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={i} className="list-disc space-y-2 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}
