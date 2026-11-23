import { createHash } from "node:crypto";
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "GLOBAL_CLASH_FROM"];
for (const key of required) {
  if (!process.env[key]) throw new Error("Missing required GitHub Actions secret: " + key);
}
const supabaseUrl = process.env.SUPABASE_URL.replace(/\/+$/, "");
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const from = process.env.GLOBAL_CLASH_FROM;
const siteUrl = process.env.GLOBAL_CLASH_SITE_URL || "https://stikerpo-spec.github.io/Random-Games/global-clash/";
const title = (process.env.UPDATE_TITLE || "A new arena update is here").trim().slice(0, 160);
const notes = (process.env.UPDATE_NOTES || "A new version of GLOBAL CLASH is available. Open the game to see what changed.").trim().slice(0, 12000);
const releaseUrl = process.env.UPDATE_URL || siteUrl;
const idempotencyPrefix = String(process.env.UPDATE_IDEMPOTENCY_PREFIX || process.env.GITHUB_RUN_ID || "manual").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function loadConfirmedUsers() {
  const users = [];
  for (let page = 1; page <= 1000; page++) {
    const response = await fetch(
      supabaseUrl + "/auth/v1/admin/users?page=" + page + "&per_page=1000",
      { headers: { apikey: adminKey, Authorization: "Bearer " + adminKey, Accept: "application/json" } }
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new Error("Supabase Admin API failed (" + response.status + "): " + detail.slice(0, 500));
    }
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.users)) throw new Error("Unexpected response from Supabase Admin API.");
    users.push(...payload.users);
    if (payload.users.length < 1000) break;
  }
  return users;
}

async function sendOne(subscriber, html, text) {
  const emailHash = createHash("sha256").update(subscriber.email.toLowerCase()).digest("hex").slice(0, 24);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json", "Idempotency-Key": "global-clash-" + idempotencyPrefix + "-" + emailHash },
    body: JSON.stringify({ from, to: [subscriber.email], subject: "GLOBAL CLASH Update: " + title, html, text })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Resend rejected a message (" + response.status + "): " + detail.slice(0, 400));
  }
}

const users = await loadConfirmedUsers();
const subscribers = [...new Map(users
  .filter(user =>
    user &&
    typeof user.email === "string" &&
    (user.email_confirmed_at || user.confirmed_at) &&
    user.user_metadata &&
    user.user_metadata.update_emails === true
  )
  .map(user => [user.email.toLowerCase(), { email: user.email }])
).values()];

console.log("Found " + subscribers.length + " confirmed, opted-in update subscribers.");
if (subscribers.length === 0) {
  console.log("No emails to send. No message was sent.");
  process.exit(0);
}

const safeTitle = escapeHtml(title);
const safeNotes = escapeHtml(notes).replace(/\r?\n/g, "<br>");
const safeReleaseUrl = escapeHtml(releaseUrl);
const safeSiteUrl = escapeHtml(siteUrl);
const html = `<!doctype html><html><body style="margin:0;padding:28px;background:#08111b;color:#eaf5f6;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:auto;padding:28px;border:1px solid #294454;border-radius:12px;background:#101e2b">
    <p style="color:#53eedc;font-size:12px;letter-spacing:3px">GLOBAL CLASH / RELEASE UPDATE</p>
    <h1 style="font-size:28px;margin:14px 0;color:#c5ff67">${safeTitle}</h1>
    <p style="font-size:14px;line-height:1.7;color:#b8cbd1">${safeNotes}</p>
    <p style="margin:26px 0"><a href="${safeReleaseUrl}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#53eedc;color:#061419;text-decoration:none;font-weight:bold">UPDATE DETAILS</a></p>
    <p style="font-size:12px;color:#91a5b3">Play GLOBAL CLASH: <a href="${safeSiteUrl}" style="color:#53eedc">${safeSiteUrl}</a></p>
    <hr style="border:0;border-top:1px solid #29404d;margin:24px 0">
    <p style="font-size:11px;line-height:1.6;color:#8299a5">Du erhältst diese Nachricht, weil du in deinem bestätigten GLOBAL-CLASH-Account Update-Mails aktiviert hast. Du kannst sie jederzeit unter Settings → Email me about new updates ausschalten.</p>
  </div>
</body></html>`;
const text = [
  "GLOBAL CLASH — " + title, "", notes, "",
  "Update-Details: " + releaseUrl,
  "Spiel öffnen: " + siteUrl, "",
  "Du erhältst diese Nachricht, weil du Update-Mails in deinem GLOBAL-CLASH-Account aktiviert hast. Du kannst sie unter Settings ausschalten."
].join("\n");

let sent = 0;
const failures = [];
for (const subscriber of subscribers) {
  try {
    await sendOne(subscriber, html, text);
    sent++;
  } catch (error) {
    failures.push(error.message);
    console.error("Could not send an update message:", error.message);
  }
  await new Promise(resolve => setTimeout(resolve, 120));
}
console.log("Update emails sent: " + sent + " / " + subscribers.length + ".");
if (failures.length) {
  console.error("Failed message count: " + failures.length);
  throw new Error("One or more update emails could not be sent. See the errors above.");
}
