using BCrypt.Net;
using CausalExplorer.Application.Auth.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Interfaces;
using MediatR;

namespace CausalExplorer.Application.Auth.Commands;

/// <summary>Handles <see cref="RegisterCommand"/>.</summary>
public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;

    /// <summary>Initialises the handler.</summary>
    public RegisterCommandHandler(
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ITokenService tokenService)
    {
        _userRepo     = userRepo;
        _unitOfWork   = unitOfWork;
        _tokenService = tokenService;
    }

    /// <inheritdoc />
    public async Task<AuthResultDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailExists = await _userRepo.EmailExistsAsync(request.Email, cancellationToken);
        if (emailExists)
            throw new ConflictException($"An account with email '{request.Email}' already exists.");

        var usernameExists = await _userRepo.UsernameExistsAsync(request.Username, cancellationToken);
        if (usernameExists)
            throw new ConflictException($"The username '{request.Username}' is already taken.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = User.Create(request.Email, request.Username, passwordHash);

        await _userRepo.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessToken  = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var expiresAt    = DateTime.UtcNow.AddHours(1);

        return new AuthResultDto(accessToken, refreshToken, expiresAt, user.Id, user.Username, user.Role.ToString());
    }
}

/// <summary>Handles <see cref="LoginCommand"/>.</summary>
public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;

    /// <summary>Initialises the handler.</summary>
    public LoginCommandHandler(
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ITokenService tokenService)
    {
        _userRepo     = userRepo;
        _unitOfWork   = unitOfWork;
        _tokenService = tokenService;
    }

    /// <inheritdoc />
    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepo.GetByEmailAsync(request.Email, cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new ForbiddenAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new ForbiddenAccessException("This account has been deactivated.");

        user.RecordLogin();
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessToken  = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var expiresAt    = DateTime.UtcNow.AddHours(1);

        return new AuthResultDto(accessToken, refreshToken, expiresAt, user.Id, user.Username, user.Role.ToString());
    }
}

/// <summary>Handles <see cref="RefreshTokenCommand"/>.</summary>
public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResultDto>
{
    private readonly ITokenService _tokenService;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _userRepo;

    /// <summary>Initialises the handler.</summary>
    public RefreshTokenCommandHandler(
        ITokenService tokenService,
        ICurrentUserService currentUser,
        IUserRepository userRepo)
    {
        _tokenService = tokenService;
        _currentUser  = currentUser;
        _userRepo     = userRepo;
    }

    /// <inheritdoc />
    public async Task<AuthResultDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var isValid = _tokenService.ValidateRefreshToken(request.RefreshToken);
        if (!isValid)
            throw new ForbiddenAccessException("Refresh token is invalid or has expired.");

        if (_currentUser.UserId is null)
            throw new ForbiddenAccessException("Cannot identify the current user.");

        var user = await _userRepo.GetByIdAsync(_currentUser.UserId.Value, cancellationToken)
            ?? throw new NotFoundException(nameof(User), _currentUser.UserId.Value);

        var accessToken  = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var expiresAt    = DateTime.UtcNow.AddHours(1);

        return new AuthResultDto(accessToken, refreshToken, expiresAt, user.Id, user.Username, user.Role.ToString());
    }
}

/// <summary>Handles <see cref="RevokeTokenCommand"/>.</summary>
public sealed class RevokeTokenCommandHandler : IRequestHandler<RevokeTokenCommand>
{
    // Token revocation would typically update a blocklist in Redis/DB.
    // This stub validates the token exists and returns success.
    private readonly ITokenService _tokenService;

    /// <summary>Initialises the handler.</summary>
    public RevokeTokenCommandHandler(ITokenService tokenService)
    {
        _tokenService = tokenService;
    }

    /// <inheritdoc />
    public Task Handle(RevokeTokenCommand request, CancellationToken cancellationToken)
    {
        var isValid = _tokenService.ValidateRefreshToken(request.RefreshToken);
        if (!isValid)
            throw new ForbiddenAccessException("Refresh token is invalid or has already been revoked.");

        // TODO: add to token blocklist (Redis / DB table) when infrastructure is wired
        return Task.CompletedTask;
    }
}
