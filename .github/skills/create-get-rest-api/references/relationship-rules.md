# Candidate/Profile Relationships

These rules are specific to the CV application and should not be generalized to unrelated resources.

## Candidate ownership

Candidate is the relationship owner. Deleting a Candidate must delete every related row using IDs stored on Candidate, such as `ProfileId` and future `WorkHistoryId` values. Keep this cascade behavior in `CvContext` so every Candidate deletion follows the same rule.

## Profile deletion

Deleting a Profile must not delete Candidate. The Profile service must:

1. Find the Candidate whose `ProfileId` points to the profile.
2. Set that `ProfileId` to `null`.
3. Remove only the Profile.
4. Save both changes together.

## Profile creation

A Profile POST may accept an optional `CandidatePublicId`:

- When supplied, find the existing Candidate, verify `ProfileId` is `null`, attach the new Profile ID, and avoid creating a second Candidate.
- When omitted, create both a new Profile and Candidate in the Profile service and save them together.

The UI does not POST Candidate directly. Candidate currently exposes GET only; later related resources can update Candidate with their generated IDs.
