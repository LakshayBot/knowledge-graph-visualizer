namespace CasualExplorer.Application.Common.Models;

/// <summary>
/// Represents the result of an operation that may succeed or fail, carrying a typed value on success.
/// </summary>
/// <typeparam name="T">The type of the success value.</typeparam>
public sealed class Result<T>
{
    /// <summary>Gets the success value. Only valid when <see cref="IsSuccess"/> is <c>true</c>.</summary>
    public T? Value { get; }

    /// <summary>Gets the error message. Only valid when <see cref="IsSuccess"/> is <c>false</c>.</summary>
    public string? Error { get; }

    /// <summary>Gets a value indicating whether the operation succeeded.</summary>
    public bool IsSuccess { get; }

    /// <summary>Gets a value indicating whether the operation failed.</summary>
    public bool IsFailure => !IsSuccess;

    private Result(T value) { Value = value; IsSuccess = true; }
    private Result(string error) { Error = error; IsSuccess = false; }

    /// <summary>Creates a successful result wrapping <paramref name="value"/>.</summary>
    public static Result<T> Success(T value) => new(value);

    /// <summary>Creates a failed result with the given <paramref name="error"/> message.</summary>
    public static Result<T> Failure(string error) => new(error);
}

/// <summary>
/// Represents the result of an operation that may succeed or fail, carrying no value.
/// </summary>
public sealed class Result
{
    /// <summary>Gets the error message. Only valid when <see cref="IsSuccess"/> is <c>false</c>.</summary>
    public string? Error { get; }

    /// <summary>Gets a value indicating whether the operation succeeded.</summary>
    public bool IsSuccess { get; }

    /// <summary>Gets a value indicating whether the operation failed.</summary>
    public bool IsFailure => !IsSuccess;

    private Result(bool isSuccess, string? error) { IsSuccess = isSuccess; Error = error; }

    /// <summary>Creates a successful result.</summary>
    public static Result Success() => new(true, null);

    /// <summary>Creates a failed result with the given <paramref name="error"/> message.</summary>
    public static Result Failure(string error) => new(false, error);
}
