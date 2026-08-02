# Life Levels Application

Welcome to **Life Levels**, a full-stack web application built with a **Django REST Framework (DRF)** backend and a **React (Vite)** frontend.

---

## Project Structure

```text
├── backend/            # Django REST Framework Backend
│   ├── api/            # API application containing views, models, serializers
│   ├── backend/        # Django project settings
│   ├── db.sqlite3      # SQLite database (ignored by git, created locally)
│   └── requirements.txt # Python dependency file
├── frontend/           # React + Vite Frontend
│   ├── src/            # Frontend React source code
│   ├── public/         # Static public assets
│   ├── .env            # Environment configuration (ignored by git, containing local URL configurations)
│   └── package.json    # Node dependency file
└── venv/               # Root Python Virtual Environment (ignored by git)
```

---

## Getting Started

Follow these instructions to set up the development environment and run both backend and frontend applications locally.

### Prerequisites

Make sure you have the following installed:
- **Python 3.x**
- **Node.js** (v18 or higher recommended)
- **npm** (comes bundled with Node.js)

---

## 🐍 Backend Setup (Django)

The python virtual environment `venv` is located at the root of the workspace.

1. **Navigate to the workspace root directory**:
   ```bash
   cd life_level_sb
   ```

2. **Activate the virtual environment**:
   - **Linux/macOS**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```cmd
     venv\Scripts\activate
     ```

3. **Install python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Navigate to the backend directory and run database migrations**:
   ```bash
   cd backend
   python manage.py migrate
   ```

5. **Create a superuser (optional, for accessing the Django Admin panel)**:
   ```bash
   python manage.py createsuperuser
   ```

6. **Start the backend development server**:
   ```bash
   python manage.py runserver
   ```
   The backend server should now be running at [http://localhost:8000/](http://localhost:8000/).

---

## ⚡ Frontend Setup (React/Vite)

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file inside the `frontend/` directory (if not already present), and set the API base URL:
   ```env
   VITE_API_URL="http://localhost:8000"
   ```

4. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
   The frontend application should now be accessible in your browser (usually at `http://localhost:5173/` or similar, check terminal printout).

---

## 🔑 Authentication Architecture

- **Backend**: Employs JSON Web Token (JWT) authentication using the `djangorestframework-simplejwt` package.
- **Frontend**: Utilizes `jwt-decode` to inspect token expiry and `axios` to attach the Bearer token authorization header to standard requests.
