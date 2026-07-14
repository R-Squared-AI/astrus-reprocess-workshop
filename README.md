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
*drive* it. Round 1 = five genuinely different interaction models.

## The concepts

| # | Concept | Interaction model |
|---|---------|-------------------|
| 01 | **Checkbox Matrix** | The RFC mockup, polished — two checkbox columns + live "what this run will do" |
| 02 | **Control Deck** | One tactile card per line with a physical toggle switch |
| 03 | **Guided Review** | A wizard ending in an explicit change/stays/protected diff |
| 04 | **Smart Panel** | One glanceable surface — scope as chips, one sentence, one button |
| 05 | **Submission Timeline** | The submission's life story; control lives at the "now" point |

Each concept steps through the full journey: follow-up bell → square up files →
scope the reprocess → run & confirm.

## Notes

- The Salesforce page around each concept is a **faithful but non-clickable
  mock** — only the AI Engine Status card is interactive.
- Sample data is a real QA submission: **Cooper Engineering · SUB 022689**
  (General Liability · Commercial Auto · Workers' Comp · Excess).
- Static HTML/CSS/JS; no build step. `assets/` holds the shared Salesforce shell
  + control-center engine; each concept clones the shell and swaps only its
  scope-picker interaction.
