## Admin/Management Application (React + Node)

Structure:> frontend (Vite React), backend (Node), .env.example, README.md


Run each command one after the other.
-------------------------------------
Backend:> 
* cd backend
* copy .env.example .env 
* npm install 
* npm run dev
  
Frontend Dev (run admin web):> 
* cd frontend 
* npm install 
* set VITE_API_BASE_URL=http://localhost:3000 
* set VITE_VAPID_KEY=YOUR_PUBLIC_VAPID_KEY 
* npm run dev -- --port 5174
