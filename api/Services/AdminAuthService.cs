using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Puzzles.Services;

public class AdminAuthService : IAdminAuthService
{
    private readonly string? _apiKey;

    public AdminAuthService()
    {
        _apiKey = Environment.GetEnvironmentVariable("ADMIN_API_KEY");
    }

    public IActionResult? Authorize(HttpRequest request)
    {
        // Check X-API-Key header
        var providedKey = request.Headers["X-API-Key"].FirstOrDefault();

        if (string.IsNullOrEmpty(providedKey))
        {
            return new UnauthorizedObjectResult(new
            {
                error = "Unauthorized",
                message = "This endpoint requires authentication.",
                hint = "Include the X-API-Key header with your request.",
                keyLocation = "The API key is stored in .secrets in the project root."
            });
        }

        // If no API key is configured on the server, deny all requests (fail secure)
        if (string.IsNullOrEmpty(_apiKey))
        {
            return new ObjectResult(new
            {
                error = "Server configuration error",
                message = "ADMIN_API_KEY environment variable is not configured on the server."
            })
            { StatusCode = 500 };
        }

        // Constant-time comparison to prevent timing attacks
        if (!CryptographicEquals(_apiKey, providedKey))
        {
            return new UnauthorizedObjectResult(new
            {
                error = "Unauthorized",
                message = "Invalid API key.",
                keyLocation = "The API key is stored in .secrets in the project root."
            });
        }

        // Authorized
        return null;
    }

    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length)
        {
            return false;
        }

        int result = 0;
        for (int i = 0; i < a.Length; i++)
        {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }
}
