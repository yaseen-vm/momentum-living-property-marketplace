import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Upload, UserRound } from "lucide-react";
import { agentSchema } from "@momentum/shared";
import type { AdminAgent, AgentInput } from "@momentum/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import { AdminField, AdminPage, EmptyState, ErrorBox, adminInputClass, useAdminToken } from "../../components/admin/AdminUi";

export default function AdminAgentsPage() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminAgent | "new" | null>(null);

  const agents = useQuery({ queryKey: ["admin-agents"], queryFn: () => api.admin.agents(token) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-agents"] });
    void qc.invalidateQueries({ queryKey: ["agents"] });
  };
  const toggle = useMutation({
    mutationFn: (a: AdminAgent) => api.admin.updateAgent(a.id, { is_active: !a.is_active }, token),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.admin.deleteAgent(id, token), onSuccess: refresh });

  return (
    <AdminPage
      title="Agents"
      description="Active agents appear on the Our Agents page in display order. Inactive agents are kept for lead history."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden /> New agent
        </Button>
      }
    >
      <ErrorBox error={agents.error ?? toggle.error ?? remove.error} />
      {agents.isPending ? (
        <PageSpinner />
      ) : !agents.data?.agents.length ? (
        <EmptyState>No agents yet.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {agents.data.agents.map((a) => (
            <li key={a.id} className={`flex gap-4 rounded-xl bg-white p-4 shadow-sm ${a.is_active ? "" : "opacity-60"}`}>
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-navy-50">
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="m-4 h-8 w-8 text-navy-300" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{a.name}</span>
                  {!a.is_active && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Inactive</span>}
                </div>
                <p className="text-sm text-slate-500">{a.position}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Order {a.display_order} · {a.lead_count} leads · {a.property_count} properties
                  {a.languages.length > 0 && ` · ${a.languages.join(", ")}`}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {[a.phone, a.whatsapp && `WhatsApp ${a.whatsapp}`, a.email].filter(Boolean).join(" · ") || "No contact details"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(a)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </Button>
                  <Button size="sm" variant="secondary" loading={toggle.isPending && toggle.variables?.id === a.id} onClick={() => toggle.mutate(a)}>
                    {a.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  {a.lead_count === 0 && a.property_count === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Delete ${a.name}? This cannot be undone.`)) remove.mutate(a.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AgentDialog
          agent={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            setEditing(null);
          }}
        />
      )}
    </AdminPage>
  );
}

interface AgentForm {
  name: string;
  position: string;
  specialization: string;
  languages: string;
  phone: string;
  whatsapp: string;
  email: string;
  bio: string;
  display_order: string;
  is_active: boolean;
  photo_key: string | null;
  photo_url: string | null;
}

function toForm(a: AdminAgent | null): AgentForm {
  return {
    name: a?.name ?? "",
    position: a?.position ?? "",
    specialization: a?.specialization ?? "",
    languages: a?.languages.join(", ") ?? "",
    phone: a?.phone ?? "",
    whatsapp: a?.whatsapp ?? "",
    email: a?.email ?? "",
    bio: a?.bio ?? "",
    display_order: String(a?.display_order ?? 0),
    is_active: a?.is_active ?? true,
    photo_key: a?.photo_key ?? null,
    photo_url: a?.photo_url ?? null,
  };
}

function AgentDialog({ agent, onClose, onSaved }: { agent: AdminAgent | null; onClose: () => void; onSaved: () => void }) {
  const token = useAdminToken();
  const [form, setForm] = useState<AgentForm>(() => toForm(agent));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (input: AgentInput) => (agent ? api.admin.updateAgent(agent.id, input, token) : api.admin.createAgent(input, token)),
    onSuccess: onSaved,
  });

  const set = <K extends keyof AgentForm>(key: K, value: AgentForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: AgentInput = {
      name: form.name,
      position: form.position,
      specialization: form.specialization,
      languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      bio: form.bio,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
      photo_key: form.photo_key,
    };
    const parsed = agentSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    save.mutate(input);
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const { key } = await api.upload.uploadFile(file, "public_media", token, { area: "agents" });
      setForm((f) => ({ ...f, photo_key: key, photo_url: URL.createObjectURL(file) }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const input = (key: keyof AgentForm, label: string, opts: { type?: string; placeholder?: string; hint?: string } = {}) => (
    <AdminField label={label} htmlFor={`agent-${key}`} error={errors[key]} hint={opts.hint}>
      <input
        id={`agent-${key}`}
        type={opts.type ?? "text"}
        value={form[key] as string}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value as never)}
        className={adminInputClass}
      />
    </AdminField>
  );

  return (
    <Modal open onClose={onClose} title={agent ? `Edit ${agent.name}` : "New agent"} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-navy-50">
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="m-5 h-10 w-10 text-navy-300" aria-hidden />
            )}
          </div>
          <div className="space-y-1">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <Upload className="h-4 w-4" aria-hidden /> {uploading ? "Uploading…" : form.photo_key ? "Replace photo" : "Upload photo"}
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  e.target.value = "";
                }}
              />
            </label>
            {form.photo_key && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, photo_key: null, photo_url: null }))} className="block text-xs text-slate-500 hover:underline">
                Remove photo
              </button>
            )}
            {(uploadError ?? errors["photo_key"]) && <p className="text-xs text-red-600">{uploadError ?? errors["photo_key"]}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {input("name", "Name")}
          {input("position", "Position", { placeholder: "Labour Accommodation Specialist" })}
          {input("specialization", "Specialisation", { placeholder: "Area or property type" })}
          {input("languages", "Languages", { placeholder: "English, Arabic, Hindi", hint: "Separate with commas." })}
          {input("phone", "Phone", { type: "tel", placeholder: "+971501234567" })}
          {input("whatsapp", "WhatsApp", { type: "tel", placeholder: "+971501234567" })}
          {input("email", "Email", { type: "email" })}
          {input("display_order", "Display order", { type: "number", hint: "Lower numbers appear first." })}
        </div>
        <AdminField label="Short bio" htmlFor="agent-bio" error={errors["bio"]}>
          <textarea id="agent-bio" rows={3} maxLength={1000} value={form.bio} onChange={(e) => set("bio", e.target.value)} className={adminInputClass} />
        </AdminField>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Active (shown on the website)
        </label>

        <ErrorBox error={save.error} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={uploading}>
            {agent ? "Save" : "Create agent"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
