# End-to-End User Flow

## 1. Signup & Onboarding
- User signs up with email/password.
- Immediately enters name and self-rated Python level on the onboarding form.
- Redirects to the Main Menu.

## 2. Main Menu
- Three options:
  1. **Browse Learning Objectives**
  2. **Let the Tutor Guide Me**
  3. **See My Proficiency Table**

## 3. Browse Learning Objectives
- User picks one objective from a grouped list.
- **If unmastered**:
  - Present a single assessment question.
  - Loop through follow-ups until the user succeeds.
- **If already mastered**:
  - Show past chat history.
  - Allow help and other interactions.
- Switching between objectives restores that objective’s full history and latest mastery status.

## 4. Let the Tutor Guide Me
- System automatically selects the first unmastered objective.
- Asks a question and loops follow-ups until mastery.
- Celebrates success and advances to the next unmastered objective (skipping mastered ones).
- The entire multi-objective session is one rolling chat.
- Leaving and returning resumes exactly where the user left off.

## 5. See My Proficiency Table
- Displays every objective with:
  - The user’s current score
  - Last feedback received

## 6. Help-On-Demand
- At any point in either flow, the user can ask for help.
- The system provides targeted, encouraging hints tied to the current objective.
- Proficiency is updated if warranted.

## 7. Persistence & Resume
- Every message, hint, score update, and evidence table is durably stored per turn in the database.
- No client-side storage.
- Every reload or device switch rehydrates state via API.
