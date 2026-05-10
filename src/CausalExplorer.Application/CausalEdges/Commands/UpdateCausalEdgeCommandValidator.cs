using FluentValidation;

namespace CausalExplorer.Application.CausalEdges.Commands;

/// <summary>Validates <see cref="UpdateCausalEdgeCommand"/>.</summary>
public sealed class UpdateCausalEdgeCommandValidator : AbstractValidator<UpdateCausalEdgeCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public UpdateCausalEdgeCommandValidator()
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
