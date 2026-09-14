import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend import routes

app = FastAPI(title="Collecting a Word API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production if desired
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")

# Serve static frontend during local development
if os.path.exists("public"):
    app.mount("/", StaticFiles(directory="public", html=True), name="public")

