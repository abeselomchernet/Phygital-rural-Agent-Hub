## Description

Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context.

**Jira/Ticket ID:** `SOV-[number]`

## Type of Change

Please delete options that are not relevant.

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] 🏗️ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] ♻️ Refactor (code restructuring without changing functionality)
- [ ] 📝 Documentation Update

## Phygital Architecture Checklist
This project bridges edge networking and offline nodes. Before requesting a review, confirm the following:

- [ ] My code follows the localized style guidelines (English, Amharic, Oromiffa).
- [ ] I have verified this UI behaves safely in 100% Offline environments (GhostSync friendly).
- [ ] I have executed `npm run lint` and resolved all TS/strict exceptions.
- [ ] I have executed `npm run test:e2e` and passes the Express-SPA proxy smoke test.
- [ ] (If infrastructure changes made) I have tested `docker-compose build` locally.

## Screenshots (If UI changes made)
_Please attach screenshots or screen recordings of the Kiosk/Supervisor tablet views._
