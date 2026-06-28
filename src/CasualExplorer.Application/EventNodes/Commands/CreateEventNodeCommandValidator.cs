using FluentValidation;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>Validates <see cref="CreateEventNodeCommand"/> before it reaches the handler.</summary>
public sealed class CreateEventNodeCommandValidator : AbstractValidator<CreateEventNodeCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public CreateEventNodeCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MinimumLength(5).WithMessage("Title must be at least 5 characters.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Summary)
            .NotEmpty().WithMessage("Summary is required.")
            .MinimumLength(20).WithMessage("Summary must be at least 20 characters.")
            .MaximumLength(2000).WithMessage("Summary must not exceed 2000 characters.");

        RuleFor(x => x.EventDate)
            .NotEmpty().WithMessage("Event date is required.")
            .LessThanOrEqualTo(DateTime.UtcNow).WithMessage("Event date cannot be in the future.")
            .GreaterThanOrEqualTo(new DateTime(1800, 1, 1)).WithMessage("Event date cannot be before 1800.");

        RuleFor(x => x.Domain)
            .IsInEnum().WithMessage("Domain must be a valid EventDomain value.");

        RuleFor(x => x.ConfidenceScore)
            .InclusiveBetween(0m, 1m).WithMessage("Confidence score must be between 0 and 1.");

        RuleFor(x => x.FreshnessScore)
            .InclusiveBetween(0m, 1m).WithMessage("Freshness score must be between 0 and 1.");

        RuleFor(x => x.Sources)
            .NotNull().WithMessage("Sources list is required.")
            .Must(s => s.Count >= 1).WithMessage("At least one source is required.");

        RuleForEach(x => x.Sources).ChildRules(source =>
        {
            source.RuleFor(s => s.Url)
                .NotEmpty().WithMessage("Source URL is required.")
                .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
                .WithMessage("Source URL must be a valid absolute URI.");

            source.RuleFor(s => s.Title)
                .NotEmpty().WithMessage("Source title is required.")
                .MaximumLength(300).WithMessage("Source title must not exceed 300 characters.");

            source.RuleFor(s => s.ReliabilityScore)
                .InclusiveBetween(0m, 1m).WithMessage("Source reliability score must be between 0 and 1.");

            source.RuleFor(s => s.SourceType)
                .IsInEnum().WithMessage("Source type must be a valid SourceType value.");
        });
    }
}
