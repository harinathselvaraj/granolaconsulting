import {
  clearAuthState,
  completeOAuthLogin,
  DELETE_STEPS,
  deleteUserStep,
  getIdToken,
  getSignedInEmail,
  getUserDetail,
  insecureLoginWarning,
  listUsers,
  logout,
  reactivateUser,
  redirectInsecureOriginToHttps,
  revokeUser,
  signInWithPassword,
  startGoogleLogin,
  type DeleteStepId,
} from "./auth.js";
import type { AdminUser, AdminUserDetail, ProvisionStepView } from "./types.js";

const app = document.getElementById("app");
if (!app) {
  throw new Error("#app not found");
}

type UserFilter = "all" | "stuck" | "provisioning" | "onboarding" | "active";

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleString();
}

function fmtBytes(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusBadge(user: AdminUser): string {
  const key = user.revoked ? "revoked" : user.status.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const label = user.revoked ? "REVOKED" : user.status;
  return `<span class="badge ${esc(key)}">${esc(label)}</span>`;
}

function meterCell(user: AdminUser): string {
  const pct = user.mcpLimit > 0 ? Math.min(100, Math.round((user.mcpUsed / user.mcpLimit) * 100)) : 0;
  return `<div class="meter">${user.mcpUsed} / ${user.mcpLimit}<div class="meter-bar"><span style="width:${pct}%"></span></div></div>`;
}

function progressMini(user: AdminUser): string {
  const pct = Math.min(100, Math.max(0, user.percent));
  const stuckMark = user.stuck ? `<span class="stuck-flag" title="${esc(user.stuckReason ?? "")}">⚠</span>` : "";
  return `<div class="progress-mini">
    <div class="progress-mini-bar"><span style="width:${Math.max(pct, 4)}%"></span></div>
    <span class="progress-mini-label">${esc(user.progressLabel)}${stuckMark}</span>
  </div>`;
}

function matchesFilter(user: AdminUser, filter: UserFilter): boolean {
  if (filter === "all") return true;
  if (filter === "stuck") return user.stuck;
  if (filter === "provisioning") {
    return user.status === "PENDING" || user.status === "PROVISIONING";
  }
  if (filter === "onboarding") {
    return user.status === "ACTIVE" && !user.onboardingCompleted && !user.revoked;
  }
  if (filter === "active") {
    return user.status === "ACTIVE" && user.onboardingCompleted && !user.revoked;
  }
  return true;
}

function renderStepsHtml(steps: ProvisionStepView[]): string {
  return `<ul class="step-list">${steps
    .map((s) => {
      const icon = s.state === "done" ? "✓" : s.state === "active" ? "◉" : "○";
      return `<li class="step-item step-${esc(s.state)}"><span class="step-icon">${icon}</span><span>${esc(s.label)}</span></li>`;
    })
    .join("")}</ul>`;
}

function kvRow(label: string, value: string | null | undefined, rawHtml = false): string {
  const v = rawHtml ? (value ?? "—") : esc(value ?? "—");
  return `<tr><th>${esc(label)}</th><td>${v}</td></tr>`;
}

function renderDetailPanel(detail: AdminUserDetail | null, loading: boolean): string {
  if (loading) {
    return `<aside class="detail-panel"><p class="meta">Loading tenant…</p></aside>`;
  }
  if (!detail) {
    return `<aside class="detail-panel detail-empty"><p class="meta">Select a user to view provisioning progress, onboarding, usage, and billing.</p></aside>`;
  }

  const u = detail.user;
  const profile = detail.onboardingProfile;
  const profileRows = profile
    ? [
        kvRow("Company", profile.companyName ?? null),
        kvRow("Company email", profile.companyEmail ?? null),
        kvRow("Phone", profile.phone ?? null),
        kvRow("Occupation", profile.occupation ?? null),
        kvRow("Job title", profile.jobTitle ?? null),
        kvRow("Team size", profile.teamSize ?? null),
        kvRow("Use case", profile.primaryUseCase ?? null),
      ].join("")
    : `<tr><td colspan="2" class="meta">Not submitted yet</td></tr>`;

  const billingRows = detail.billing
    ? [
        kvRow("Checkout", detail.billing.checkoutId),
        kvRow("Status", detail.billing.status),
        kvRow("Interval", detail.billing.billingInterval),
        kvRow("Stripe customer", detail.billing.stripeCustomerId),
        kvRow("Subscription", detail.billing.stripeSubscriptionId),
        kvRow("Sandbox job", detail.billing.jobId),
      ].join("")
    : `<tr><td colspan="2" class="meta">No Stripe checkout linked to this tenant</td></tr>`;

  const jobRows = detail.sandboxJob
    ? [
        kvRow("Job ID", detail.sandboxJob.jobId),
        kvRow("Status", detail.sandboxJob.status),
        kvRow("Progress", detail.sandboxJob.percent != null ? `${detail.sandboxJob.percent}%` : null),
        kvRow("Hostname", detail.sandboxJob.publicHostname),
        kvRow(
          "App URL",
          detail.sandboxJob.appUrl
            ? `<a href="${esc(detail.sandboxJob.appUrl)}" target="_blank" rel="noopener">${esc(detail.sandboxJob.appUrl)}</a>`
            : null,
          true,
        ),
        kvRow("Error", detail.sandboxJob.error),
      ].join("")
    : "";

  const stuckBanner = detail.stuck
    ? `<div class="stuck-banner"><strong>Needs attention</strong><p>${esc(detail.stuckReason)}</p></div>`
    : "";

  return `<aside class="detail-panel">
    <div class="detail-header">
      <h2>${esc(u.email ?? u.tenantId)}</h2>
      <button type="button" class="secondary" id="detail-close">Close</button>
    </div>
    ${stuckBanner}
    <p class="meta"><code>${esc(u.tenantId)}</code> · ${statusBadge(u)} · ${esc(detail.progressLabel)}</p>
    <div class="detail-actions">
      <a class="secondary link-btn" href="${esc(detail.workspaceOpenUrl ?? detail.appUrl)}" target="_blank" rel="noopener">Open workspace</a>
      ${
        u.revoked
          ? `<button type="button" class="secondary" data-action="reactivate" data-tenant="${esc(u.tenantId)}">Reactivate</button>`
          : `<button type="button" class="danger" data-action="revoke" data-tenant="${esc(u.tenantId)}">Revoke</button>`
      }
      <button type="button" class="danger" data-action="delete" data-tenant="${esc(u.tenantId)}">Delete permanently</button>
    </div>

    <section class="detail-section">
      <h3>Provisioning</h3>
      <div class="detail-progress">
        <div class="detail-progress-bar"><span style="width:${Math.max(detail.percent, 4)}%"></span></div>
        <span>${detail.percent}%</span>
      </div>
      ${renderStepsHtml(detail.provisionSteps)}
    </section>

    <section class="detail-section">
      <h3>Onboarding</h3>
      <p>${detail.onboardingCompleted ? '<span class="badge active">Completed</span>' : '<span class="badge pending">Pending</span>'}</p>
      <table class="kv-table">${profileRows}</table>
    </section>

    <section class="detail-section">
      <h3>Usage</h3>
      <table class="kv-table">
        ${kvRow("MCP credits (this month)", `${u.mcpUsed} / ${u.mcpLimit}`)}
        ${kvRow("MCP tool policy", detail.mcpToolAllowlist)}
        ${kvRow("Last MCP use", fmtDate(u.lastMcpUsageAt))}
        ${kvRow("Egress (month)", `${fmtBytes(detail.egressBytesMonth)} / ${fmtBytes(detail.egressCapBytes)}`)}
        ${kvRow("Egress month", detail.egressMonth)}
        ${kvRow("Max creators / viewers", detail.maxCreators != null ? `${detail.maxCreators} / ${detail.maxViewers}` : null)}
      </table>
    </section>

    <section class="detail-section">
      <h3>Account</h3>
      <table class="kv-table">
        ${kvRow("Sign-in", detail.account?.signInMethod ?? (u.email ? "email" : "—"))}
        ${kvRow("Google sub", detail.account?.googleSub ?? null)}
        ${kvRow("Account email", detail.account?.email ?? u.email)}
        ${kvRow("Signed up", fmtDate(detail.createdAt))}
        ${kvRow("Last updated", fmtDate(detail.updatedAt))}
        ${kvRow("API key issued", detail.apiKeyPresent ? "Yes" : "No")}
      </table>
    </section>

    <section class="detail-section">
      <h3>Billing (Stripe)</h3>
      <table class="kv-table">${billingRows}</table>
    </section>

    ${
      detail.sandboxJob
        ? `<section class="detail-section"><h3>Dedicated stack job</h3><table class="kv-table">${jobRows}</table></section>`
        : ""
    }

    <section class="detail-section">
      <h3>Infrastructure</h3>
      <table class="kv-table">
        ${kvRow("Plan", u.plan)}
        ${kvRow("Pool", u.pool)}
        ${kvRow("Pool mode", detail.poolMode)}
        ${kvRow("Upload schema", detail.uploadSchema)}
        ${kvRow("Superset role", detail.supersetRoleName)}
        ${kvRow("MCP backend", detail.mcpBackendUrl)}
        ${kvRow("ECS service", detail.ecsServiceName)}
        ${kvRow("Cloud Map", detail.cloudMapUrl)}
      </table>
    </section>
  </aside>`;
}

function renderLogin(errorMsg?: string | null): void {
  const err = errorMsg
    ? `<p class="error" style="color:#b42318;margin-top:12px">${esc(errorMsg)}</p>`
    : "";
  const insecure = insecureLoginWarning();
  const warn = insecure
    ? `<p class="error" style="color:#b45309;margin-top:12px">${esc(insecure)}</p>`
    : "";
  app.innerHTML = `
    <div class="shell">
      <div class="panel login-panel">
        <h1>HoneyGold Admin</h1>
        <p>Sign in with Google or your Granola admin email and password.</p>
        ${warn}
        <button class="primary" id="login-btn" type="button">Continue with Google</button>
        <div class="login-divider">or</div>
        <form id="password-form" class="login-form">
          <label class="field">
            <span>Email</span>
            <input id="login-email" type="email" autocomplete="username" value="hello@granolaconsulting.com" />
          </label>
          <label class="field">
            <span>Password</span>
            <input id="login-password" type="password" autocomplete="current-password" />
          </label>
          <button class="primary" id="password-btn" type="submit">Sign in with password</button>
        </form>
        <button class="secondary" id="clear-state-btn" type="button">Clear sign-in state</button>
        ${err}
      </div>
    </div>`;
  document.getElementById("login-btn")?.addEventListener("click", () => {
    void startGoogleLogin().catch((e) => {
      renderLogin(e instanceof Error ? e.message : String(e));
    });
  });
  document.getElementById("password-form")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const email = (document.getElementById("login-email") as HTMLInputElement | null)?.value ?? "";
    const password = (document.getElementById("login-password") as HTMLInputElement | null)?.value ?? "";
    void signInWithPassword(email, password)
      .then(() => void boot())
      .catch((e) => {
        renderLogin(e instanceof Error ? e.message : String(e));
      });
  });
  document.getElementById("clear-state-btn")?.addEventListener("click", () => {
    clearAuthState();
    renderLogin("Sign-in state cleared.");
  });
}

