# Architecture

Implement requests through these layers, creating a file only when the operation needs it:

1. `CV.LogicInterface/Dto/<Resource>/<Resource>Dto.cs` contains the response contract.
2. `CV.LogicInterface/Dto/<Resource>/Create<Resource>Request.cs` contains POST input fields.
3. `CV.LogicInterface/Dto/<Resource>/Update<Resource>Request.cs` contains PUT replacement fields.
4. `CV.LogicInterface/ServiceInterfaces/I<Resource>Service.cs` declares use-case operations.
5. `CV.Logic/Services/<Resource>Service.cs` owns validation, data access, mapping, and domain/API exceptions.
6. `CV.Logic/Mappers/<Resource>Mapper.cs` maps entities and DTOs when mapping is needed.
7. `CV.WebApi/Controllers/<Resource>Controller.cs` exposes thin HTTP endpoints.
8. `CV.WebApi/Program.cs` registers the interface-to-service mapping.

Keep DTO contracts together under `CV.LogicInterface/Dto/<Resource>` and use the namespace `CV.LogicInterface.Dto.<Resource>`.

When creating DTOs, document every DTO class and property with concise XML `<summary>` documentation. Describe each property's API meaning, including whether an identifier is internal, public, related, required, or optional.

Use the solution's existing primary-constructor services, controller style, namespaces, brace style, and dependency injection lifetime. Do not introduce a new architectural pattern for one resource.
