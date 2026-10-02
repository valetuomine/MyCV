# Controller Patterns

Use attribute routing, constructor injection, a private service field, and thin actions:

```csharp
[Route("api/[controller]")]
[ApiController]
public class <Resource>Controller(I<Resource>Service resourceService) : ControllerBase
{
    private readonly I<Resource>Service _resourceService = resourceService;

    [HttpGet("{resourceId:guid}")]
    public async Task<ActionResult<<Resource>Dto>> Get<Resource>(
        Guid resourceId,
        CancellationToken cancellationToken)
    {
        var result = await _resourceService.Get<Resource>(resourceId, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<<Resource>Dto>> Create<Resource>(
        Create<Resource>Request request,
        CancellationToken cancellationToken)
    {
        var result = await _resourceService.Create<Resource>(request, cancellationToken);
        return CreatedAtAction(nameof(Get<Resource>), new { resourceId = result.Id }, result);
    }

    [HttpPut("{resourceId:guid}")]
    public async Task<ActionResult<<Resource>Dto>> Update<Resource>(
        Guid resourceId,
        Update<Resource>Request request,
        CancellationToken cancellationToken)
    {
        var result = await _resourceService.Update<Resource>(resourceId, request, cancellationToken);
        return Ok(result);
    }
}
```

Use `CreatedAtAction` for POST so the response is `201 Created` with a `Location` header. Ensure the route value name matches the GET action parameter.

Use `204 No Content` after a successful DELETE. Keep controllers responsible only for route binding, calling the private service field, and returning successful HTTP responses. Let the existing exception handler translate service exceptions.

Use route constraints or controller validation only when they match existing project conventions. Do not duplicate service business rules unnecessarily.

## Swagger request examples

Add a typed example provider for every action that accepts a request body, and annotate the action with `SwaggerRequestExample`. Include realistic values that form a valid request, including all required languages for localized requests. Register the provider assembly and enable `ExampleFilters()` in `AddSwaggerGen` once in `Program.cs`:

```csharp
builder.Services.AddSwaggerExamplesFromAssemblyOf<CreateProfileRequestExample>();
builder.Services.AddSwaggerGen(options => options.ExampleFilters());
```

```csharp
[SwaggerRequestExample(typeof(CreateProfileRequest), typeof(CreateProfileRequestExample))]
[HttpPost]
public async Task<ActionResult<ResourceDto>> CreateResource(...)
```

Do not add request-body examples to GET or DELETE actions that have no request body.
