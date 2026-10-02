using CV.DataAccess;
using CV.Logic.Services;
using CV.LogicInterface.ServiceInterfaces;
using CV.WebApi.Middleware;
using CV.WebApi.Swagger.Examples;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using Swashbuckle.AspNetCore.Filters;

var builder = WebApplication.CreateBuilder(args);
var authenticationEnabled = builder.Configuration.GetValue("Authentication:Enabled", true);

// Controllers
builder.Services.AddControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

if (authenticationEnabled)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

    builder.Services.AddAuthorizationBuilder()
        .AddPolicy("CvAdmin", policy =>
            policy.RequireAuthenticatedUser().RequireRole("CvAdmin"));
}

builder.Services.AddDbContext<CvContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("CV"))
    .EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerExamplesFromAssemblyOf<CreateProfileRequestExample>();
builder.Services.AddSwaggerGen(options => options.ExampleFilters());

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(opt =>
    {
        opt.AddPolicy("AllowSpecificOrigin", builder =>
        {
            builder.WithOrigins("https://localhost:3000", "https://localhost:44343/")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });
}

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

if (authenticationEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();
}

app.MapControllers();

app.Run();
