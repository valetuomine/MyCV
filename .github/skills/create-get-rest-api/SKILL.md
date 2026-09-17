---
name: create-get-rest-api
description: 'Create a layered ASP.NET Core REST API with GET, POST, and PUT endpoints, interfaces, EF Core services, controller endpoints, DTO mapping, validation, exceptions, dependency injection, and focused tests. Use when adding a resource endpoint that should follow the MyCV architecture.'
argument-hint: '[resource name and lookup key, for example: candidate by public ID]'
user-invocable: true
---

# Create a REST API

Use this workflow for a new resource endpoint in the MyCV solution. Preserve the existing project boundaries and naming conventions.

## Architecture

Implement the request through these layers:

1. `CV.LogicInterface/Dto/<Resource>/<Resource>Dto.cs` contains the response contract when one does not already exist.
2. `CV.LogicInterface/Dto/<Resource>/Create<Resource>Request.cs` contains POST input fields when creation is supported.
3. `CV.LogicInterface/Dto/<Resource>/Update<Resource>Request.cs` contains PUT replacement fields when updates are supported.
4. `CV.LogicInterface/ServiceInterfaces/I<Resource>Service.cs` declares the use-case operations.
5. `CV.Logic/Services/<Resource>Service.cs` owns validation, data access, mapping, and domain/API exceptions.
6. `CV.Logic/Mappers/<Resource>Mapper.cs` maps the EF entity to and from DTOs when mapping is needed.
7. `CV.WebApi/Controllers/<Resource>Controller.cs` exposes the HTTP endpoints and remains thin.
8. `CV.WebApi/Program.cs` registers the interface-to-service mapping with dependency injection.

First inspect a nearby resource implementation and follow its namespaces, brace style, registration lifetime, and exception handling.

Keep each resource's DTO contracts together in a resource-specific folder under `CV.LogicInterface/Dto`. Use the namespace `CV.LogicInterface.Dto.<Resource>` for those contracts.

## Service Contract

Declare an asynchronous operation with a cancellation token:

```csharp
Task<<Resource>Dto> Get<Resource>(Guid resourceId, CancellationToken cancellationToken = default);
```

Use a more specific key type and method name when the endpoint is looked up by something other than a `Guid`. Document the operation and parameters when neighboring interfaces use XML documentation.

## Service Implementation

Use the primary-constructor service shape already used in the solution:

```csharp
public class <Resource>Service(CvContext dataContext) : BaseService(dataContext), I<Resource>Service
{
    private readonly CvContext _dataContext = dataContext;

    public async Task<<Resource>Dto> Get<Resource>(Guid resourceId, CancellationToken cancellationToken = default)
    {
        if (resourceId == Guid.Empty)
        {
            throw new BadRequestException($"Invalid <resource> ID: {resourceId}");
        }

        var dbResource = await _dataContext.<DbSet>
            .AsNoTracking()
            .FirstOrDefaultAsync(resource => resource.Id == resourceId, cancellationToken);

        return dbResource == null
            ? throw new NotFoundException($"<Resource> not found with Id: {resourceId}")
            : dbResource.MapEntityToDto();
    }
}
```

Rules:

- Validate direct service callers, even if the controller also validates or model binding rejects malformed input.
- Pass the request cancellation token into every EF Core async operation.
- Use `AsNoTracking()` for read-only queries.
- Throw the repository's `BadRequestException` for invalid identifiers and `NotFoundException` when no row exists. Do not return `null` for a missing required resource.
- Keep query and business behavior in the service, not in the controller.
- Include related data only when the response contract requires it; avoid accidental over-fetching.

For non-Guid keys, validate according to the key's domain rules and use the matching EF predicate.

## POST Create

When adding a create operation, follow the Profile implementation:

Service contract:

```csharp
Task<<Resource>Dto> Create<Resource>(Create<Resource>Request request, CancellationToken cancellationToken = default);
```

Service flow:

1. Validate required request fields in the service so direct service callers receive the same behavior as HTTP callers.
2. Map the request to a new entity with `request.MapRequestToEntity()`.
3. Call `AddAsync` with the request cancellation token, then call `SaveChangesAsync` with the same token.
4. Map the saved entity to the response DTO and return it. The database-generated `Id` is available after saving.

Do not accept or assign persistence-generated identifiers from a create request unless the domain explicitly requires it. Do not return the EF entity directly.

Controller endpoint:

```csharp
[HttpPost]
public async Task<ActionResult<<Resource>Dto>> Create<Resource>(
    Create<Resource>Request request,
    CancellationToken cancellationToken)
{
    var result = await resourceService.Create<Resource>(request, cancellationToken);
    return CreatedAtAction(nameof(Get<Resource>), new { resourceId = result.Id }, result);
}
```

