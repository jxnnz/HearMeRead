from fastapi import APIRouter

from app.api.v1.routes import auth, students
from app.api.v1.routes import passages, questions
from app.api.v1.routes import sessions

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(passages.router)
api_router.include_router(questions.router)
api_router.include_router(sessions.router)
api_router.include_router(sessions.student_sessions_router)
# api_router.include_router(assessments.router) ← after passages
