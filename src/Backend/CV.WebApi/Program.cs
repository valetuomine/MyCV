using CV.DataAccess;
using CV.Logic.Services;
using CV.LogicInterface.ServiceInterfaces;
using CV.WebApi.Middleware;
using CV.WebApi.Swagger.Examples;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Filters;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

if (builder.Environment.IsDevelopment())
{
    allowedOrigins = [.. allowedOrigins
        .Append("http://localhost:3000")
        .Distinct(StringComparer.OrdinalIgnoreCase)];
}

// Controllers
builder.Services.AddControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod());
    });
}

builder.Services.AddDbContext<CvContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("CV"))
    .EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerExamplesFromAssemblyOf<CreateProfileRequestExample>();
builder.Services.AddSwaggerGen(options => options.ExampleFilters());

builder.Services.AddTransient<IProfileService, ProfileService>();
builder.Services.AddTransient<ICandidateService, CandidateService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseExceptionHandler();

if (allowedOrigins.Length > 0)
{
    app.UseCors("Frontend");
}

app.MapControllers();

app.Run();
