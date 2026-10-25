# Forms

Part of the `setup-frontend` skill. Read it before creating or changing a form or the profile edit mode.

- Create a Zod schema whenever creating a form. Keep the schema next to the form when it is local to that form, or in the form's feature folder when it is shared.
- Infer form input types from the Zod schema where practical so validation and TypeScript types stay aligned.
- Build forms with React Hook Form (`react-hook-form`) and `@hookform/resolvers/zod`. Wrap RHF-backed sections in `FormProvider` and make reusable inputs read state with `useFormContext`/`useWatch`, using typed field names.
- Keep profile content in its normal story layout for viewing. When `useCanEditProfile(profileId)` from `src/auth/useCanEditProfile.ts` returns `canEdit`, show one form-level Edit action; edit all fields together in a conventional form with Save and Cancel actions, not per-field edit buttons. Use React Hook Form and the Zod resolver to validate the full form before leaving edit mode, reset changes on Cancel, and render each validation message beneath its field with `aria-describedby`. Forward applicable native input attributes while keeping React Hook Form-controlled props internal. Save persists through `useUpdateProfileMutation`. `canEdit` only hides or shows controls; the API enforces who may edit.
