using FluentValidation;

namespace CausalExplorer.Application.CausalChains.Commands;

/// <summary>Validates <see cref="CreateCausalChainCommand"/>.</summary>
public sealed class CreateCausalChainCommandValidator : AbstractValidator<CreateCausalChainCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public CreateCausalChainCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MinimumLength(5).WithMessage("Title must be at least 5 characters.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.RootEventId)
            .NotEmpty().WithMessage("Root event ID is required.");

        RuleFor(x => x.Domain)
            .IsInEnum().WithMessage("Domain must be a valid EventDomain value.");
    }
}

/// <summary>Validates <see cref="SaveChainCommand"/>.</summary>
public sealed class SaveChainCommandValidator : AbstractValidator<SaveChainCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public SaveChainCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty().WithMessage("User ID is required.");
        RuleFor(x => x.ChainId).NotEmpty().WithMessage("Chain ID is required.");
        RuleFor(x => x.Notes).MaximumLength(1000).When(x => x.Notes is not null)
            .WithMessage("Notes must not exceed 1000 characters.");
    }
}
