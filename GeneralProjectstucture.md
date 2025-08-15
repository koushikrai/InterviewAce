src/
├── ai/                            # Genkit/LLM-based AI workflows
│   ├── flows/
│   │   ├── AiFeedbackEngine.ts            # Analyze spoken/text responses
│   │   ├── ResumeAnalyser.ts              # Parse + match resume vs job
│   │   └── InterviewQuestionGenerator.ts  # Custom interview Qs via LLM
│   ├── dev.ts                    # Local test CLI for AI flows
│   ├── genkit.ts                 # Genkit/OpenAI config and setup

├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui system (buttons, cards, etc.)
│   ├── DashboardNav.tsx          # Custom dashboard nav
│   ├──   
│   └── 

├── pages/                        # Route-based pages
│   ├── Auth.tsx                 # Landing page
│   ├── dashboard.tsx             # Main dashboard
│   ├── index.tsx                 # Auth page
│   ├── interview.tsx             # Interactive interview simulator
│   └── NotFound.tsx                # Resume upload & analysis interface
│   ├── Progress.tsx                 # Landing page
│   ├── Upload.tsx                 # Landing page


├── utils/                        #  Helper functions
│   ├── resumeParser.ts           # Local resume cleaning/fallback
│   └── scoreCalculator.ts        # Quantify feedback from AI

├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Auth session hook
│   └── useInterview.ts           # Manage live interview logic

├── lib/                          # Config & API clients
│   ├── api.ts                    # Axios/fetch wrapper with interceptors
│   └── config.ts                 # Constants, endpoints, env config

├── models/                       # Mongoose DB schemas
│   ├── userModel.ts              # User auth & profile
│   ├── resumeModel.ts            # Resume metadata, parsed content
│   ├── jobModel.ts               # Job role metadata
│   ├── interviewModel.ts         # Mock interview logs
│   └── feedbackLogModel.ts       # AI-generated feedback history

├── server/                       # Node.js/Express backend
│   ├── routes/                   # API endpoints
│   │   ├── authRoutes.ts
│   │   ├── resumeRoutes.ts
│   │   ├── interviewRoutes.ts
│   │   └── feedbackRoutes.ts
│   ├── controllers/              # Request handlers
│   │   ├── authController.ts
│   │   ├── resumeController.ts
│   │   └── interviewController.ts
│   ├── services/                 # Logic/service layer
│   │   ├── aiService.ts          # Call local AI flows or Python services
│   │   └── googleSpeech.ts       # TTS / STT handling
│   ├── app.ts                    # Express app setup
│   └── db.ts                     # MongoDB connection logic

├── ai-services/                  # Python microservices (via Flask/FastAPI)                                                                                    
│   ├── resume_parser.py          # NLP resume parsing
│   ├── interview_generator.py    # Custom Qs via OpenAI/Gemini
│   └── answer_feedback.py        # AI answer scoring

├── public/
│   └── assets/                   # Static files, logos, PDFs

├── .env                          # Env vars (API keys, DB URIs)
├── package.json
└── README.md



 1. Technical Flow Diagram (System Architecture)

[ User (Browser) ]
       |
       v
+------------------------+
|  Frontend (React.js)   |
|  - Resume Upload       |
|  - Interview Practice  |
|  - Feedback UI         |
+------------------------+
       |
       v  API Calls (HTTPS)
+------------------------+
| Backend (Node.js +     |
| Express.js)            |
| - Auth (JWT)           |
| - File handling        |
| - Route control        |
+------------------------+
       |
       | Calls AI Microservices via REST
       v
+----------------------------+
| AI Microservices (Python)  |
| - Resume Parser            |
| - Job Match Analyzer       |
| - Interview Generator      |
| - Answer Evaluator         |
+----------------------------+
       |
       | Read/Write Data
       v
+--------------------------+
| MongoDB Atlas            |
| - Users                  |
| - Resumes                |
| - Job Descriptions       |
| - Feedback Logs          |
+--------------------------+

External Services:
------------------
[Google Speech-to-Text] <--- Voice Input
[Google Text-to-Speech] ---> Voice Output



2. ERD (Entity-Relationship Diagram):

[User]
- _id (ObjectId)
- name
- email
- passwordHash
- createdAt
- resumeId (FK to Resume)
- preferences

        |
        | 1
        |
        | has many
        v

[InterviewSession]
- _id
- userId (FK to User)
- createdAt
- jobTitle
- mode (text/voice)
- scoreSummary
- feedbackLogIds (array of ObjectId)

        |
        | 1
        |
        | has many
        v

[FeedbackLog]
- _id
- sessionId (FK to InterviewSession)
- question
- userAnswer
- aiFeedback
- score
- timestamp

        |
        | 1
        |
        | has one
        v

[Resume]
- _id
- userId (FK to User)
- originalFile (path or base64)
- parsedData (JSON)
- resumeScore
- suggestions

        |
        | optional link to
        v

[JobDescription]
- _id
- title
- content
- parsedSkills
- uploadedBy (User reference)




 3. API Specification (Backend + AI Services)
Authentication
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me (with JWT)

 Resume Management
POST /api/resume/upload

Upload resume (multipart form). Passes file to Python microservice for parsing.

GET /api/resume/:id

Get parsed resume details and suggestions.

DELETE /api/resume/:id

Delete resume from user profile.

 Job Description Matching
POST /api/job/upload

Upload target job description.

POST /api/resume/analyze

Compare resume with job and get matching score + gaps.

Interview Practice
POST /api/interview/start

Body: { jobTitle, mode }
Calls AI microservice to generate relevant questions.

POST /api/interview/answer

Body: { sessionId, questionId, userAnswer }
Returns AI feedback & score.

GET /api/interview/:sessionId

View previous session questions, answers, feedback.

 AI Microservices
POST /ai/resume/parse

Parse resume (returns structured JSON).

POST /ai/job/compare

Compare resume to job; returns match score and keyword gaps.

POST /ai/interview/generate

Input: { resume, jobTitle } → Output: Questions list.

POST /ai/interview/feedback

Input: { question, answer } → Output: AI feedback & score.

Voice Integration APIs (Google)
Speech-to-Text: Used in frontend or Node backend

Text-to-Speech: Request via frontend or backend to convert AI feedback to voice


// used to generate jwt token 
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
