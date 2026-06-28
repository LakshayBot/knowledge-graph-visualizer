using FluentValidation;

namespace CasualExplorer.Application.Auth.Commands;

/// <summary>Validates <see cref="RegisterCommand"/>.</summary>
public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Email must be a valid email address.")
            .MaximumLength(256).WithMessage("Email must not exceed 256 characters.");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required.")
            .MinimumLength(3).WithMessage("Username must be at least 3 characters.")
            .MaximumLength(50).WithMessage("Username must not exceed 50 characters.")
            .Matches("^[a-zA-Z0-9_-]+$").WithMessage("Username may only contain letters, digits, hyphens and underscores.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit.")
            .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

        RuleFor(x => x.ConfirmPassword)
            .NotEmpty().WithMessage("Confirm password is required.")
            .Equal(x => x.Password).WithMessage("Passwords do not match.");
    }
}

/// <summary>Validates <see cref="LoginCommand"/>.</summary>
public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Email must be a valid email address.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}

/// <summary>Validates <see cref="RefreshTokenCommand"/>.</summary>
public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("Refresh token is required.");
    }
}

/// <summary>Validates <see cref="RevokeTokenCommand"/>.</summary>
public sealed class RevokeTokenCommandValidator : AbstractValidator<RevokeTokenCommand>
{
    /// <summary>Defines all validation rules.</summary>
    public RevokeTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("Refresh token is required.");
    }
}

/// <summary>Validates <see cref="UpdateUserCommand"/>.</summary>
public sealed class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();

        When(x => !string.IsNullOrWhiteSpace(x.Email), () =>
        {
            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("Email must be a valid email address.")
                .MaximumLength(256).WithMessage("Email must not exceed 256 characters.");
        });

        When(x => !string.IsNullOrWhiteSpace(x.Username), () =>
        {
            RuleFor(x => x.Username)
                .MinimumLength(3).WithMessage("Username must be at least 3 characters.")
                .MaximumLength(50).WithMessage("Username must not exceed 50 characters.")
                .Matches("^[a-zA-Z0-9_-]+$").WithMessage("Username may only contain letters, digits, hyphens and underscores.");
        });

        When(x => !string.IsNullOrWhiteSpace(x.NewPassword), () =>
        {
            RuleFor(x => x.CurrentPassword)
                .NotEmpty().WithMessage("Current password is required when setting a new password.");

            RuleFor(x => x.NewPassword)
                .MinimumLength(8).WithMessage("New password must be at least 8 characters.");
        });
    }
}
