# Aura - Personal Analytics OS

Aura is a modern Personal Analytics Operating System designed to help students, developers, and lifelong learners track their growth, productivity, learning progress, and goals in one unified dashboard.

## Features

### Authentication

* Secure User Signup & Login
* Session Persistence
* Protected Routes
* User-specific Data Isolation

### Productivity Tracking

* Daily Activity Tracking
* Study Hours Tracking
* Workout Tracking
* Reading Tracking
* Custom Activity Tracking
* Productivity Score Calculation

### Task Management

* Create Tasks
* Edit Tasks
* Delete Tasks
* Mark Tasks Complete/Incomplete
* Priority Management
* Due Date Tracking

### Goal Management

* Daily Goals
* Weekly Goals
* Monthly Goals
* Custom Goals
* Goal Progress Tracking

### Skills & Learning Roadmaps

* Create Custom Skills
* Learning Roadmaps
* Topic Completion Tracking
* Progress Percentage Calculation
* XP-Based Progression System

### Analytics Dashboard

* Productivity Metrics
* Streak Tracking
* Progress Visualization
* Activity Insights
* Learning Analytics
* Growth Tracking

### Achievements & Milestones

* Achievement System
* XP Rewards
* Milestone Tracking
* Level Progression

### User Experience

* Responsive Design
* Dark Mode
* Light Mode
* Modern Glassmorphism UI
* Mobile Friendly

## Tech Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Framer Motion
* Recharts

### Backend & Database

* Supabase
* PostgreSQL
* Supabase Authentication
* Row Level Security (RLS)

## Security

Aura uses Supabase Authentication and Row Level Security (RLS) to ensure that users can only access their own data.

Security Features:

* User-specific database access
* Protected routes
* Secure authentication
* Environment variable protection
* Database-level access control

## Installation

### Clone Repository

```bash
git clone https://github.com/Jeffrey-Anto/Aura-Tracker.git
cd Aura-Tracker
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Project Structure

```text
src/
├── components/
├── pages/
├── context/
├── hooks/
├── services/
├── utils/
├── types/
└── assets/
```

## Future Enhancements

* AI Productivity Coach
* Smart Goal Recommendations
* Advanced Learning Analytics
* Data Export & Backup
* Calendar Integration
* Mobile Application

## Contributing

Contributions, suggestions, and improvements are welcome.

## License

This project is licensed under the MIT License.

## Author

Jeffrey Anto Thomas

Computer Science and Engineering Student

Government College of Engineering, Srirangam

## Tagline

Track. Learn. Grow.