type DeleteProgressState = Record<
  DeleteStepId,
  { status: "pending" | "running" | "done" | "error"; message?: string }
>;

type AppState = {
  users: AdminUser[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
  pendingAction: { type: "revoke" | "reactivate" | "delete"; user: AdminUser } | null;
  deleteConfirm: string;
  deleteProgress: DeleteProgressState | null;
  modalError: string | null;
  deleteInProgress: boolean;
  filter: UserFilter;
  selectedTenantId: string | null;
  detail: AdminUserDetail | null;
  detailLoading: boolean;
  autoRefresh: boolean;
};

let refreshTimer: ReturnType<typeof setInterval> | null = null;

const state: AppState = {
  users: [],
  nextCursor: null,
  loading: false,
  error: null,
  pendingAction: null,
  deleteConfirm: "",
  deleteProgress: null,
  modalError: null,
  deleteInProgress: false,
  filter: "all",
  selectedTenantId: null,
  detail: null,
  detailLoading: false,
  autoRefresh: true,
};

function initialDeleteProgress(): DeleteProgressState {
  return {
    dynamodb: { status: "pending" },
    secrets: { status: "pending" },
    superset: { status: "pending" },
    postgres: { status: "pending" },
    cognito: { status: "pending" },
  };
}

function renderDeleteProgress(): string {
  if (!state.deleteProgress) return "";
  const rows = DELETE_STEPS.map(({ id, label }) => {
    const row = state.deleteProgress![id];
    const icon =
      row.status === "done"
        ? "✓"
        : row.status === "running"
          ? "…"
          : row.status === "error"
            ? "✕"
            : "○";
    const cls = `delete-step delete-step-${row.status}`;
    const detail = row.message ? `<span class="meta">${esc(row.message)}</span>` : "";
    return `<li class="${cls}"><span class="delete-step-icon">${icon}</span><span>${esc(label)}</span>${detail}</li>`;
  }).join("");
  return `<ul class="delete-progress">${rows}</ul>`;
}

function visibleUsers(): AdminUser[] {
  return state.users.filter((u) => matchesFilter(u, state.filter));
}

function needsAutoRefresh(): boolean {
  if (!state.autoRefresh) return false;
  if (state.detailLoading) return true;
  if (state.selectedTenantId) {
    const u = state.users.find((x) => x.tenantId === state.selectedTenantId);
    if (u && (u.status === "PENDING" || u.status === "PROVISIONING" || u.stuck)) return true;
  }
  return state.users.some(
    (u) => u.status === "PENDING" || u.status === "PROVISIONING" || u.stuck,
  );
}

function scheduleAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (!needsAutoRefresh()) return;
  refreshTimer = setInterval(() => {
    void refreshAll(true);
  }, 10_000);
}

