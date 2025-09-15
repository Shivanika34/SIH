# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Urban Assistant is a civic issue reporting and crowdsourcing platform built with React frontend and Node.js/Express backend. The system enables citizens to report civic issues, vote on reports, and track resolution progress. It uses MongoDB for primary data storage, Firebase for authentication and hosting, and integrates with Dropbox for file storage.

## Architecture

### Full-Stack Monorepo Structure
- **Frontend**: React SPA (`/src`, `/public`) deployed via Firebase Hosting
- **Backend**: Express.js API server (`/backend/src`) with MongoDB/Mongoose
- **Shared Config**: Firebase configuration for auth, hosting, and Firestore

### Key Components
- **Report Management**: Core civic issue reporting system with geospatial indexing
- **User Authentication**: Firebase Auth integration with role-based access (citizen, department staff, admin)
- **Voting System**: Community validation through upvotes/downvotes
- **Real-time Updates**: Socket.IO for live status updates and notifications
- **Department Assignment**: Automated routing to appropriate civic departments
- **SLA Tracking**: Service Level Agreement monitoring with escalation

### Database Strategy
- **Primary DB**: MongoDB with geospatial 2dsphere indexes for location-based queries
- **Text Search**: Full-text search indexes on reports (title, description, address)
- **Real-time**: Firebase Firestore for live updates (limited usage)
- **File Storage**: Dropbox API for media attachments

## Development Commands

### Frontend (React)
```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm start

# Build for production
npm run build

# Run tests
npm test

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Backend (Express API)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Seed database with initial data
npm run seed
```

### Database Operations
```bash
# Connect to MongoDB (requires MONGO_URI in .env)
# Database indexes are created automatically on server startup

# Health check backend API
curl http://localhost:5000/health
```

### Firebase Operations
```bash
# Deploy Firebase functions
firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# View Firebase logs
firebase functions:log

# Test Firestore rules locally
firebase emulators:start --only firestore
```

## Environment Configuration

### Required Environment Variables (.env)
```env
# Backend
MONGO_URI=mongodb://localhost:27017/civic-reporting
NODE_ENV=development
PORT=5000
CLIENT_URLS=http://localhost:3000,http://localhost:3001

# Firebase (backend)
FIREBASE_SERVICE_ACCOUNT_KEY={...}

# Frontend
REACT_APP_DROPBOX_TOKEN=your_dropbox_token
```

### Firebase Configuration
Firebase config is hardcoded in `src/firebase/config.js` (should be moved to env vars for production).

## Testing

### Backend Testing
- Uses Jest and Supertest for API testing
- No existing test files found - tests need to be created
- Run individual test: `npm test -- --testNamePattern="specific test"`

### Frontend Testing
- Uses React Testing Library (via react-scripts)
- No existing test files found - tests need to be created

## Architecture Patterns

### Backend Patterns
- **Modular Route Structure**: Routes organized by feature (`/routes/auth.js`, `/routes/reports.js`)
- **Middleware Chain**: Security (helmet), CORS, rate limiting, body parsing
- **Error Handling**: Centralized error handler with custom not-found handler
- **Database Abstraction**: Mongoose ODM with schema validation
- **Real-time Communication**: Socket.IO rooms based on user roles/departments

### Frontend Patterns
- **Component-Based**: React functional components with hooks
- **Firebase Integration**: Auth state management with `onAuthStateChanged`
- **Service Layer**: Upload services abstracted (`uploadService.js`)
- **Conditional Rendering**: Auth-based UI switching

### Data Flow
1. Reports submitted via React frontend with geolocation
2. Files uploaded to Dropbox, metadata to MongoDB
3. AI priority scoring and department auto-assignment
4. Real-time updates via Socket.IO to relevant departments
5. Public voting and comment system for community validation
6. SLA tracking with automatic escalation

## Deployment

### Production Deployment
- **Frontend**: Automatically deployed to Firebase Hosting on main branch push
- **Backend**: Manual deployment (no CI/CD configured)
- **Database**: MongoDB Atlas connection via MONGO_URI

### GitHub Actions
- Firebase hosting deployment configured for main branch
- Pull request preview deployments enabled
- Backend deployment automation missing

## Development Notes

### Current System State
- Basic React frontend with Firebase auth integration
- Comprehensive backend API with advanced features (voting, SLA, real-time)
- Multiple frontend directories suggest different interfaces (admin, citizen, department dashboards)
- Legacy code present in root `server.js` (commented out)

### Integration Points
- Dropbox API for file storage (token-based auth)
- Firebase for authentication and hosting
- MongoDB for primary data persistence
- Socket.IO for real-time features
- AWS SDK integrated (S3 storage alternative)

### Security Considerations
- Rate limiting and slow-down protection enabled
- Helmet.js for security headers
- CORS properly configured for multiple origins
- JWT authentication in backend (not yet connected to frontend)