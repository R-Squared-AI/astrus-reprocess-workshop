# Astrus · Underwriter-Controlled Reprocess — Concept Workshop

Interactive design concepts for the **underwriter-controlled reprocess + COM
file-linking** experience, built onto the **Submissions AI Engine Status** card
on the Salesforce Communication record.

**▶ Live gallery:** https://r-squared-ai.github.io/astrus-reprocess-workshop/

## What this is

A broker sends a revised vehicle schedule against an open deal. Today the AI
engine silently re-runs and overwrites the underwriter's work. This feature
stops that — files link to the Communication, a follow-up email rings a bell
instead of reprocessing, and the underwriter chooses exactly which lines a
reprocess may touch (premium and hand-entered data protected).

The engine logic is **already built** (RFC `reprocess_control_and_com_file_linking_rfc`
+ the Jul-13 underwriter workshop). These prototypes only explore how underwriters
*drive* it. Narrowed to **three options** — same flow and rules, three surfaces.

## The three options

| # | Option | Interaction model |
|---|--------|-------------------|
| 01 | **Option 1 · Checklist** | A clean, linear checklist — step through Upload → Review → Lines, tick lines, reprocess. The frontrunner. |
| 02 | **Option 2 · Timeline** | The submission's life story on a vertical rail; you act at the NOW point, past reprocesses stay logged as an audit record. |
| 03 | **Option 3 · Guided Rail** | Every step on one scrolling surface, tied together by a guided rail — nothing hidden behind a Next button. |

There is one flow — **Reprocess**. A submission already exists, new attachments
have landed on the Communication, and the underwriter steps through
**Upload → Review → Scope → Reprocess**. (The earlier "New submission" entry and
the Attachment-Driven concept were removed.)

Every option carries the same rules, drawn from the Jul workshop:

- **Gated entry** — the panel stays hidden behind one **"Reprocessing options"**
  button; nothing fires or expands until the underwriter opens it.
- **Upload** — drag-drop / browse, plus a **paste-text** box for tabular data that
  arrived in the email body (not as a file). New files sit on top; every file shows
  a **date received**.
- **Review** — toggle off only exact/older versions; turning a doc off **removes it
  from this run only** (the file stays on the record — nothing is deleted).
- **Scope** — **per-LOB and per-LOB-Quote** checkboxes. "Entire submission" requires
  an explicit **overwrite-confirm** checkbox. Unpicked lines stay locked and their
  hand-entered work is preserved.
- **Protected** — Estimated / Proposed Bound Premium is never overwritten.
- **Status** — color-coded per-line aggregation (green / amber / red).

## Notes

- The Salesforce page around each concept is a **faithful but non-clickable
  mock** — only the AI Engine Status card is interactive.
- Sample data is a real QA submission: **Cooper Engineering · SUB 022689**
  (General Liability · Commercial Auto · Workers' Comp · Excess).
- Static HTML/CSS/JS; no build step. `assets/` holds the shared Salesforce shell
  + control-center engine; each concept clones the shell and swaps only its
  scope-picker interaction.
