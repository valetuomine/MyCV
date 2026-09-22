# Service Patterns

## Service shape

Use the primary-constructor service shape already used in the solution:

```csharp
public class <Resource>Service(CvContext dataContext) : BaseService(dataContext), I<Resource>Service
{
    private readonly CvContext _dataContext = dataContext;
}
```

Validate direct service callers even when controllers or model binding perform related validation. Pass the cancellation token to every EF Core async operation. Keep query and business behavior in the service, not the controller.

## GET

Declare an asynchronous operation with a cancellation token:

```csharp
Task<<Resource>Dto> Get<Resource>(Guid resourceId, CancellationToken cancellationToken = default);
```

Use a more specific key type and method name for non-Guid lookups. Validate `Guid.Empty` with `BadRequestException`, use `AsNoTracking()` for reads, and throw `NotFoundException` when the row does not exist.

```csharp
var dbResource = await _dataContext.<DbSet>
    .AsNoTracking()
    .FirstOrDefaultAsync(resource => resource.Id == resourceId, cancellationToken);

return dbResource?.MapEntityToDto()
    ?? throw new NotFoundException($"<Resource> not found with Id: {resourceId}");
```

Do not return `null` for a missing required resource or over-fetch related data that the response does not require.

## POST

Service contract:

```csharp
Task<<Resource>Dto> Create<Resource>(Create<Resource>Request request, CancellationToken cancellationToken = default);
```

Service flow:

1. Validate required request fields.
2. Map the request with `request.MapRequestToEntity()`.
3. Call `AddAsync` and `SaveChangesAsync`, passing the cancellation token to both.
4. Map the saved entity to the response DTO and return it.

Do not accept or assign persistence-generated identifiers from a create request unless the domain requires it. Do not return the EF entity directly.

## PUT

Use PUT for full replacement. The request contains every replaceable field; nullable fields are explicitly cleared when sent as `null`.

```csharp
Task<<Resource>Dto> Update<Resource>(
    Guid resourceId,
    Update<Resource>Request request,
    CancellationToken cancellationToken = default);
```

1. Reject an invalid route identifier with `BadRequestException`.
2. Validate required request fields.
3. Load the tracked entity without `AsNoTracking()` and throw `NotFoundException` when absent.
4. Apply fields with `request.MapRequestToEntity(dbResource)` without replacing the entity or changing its identifier.
5. Set tracking fields such as `UpdatedAt`, save with the cancellation token, and map the result.

Do not silently treat a missing resource as an insert. Add PATCH only when partial updates are explicitly required.

## Mapping

Keep entity exposure behind explicit mapper methods:

```csharp
public static <Resource>Dto MapEntityToDto(this <Resource> dbResource)
{
    return new <Resource>Dto
    {
        // Copy only fields intentionally exposed by the API.
    };
}

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

The service remains responsible for validation, loading tracked entities, setting tracking fields, and saving. Never expose persistence-only fields, navigation objects, or tracking state.
