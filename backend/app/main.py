
from fastapi import FastAPI

app = FastAPI(
    title="ACME Salary Intelligence",
    description="Employee compensation management and analytics.",
    version="0.1.0",
)


@app.get("/api/v1/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
