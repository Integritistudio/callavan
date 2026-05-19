# Call A Van

A real-time tracking application connecting users with local drivers. This project is structured as a monorepo containing both the Node.js/Express backend and the Flutter mobile frontend.

---

## 🛠️ Getting Started

To get a local copy of this project running on your machine, follow these instructions.

### 1. Clone the Repository
Open your terminal and run:
```bash
git clone <your-repository-url>
cd call_a_van
```

---

## 🗄️ 1. Backend Setup (`call_a_van_backend`)

The backend is built with **Node.js**, **Express**, and **PostgreSQL**.

### Step 1: Install Dependencies
Open a terminal, navigate to the backend folder, and install npm modules:
```bash
cd call_a_van_backend
npm install
```

### Step 2: Configure Environment Variables
Copy the provided `.env.example` file to create a local `.env` configuration file, then populate it with your local credentials

### Step 3: Run the Backend Server
Start the development server with hot-reload enabled:
```bash
npm start
```
The server will start running on `http://localhost:5000`.

---

## 📱 2. Frontend Setup (`call_a_van_frontend`)

The mobile client is built with **Flutter**.

### Step 1: Install Flutter Dependencies
Open a new terminal window, navigate to the frontend folder, and fetch Dart packages:
```bash
cd call_a_van_frontend
flutter pub get
```

### Step 2: Configure Environment Variables
Copy the provided `.env.example` file to create a local `.env` configuration file, then populate it with your Mapbox access tokens and base URL configuration

*(If running on the Android Emulator, configure `BACKEND_URL` in `.env` as `http://10.0.2.2:5000` so the emulator can connect to your local machine).*

### Step 3: Run the App
Connect a physical device or launch an emulator, and execute:
```bash
flutter run
```
