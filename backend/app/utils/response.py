from fastapi import Request
from fastapi.responses import JSONResponse


def success_response(data, message=""):
    return {"success": True, "data": data, "message": message, "error": None}


def error_response(message: str, error=None):
    return {"success": False, "data": None, "message": message, "error": str(error)}


async def api_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content=error_response("Internal Server Error", str(exc)))
