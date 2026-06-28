using FluentValidation;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Validates <see cref="UpdateCasualEdgeCommand"/>.</summary>
public sealed class UpdateCasualEdgeCommandValidator : AbstractValidator<UpdateCasualEdgeCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public UpdateCasualEdgeCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("Edge ID is required.");

        RuleFor(x => x.Explanation)
            .MaximumLength(2000).When(x => x.Explanation is not null)
            .WithMessage("Explanation must not exceed 2000 characters.");

        RuleFor(x => x.Strength)
            .InclusiveBetween(0m, 1m).When(x => x.Strength.HasValue)
            .WithMessage("Strength must be between 0 and 1.");
    }
}
