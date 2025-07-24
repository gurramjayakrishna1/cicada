# fastapi_backend/main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
import asyncpg
from fastapi import Form, Depends
from fastapi.security import OAuth2PasswordBearer
from auth_utils import hash_password, verify_password, create_access_token
from jose import JWTError, jwt
from dotenv import load_dotenv
import os
from openai import OpenAI
import json
from fastapi import Request

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")  # fallback if not in .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # or ["*"] for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB connection (adjust credentials)
DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db():
    return await asyncpg.connect(DATABASE_URL)


# --- MODELS ---
class UserProfile(BaseModel):
    id: UUID
    name: str
    email: str
    python_level: int


class SessionMessage(BaseModel):
    session_id: UUID
    lo_id: int
    role: str
    text: str
    activity_type: Optional[str] = "chat"


class SessionMessage_1(BaseModel):
    lo_id: int
    role: str
    text: str
    activity_type: Optional[str] = "chat"

class LearnerProficiency(BaseModel):
    user_id: UUID
    lo_id: int
    proficiency: float

class SessionStartRequest(BaseModel):
    user_id: UUID
    mode: str  # 'tutor' or 'browse'
    lo_id: Optional[int] = None

class AssessmentRequest(BaseModel):
    lo_id: int

class EvaluationRequest(BaseModel):
    session_id: UUID
    lo_id: int
    question: str
    user_input: str

class SessionMessageInput(BaseModel):
    lo_id: int
    role: str
    text: str
    activity_type: str = "chat"

# --- ROUTES ---
@app.post("/api/user", response_model=UserProfile)
async def create_or_update_user(profile: UserProfile):
    db = await get_db()
    await db.execute("""
        INSERT INTO cicada.users (id, name, email, python_level)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, python_level = $4
    """, profile.id, profile.name, profile.email, profile.python_level)
    await db.close()
    return profile

@app.get("/api/user/{user_id}", response_model=UserProfile)
async def get_user(user_id: UUID):
    db = await get_db()
    row = await db.fetchrow("SELECT * FROM cicada.users WHERE id = $1", user_id)
    await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**row)



@app.post("/api/session/start")
async def start_session(data: SessionStartRequest):
    db = await get_db()

    # ✅ Reuse active tutor session if it exists and hasn't asked a question yet
    # if data.mode == "tutor" and not data.lo_id:
    #     existing = await db.fetchrow("""
    #         SELECT s.id, s.lo_id
    #         FROM cicada.sessions s
    #         LEFT JOIN cicada.session_messages m
    #         ON s.id = m.session_id AND m.lo_id = s.lo_id
    #         WHERE s.user_id = $1 AND s.mode = 'tutor' AND s.status = 'active'
    #         GROUP BY s.id, s.lo_id
    #         HAVING COUNT(CASE WHEN m.role = 'tutor' AND m.text LIKE '🧠%' THEN 1 END) = 0
    #         ORDER BY s.created_at DESC
    #         LIMIT 1
    #     """, data.user_id)

    #     if existing:
    #         await db.close()
    #         return {
    #             "session_id": str(existing["id"]),
    #             "lo_id": existing["lo_id"]
    #         }

    if data.mode == "tutor":
        existing = await db.fetchrow("""
            SELECT id, lo_id FROM cicada.sessions
            WHERE user_id = $1 AND mode = 'tutor' AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
        """, data.user_id)

        if existing:
            await db.close()
            return {
                "session_id": str(existing["id"]),
                "lo_id": existing["lo_id"]
            }

        # 👇 If no lo_id is passed, fetch next unmastered LO
        if not data.lo_id:
            lo = await db.fetchrow("""
                SELECT l.id FROM cicada.learning_objectives l
                LEFT JOIN cicada.learner_models m ON l.id = m.lo_id AND m.user_id = $1
                WHERE COALESCE(m.proficiency, 0) < 1
                ORDER BY l.id ASC
                LIMIT 1
            """, data.user_id)
            if lo:
                data.lo_id = lo["id"]

    # ✅ Browse mode: reuse session if LO already mastered
    if data.mode == "browse" and data.lo_id:
        prof = await db.fetchval("""
            SELECT proficiency FROM cicada.learner_models
            WHERE user_id = $1 AND lo_id = $2
        """, data.user_id, data.lo_id)

        if prof == 1:
            existing = await db.fetchrow("""
                SELECT id FROM cicada.sessions
                WHERE user_id = $1 AND lo_id = $2 AND mode = 'browse'
                ORDER BY created_at DESC
                LIMIT 1
            """, data.user_id, data.lo_id)

            if existing:
                await db.close()
                return {
                    "session_id": str(existing["id"]),
                    "lo_id": data.lo_id
                }

    # ✅ Create new session
    session_id = uuid4()
    await db.execute("""
        INSERT INTO cicada.sessions (id, user_id, mode, status, lo_id, created_at)
        VALUES ($1, $2, $3, 'active', $4, NOW())
    """, session_id, data.user_id, data.mode, data.lo_id)

    await db.close()
    return {
        "session_id": str(session_id),
        "lo_id": data.lo_id
    }





