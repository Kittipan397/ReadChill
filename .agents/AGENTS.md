# ReadChill Project Guidelines

## Backend Development
- **Go as Primary Language:** All new backend logic, APIs, and services MUST be written in Go (Golang) using the Fiber framework. We are fully migrating to Go to prioritize maximum performance and low memory footprint.

## Data & Frontend Integration
- **NO MOCK DATA:** Absolutely DO NOT use mock data or hardcoded placeholder arrays/objects in the frontend (React/Next.js) or backend.
- **Real Data Only:** Always fetch and display real data directly from the Go API or Firebase Firestore. 
- **API First:** If a feature requires data that doesn't exist yet, build the corresponding Go API endpoint and Firestore schema first, then wire the frontend to consume it immediately. Using mock data slows down actual development progress.

## Media & File Storage
- **Current Stack:** Use Cloudinary and Firebase Storage for handling images and files for now.
- **R2 Preparation:** The user plans to migrate to Cloudflare R2 as soon as billing is configured. Therefore, whenever writing upload or storage logic, structure it cleanly (e.g., using interfaces or abstract storage services) so that it can be easily swapped out for an S3-compatible R2 client in the future.
