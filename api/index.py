import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from backend import routes

app = FastAPI(title="Collecting a Word API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"خطأ في الخادم: {str(exc)}"}
    )

# Include router with and without /api prefix for maximum Vercel rewrite compatibility
app.include_router(routes.router, prefix="/api")
app.include_router(routes.router)

# Serve static frontend during local development
if os.path.exists("public"):
    app.mount("/", StaticFiles(directory="public", html=True), name="public")