Use `CreatedAtAction` so the response is `201 Created` and includes a `Location` for the GET endpoint. Ensure the route value name matches the GET action parameter.

When a resource bootstraps a related aggregate record, create both records in the bootstrap resource's service. For this CV application, `Profile` is created first and `Candidate` is created with `ProfileId` during the same POST and `SaveChangesAsync` operation. The UI does not POST Candidate directly. Candidate currently exposes GET only; later related resources can update Candidate with their generated IDs.

## PUT Replace

Use PUT for a full replacement of an existing resource, following the Profile implementation. The update request should contain every replaceable field; nullable fields are explicitly cleared when sent as `null`.

Service contract:

```csharp
Task<<Resource>Dto> Update<Resource>(
    Guid resourceId,
    Update<Resource>Request request,
    CancellationToken cancellationToken = default);
```

Service flow:

1. Reject `Guid.Empty` or another invalid route identifier with `BadRequestException`.
2. Validate required request fields.
3. Load the entity without `AsNoTracking()` so EF Core tracks the update. Throw `NotFoundException` when it does not exist.
4. Apply editable fields with `request.MapRequestToEntity(dbResource)`; do not replace the entity instance or modify its identifier.
5. Set tracking fields such as `UpdatedAt`, save with the cancellation token, and map the updated entity to the response DTO.

Controller endpoint:

```csharp
[HttpPut("{resourceId:guid}")]
public async Task<ActionResult<<Resource>Dto>> Update<Resource>(
    Guid resourceId,
    Update<Resource>Request request,
    CancellationToken cancellationToken)
{
    var result = await resourceService.Update<Resource>(resourceId, request, cancellationToken);
    return Ok(result);
}
```

Do not silently treat a missing resource as an insert. Keep PUT replacement semantics distinct from PATCH-style partial updates; add PATCH only when the API explicitly needs partial changes.

## Mapping

Add an extension mapper when an entity should not be exposed directly:

```csharp
public static <Resource>Dto MapEntityToDto(this <Resource> dbResource)
{
    return new <Resource>Dto
    {
        // Copy only fields intentionally exposed by the API.
    };
}
```

For write endpoints, keep request-to-entity assignments in the mapper as well. Use one method to create a new entity from a create request and one method to apply an update request to the tracked entity:

```csharp
public static <Resource> MapRequestToEntity(this Create<Resource>Request request)
{
    return new <Resource>
    {
        // Map editable request fields explicitly.
    };
}

public static void MapRequestToEntity(this Update<Resource>Request request, <Resource> dbResource)
{
    // Apply editable request fields explicitly.
}
```

The service should call these mapper methods and remain responsible for validation, loading tracked entities, setting tracking fields such as `UpdatedAt`, and saving changes. Keep mapping explicit and do not expose persistence-only fields, navigation objects, or tracking state.

## Controller

Use attribute routing and constructor injection:

```csharp
[Route("api/[controller]")]
[ApiController]
public class <Resource>Controller(I<Resource>Service resourceService) : ControllerBase
{
    [HttpGet("{resourceId}")]
    public async Task<ActionResult<<Resource>Dto>> Get<Resource>(
        Guid resourceId,
        CancellationToken cancellationToken)
    {
        var result = await resourceService.Get<Resource>(resourceId, cancellationToken);
        return Ok(result);
    }
}
```

Keep the controller responsible only for HTTP concerns: route binding, calling the service, and returning the successful response. Let the existing exception handler translate service exceptions into error responses.

Use route constraints or controller-level validation only when they match existing project conventions; do not duplicate service business rules unnecessarily.

## Dependency Injection

Register the service in `CV.WebApi/Program.cs` using the same lifetime as nearby services:

```csharp
builder.Services.AddTransient<I<Resource>Service, <Resource>Service>();
```

Use the solution's established lifetime rather than introducing a new one. Confirm the controller's interface and implementation namespaces resolve without new global usings.

## Verification

After implementation:

1. Build the solution or the affected projects.
2. Run focused tests if the repository has them.
3. Verify GET's happy path, empty identifier behavior, missing-resource behavior, and cancellation propagation where practical.
4. For POST, verify required-field validation, `201 Created`, the `Location` header, and the generated identifier in the response.
5. For PUT, verify invalid-identifier validation, required-field validation, missing-resource behavior, full replacement including nullable fields, `UpdatedAt`, and `200 OK`.
6. Confirm Swagger exposes the supported routes and that responses are DTOs, not EF entities.
7. Check that no controller or service returns tracked entities or leaks persistence-only fields.