async function openDetail(tenantId: string): Promise<void> {
  state.selectedTenantId = tenantId;
  state.detailLoading = true;
  renderTable();
  try {
    state.detail = await getUserDetail(tenantId);
    const idx = state.users.findIndex((u) => u.tenantId === tenantId);
    if (idx >= 0 && state.detail?.user) {
      state.users[idx] = state.detail.user;
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err);
    state.detail = null;
  } finally {
    state.detailLoading = false;
    renderTable();
    scheduleAutoRefresh();
  }
}

async function refreshAll(resetList: boolean): Promise<void> {
  await loadUsers(resetList);
  if (state.selectedTenantId) {
    try {
      state.detail = await getUserDetail(state.selectedTenantId);
      const idx = state.users.findIndex((u) => u.tenantId === state.selectedTenantId);
      if (idx >= 0 && state.detail?.user) {
        state.users[idx] = state.detail.user;
      }
    } catch {
      /* keep prior detail */
    }
  }
  renderTable();
  scheduleAutoRefresh();
}

function renderTable(): void {
  const visible = visibleUsers();
  const stuckCount = state.users.filter((u) => u.stuck).length;
  const provCount = state.users.filter(
    (u) => u.status === "PENDING" || u.status === "PROVISIONING",
  ).length;

  const rows =
    visible.length === 0
      ? `<tr><td colspan="9" class="empty">No users match this filter.</td></tr>`
      : visible
          .map((user) => {
            const selected = state.selectedTenantId === user.tenantId ? "selected" : "";
            const stuckClass = user.stuck ? "stuck-row" : "";
            const action = user.revoked
              ? `<button class="secondary" data-action="reactivate" data-tenant="${esc(user.tenantId)}">Reactivate</button>`
              : `<button class="danger" data-action="revoke" data-tenant="${esc(user.tenantId)}">Revoke</button>`;
            return `<tr class="${user.revoked ? "revoked" : ""} ${stuckClass} ${selected}" data-tenant="${esc(user.tenantId)}" tabindex="0">
              <td>${esc(user.email ?? "—")}</td>
              <td><code>${esc(user.tenantId)}</code></td>
              <td>${esc(user.plan)}</td>
              <td>${progressMini(user)}</td>
              <td>${statusBadge(user)}</td>
              <td>${meterCell(user)}</td>
              <td class="hide-sm">${fmtDate(user.signedUpAt)}</td>
              <td class="hide-sm">${user.onboardingCompleted ? "Yes" : "No"}</td>
              <td class="actions-cell">${action}</td>
            </tr>`;
          })
          .join("");

  const modal = state.pendingAction
    ? `<div class="modal-backdrop" id="modal">
        <div class="panel modal">
          <h2>${
            state.pendingAction.type === "delete"
              ? "Delete user permanently?"
              : state.pendingAction.type === "revoke"
                ? "Revoke user?"
                : "Reactivate user?"
          }</h2>
          <p>${esc(state.pendingAction.user.email ?? state.pendingAction.user.tenantId)}</p>
          <p class="meta">${
            state.pendingAction.type === "delete"
              ? "Removes DynamoDB records, Postgres upload schema, secrets, and Cognito user. This cannot be undone."
              : state.pendingAction.type === "revoke"
                ? "MCP and API access will be blocked immediately."
                : "Access will be restored."
          }</p>
          ${
            state.pendingAction.type === "delete"
              ? `<label class="field"><span>Type tenant ID to confirm: <code>${esc(state.pendingAction.user.tenantId)}</code></span>
                 <input id="delete-confirm-input" type="text" autocomplete="off" value="${esc(state.deleteConfirm)}" ${state.deleteInProgress ? "disabled" : ""} /></label>`
              : ""
          }
          ${state.pendingAction.type === "delete" && state.deleteProgress ? renderDeleteProgress() : ""}
          ${state.modalError ? `<p class="error inline">${esc(state.modalError)}</p>` : ""}
          <div class="modal-actions">
            <button class="secondary" id="modal-cancel" type="button" ${state.deleteInProgress ? "disabled" : ""}>Cancel</button>
            <button class="${state.pendingAction.type === "reactivate" ? "primary" : "danger"}" id="modal-confirm" type="button" ${state.deleteInProgress || state.loading ? "disabled" : ""}>${state.deleteInProgress ? "Deleting…" : "Confirm"}</button>
          </div>
        </div>
      </div>`
    : "";

  app.innerHTML = `
    <div class="shell">
      <header class="top">
        <h1>HoneyGold Admin</h1>
        <div style="display:flex;align-items:center;gap:12px">
          ${getSignedInEmail() ? `<span class="meta">${esc(getSignedInEmail())}</span>` : ""}
          <button class="secondary" id="logout-btn" type="button">Sign out</button>
        </div>
      </header>
      <div class="layout-main">
        <div class="panel list-panel">
          <div class="toolbar">
            <button class="primary" id="refresh-btn" type="button" ${state.loading ? "disabled" : ""}>Refresh</button>
            ${state.nextCursor ? `<button class="secondary" id="more-btn" type="button" ${state.loading ? "disabled" : ""}>Load more</button>` : ""}
            <label class="auto-refresh">
              <input type="checkbox" id="auto-refresh" ${state.autoRefresh ? "checked" : ""} />
              Auto-refresh (10s)
            </label>
            <span class="meta">${visible.length} shown · ${state.users.length} loaded · ${stuckCount} stuck · ${provCount} provisioning</span>
          </div>
          <div class="filter-bar">
            ${(["all", "stuck", "provisioning", "onboarding", "active"] as UserFilter[])
              .map(
                (f) =>
                  `<button type="button" class="filter-chip ${state.filter === f ? "active" : ""}" data-filter="${f}">${esc(f)}</button>`,
              )
              .join("")}
          </div>
          ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Journey</th>
                  <th>Status</th>
                  <th>MCP</th>
                  <th class="hide-sm">Signed up</th>
                  <th class="hide-sm">Onboarded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        ${renderDetailPanel(state.detail, state.detailLoading)}
      </div>
    </div>
    ${modal}`;

  document.getElementById("logout-btn")?.addEventListener("click", () => logout());
  document.getElementById("refresh-btn")?.addEventListener("click", () => void refreshAll(true));
  document.getElementById("more-btn")?.addEventListener("click", () => void loadUsers(false));
  document.getElementById("auto-refresh")?.addEventListener("change", (ev) => {
    state.autoRefresh = (ev.target as HTMLInputElement).checked;
    scheduleAutoRefresh();
  });
  document.getElementById("detail-close")?.addEventListener("click", () => {
    state.selectedTenantId = null;
    state.detail = null;
    renderTable();
    scheduleAutoRefresh();
  });

  document.querySelectorAll("[data-filter]").forEach((el) => {
    el.addEventListener("click", () => {
      state.filter = (el as HTMLElement).dataset.filter as UserFilter;
      renderTable();
    });
  });

  app.querySelectorAll("tbody tr[data-tenant]").forEach((row) => {
    row.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement;
      if (target.closest("button")) return;
      const tenantId = (row as HTMLElement).dataset.tenant;
      if (tenantId) void openDetail(tenantId);
    });
    row.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        const tenantId = (row as HTMLElement).dataset.tenant;
        if (tenantId) void openDetail(tenantId);
      }
    });
  });

  app.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const tenantId = (el as HTMLElement).dataset.tenant;
      const action = (el as HTMLElement).dataset.action;
      const user = state.users.find((u) => u.tenantId === tenantId);
      if (!user || !action) return;
      state.pendingAction = {
        type: action === "revoke" ? "revoke" : action === "delete" ? "delete" : "reactivate",
        user,
      };
      state.deleteConfirm = "";
      state.deleteProgress = null;
      state.modalError = null;
      renderTable();
    });
  });
}

