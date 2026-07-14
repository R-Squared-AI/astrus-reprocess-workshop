/* ============================================================================
   Astrus Reprocess Workshop — shared engine
   Renders the faithful (non-interactive) Salesforce chrome and exposes helpers
   every concept reuses: locked data, the 4-moment journey, the follow-up bell,
   the file square-up list, the live "what this run will do" summary, toasts and
   the reprocess confirm modal. Each concept owns ONLY its scope-picker UI.
   ============================================================================ */
(function () {
  "use strict";

  const data = {
    com: "COM-0022689",
    sub: "SUB 022689",
    sul: "SUL-3212",
    account: "Cooper Engineering",
    subject: "FW: 2026-2027 Cooper Engineering GL Auto WC XS Submission",
    from: "mlettieri@astrusins.com",
    to: "submissions-uat@astrusins.com",
    messageDate: "7/13/2026, 3:37 PM",
    underwriter: "Karen Rivara",
    latestEmail: "Jul 13, 2026 · 9:14 AM",
    owner: "Astrus AI Integration User",
    engine: {
      status: "Requires Review",
      stage: "complete",
      filesPrep: "5 / 5",
      filesExt: "5 / 5",
      started: "7/13/2026, 4:06:50 PM",
      lastProgress: "7/13/2026, 4:10:13 PM",
      completed: "7/13/2026, 4:22:32 PM"
    },
    protectedField: "Estimated / Proposed Bound Premium",
    followup: {
      line: "Commercial Auto",
      desc: "The broker emailed a revised vehicle schedule against the existing deal.",
      when: "Jul 13, 2026 · 9:14 AM",
      file: "Vehicle_Schedule_REVISED.xlsx"
    },
    lobs: [
      {
        id: "gl",
        label: "General Liability",
        ctx: "Gross receipts · classes reviewed",
        changed: false,
        exposure: "Gross receipts $12.4M",
        loss: "5-yr loss runs present"
      },
      {
        id: "ca",
        label: "Commercial Auto",
        ctx: "27 vehicles · new schedule arrived",
        changed: true,
        exposure: "27 power units",
        loss: "Loss history present"
      },
      {
        id: "wc",
        label: "Workers' Compensation",
        ctx: "Payroll by class · Indiana class corrected by Pat",
        changed: false,
        exposure: "Payroll $4.9M",
        loss: "Experience mod on file"
      },
      {
        id: "xs",
        label: "Excess / Umbrella",
        ctx: "Underlying policies entered",
        changed: false,
        exposure: "Underlying limits entered",
        loss: "—"
      }
    ],
    files: [
      { name: "ACORD_125_Commercial_Application.pdf", type: "pdf", owner: "Nate Shilling", modified: "Jun 28, 2026", size: "1.2 MB" },
      { name: "Vehicle_Schedule_2024.xlsx", type: "xlsx", owner: "Nate Shilling", modified: "Jun 28, 2026", size: "88 KB", superseded: true },
      { name: "Vehicle_Schedule_REVISED.xlsx", type: "xlsx", owner: "Nate Shilling", modified: "Jul 13, 2026", size: "91 KB", isNew: true },
      { name: "GL_Loss_Runs_5yr.pdf", type: "pdf", owner: "Nate Shilling", modified: "Jun 28, 2026", size: "640 KB" },
      { name: "WC_Experience_Mod.pdf", type: "pdf", owner: "Nate Shilling", modified: "Jun 28, 2026", size: "210 KB" },
      { name: "Statement_of_Values.xlsx", type: "xlsx", owner: "Nate Shilling", modified: "Jul 9, 2026", size: "44 KB" }
    ]
  };

  const MOMENTS = [
    { key: "arrival", num: "01", label: "Follow-up arrived" },
    { key: "files", num: "02", label: "Square up files" },
    { key: "scope", num: "03", label: "Scope the reprocess" },
    { key: "run", num: "04", label: "Run & confirm" }
  ];

  /* ---- tiny utils ------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(variant, title, message, ms) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const t = document.createElement("div");
    t.className = "toast toast--" + variant;
    t.innerHTML =
      '<div class="ic" aria-hidden="true">' +
      (variant === "success" ? "✓" : variant === "warning" ? "⚠" : "✕") +
      "</div><div><strong>" +
      esc(title) +
      "</strong><span>" +
      esc(message) +
      '</span></div><div class="x" role="button" aria-label="Close">✕</div>';
    t.querySelector(".x").onclick = () => t.remove();
    wrap.appendChild(t);
    setTimeout(() => t.remove(), ms || 5200);
  }

  function confirmModal(opts) {
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "modal-backdrop";
      back.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-label="' +
        esc(opts.title) +
        '"><header>' +
        esc(opts.title) +
        '</header><div class="modal-body">' +
        opts.body +
        '</div><footer><button class="slds-btn" data-x="cancel">' +
        esc(opts.cancelLabel || "Cancel") +
        '</button><button class="slds-btn ' +
        (opts.destructive ? "slds-btn--destructive" : "slds-btn--brand") +
        '" data-x="ok">' +
        esc(opts.confirmLabel || "Confirm") +
        "</button></footer></div>";
      function close(v) {
        back.remove();
        document.removeEventListener("keydown", onKey);
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") close(false);
      }
      back.querySelector('[data-x="cancel"]').onclick = () => close(false);
      back.querySelector('[data-x="ok"]').onclick = () => close(true);
      back.onclick = (e) => {
        if (e.target === back) close(false);
      };
      document.addEventListener("keydown", onKey);
      document.body.appendChild(back);
      back.querySelector('[data-x="ok"]').focus();
    });
  }

  /* ---- the follow-up bell / "nothing was reprocessed" alert (D2) -------- */
  function bellAlertHTML() {
    return (
      '<div class="cc-alert cc-alert--bell">' +
      '<div class="cc-alert-ic">🔔</div>' +
      "<div><strong>Follow-up email received on " +
      esc(data.com) +
      ".</strong> Its attachment (<em>" +
      esc(data.followup.file) +
      "</em>) was added to the files below. <strong>Nothing was reprocessed automatically</strong> — your work is untouched. Review the files, then reprocess when you're ready." +
      "</div></div>"
    );
  }

  /* ---- file square-up list (D1 / D3 / D4) ------------------------------ */
  // state.removed = Set of file names the underwriter unlinked
  function renderFiles(state) {
    const rows = data.files
      .filter((f) => !state.removed.has(f.name))
      .map((f) => {
        const tag = f.isNew
          ? '<span class="file-tag file-tag--new">New</span>'
          : f.superseded
          ? '<span class="file-tag file-tag--old">Superseded?</span>'
          : "";
        return (
          '<tr class="' +
          (f.superseded ? "row-old" : f.isNew ? "row-new" : "") +
          '">' +
          '<td class="file-name"><span class="file-ic file-ic--' +
          f.type +
          '">' +
          f.type.toUpperCase() +
          "</span><a>" +
          esc(f.name) +
          "</a>" +
          tag +
          "</td>" +
          "<td>" +
          esc(f.modified) +
          "</td><td>" +
          esc(f.size) +
          "</td>" +
          '<td class="file-act"><button class="file-remove slds-btn slds-btn--sm" data-file="' +
          esc(f.name) +
          '">Remove from record</button></td>' +
          "</tr>"
        );
      })
      .join("");
    const count = data.files.length - state.removed.size;
    return (
      '<div class="files-block">' +
      '<div class="files-head"><strong>Files (' +
      count +
      ")</strong> on this Communication " +
      '<span class="files-sub">— emailed and unzipped files now live here, not just on the email (D1).</span></div>' +
      '<table class="files-table"><thead><tr><th>Title</th><th>Last Modified</th><th>Size</th><th></th></tr></thead><tbody>' +
      rows +
      "</tbody></table>" +
      '<p class="files-foot">A non-admin can <strong>Remove from record</strong> (unlinks, keeps the file in Salesforce) but cannot permanently delete an intake file — a trigger blocks that so documents can\'t be lost by accident (D4).</p>' +
      "</div>"
    );
  }

  /* ---- live "what this run will do" (mirrors the real LWC getter) ------- */
  // scope: { lob: Set(ids), quote: Set(ids), removed: Set(names) }
  function computeRunSummary(scope) {
    const selected = data.lobs.filter((l) => scope.lob.has(l.id));
    const unselected = data.lobs.filter((l) => !scope.lob.has(l.id));
    const quotes = data.lobs.filter((l) => scope.quote.has(l.id));
    const lines = [];
    selected.forEach((l) =>
      lines.push({
        kind: "update",
        text:
          l.label +
          " — exposures, schedules, rates and loss history refreshed from the documents on this Communication."
      })
    );
    if (unselected.length) {
      lines.push({
        kind: "safe",
        text:
          unselected.map((l) => l.label).join(", ") +
          " — left exactly as they are (any hand-entered data is safe)."
      });
    }
    if (quotes.length) {
      lines.push({
        kind: "update",
        text: "LOB Quote program design updated for: " + quotes.map((l) => l.label).join(", ") + "."
      });
    } else {
      lines.push({
        kind: "safe",
        text: "No LOB Quotes — your program design, coverages, amendments and exclusions are untouched."
      });
    }
    lines.push({
      kind: "lock",
      text: data.protectedField + " is never overwritten by a reprocess — it stays exactly as you set it."
    });
    return { lines: lines, selectedCount: selected.length, quoteCount: quotes.length, total: data.lobs.length };
  }

  /* ---- the reprocess confirm + run (D6 guard + toast) ------------------ */
  async function runReprocess(scope) {
    const selCount = scope.lob.size;
    const qCount = scope.quote.size;
    if (selCount === 0 && qCount === 0) {
      toast(
        "warning",
        "Nothing selected",
        "Turn on at least one line before reprocessing, or use Process as New to rebuild everything."
      );
      return false;
    }
    const sel = data.lobs.filter((l) => scope.lob.has(l.id)).map((l) => l.label);
    const body =
      "<p>The AI engine re-reads <strong>every file</strong> on this Communication, but Salesforce updates <strong>only the " +
      selCount +
      " line" +
      (selCount === 1 ? "" : "s") +
      " you turned on</strong>:</p><p style=\"margin:8px 0;font-weight:600;color:#181818\">" +
      esc(sel.join(", ") || "—") +
      "</p><p>Every other line — and all its exposures, schedules, rates and loss history — is left exactly as it is. <strong>This can't be undone.</strong></p>";
    const ok = await confirmModal({
      title: "Reprocess " + selCount + " of " + data.lobs.length + " lines?",
      body: body,
      confirmLabel: "Reprocess selected lines",
      cancelLabel: "Cancel",
      destructive: true
    });
    if (!ok) return false;
    toast(
      "success",
      "Reprocess initiated",
      "Sent to the AI engine. Only the lines you selected will change when processing completes."
    );
    return true;
  }

  /* ---- moment stepper (concepts may use or ignore) --------------------- */
  function momentStepper(current, onNav) {
    const bar = document.createElement("div");
    bar.className = "cc-stepper";
    bar.setAttribute("role", "tablist");
    MOMENTS.forEach((m, i) => {
      const b = document.createElement("button");
      b.className = "cc-step" + (i === current ? " is-current" : "") + (i < current ? " is-done" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === current ? "true" : "false");
      b.innerHTML =
        '<span class="cc-step-num">' +
        (i < current ? "✓" : m.num) +
        '</span><span class="cc-step-label">' +
        m.label +
        "</span>";
      b.onclick = () => onNav(i);
      bar.appendChild(b);
    });
    return bar;
  }

  /* ---- static Salesforce chrome ---------------------------------------- */
  function chromeHTML(conceptName) {
    const d = data;
    return (
      // prototype ribbon
      '<div class="proto-ribbon">' +
      "<span>Astrus · Underwriter-Controlled Reprocess — interactive concept</span><span class=\"dot\">•</span>" +
      "<span><strong>" +
      esc(conceptName) +
      "</strong></span><span class=\"dot\">•</span>" +
      '<a href="../../index.html">← All concepts</a><span class="dot">•</span>' +
      "<span>Salesforce chrome is a non-clickable mock; only the AI Engine Status card responds.</span>" +
      "</div>" +
      // global nav
      '<div class="sf-globalnav">' +
      '<div class="sf-waffle"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<span class="sf-appname">Astrus</span>' +
      '<nav class="sf-tabs">' +
      '<span class="sf-tab">Home</span>' +
      '<span class="sf-tab active">Astrus Submissions Commu… <span class="caret">▾</span></span>' +
      '<span class="sf-tab">Astrus Submissions <span class="caret">▾</span></span>' +
      '<span class="sf-tab">Astrus Submission Update … <span class="caret">▾</span></span>' +
      '<span class="sf-tab">Reports <span class="caret">▾</span></span>' +
      '<span class="sf-tab">Dashboards <span class="caret">▾</span></span>' +
      '<span class="sf-tab">Astrus Brokers <span class="caret">▾</span></span>' +
      '<span class="sf-tab">More <span class="caret">▾</span></span>' +
      "</nav>" +
      '<div class="sf-search">🔎 Search…</div>' +
      '<span class="sf-iconbtn">🔔<span class="bell-dot"></span></span>' +
      "</div>" +
      // record head
      '<div class="sf-record-head">' +
      '<div class="sf-record-topline">' +
      '<div class="sf-record-icon">✉</div>' +
      "<div>" +
      '<div class="sf-record-eyebrow">Submission Communication</div>' +
      '<h1 class="sf-record-title">' +
      esc(d.com) +
      "</h1></div>" +
      '<div class="sf-record-actions">' +
      '<button class="slds-btn" tabindex="-1">Edit</button>' +
      '<button class="slds-btn" tabindex="-1">Change Owner</button>' +
      "</div></div>" +
      '<dl class="sf-highlights">' +
      '<div class="sf-hl"><dt>Related Submission</dt><dd><a>' + esc(d.sub) + "</a></dd></div>" +
      '<div class="sf-hl"><dt>Status</dt><dd><span class="slds-badge badge-success">Success</span></dd></div>' +
      '<div class="sf-hl"><dt>Assigned Underwriter</dt><dd>' + esc(d.underwriter) + "</dd></div>" +
      '<div class="sf-hl"><dt>Latest Email</dt><dd>' + esc(d.latestEmail) + "</dd></div>" +
      '<div class="sf-hl"><dt>Files</dt><dd>' + d.files.length + "</dd></div>" +
      "</dl>" +
      '<div class="sf-subnav"><span class="item active">Details</span><span class="item">Related</span><span class="item">Emails</span></div>' +
      "</div>" +
      // body
      '<div class="sf-body">' +
      // LEFT static chrome
      '<div class="sf-col-left">' +
      '<section class="sf-card"><header><span class="ic">▾</span> Details</header><div class="sf-card-body">' +
      '<div class="sf-fieldgrid">' +
      '<div class="sf-field"><div class="lbl">From Address</div><div class="val"><a>' + esc(d.from) + "</a></div></div>" +
      '<div class="sf-field"><div class="lbl">Owner</div><div class="val"><a>' + esc(d.owner) + "</a></div></div>" +
      '<div class="sf-field"><div class="lbl">To Address</div><div class="val"><a>' + esc(d.to) + "</a></div></div>" +
      '<div class="sf-field"><div class="lbl">Status</div><div class="val">Success</div></div>' +
      '<div class="sf-field full"><div class="lbl">Subject</div><div class="val">' + esc(d.subject) + "</div></div>" +
      '<div class="sf-field"><div class="lbl">Message Date</div><div class="val">' + esc(d.messageDate) + "</div></div>" +
      '<div class="sf-field"><div class="lbl">Type</div><div class="val">Email</div></div>' +
      '<div class="sf-field full"><div class="lbl">Matching Message</div><div class="val">Submission processed successfully</div></div>' +
      "</div></div></section>" +
      '<section class="sf-card"><header><span class="ic">▾</span> System Information</header><div class="sf-card-body">' +
      '<div class="sf-fieldgrid">' +
      '<div class="sf-field"><div class="lbl">Created By</div><div class="val"><a>' + esc(d.owner) + "</a>, 7/13/2026 3:37 PM</div></div>" +
      '<div class="sf-field"><div class="lbl">Last Modified By</div><div class="val"><a>Automated Process</a>, 7/13/2026 4:22 PM</div></div>' +
      '</div><p class="static-note">Details, System Information and the record header are a static mock of the live Salesforce page.</p></div></section>' +
      "</div>" +
      // RIGHT interactive control center
      '<div class="sf-col-right">' +
      '<section class="cc" id="cc"><div class="cc-head">' +
      '<div class="cc-head-title"><span class="cc-bolt">⚡</span> Submissions AI Engine Status</div>' +
      '<span class="cc-badge-mount"></span>' +
      "</div>" +
      '<div class="cc-body" id="cc-body"></div>' +
      "</section>" +
      "</div>" +
      "</div>"
    );
  }

  function boot(concept) {
    const conceptName = concept.name || "Concept";
    document.body.innerHTML = chromeHTML(conceptName);
    const mount = document.getElementById("cc-body");
    const ctx = {
      data: data,
      MOMENTS: MOMENTS,
      esc: esc,
      toast: toast,
      confirmModal: confirmModal,
      bellAlertHTML: bellAlertHTML,
      renderFiles: renderFiles,
      computeRunSummary: computeRunSummary,
      runReprocess: runReprocess,
      momentStepper: momentStepper
    };
    concept.render(mount, ctx);
    document.title = "Astrus Reprocess · " + conceptName;
  }

  window.ASTRUS = { data: data, MOMENTS: MOMENTS, esc: esc, toast: toast, confirmModal: confirmModal, boot: boot };
})();
