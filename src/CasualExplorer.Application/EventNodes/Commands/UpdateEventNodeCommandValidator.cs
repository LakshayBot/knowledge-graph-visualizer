using FluentValidation;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>Validates <see cref="UpdateEventNodeCommand"/>.</summary>
public sealed class UpdateEventNodeCommandValidator : AbstractValidator<UpdateEventNodeCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public UpdateEventNodeCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("Event node ID is required.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MinimumLength(5).WithMessage("Title must be at least 5 characters.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Summary)
            .NotEmpty().WithMessage("Summary is required.")
            .MinimumLength(20).WithMessage("Summary must be at least 20 characters.")
            .MaximumLength(2000).WithMessage("Summary must not exceed 2000 characters.");

        RuleFor(x => x.ConfidenceScore)
            .InclusiveBetween(0m, 1m).WithMessage("Confidence score must be between 0 and 1.");

        RuleFor(x => x.FreshnessScore)
            .InclusiveBetween(0m, 1m).WithMessage("Freshness score must be between 0 and 1.");
    }
}
