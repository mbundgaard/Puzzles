using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Puzzles.Services;

public interface IAdminAuthService
{
    /// <summary>
    /// Checks if the request is authorized for admin endpoints.
    /// Returns null if authorized, or an IActionResult with error details if not.
    /// </summary>
    IActionResult? Authorize(HttpRequest request);
}
