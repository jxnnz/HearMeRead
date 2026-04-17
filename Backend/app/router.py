from fastapi import APIRouter

from app.routes import passages, students
from app.routes import questions
from app.routes import auth, session as sessions

api_router = APIRouter(prefix="/routes")

api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(passages.router)
api_router.include_router(questions.router)
api_router.include_router(sessions.router)
api_router.include_router(sessions.student_sessions_router)
# api_router.include_router(assessments.router) ← after passages
