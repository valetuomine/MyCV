---
name: create-get-rest-api
description: 'Create a layered ASP.NET Core GET REST API with an interface, EF Core service, controller endpoint, DTO mapping, validation, exceptions, dependency injection, and focused tests. Use when adding a new read-only resource endpoint that should follow the MyCV architecture.'
argument-hint: '[resource name and lookup key, for example: candidate by public ID]'
user-invocable: true
---

# Create a GET REST API

Use this workflow for a new read-only endpoint in the MyCV solution. Preserve the existing project boundaries and naming conventions.

## Architecture

Implement the request through these layers:

1. `CV.LogicInterface/Dto/<Resource>Dto.cs` contains the response contract when one does not already exist.
2. `CV.LogicInterface/ServiceInterfaces/I<Resource>Service.cs` declares the use-case operation.
3. `CV.Logic/Services/<Resource>Service.cs` owns validation, data access, mapping, and domain/API exceptions.
4. `CV.Logic/Mappers/<Resource>Mapper.cs` maps the EF entity to the DTO when a mapping is needed.
5. `CV.WebApi/Controllers/<Resource>Controller.cs` exposes the HTTP GET endpoint and remains thin.
6. `CV.WebApi/Program.cs` registers the interface-to-service mapping with dependency injection.

First inspect a nearby resource implementation and follow its namespaces, brace style, registration lifetime, and exception handling.

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

Keep mapping explicit and do not expose persistence-only fields, navigation objects, or tracking state.

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
3. Verify the endpoint's happy path, empty identifier behavior, missing-resource behavior, and cancellation propagation where practical.
4. Confirm Swagger exposes `GET /api/<resource>/{resourceId}` and that the response is the DTO, not the EF entity.
5. Check that no controller or service returns tracked entities or leaks persistence-only fields.
