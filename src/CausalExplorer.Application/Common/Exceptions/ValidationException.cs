namespace CausalExplorer.Application.Common.Exceptions;

/// <summary>
/// Thrown when one or more FluentValidation rules fail during pipeline execution.
/// </summary>
public sealed class ValidationException : Exception
{
    /// <summary>
    /// Gets a dictionary mapping property names to their associated validation error messages.
    /// </summary>
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    /// <summary>
    /// Initialises a new <see cref="ValidationException"/> from a collection of
    /// FluentValidation failures.
    /// </summary>
    /// <param name="failures">The validation failures reported by FluentValidation.</param>
    public ValidationException(IEnumerable<FluentValidation.Results.ValidationFailure> failures)
        : base("One or more validation failures have occurred.")
    {
        Errors = failures
            .GroupBy(f => f.PropertyName, f => f.ErrorMessage)
            .ToDictionary(g => g.Key, g => g.ToArray());
    }
}