let modalHandlersBound = false;

function bindModal(): void {
  if (modalHandlersBound) return;
  modalHandlersBound = true;
  app.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement;
    if (target.id === "modal-cancel") {
      if (state.deleteInProgress) return;
      state.pendingAction = null;
      state.deleteConfirm = "";
      state.deleteProgress = null;
      state.modalError = null;
      renderTable();
      return;
    }
    if (target.id === "modal-confirm") {
      void confirmModal();
    }
  });
  app.addEventListener("input", (ev) => {
    const target = ev.target as HTMLInputElement;
    if (target.id === "delete-confirm-input") {
      state.deleteConfirm = target.value;
      state.modalError = null;
    }
  });
  app.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement;
    if (target.id === "modal") {
      if (state.deleteInProgress) return;
      state.pendingAction = null;
      state.deleteConfirm = "";
      state.deleteProgress = null;
      state.modalError = null;
      renderTable();
    }
  });
}

async function confirmModal(): Promise<void> {
  const action = state.pendingAction;
  if (!action || state.deleteInProgress) return;
  state.modalError = null;
  try {
    if (action.type === "revoke") {
      state.loading = true;
      renderTable();
      await revokeUser(action.user.tenantId);
      state.pendingAction = null;
      await refreshAll(true);
      return;
    }
    if (action.type === "reactivate") {
      state.loading = true;
      renderTable();
      await reactivateUser(action.user.tenantId);
      state.pendingAction = null;
      await refreshAll(true);
      return;
    }
    const confirmInput = document.getElementById("delete-confirm-input") as HTMLInputElement | null;
    const typed = (confirmInput?.value ?? state.deleteConfirm).trim();
    if (typed !== action.user.tenantId) {
      state.modalError = "Tenant ID confirmation does not match.";
      renderTable();
      return;
    }
    state.deleteInProgress = true;
    state.deleteProgress = initialDeleteProgress();
    state.autoRefresh = false;
    renderTable();
    const email = action.user.email ?? "";
    for (const step of DELETE_STEPS) {
      state.deleteProgress![step.id] = { status: "running" };
      renderTable();
      try {
        const resp = await deleteUserStep(action.user.tenantId, step.id, email);
        state.deleteProgress![step.id] = { status: "done", message: resp.message };
      } catch (stepErr) {
        const msg = stepErr instanceof Error ? stepErr.message : String(stepErr);
        state.deleteProgress![step.id] = { status: "error", message: msg };
        state.modalError = msg;
        state.deleteInProgress = false;
        state.autoRefresh = true;
        renderTable();
        return;
      }
    }
    if (state.selectedTenantId === action.user.tenantId) {
      state.selectedTenantId = null;
      state.detail = null;
    }
    state.pendingAction = null;
    state.deleteConfirm = "";
    state.deleteProgress = null;
    state.deleteInProgress = false;
    state.autoRefresh = true;
    await refreshAll(true);
  } catch (err) {
    state.modalError = err instanceof Error ? err.message : String(err);
    state.deleteInProgress = false;
    state.autoRefresh = true;
    renderTable();
  }
}

