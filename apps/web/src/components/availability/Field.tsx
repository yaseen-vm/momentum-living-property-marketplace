import { Check } from "lucide-react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}

/** Label, control, hint and error for one wizard form field. */
export function Field({ label, htmlFor, required, hint, error, children }: FieldProps) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div>
      <Label htmlFor={htmlFor} className="field-label">
        {label}
        {required ? <span className="text-gold-600"> *</span> : <span className="text-charcoal-400"> (optional)</span>}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** Toggle chip for multi-select answers (locations, facilities). */
export function Chip({ selected, onClick, children }: ChipProps) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={selected ? "chip-on" : "chip-off"}>
      {selected && <Check className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

/** `className` for a text-like input, with the error state applied. */
export function inputClass(error: unknown): string {
  return error ? "field-input field-input-error" : "field-input";
}
