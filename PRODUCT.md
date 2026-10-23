# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who opens a candidate's public CV page (general public portfolio audience, confirmed). Typical visitors are likely recruiters and collaborators, but this was not narrowed down. The owner who edits their profile is a secondary audience and signs in with Microsoft or Google; Google sign-up is invite-only.

## Product Purpose

MyCV presents a candidate's CV as a shareable web page at `/<candidateId>`. It serves the owner's own CV now and is intended to grow into a multi-candidate site later (confirmed). Success means a visitor can understand who the candidate is and reach their GitHub and LinkedIn quickly.

## Positioning

Undecided. Not yet defined how this differs from LinkedIn or a PDF CV; the owner did not supply a mechanism beyond the shareable public-ID URL and Finnish/English content.

## Operating Context

- Public page loads a Candidate by ID, then that Candidate's Profile (name, title, location, summary, GitHub URL, LinkedIn URL, created/updated dates).
- Candidate is a hub that references related data (Profile now; work history and others later).
- Profile content has translations; Finnish (`fi`) is required, with a title.
- An "Edit profile" mode exists in the UI. Creating, editing and deleting require sign-in with Microsoft (Entra) or Google, and only the CV's owner or a `CvAdmin` (Microsoft only) may change it.
- Section-by-section CV navigation exists for the public candidate view.

## Capabilities and Constraints

- Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, react-hook-form with zod, RTK Query, Jotai; ASP.NET Core API with EF Core.
- Light and dark themes switchable by the user.
- Candidate ID appears in public URLs and is not a secret.
- Deployed to Azure Static Web Apps and App Service via Azure DevOps.
- Undecided: additional CV sections, language switching UX, multi-candidate onboarding beyond the Google invite list.

## Personal Data

What MyCV stores about people, beyond the public CV content itself:

- **Sign-in identities** (`CandidateLogin`): for each sign-in method linked to a CV, the provider (`entra` or `google`), the provider's tenant or issuer, and the user ID (Entra `oid`, Google `sub`). They are pseudonymous identifiers that tie a CV to an account, not credentials. They are never shown in the UI or returned by the API.
- **Last sign-in time** (`LastSignInAt`): updated when the owner opens their CV's admin view.
- **Google sign-up list** (`Authentication:Google:AllowedSignUpEmails`): invited email addresses, kept in app settings, not in the database or the repository. A Google sign-in's email address is only compared against this list and is not stored.
- **In the browser:** sign-in tokens stay in session storage for the tab (MSAL's cache and the Google ID token), and local storage holds only the theme, the last sign-in method and a post-sign-out flag.

Deleting a CV deletes its sign-in identities. Any public privacy notice must cover these items.

## Brand Commitments

None confirmed beyond the product name "MyCV".

## Evidence on Hand

No testimonials, case studies or project data exist in the repo; none may be fabricated. Real content comes from the Profile API only.

## Product Principles

- The candidate's content leads; the interface recedes.
- Every candidate gets a clean, fast, shareable page from a single public URL.
- Built to extend from one profile to many candidates and more CV sections without redesign.

## Accessibility & Inclusion

No specific standard stated. Existing code already respects reduced motion, focus-visible outlines and form ARIA; keep that baseline. Content is bilingual (Finnish required).
