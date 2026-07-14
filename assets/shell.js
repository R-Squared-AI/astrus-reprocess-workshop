/* ============================================================================
   Astrus Reprocess Workshop — shared engine (Round 2)
   Renders a faithful, NON-interactive Salesforce Communication record page and
   exposes the helpers every concept reuses. Reality check: at this point NO
   extraction has run, so the only known facts are (a) which documents are new
   vs already-processed and (b) the LOB names. The underwriter curates the
   documents and chooses which lines a reprocess may re-run. No LOB Quotes, no
   submission-level fields, no extracted content.
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
      when: "Jul 13, 2026 · 9:14 AM",
      file: "Vehicle_Schedule_REVISED.xlsx"
    },
    // Only the LOB NAMES are known pre-extraction.
    lobs: [
      { id: "gl", label: "General Liability" },
      { id: "ca", label: "Commercial Auto" },
      { id: "wc", label: "Workers' Compensation" },
      { id: "xs", label: "Excess / Umbrella" }
    ],
    // isNew = arrived with this follow-up (knowable from the email, not extraction).
    files: [
      { name: "ACORD_125_Commercial_Application.pdf", type: "pdf", modified: "Jun 28, 2026", size: "1.2 MB", isNew: false },
      { name: "Vehicle_Schedule_2024.xlsx", type: "xlsx", modified: "Jun 28, 2026", size: "88 KB", isNew: false },
      { name: "GL_Loss_Runs_5yr.pdf", type: "pdf", modified: "Jun 28, 2026", size: "640 KB", isNew: false },
      { name: "WC_Experience_Mod.pdf", type: "pdf", modified: "Jun 28, 2026", size: "210 KB", isNew: false },
      { name: "Statement_of_Values.xlsx", type: "xlsx", modified: "Jul 9, 2026", size: "44 KB", isNew: false },
      { name: "Vehicle_Schedule_REVISED.xlsx", type: "xlsx", modified: "Jul 13, 2026", size: "91 KB", isNew: true }
    ]
  };

  const MOMENTS = [
    { key: "arrival", num: "01", label: "Follow-up" },
    { key: "files", num: "02", label: "Review files" },
    { key: "scope", num: "03", label: "Choose lines" },
    { key: "run", num: "04", label: "Reprocess" }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---- scope helpers ---------------------------------------------------- */
  // scope = { excludedDocs:Set, whole:bool, lob:Set }
  function newScope() {
    return { excludedDocs: new Set(), whole: false, lob: new Set() };
  }
  function includedDocs(scope) {
    return data.files.filter((f) => !scope.excludedDocs.has(f.name));
  }
  function effectiveLobs(scope) {
    // "entire submission" => every line; otherwise the chosen ones
    return scope.whole ? data.lobs.slice() : data.lobs.filter((l) => scope.lob.has(l.id));
  }
  function hasSelection(scope) {
    return scope.whole || scope.lob.size > 0;
  }

  /* ---- toast ------------------------------------------------------------ */
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

  /* ---- modal ------------------------------------------------------------ */
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

  /* ---- follow-up bell (D2) --------------------------------------------- */
  function bellAlertHTML() {
    return (
      '<div class="cc-alert cc-alert--bell">' +
      '<div class="cc-alert-ic">🔔</div>' +
      "<div><strong>Follow-up email received.</strong> A new attachment (<em>" +
      esc(data.followup.file) +
      "</em>) was linked to this Communication. <strong>Nothing was reprocessed automatically</strong> — your work is untouched. Review the files, then choose what a reprocess may re-run." +
      "</div></div>"
    );
  }

  /* ---- document picker (D1/D3) ----------------------------------------
     Every document is included by default (many fields are derived and depend
     on each other). Split into "new / not yet processed" and "already
     processed" so the underwriter can toggle off, e.g., last year's version
     when a newer one arrives. scope.excludedDocs holds the turned-off names. */
  function fileRow(f, scope) {
    const on = !scope.excludedDocs.has(f.name);
    return (
      '<div class="doc-row' +
      (on ? " is-in" : " is-out") +
      '">' +
      '<button class="doc-toggle sw sw--sm' +
      (on ? " on" : "") +
      '" data-doc="' +
      esc(f.name) +
      '" role="switch" aria-checked="' +
      on +
      '" aria-label="Include ' +
      esc(f.name) +
      '"></button>' +
      '<span class="file-ic file-ic--' +
      f.type +
      '">' +
      f.type.toUpperCase() +
      "</span>" +
      '<span class="doc-name">' +
      esc(f.name) +
      "</span>" +
      '<span class="doc-size">' +
      esc(f.size) +
      "</span>" +
      '<span class="doc-state">' +
      (on ? "Included" : "Excluded") +
      "</span>" +
      "</div>"
    );
  }
  function renderFiles(scope) {
    const news = data.files.filter((f) => f.isNew);
    const old = data.files.filter((f) => !f.isNew);
    const inCount = includedDocs(scope).length;
    function group(title, hint, arr) {
      if (!arr.length) return "";
      return (
        '<div class="doc-group"><div class="doc-group-head">' +
        title +
        ' <span class="doc-group-hint">' +
        hint +
        "</span></div>" +
        arr.map((f) => fileRow(f, scope)).join("") +
        "</div>"
      );
    }
    return (
      '<div class="docs-block">' +
      '<div class="docs-head"><strong>Documents on this Communication (' +
      data.files.length +
      ")</strong><span class=\"docs-count\">" +
      inCount +
      " of " +
      data.files.length +
      " included</span></div>" +
      group(
        "New — sent in with this follow-up",
        "not yet processed",
        news
      ) +
      group(
        "Already processed in this submission",
        "from the last run",
        old
      ) +
      '<p class="docs-foot">All documents are included by default. Turn one off to keep it out of the reprocess — for example, last year\'s vehicle schedule once a newer one arrives. Removing a file here doesn\'t delete it from Salesforce.</p>' +
      "</div>"
    );
  }

  /* ---- truthful run summary (no extraction) ---------------------------- */
  function computeRunSummary(scope) {
    const inDocs = includedDocs(scope);
    const excluded = data.files.length - inDocs.length;
    const willRun = effectiveLobs(scope);
    const locked = scope.whole ? [] : data.lobs.filter((l) => !scope.lob.has(l.id));
    const lines = [];
    lines.push({
      kind: "docs",
      text:
        "Re-reads " +
        inDocs.length +
        " of " +
        data.files.length +
        " documents" +
        (excluded ? " (" + excluded + " turned off)" : "") +
        "."
    });
    if (scope.whole) {
      lines.push({
        kind: "update",
        text: "Re-runs the entire submission — all " + data.lobs.length + " lines (" + data.lobs.map((l) => l.label).join(", ") + ")."
      });
    } else if (willRun.length) {
      lines.push({
        kind: "update",
        text: "Re-runs: " + willRun.map((l) => l.label).join(", ") + "."
      });
    }
    if (locked.length) {
      lines.push({
        kind: "lock",
        text: locked.map((l) => l.label).join(", ") + " — locked. Nothing on those lines changes."
      });
    }
    lines.push({
      kind: "safe",
      text: "No submission-level fields are pushed."
    });
    lines.push({
      kind: "protect",
      text: data.protectedField + " is protected — never overwritten by a reprocess."
    });
    return {
      lines: lines,
      selectedCount: willRun.length,
      total: data.lobs.length,
      whole: scope.whole,
      includedDocs: inDocs.length
    };
  }

  /* ---- reprocess (guard + confirm + toast) ----------------------------- */
  async function runReprocess(scope) {
    if (!hasSelection(scope)) {
      toast(
        "warning",
        "Choose what to update",
        "Pick at least one line, or choose “Reprocess the entire submission,” before you reprocess."
      );
      return false;
    }
    const willRun = effectiveLobs(scope);
    const inDocs = includedDocs(scope);
    const headline = scope.whole
      ? "Reprocess the entire submission?"
      : "Reprocess " + willRun.length + " of " + data.lobs.length + " lines?";
    const body =
      "<p>The AI engine re-reads the <strong>" +
      inDocs.length +
      " included document" +
      (inDocs.length === 1 ? "" : "s") +
      "</strong> and re-runs " +
      (scope.whole
        ? "<strong>every line</strong>"
        : "only <strong>" + esc(willRun.map((l) => l.label).join(", ")) + "</strong>") +
      ".</p>" +
      (scope.whole
        ? ""
        : "<p>Every other line stays <strong>locked</strong> — nothing on it changes.</p>") +
      "<p>No submission-level fields are pushed, and " +
      esc(data.protectedField) +
      " stays protected. <strong>This can’t be undone.</strong></p>";
    const ok = await confirmModal({
      title: headline,
      body: body,
      confirmLabel: scope.whole ? "Reprocess entire submission" : "Reprocess selected lines",
      cancelLabel: "Cancel",
      destructive: true
    });
    if (!ok) return false;
    toast(
      "success",
      "Reprocess initiated",
      "Sent to the AI engine. Only the lines you chose will change when processing completes."
    );
    return true;
  }

  /* ---- moment stepper --------------------------------------------------- */
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
  function sideCardsHTML() {
    // static right-column cards below the control center — realistic SF page
    return (
      '<section class="sf-card side-card"><header><span class="side-ic">🗂</span> Submission Update Logs (1)</header>' +
      '<div class="sf-card-body side-log">' +
      '<div class="side-log-row"><a>' + data.sul + "</a><span>Last Modified 7/13/2026 4:22 PM</span></div>" +
      '<div class="side-log-row muted">Submission #: <a>' + data.sub + "</a></div>" +
      "</div></section>" +
      '<section class="sf-card side-card"><header><span class="side-ic">📇</span> Activity</header>' +
      '<div class="sf-card-body side-activity"><div class="side-tabs"><span class="on">Log a Call</span><span>New Task</span><span>Email</span></div>' +
      '<div class="side-empty">No upcoming activities. To get things moving, add a task.</div></div></section>'
    );
  }

  function chromeHTML(conceptName) {
    const d = data;
    return (
      '<div class="proto-ribbon">' +
      "<span>Astrus prototype</span><span class=\"dot\">•</span>" +
      "<span><strong>" +
      esc(conceptName) +
      "</strong></span><span class=\"dot\">•</span>" +
      '<a href="../../index.html">← All concepts</a><span class="dot">•</span>' +
      "<span>Salesforce chrome is a non-clickable mock; only the AI Engine Status card responds.</span>" +
      "</div>" +
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
      '<span class="sf-iconbtn">✎</span>' +
      "</div>" +
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
      '<div class="sf-body">' +
      '<div class="sf-col-left">' +
      '<section class="sf-card"><header><span class="ic">▾</span> Details</header><div class="sf-card-body">' +
      '<div class="sf-fieldgrid">' +
      '<div class="sf-field"><div class="lbl">From Address</div><div class="val"><a>' + esc(d.from) + "</a></div></div>" +
      '<div class="sf-field"><div class="lbl">Owner</div><div class="val"><a>' + esc(d.owner) + "</a></div></div>" +
      '<div class="sf-field"><div class="lbl">To Address</div><div class="val"><a>' + esc(d.to) + "</a></div></div>" +
      '<div class="sf-field"><div class="lbl">Status</div><div class="val">Success</div></div>' +
      '<div class="sf-field"><div class="lbl">CC Address</div><div class="val">&nbsp;</div></div>' +
      '<div class="sf-field"><div class="lbl">Matching Message</div><div class="val">Submission processed successfully</div></div>' +
      '<div class="sf-field"><div class="lbl">BCC Address</div><div class="val">&nbsp;</div></div>' +
      '<div class="sf-field"><div class="lbl">Type</div><div class="val">Email</div></div>' +
      '<div class="sf-field full"><div class="lbl">Subject</div><div class="val">' + esc(d.subject) + "</div></div>" +
      '<div class="sf-field"><div class="lbl">Message Date</div><div class="val">' + esc(d.messageDate) + "</div></div>" +
      "</div></div></section>" +
      '<section class="sf-card"><header><span class="ic">▾</span> System Information</header><div class="sf-card-body">' +
      '<div class="sf-fieldgrid">' +
      '<div class="sf-field"><div class="lbl">Created By</div><div class="val"><a>' + esc(d.owner) + "</a>, 7/13/2026 3:37 PM</div></div>" +
      '<div class="sf-field"><div class="lbl">Last Modified By</div><div class="val"><a>Automated Process</a>, 7/13/2026 4:22 PM</div></div>' +
      '</div><p class="static-note">Details, System Information and the record header are a static mock of the live Salesforce page.</p></div></section>' +
      "</div>" +
      '<div class="sf-col-right">' +
      '<section class="cc" id="cc"><div class="cc-head">' +
      '<div class="cc-head-title"><span class="cc-bolt">⚡</span> Submissions AI Engine Status</div>' +
      '<span class="cc-badge-mount"></span>' +
      "</div>" +
      '<div class="cc-body" id="cc-body"></div>' +
      "</section>" +
      sideCardsHTML() +
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
      newScope: newScope,
      includedDocs: includedDocs,
      effectiveLobs: effectiveLobs,
      hasSelection: hasSelection,
      bellAlertHTML: bellAlertHTML,
      renderFiles: renderFiles,
      computeRunSummary: computeRunSummary,
      runReprocess: runReprocess,
      momentStepper: momentStepper
    };
    concept.render(mount, ctx);
    document.title = "Astrus Reprocess · " + conceptName;
  }

  window.ASTRUS = {
    data: data,
    MOMENTS: MOMENTS,
    esc: esc,
    toast: toast,
    confirmModal: confirmModal,
    newScope: newScope,
    boot: boot
  };
})();
