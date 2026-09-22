---
name: create-get-rest-api
description: 'Create a layered ASP.NET Core REST API with GET, POST, and PUT endpoints, interfaces, EF Core services, controller endpoints, DTO mapping, validation, exceptions, dependency injection, and focused tests. Use when adding a resource endpoint that should follow the MyCV architecture.'
argument-hint: '[resource name and lookup key, for example: candidate by public ID]'
user-invocable: true
---

# Create a REST API

Use this workflow when adding a resource endpoint to MyCV. Preserve the existing project boundaries, naming conventions, and nearby implementation patterns.

## Workflow

1. Inspect a nearby resource implementation before editing. Match its namespaces, brace style, constructor pattern, registration lifetime, and exception handling.
2. Read [architecture.md](references/architecture.md) and create only the layers required by the endpoint.
3. Implement the service contract and service behavior using [service-patterns.md](references/service-patterns.md).
4. Add DTO/entity mapping using the mapping guidance in [service-patterns.md](references/service-patterns.md).
5. Add thin controller actions using [controller-patterns.md](references/controller-patterns.md).
6. Apply [relationship-rules.md](references/relationship-rules.md) when the resource participates in the Candidate/Profile aggregate.
7. Register the service in `CV.WebApi/Program.cs` using the established lifetime.
8. Follow [verification.md](references/verification.md) before finishing.

## Scope

This skill covers the common GET, POST, and PUT resource workflow. Use the focused references for implementation details rather than duplicating those rules here. Keep application-specific relationship behavior isolated from general REST guidance.
