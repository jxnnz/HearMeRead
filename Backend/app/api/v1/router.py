from fastapi import APIRouter

from app.api.v1.routes import auth, students

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(students.router)
# api_router.include_router(passages.router)    ← next
# api_router.include_router(assessments.router) ← after passages
