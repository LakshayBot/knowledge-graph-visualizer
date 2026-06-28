using FluentValidation;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Validates <see cref="AddCasualEdgeCommand"/>.</summary>
public sealed class AddCasualEdgeCommandValidator : AbstractValidator<AddCasualEdgeCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public AddCasualEdgeCommandValidator()
    {
        RuleFor(x => x.FromEventId)
            .NotEmpty().WithMessage("FromEventId is required.");

        RuleFor(x => x.ToEventId)
            .NotEmpty().WithMessage("ToEventId is required.")
            .NotEqual(x => x.FromEventId).WithMessage("An edge cannot point to its own source node.");

        RuleFor(x => x.RelationshipType)
            .IsInEnum().WithMessage("RelationshipType must be a valid CasualRelationshipType value.");

        RuleFor(x => x.Perspective)
            .IsInEnum().WithMessage("Perspective must be a valid Perspective value.");

        RuleFor(x => x.Strength)
            .InclusiveBetween(0m, 1m).WithMessage("Strength must be between 0 and 1.");

        RuleFor(x => x.Explanation)
            .MaximumLength(2000).When(x => x.Explanation is not null)
            .WithMessage("Explanation must not exceed 2000 characters.");

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
