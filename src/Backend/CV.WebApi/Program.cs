using CV.DataAccess;
using CV.Logic.Services;
using CV.LogicInterface.ServiceInterfaces;
using CV.WebApi.Middleware;
using CV.WebApi.Swagger.Examples;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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

var tenantId = builder.Configuration["AzureAd:TenantId"];
var apiClientId = builder.Configuration["AzureAd:ApiClientId"];
var audience = builder.Configuration["AzureAd:Audience"];
if (string.IsNullOrWhiteSpace(audience))
{
    audience = apiClientId;
}

if (!builder.Environment.IsDevelopment()
    && (string.IsNullOrWhiteSpace(tenantId) || string.IsNullOrWhiteSpace(apiClientId)))
{
    throw new InvalidOperationException(
        "AzureAd:TenantId and AzureAd:ApiClientId must be configured outside Development.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        var authorityTenant = string.IsNullOrWhiteSpace(tenantId) ? "organizations" : tenantId;
        options.Authority = $"https://login.microsoftonline.com/{authorityTenant}/v2.0";
        options.Audience = audience ?? "missing-azure-ad-api-client-id";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            RoleClaimType = "roles"
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CvAdmin", policy =>
        policy.RequireAuthenticatedUser().RequireRole("CvAdmin"));

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

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