async function loadUsers(reset: boolean): Promise<void> {
  state.loading = true;
  state.error = null;
  if (reset) {
    state.users = [];
    state.nextCursor = null;
  }
  renderTable();
  let redirectToLogin = false;
  try {
    const resp = await listUsers(reset ? null : state.nextCursor);
    state.users = reset ? resp.users : [...state.users, ...resp.users];
    state.nextCursor = resp.nextCursor;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Not signed in") || message.toLowerCase().includes("unauthorized")) {
      redirectToLogin = true;
    } else if (message.includes("Not an admin account")) {
      const email = getSignedInEmail();
      state.error = email
        ? `Signed in as ${email}. Admin access requires a @granolaconsulting.com Google account.`
        : "Admin access requires a @granolaconsulting.com Google account.";
    } else {
      state.error = message;
    }
  } finally {
    state.loading = false;
    if (redirectToLogin) {
      renderLogin("Your session expired. Please sign in again.");
    } else {
      renderTable();
      scheduleAutoRefresh();
    }
  }
}

async function boot(): Promise<void> {
  if (redirectInsecureOriginToHttps()) {
    return;
  }
  bindModal();

  const oauthErr = await completeOAuthLogin();
  if (oauthErr) {
    renderLogin(oauthErr);
    return;
  }
  if (!getIdToken()) {
    renderLogin();
    return;
  }
  await refreshAll(true);
}

void boot();
