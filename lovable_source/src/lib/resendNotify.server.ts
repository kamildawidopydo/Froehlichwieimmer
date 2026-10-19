// E-Mail-Benachrichtigung über Resend für Formular-Eingänge.
// Empfänger: info@essenceinvest.com · Absender: essenceinvest.com (in Resend verifiziert).
const NOTIFY_TO = "info@essenceinvest.com";
const FROM = "Fröhlich Vermögensberatung <noreply@essenceinvest.com>";

const KIND_LABELS: Record<string, string> = {
  "send-contact-email": "Kontaktformular",
  "send-product-inquiry-email": "Produktanfrage",
  "wealth-consultation": "Vermögensberatung-Anfrage",
  "newsletter/subscribe": "Newsletter-Anmeldung",
  "investment-topics/lead": "Lead (Investmentthemen)",
  "reviews/submit": "Bewertung",
  "assistant/handoff": "Assistent-Übergabe",
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRows(obj: unknown, prefix = ""): string {
  if (obj == null) return "";
  if (Array.isArray(obj)) {
    return obj.map((x, i) => renderRows(x, `${prefix}[${i}]`)).join("");
  }
  if (typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => renderRows(v, prefix ? `${prefix}.${k}` : k))
      .join("");
  }
  const val = String(obj);
  if (val.length > 4000) return "";
  return `<tr><td style="padding:6px 10px;border:1px solid #e5e2da;font-size:13px;color:#666;vertical-align:top">${esc(prefix)}</td><td style="padding:6px 10px;border:1px solid #e5e2da;font-size:13px">${esc(val).replace(/\n/g, "<br>")}</td></tr>`;
}

export async function notifyFormSubmission(kind: string, payload: unknown, attachmentPaths: string[]): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return; // Schlüssel fehlt — Eingang ist bereits gespeichert, nichts verlieren.
  const label = KIND_LABELS[kind] || (/contract/i.test(kind) ? "Vertragsformular" : kind);
  const attachNote = attachmentPaths.length
    ? `<p style="font-size:13px;color:#666">Anhänge (${attachmentPaths.length}) sind in der Ablage gespeichert: ${esc(attachmentPaths.join(", "))}</p>`
    : "";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px">
      <h2 style="font-size:18px;margin:0 0 12px">Neuer Eingang: ${esc(label)}</h2>
      <table style="border-collapse:collapse;width:100%">${renderRows(payload)}</table>
      ${attachNote}
      <p style="font-size:12px;color:#999;margin-top:16px">Automatische Benachrichtigung der Website essenceinvest.com</p>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_TO],
        subject: `Neuer Eingang: ${label}`,
        html,
      }),
    });
    if (!res.ok) console.error("[resend-notify]", res.status, await res.text());
  } catch (err) {
    console.error("[resend-notify]", err);
  }
}
