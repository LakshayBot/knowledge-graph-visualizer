using CausalExplorer.Application.AI.Interfaces;
using CausalExplorer.Application.Common.Interfaces;
using MediatR;

namespace CausalExplorer.Application.AI.Commands;

/// <summary>Command to extract structured event nodes from free-form text using the AI service.</summary>
public sealed record ExtractEventsFromTextCommand(string Text) : IRequest<ExtractedEventsResult>;

/// <summary>Handles <see cref="ExtractEventsFromTextCommand"/>.</summary>
public sealed class ExtractEventsFromTextCommandHandler
    : IRequestHandler<ExtractEventsFromTextCommand, ExtractedEventsResult>
{
    private readonly IAIService _aiService;

    /// <summary>Initialises the handler.</summary>
    public ExtractEventsFromTextCommandHandler(IAIService aiService)
    {
        _aiService = aiService;
    }

    /// <inheritdoc />
    public Task<ExtractedEventsResult> Handle(
        ExtractEventsFromTextCommand request,
        CancellationToken cancellationToken) =>
        _aiService.ExtractEventsFromTextAsync(request.Text, cancellationToken);
}
