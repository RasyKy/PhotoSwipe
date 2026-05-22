import logging

from fastapi.responses import JSONResponse


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)s] [%(asctime)s] [%(module)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def success_response(data):
    return {"success": True, "data": data, "error": None}


def error_response(message: str, status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "data": None, "error": message},
    )
