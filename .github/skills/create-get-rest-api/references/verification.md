# Verification

1. Build the affected projects and run focused tests.
2. Test GET: success, empty ID, missing resource, and cancellation.
3. Test POST: validation, `201 Created`, `Location`, and generated ID.
4. Test PUT: validation, missing resource, full replacement, nullable fields, `UpdatedAt`, and `200 OK`.
5. Check Swagger routes, DTO-only responses, no tracked-entity or persistence-field leaks, project style, and valid skill links.
