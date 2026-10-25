# GetOutLah!

Vue 3 + Vite frontend for the IS216-WAD project. It uses Firebase Authentication and Cloud Firestore for accounts and user data.

## Prerequisites

- [Node.js](https://nodejs.org/) `22.18.0` or later
- [pnpm](https://pnpm.io/)
- Access to the team's Firebase project

Run all commands in this directory, not in the repository root:

```sh
cd getoutlah
```

## Install and run

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Stop the server with <kbd>Ctrl</kbd> + <kbd>C</kbd>.

## Firebase setup

### 1. Create your local environment file

Copy the template and fill in the Firebase web-app configuration values:

```sh
cp .env.example .env.local
```

In the Firebase console, open **Project settings** (gear icon) → **Your apps** → select the web app. Under **SDK setup and configuration**, choose **Config** and copy each value from `firebaseConfig` into `.env.local`.

| `.env.local` variable | Firebase `firebaseConfig` field |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Use raw values, without quotation marks or commas. For example:

```env
VITE_FIREBASE_PROJECT_ID=your-project-id
```

Restart `pnpm dev` after changing `.env.local`.

> `.env.local` is ignored by Git. Do not commit it or paste project credentials into the repository. Values prefixed with `VITE_` are included in the browser bundle, so never put server-only secrets in this file.

### 2. Configure Firebase services

In the Firebase console for the same project:

1. **Authentication** → **Sign-in method**: enable the **Google** provider and select a support email.
2. **Authentication** → **Settings** → **Authorized domains**: ensure `localhost` is listed for local development. Add the production domain before deployment.
3. **Firestore Database**: create a Cloud Firestore database if one does not exist.
4. **Firestore Database** → **Rules**: replace the rules with the contents of [`firestore.rules`](firestore.rules), then click **Publish**.

The app creates a profile at `users/{uid}` after the first successful Google login. If sign-in works but profile creation fails, verify that the Firestore rules above were published.

### Deploying Firestore rules

This repository does not yet include Firebase CLI deployment configuration (`firebase.json`). For now, publish [`firestore.rules`](firestore.rules) manually in the Firebase console. Do not use Firestore test mode for a deployed app.

## Available commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server with hot reload. |
| `pnpm build` | Build the production bundle. |
| `pnpm preview` | Serve the production build locally. |
| `pnpm test:unit` | Run Vitest unit tests. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |
| `pnpm lint` | Run the configured linters. |

Install Playwright browsers before running end-to-end tests for the first time:

```sh
npx playwright install
```

For a production-style test run:

```sh
pnpm build
pnpm test:e2e
```
