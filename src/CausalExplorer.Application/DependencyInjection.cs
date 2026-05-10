using CausalExplorer.Application.Common.Behaviors;
using CausalExplorer.Application.Common.Options;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace CausalExplorer.Application;

/// <summary>
/// Provides an extension method to register all Application-layer services
/// with the dependency injection container.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers MediatR handlers, pipeline behaviors, FluentValidation validators,
    /// and AutoMapper profiles defined in the Application assembly.
    /// </summary>
    /// <param name="services">The service collection to configure.</param>
    /// <param name="configuration">Application configuration (used for options binding).</param>
    /// <returns>The configured <see cref="IServiceCollection"/>.</returns>
    public static IServiceCollection AddApplication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // Bind strongly-typed options
        services.Configure<SearchOptions>(
            configuration.GetSection("VectorSearch"));

        // MediatR — register all handlers + pipeline behaviors (order matters)
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);

            // Outer → inner (first registered = outermost wrapper)
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(UnhandledExceptionBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(PerformanceBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // FluentValidation — auto-discover all validators in assembly
        services.AddValidatorsFromAssembly(assembly);

        // Note: AutoMapper is excluded — all mapping is done via MappingExtensions.cs

        return services;
    }
}
