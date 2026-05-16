# Antigravity Nutrition - Ralph Loop Task List

> **Instructions for the Autonomous Agent (Ralph Loop):**
> 1. Read `PRD.md` for project context.
> 2. Find the first uncompleted task below marked as `[ ]`.
> 3. Complete ONLY that single task. Ensure the code works and runs without errors.
> 4. Change the `[ ]` to `[x]` upon completion.
> 5. Commit the code to Git with a descriptive message referencing the task.
> 6. Exit/End iteration.

## Phase 1: Project Initialization & Database Setup
- [ ] **Task 1:** Initialize a Git repository in the root directory and create a standard `.gitignore` file.
- [ ] **Task 2:** Create a `backend` folder. Initialize a Node.js project (`npm init -y`) inside it.
- [ ] **Task 3:** Install essential backend dependencies (`express`, `mongoose`, `dotenv`, `cors`) and `nodemon` as a dev dependency.
- [ ] **Task 4:** Create a basic Express server setup in `backend/server.js` that listens on port 5000 and includes error handling.
- [ ] **Task 5:** Create `backend/config/db.js` to handle connection to MongoDB Atlas using `mongoose`. Integrate this into `server.js`.
- [ ] **Task 6:** Create the `User` Mongoose schema/model (`backend/models/User.js`). Include fields for email, password, age, weight, height, healthGoals, restrictions, and streakCount.
- [ ] **Task 7:** Create the `FoodItem` Mongoose schema/model (`backend/models/FoodItem.js`). Include fields for name, country, calories, protein, carbs, fats, fiber, vitamins, sodium, and sugar.
- [ ] **Task 8:** Create the `DailyLog` Mongoose schema/model (`backend/models/DailyLog.js`). Include references to the User, an array of logged foods, date, and calculated macro totals.
- [ ] **Task 9:** Create the `CheckIn` Mongoose schema/model (`backend/models/CheckIn.js`). Include references to the User, date, mood, energy level, and satiety.

## Phase 2: Backend Authentication & API Endpoints
- [ ] **Task 10:** Install `jsonwebtoken` and `bcryptjs` in the backend.
- [ ] **Task 11:** Create a JWT generation utility and an authentication middleware (`backend/middleware/auth.js`) to protect routes.
- [ ] **Task 12:** Implement the user registration endpoint (`POST /api/auth/register`) with password hashing.
- [ ] **Task 13:** Implement the user login endpoint (`POST /api/auth/login`) returning a JWT.
- [ ] **Task 14:** Implement user onboarding endpoint (`PUT /api/users/profile`) to update bio-data, goals, and restrictions.
- [ ] **Task 15:** Implement the food search endpoint (`GET /api/food/search`) that accepts `q` (query) and `country` parameters.
- [ ] **Task 16:** Implement daily food logging endpoints (`POST /api/logs/daily` and `GET /api/logs/daily/:date`).
- [ ] **Task 17:** Implement the check-in endpoint (`POST /api/checkin`) that saves daily mood/energy data.

## Phase 3: AI Orchestration
- [ ] **Task 18:** Install the `openai` SDK in the backend to interface with the LMArena/LMSYS API.
- [ ] **Task 19:** Create an AI service file (`backend/services/aiService.js`) and configure the OpenAI client with the custom LMArena endpoint and system prompt.
- [ ] **Task 20:** Implement the chat endpoint (`POST /api/chat`) that routes user input to the AI service and returns the response.
- [ ] **Task 21:** Add "Function Calling" capability to the AI service, allowing the LLM to query the `FoodItem` database if the user asks for specific food macros.
- [ ] **Task 22:** Implement business logic in the backend to append user restriction data (allergies/goals) to the AI context to enable "Conflict Warnings".

## Phase 4: Frontend Initialization
- [ ] **Task 23:** Create the React frontend using Vite (`npm create vite@latest frontend -- --template react`) in the root directory.
- [ ] **Task 24:** Install fundamental frontend dependencies: `react-router-dom`, `axios`, `lucide-react`, and `recharts`.
- [ ] **Task 25:** Set up Tailwind CSS in the Vite frontend project for rapid, premium styling.
- [ ] **Task 26:** Configure React Router in `frontend/src/App.jsx` with basic placeholder routes (Login, Register, Dashboard, Onboarding).
- [ ] **Task 27:** Set up a global state management solution (React Context API) to hold the authenticated user's data and token.
- [ ] **Task 28:** Create an Axios API client utility (`frontend/src/api/client.js`) with an interceptor to automatically attach the JWT token to requests.

## Phase 5: Frontend UI & Features
- [ ] **Task 29:** Build the Login and Registration components with proper form validation and error handling.
- [ ] **Task 30:** Build the multi-step Onboarding form UI to capture the user's age, weight, goals, and restrictions upon first login.
- [ ] **Task 31:** Build the Dashboard layout, including a responsive navigation bar and a visually distinct main content area.
- [ ] **Task 32:** Implement the Macro Progress Radial Charts component using `recharts` to visualize daily calories and macros.
- [ ] **Task 33:** Build the Food Search UI component with an input field, search results list, and "Add to Log" functionality.
- [ ] **Task 34:** Build the Daily Check-in UI featuring Emoji selectors for mood and sliders for energy levels.
- [ ] **Task 35:** Integrate `quagga2` (or a modern alternative like `html5-qrcode`) and build the Barcode Scanner UI component for food logging.

## Phase 6: Gamification & AI Chat UI
- [ ] **Task 36:** Build the floating AI Chatbot Bubble component that toggles a chat interface on the screen.
- [ ] **Task 37:** Build the real-time Chat Interface, handling message state, loading indicators, and displaying AI responses.
- [ ] **Task 38:** Build a Streak Tracking visual component on the Dashboard showing consecutive days of macro targets met.
- [ ] **Task 39:** Implement a global "Achievement Unlocked" modal system triggered when users hit their targets (e.g., 3-day streak).

## Phase 7: Optimization & Polish
- [ ] **Task 40:** Review all components to ensure responsive design (mobile-friendly).
- [ ] **Task 41:** Add subtle micro-animations (e.g., using Framer Motion or Tailwind classes) to buttons and the chat interface.
- [ ] **Task 42:** Conduct a final test of the authentication flow, data logging flow, and AI chat capability.
