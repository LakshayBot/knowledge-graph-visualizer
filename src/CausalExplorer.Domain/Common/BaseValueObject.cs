namespace CausalExplorer.Domain.Common;

/// <summary>
/// Abstract base class for value objects.
/// Provides structural equality comparison based on the components returned by
/// <see cref="GetEqualityComponents"/>.
/// </summary>
public abstract class BaseValueObject : IEquatable<BaseValueObject>
{
    /// <summary>
    /// Returns the ordered sequence of components that participate in equality comparison.
    /// </summary>
    /// <returns>An enumerable of the components that define equality.</returns>
    protected abstract IEnumerable<object?> GetEqualityComponents();

    /// <inheritdoc />
    public bool Equals(BaseValueObject? other)
    {
        if (other is null) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;

        return GetEqualityComponents()
            .SequenceEqual(other.GetEqualityComponents());
    }

    /// <inheritdoc />
    public override bool Equals(object? obj) =>
        obj is BaseValueObject other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode() =>
        GetEqualityComponents()
            .Aggregate(0, (hash, component) =>
                HashCode.Combine(hash, component?.GetHashCode() ?? 0));

    /// <summary>Equality operator delegating to <see cref="Equals(BaseValueObject?)"/>.</summary>
    public static bool operator ==(BaseValueObject? left, BaseValueObject? right) =>
        left?.Equals(right) ?? right is null;

    /// <summary>Inequality operator delegating to <see cref="Equals(BaseValueObject?)"/>.</summary>
    public static bool operator !=(BaseValueObject? left, BaseValueObject? right) =>
        !(left == right);
}
