# PhotoSwipe

A mobile photo cleanup app — swipe through your camera roll, queue duplicates and clutter for deletion, and reclaim storage with confidence.

## Structure

```
photoswipe/
├── backend/   # Python FastAPI — sessions, photo metadata, analytics, backup
└── mobile/    # React Native Expo (TypeScript) — swipe UI, delete queue, dashboard
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill in Supabase credentials
uvicorn app.main:app --reload
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```
