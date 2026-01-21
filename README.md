# KahootKiller 🎯

A Kahoot-like quiz application with AI-powered grading. Built with Vue.js and Express.js.

## Features

- **Multilingual Support** (English & Turkish)
  - Language selector in header
  - All UI elements translated
  - AI provides feedback in the same language as the question
  - Automatic language detection for grading

- **Unique User Identity System**
  - Each user gets a permanent 16-digit unique ID stored in localStorage
  - Usernames can be changed anytime with the "Change Username" button
  - Responses displayed as "Username#1234" (last 4 digits of ID)
  - Prevents duplicate submissions based on ID, not username

- **Admin Panel** (Password Protected)
  - Add open-ended questions with correct answers
  - Set deadlines for questions
  - Set optional character limits for answers
  - Enable/disable questions
  - View all user responses with unique IDs
  - AI-powered automatic grading using OpenRouter
  - View results with podium rankings (🥇🥈🥉)
  - Delete questions

- **User Panel**
  - View all enabled questions
  - Submit open-ended answers
  - Deadline-aware (can't answer after deadline)
  - Character limit enforcement with live counter
  - Track which questions you've already answered
  - Modify username while keeping same ID

- **AI Grading**
  - Automatically scores all responses using OpenRouter API
  - Provides feedback for each answer
  - Scores on a 0-100 scale
  - Supports various AI models (GPT-4, Claude, etc.)

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **Backend**: Express.js + Node.js
- **Database**: SQLite (sql.js - pure JavaScript, no compilation)
- **AI Integration**: OpenRouter API
- **Authentication**: Simple password-based admin auth
- **Deployment**: Docker & Docker Compose

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (get one at https://openrouter.ai/)

## Installation

### 1. Clone and navigate to the project

```bash
cd kahootkiller
```

### 2. Setup Backend

```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env
```

Edit the `.env` file:
```env
PORT=3000
ADMIN_PASSWORD=your_secure_password_here
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

## Running the Application

### Option 1: Docker (Recommended for Production)

**Quick Start:**
```bash
# Create .env file from example
cp .env.example .env
# Edit .env file with your credentials

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:3000

**Docker Commands:**
```bash
# Rebuild containers
docker-compose up -d --build

# Stop containers
docker-compose down

# Remove volumes (deletes database)
docker-compose down -v
```

### Option 2: Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Option 3: Production Build (Manual)

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Usage Guide

### For Admins

1. Click "Admin Panel" button
2. Enter the admin password (set in `.env`)
3. Add questions:
   - Click "+ Add New Question"
   - Enter the question text
   - Enter the correct answer
   - Optionally set a deadline
   - Click "Add Question"
4. Enable questions by clicking the "Enable" button
5. View responses by clicking "View Responses"
6. Score responses with AI by clicking "🤖 Score with AI"

### For Users

1. Stay on "User Panel" (default view)
2. Enter your name
3. View available questions
4. Type your answer in the text area
5. Click "Submit Answer"
6. Answers can only be submitted once per user per question

## API Endpoints

### Admin Endpoints (require password)

- `POST /api/admin/verify` - Verify admin password
- `POST /api/admin/questions` - Add new question
- `POST /api/admin/questions/list` - Get all questions with response counts
- `POST /api/admin/questions/:id/toggle` - Enable/disable question
- `POST /api/admin/questions/:id/responses` - Get all responses for a question
- `POST /api/admin/questions/:id/score` - Score responses using AI
- `POST /api/admin/questions/:id/delete` - Delete question and all responses

### User Endpoints

- `GET /api/questions` - Get all enabled questions (before deadline)
- `POST /api/questions/:id/respond` - Submit answer to a question
- `GET /api/questions/:id/check/:username` - Check if user already responded

## Database Schema

### questions
- id (PRIMARY KEY)
- question (TEXT)
- correct_answer (TEXT)
- enabled (INTEGER, 0 or 1)
- deadline (DATETIME)
- created_at (DATETIME)

### user_responses
- id (PRIMARY KEY)
- question_id (FOREIGN KEY)
- username (TEXT)
- answer (TEXT)
- submitted_at (DATETIME)
- score (INTEGER, 0-100)
- ai_feedback (TEXT)

### scoring_results
- id (PRIMARY KEY)
- question_id (FOREIGN KEY)
- scored_at (DATETIME)
- total_responses (INTEGER)
- ai_model (TEXT)

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| ADMIN_PASSWORD | Admin panel password | admin123 |
| OPENROUTER_API_KEY | Your OpenRouter API key | Required |
| OPENROUTER_MODEL | AI model to use for grading | openai/gpt-4o-mini |

## Available AI Models

You can use any model available on OpenRouter. Popular options:

- `openai/gpt-4o-mini` (fast, affordable)
- `openai/gpt-4o` (more powerful)
- `anthropic/claude-3.5-sonnet` (excellent reasoning)
- `google/gemini-pro` (good balance)

See full list at: https://openrouter.ai/models

## Security Notes

- The admin password is stored in plain text in `.env` - suitable for MVP
- For production, implement proper authentication with JWT tokens
- Add rate limiting to prevent abuse
- Validate and sanitize all user inputs
- Use HTTPS in production

## Troubleshooting

### Backend won't start
- Ensure Node.js 18+ is installed
- Check if port 3000 is available
- Verify `.env` file exists with correct values

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check Vite proxy configuration in `vite.config.js`

### AI scoring fails
- Verify OpenRouter API key is valid
- Check you have credits/quota on OpenRouter
- Ensure the model name is correct
- Check backend console for detailed error messages

### Database errors
- Delete `quiz.db` file and restart backend to recreate database
- Check file permissions in backend directory

## Future Enhancements

- User authentication and profiles
- Real-time leaderboard
- Multiple choice questions
- Timer-based questions
- Export results to CSV/Excel
- Email notifications
- Question categories/tags
- Image/media support in questions

## License

MIT

## Support

For issues or questions, please open an issue on GitHub or contact the maintainer.
