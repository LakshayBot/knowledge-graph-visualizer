using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace CausalExplorer.Infrastructure.Cache;

/// <summary>
/// Redis-backed generic cache service.
/// </summary>
public sealed class RedisCacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisCacheService> _logger;

    // ── Well-known TTLs ──────────────────────────────────────────────────────
    /// <summary>TTL for causal chain graphs (15 minutes).</summary>
    public static readonly TimeSpan ChainTtl = TimeSpan.FromMinutes(15);

    /// <summary>TTL for event node detail views (30 minutes).</summary>
    public static readonly TimeSpan EventNodeTtl = TimeSpan.FromMinutes(30);

    /// <summary>TTL for user profile data (10 minutes).</summary>
    public static readonly TimeSpan UserProfileTtl = TimeSpan.FromMinutes(10);

    // ── Key factories ────────────────────────────────────────────────────────
    /// <summary>Cache key for a causal chain graph.</summary>
    public static string ChainKey(Guid chainId, string perspective, int depth) =>
        $"chain:{chainId}:perspective:{perspective}:depth:{depth}";

    /// <summary>Cache key for a single event node.</summary>
    public static string EventNodeKey(Guid eventId) => $"event:{eventId}";

    /// <summary>Cache key for a user profile.</summary>
    public static string UserKey(Guid userId) => $"user:{userId}";

    /// <summary>Initialises a new instance of <see cref="RedisCacheService"/>.</summary>
    public RedisCacheService(IConnectionMultiplexer redis, ILogger<RedisCacheService> logger)
    {
        _redis  = redis;
        _logger = logger;
    }

    /// <summary>Retrieves and deserialises a cached value, or returns <c>null</c> on miss.</summary>
    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            var db    = _redis.GetDatabase();
            var value = await db.StringGetAsync(key);

            if (!value.HasValue) return null;

            return JsonSerializer.Deserialize<T>(value.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache GET failed for key {Key}", key);
            return null;
        }
    }

    /// <summary>Serialises and stores a value with the given TTL.</summary>
    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        try
        {
            var db   = _redis.GetDatabase();
            var json = JsonSerializer.Serialize(value);
            await db.StringSetAsync(key, json, expiry);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache SET failed for key {Key}", key);
        }
    }

    /// <summary>Removes a single key from the cache.</summary>
    public async Task RemoveAsync(string key)
    {
        try
        {
            var db = _redis.GetDatabase();
            await db.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache DELETE failed for key {Key}", key);
        }
    }

    /// <summary>
    /// Removes all keys matching <paramref name="pattern"/> (e.g. <c>"chain:{id}:*"</c>).
    /// Uses server-side SCAN to avoid blocking Redis with KEYS.
    /// </summary>
    public async Task RemoveByPatternAsync(string pattern)
    {
        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys   = server.KeysAsync(pattern: pattern);

            var db = _redis.GetDatabase();
            await foreach (var key in keys)
                await db.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache SCAN+DELETE failed for pattern {Pattern}", pattern);
        }
    }
}
