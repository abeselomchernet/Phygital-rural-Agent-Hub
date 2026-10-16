# F10 — Guided Demo and Presentation Polish

## Scope

F10 closes the frontend productization sequence with a bounded, presenter-friendly Stage-4 walkthrough. It does not add backend capability or operational authority.

## Implemented

- `/guided-demo` read-only presentation route inside the existing governed workspace shell;
- five explicit scenes: context, service composition, offline resilience, decision support and close;
- active PartnerFI/role/Hub/environment context derived from the authenticated workspace manifest;
- manual previous/next navigation only — no automatic transaction execution, provider calls, device commands or voice narration;
- desktop and 390px mobile screenshot/readability checks;
- governed role navigation entry for Agent, Supervisor, Operations and Partner Admin;
- removal of the obsolete unmounted `DemoPresenter.tsx` voice-tour implementation;
- removal of eight zero-byte `public/audio/scene_*.mp3` placeholders;
- claim-regression coverage migrated from the obsolete presenter to the new bounded Guided Demo.

## Why the obsolete presenter was removed

The old presenter contained historical claims about physical cash acceptance, cryptographic ledger entries, FMCG-backed ATM balances, automatic credit issuance and data-center settlement. It was not mounted, but retaining it made repository archaeology easy to confuse with current product intent. F10 removes it rather than attempting to sanitize and revive an obsolete interaction model.

## Authority boundary

Guided Demo is presentation only. It creates no provider activation, posting, settlement, real funds movement, regulated-pilot approval, production credential, device-control authority or geographic authorization. Stage 4 remains synthetic.

## Validation expectations

The F10 merge gate requires focused F10 tests, the complete unit/integration suite, focused and full Playwright, TypeScript/lint, production build, `git diff --check`, and exact-head hosted Linux CI.