@app.get("/api/session/{session_id}/lo/{lo_id}/messages", response_model=List[SessionMessage])
async def get_lo_messages(session_id: UUID, lo_id: int):
    db = await get_db()
    rows = await db.fetch("""
        SELECT * FROM cicada.session_messages 
        WHERE session_id = $1 AND lo_id = $2 
        ORDER BY timestamp ASC
    """, session_id, lo_id)
    await db.close()
    return [SessionMessage(**row) for row in rows]




@app.put("/api/user/{user_id}/lo/{lo_id}")
async def update_proficiency(user_id: UUID, lo_id: int, data: LearnerProficiency):
    db = await get_db()
    await db.execute("""
        INSERT INTO cicada.learner_models (user_id, lo_id, proficiency, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, lo_id) DO UPDATE SET proficiency = $3, updated_at = NOW()
    """, user_id, lo_id, data.proficiency)
    await db.close()
    return {"status": "updated"}

@app.post("/auth/register")
async def register_user(name: str = Form(...), email: str = Form(...), password: str = Form(...)):
    db = await get_db()
    existing = await db.fetchrow("SELECT 1 FROM cicada.users WHERE email = $1", email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    await db.execute("""
        INSERT INTO cicada.users (id, name, email, password_hash)
        VALUES ($1, $2, $3, $4)
    """, uuid4(), name, email, hash_password(password))
    await db.close()
    return { "message": "Registered successfully" }

@app.post("/auth/login")
async def login_user(email: str = Form(...), password: str = Form(...)):
    db = await get_db()
    user = await db.fetchrow("SELECT * FROM cicada.users WHERE email = $1", email)
    await db.close()
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({ "sub": str(user["id"]) })
    return { "access_token": token, "token_type": "bearer" }

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        db = await get_db()
        user = await db.fetchrow("SELECT * FROM cicada.users WHERE id = $1", UUID(user_id))
        await db.close()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

@app.get("/api/me")
async def get_profile(current_user = Depends(get_current_user)):
    return {
        "id": str(current_user["id"]),
        "email": current_user["email"],
        "name": current_user["name"]
    }


@app.get("/api/session/{session_id}")
async def get_session(session_id: UUID, current_user=Depends(get_current_user)):
    db = await get_db()
    session = await db.fetchrow("SELECT * FROM cicada.sessions WHERE id = $1", session_id)
    await db.close()
    if not session or session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Session not found or not authorized")
    return {
        "session_id": str(session["id"]),
        "mode": session["mode"],
        "lo_id": session["lo_id"]
    }


@app.get("/api/session/{session_id}/messages")
async def get_all_messages_for_session(session_id: UUID, current_user=Depends(get_current_user)):
    db = await get_db()
    rows = await db.fetch("""
        SELECT * FROM cicada.session_messages
        WHERE session_id = $1
        ORDER BY timestamp ASC
    """, session_id)
    await db.close()
    return [dict(r) for r in rows]



@app.post("/api/session/{session_id}/message")
async def post_message(session_id: UUID, message: SessionMessageInput, current_user=Depends(get_current_user)):
    db = await get_db()
    await db.execute("""
        INSERT INTO cicada.session_messages (session_id, lo_id, role, text, activity_type, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, session_id, message.lo_id, message.role, message.text, message.activity_type, datetime.utcnow())
    await db.close()
    return { "status": "ok" }



@app.get("/api/objectives")
async def list_learning_objectives():
    db = await get_db()
    rows = await db.fetch("SELECT * FROM cicada.learning_objectives ORDER BY id")
    await db.close()
    return [dict(r) for r in rows]



@app.get("/api/session/{current_lo_id}/next_lo")
async def get_next_unmastered_lo(current_lo_id: int, current_user=Depends(get_current_user)):
    db = await get_db()
    rows = await db.fetch("""
        SELECT l.id, COALESCE(m.proficiency, 0) as prof
        FROM cicada.learning_objectives l
        LEFT JOIN cicada.learner_models m ON l.id = m.lo_id AND m.user_id = $1
        WHERE l.id > $2
        ORDER BY l.id ASC
    """, current_user["id"], current_lo_id)
    await db.close()

    for row in rows:
        if row["prof"] < 1:
            return {"next_lo_id": row["id"]}

    return {"next_lo_id": None}


#****************************************

@app.post("/api/assessment_question")
async def generate_assessment(data: AssessmentRequest, current_user=Depends(get_current_user)):
    lo_id = data.lo_id
    db = await get_db()
    lo = await db.fetchrow("SELECT topic, objective FROM cicada.learning_objectives WHERE id = $1", lo_id)
    await db.close()
    if not lo:
        raise HTTPException(status_code=404, detail="LO not found")

    prompt = f"""
You are an expert Python tutor. Given the learning objective: "{lo['objective']}" from the topic "{lo['topic']}", generate a single clear, instructive assessment question (coding or short answer) that will effectively assess the user's mastery of this objective.

Only return **ONE** question per request.
The question should be standalone, and written clearly on a single topic.
Do NOT return multiple questions.

Only output the question text, nothing else.
""".strip()

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": prompt}
        ],
        max_tokens=300,
        temperature=0.7
    )

    return { "question": response.choices[0].message.content.strip() }


@app.post("/api/evaluate_response")
async def evaluate_response(
    data: EvaluationRequest,
    current_user=Depends(get_current_user)
):
    db = await get_db()

    lo = await db.fetchrow(
        "SELECT topic, objective FROM cicada.learning_objectives WHERE id = $1",
        data.lo_id
    )
    if not lo:
        await db.close()
        raise HTTPException(status_code=404, detail="LO not found")

    prompt = f"""
You are an AI Python tutor evaluating a learner's response to a Python question based on the following learning objective:

"{lo['objective']}"

### Question Asked:
{data.question}

### Learner Response:
{data.user_input}

---

### Scoring Instructions:

- **Score 1** only if the response is:
  - Fully correct in logic
  - Properly **indented**
  - Free of **syntax or runtime errors**

- **Score 0** if:
  - Any required concept is missing
  - The response is ambiguous, poorly formatted, or syntactically incorrect
  - Indentation or formatting issues would cause an execution or readability problem

- **Do NOT** assume intent or fix mistakes silently — only score what is written explicitly.

---

### Feedback Instructions:

- If the score is 0:
  - Return the response in JSON format:
    {{
      "score": 0,
      "feedback": "Explain the mistake (e.g. indentation, syntax, logic, etc.)",
      "followup": "Ask a guiding question to prompt correction."
    }}

- If the score is 1:
  - Return the response in this EXACT markdown format:

## FEEDBACK
[Feedback]

## EVALUATION
| Observable | Mapped Objective | Score (0 or 1) | Importance (1-3) | Feedback |
|------------|------------------|----------------|------------------|----------|
[Rows here]

## SUMMARY
[Summary of strengths and improvements]
""".strip()

    messages = [
        { "role": "system", "content": prompt },
        { "role": "user", "content": data.user_input }
    ]

    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        temperature=0.7,
        max_tokens=600
    )

    content = response.choices[0].message.content.strip()

    try:
        parsed = json.loads(content)
        score = parsed.get("score", 0)
        feedback = parsed.get("feedback", "")
        followup = parsed.get("followup", "")
    except json.JSONDecodeError:
        # Assume it's markdown and score is 1
        score = 1
        feedback = content
        followup = ""

    if score == 1:
        await db.execute("""
            INSERT INTO cicada.learner_models (user_id, lo_id, proficiency, feedback, updated_at)
            VALUES ($1, $2, 1, $3, NOW())
            ON CONFLICT (user_id, lo_id)
            DO UPDATE SET proficiency = 1, feedback = $3, updated_at = NOW()
        """, current_user["id"], data.lo_id, feedback)

    await db.close()

    return {
        "score": score,
        "feedback": feedback,
        "followup": followup
    }




#**************************

@app.get("/api/user/{user_id}/proficiency")
async def get_user_proficiency(user_id: UUID, current_user=Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    db = await get_db()
    rows = await db.fetch("""
        SELECT 
            l.topic, 
            l.objective,
            COALESCE(m.proficiency, 0) AS score,
            m.feedback
        FROM cicada.learning_objectives l
        LEFT JOIN cicada.learner_models m ON l.id = m.lo_id AND m.user_id = $1
        ORDER BY l.id
    """, user_id)
    await db.close()

    result = []
    for row in rows:
        feedback_label = "✅ Mastered" if row["score"] >= 1 else (
            "🟡 In Progress" if row["score"] > 0 else "🔴 Not Started"
        )
        result.append({
            "topic": row["topic"],
            "objective": row["objective"],
            "score": row["score"],
            "feedback": row["feedback"] or feedback_label
        })

    return result
