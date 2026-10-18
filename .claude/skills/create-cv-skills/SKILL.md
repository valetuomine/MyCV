---
name: create-cv-skills
description: 'Create or change a MyCV layered ASP.NET Core REST API and its React client integration. Use when implementing Candidate/Profile APIs, public candidate-ID routes, DTO mapping, validation, EF Core services, RTK Query fetching, Jotai UI state, or updating this project architecture.'
argument-hint: '[resource name and lookup key, for example: candidate by public ID]'
user-invocable: true
---

# Create a REST API

Use this workflow when adding or changing a MyCV resource endpoint or the frontend integration that consumes it. Preserve the existing project boundaries, naming conventions, and nearby implementation patterns.

## Workflow

1. Inspect a nearby resource implementation before editing. Match its namespaces, brace style, constructor pattern, registration lifetime, and exception handling.
2. Read [architecture.md](references/architecture.md) and create only the layers required by the endpoint.
3. Implement the service contract and service behavior using [service-patterns.md](references/service-patterns.md).
4. Add DTO/entity mapping using the mapping guidance in [service-patterns.md](references/service-patterns.md).
5. Add thin controller actions using [controller-patterns.md](references/controller-patterns.md). For every action with a request body, add a typed Swagger request example and register its provider; body-less actions do not need request examples.
6. Apply [relationship-rules.md](references/relationship-rules.md) when the resource participates in the Candidate/Profile aggregate.
7. Register the service in `CV.WebApi/Program.cs` using the established lifetime.
8. When changing an EF entity or configuration, scaffold a new migration and keep the model snapshot current; do not apply production migrations automatically.
9. For frontend work tied to the endpoint, follow [frontend-patterns.md](references/frontend-patterns.md).
10. Follow [verification.md](references/verification.md) before finishing.

## Scope

This skill covers the common GET, POST, PUT, and DELETE resource workflow. Use the focused references for implementation details rather than duplicating those rules here. Keep application-specific relationship behavior isolated from general REST guidance.
