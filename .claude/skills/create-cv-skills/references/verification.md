# Verification

1. Build the affected projects and run focused tests.
2. Test GET: success, empty ID, missing resource, and cancellation.
3. Test POST: validation, `201 Created`, `Location`, and generated ID.
4. Test PUT: validation, missing resource, full replacement, nullable fields, `UpdatedAt`, and `200 OK`.
5. Test Candidate lookup by `Id`; test profile creation returns the associated `candidateId`.
6. Verify the public profile client route is `/:candidateId`, does Candidate lookup before Profile-ID lookup, and does not add `/:candidateId/profile`.
7. Verify Profile POST/PUT RTK Query mutations use generated request/response types and refresh affected profile queries.
8. For entity/configuration changes, verify a migration and model snapshot are generated; inspect destructive operations and rollback behavior.
9. Check Swagger routes, DTO-only responses, no tracked-entity or persistence-field leaks, project style, and valid skill links.
