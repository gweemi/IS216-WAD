# IS216-WAD

GetOutLah! is a Vue 3 application built for the IS216 Web Application Development 2 project.

## Quick start

The frontend lives in [`getoutlah/`](getoutlah/). Install and run it from that directory:

```sh
cd getoutlah
pnpm install
pnpm dev
```

See [the app setup guide](getoutlah/README.md) for prerequisites, Firebase configuration, and test commands.


## use of ai (claude)

Test scripts
- Used AI to write the end-to-end test scripts (`e2e/`), the Playwright
  configuration, the Firebase emulator setup, and the test-data seeding
  script (`e2e/support/emulator.js`). 
- Our contribution: defined what to test, ran the tests, and fixed failed cases.

Documentation
- Used AI to help draft and keep implementation documentation up to date.
- Our contribution: verified the documented behaviour against the app and edited it for accuracy.

Debugging
- Used AI to explain error messages, suggest possible causes, and point out errors in code.
- Our contribution: look through code and fixed them

Eventbrite sync
- Used AI to write the integration code for syncing with the Eventbrite API and github workflows.
- Our contribution: decided what data to sync and how it maps to our database. 

UI colours and formatting
- Used AI to write the CSS/styling code. Used AI to generate a styling template.
- Our contribution: chose the colour scheme, layout, and where each style applies. Detailed how we wanted the page to format, or look.

## End-to-end tests

The end-to-end tests drive the app in Chrome, Firefox and Safari (WebKit) with
[Playwright](https://playwright.dev/). They run against the **Firebase
emulators**, not the real Firebase project, so they never read or change real
data.

### One-time setup

1. **Java 21 or later.** The Firestore emulator needs it. On macOS:

   ```sh
   brew install openjdk@21
   echo 'export PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH' >> ~/.zshrc
   source ~/.zshrc
   ```

   Check it works with `java -version`.

2. **Playwright browsers:**

   ```sh
   npx playwright install
   ```

The Firebase CLI doesn't need installing. `pnpm test:e2e` downloads it the
first time it runs.

### Running the tests

```sh
pnpm test:e2e
```

This starts the Auth and Firestore emulators, starts a test copy of the app at
`http://127.0.0.1:5174`, runs every test in all three browsers, then shuts
everything down. You can leave your normal `pnpm dev` server running on port
5173 at the same time.

To run one test file in one browser:

```sh
pnpm test:e2e -- e2e/student-journey.spec.js --project=chromium
```

### What is tested

| File | Checks |
| --- | --- |
| `e2e/onboarding.spec.js` | Logged-out users who open the questionnaire are sent to log in first. |
| `e2e/openjio.spec.js` | Logged-out users who open OPENJIO are sent to log in first. |
| `e2e/student-journey.spec.js` | A full visit: log in with Google, share a location at SMU SCIS 1, check in to an activity on the map, host an OPENJIO, join a friend's OPENJIO, redeem a voucher and log out. |

Before the journey test runs, `e2e/support/emulator.js` creates its test data
in the emulators: a student, a friend, their friendship, the friend's OPENJIO
and an activity next to SCIS 1. The emulator's own Google account picker
handles the login.

### Troubleshooting

- **"Unable to locate a Java Runtime"**: Java isn't installed or isn't on your
  `PATH`. Redo step 1 of the setup.
- **"Port 9099, 8081 or 5174 is already in use"**: an earlier run didn't shut
  down. Stop it with `lsof -ti :9099,:8081,:5174 | xargs kill`.
- **Failure details**: Playwright saves a report for each failed test in
  `test-results/` and `playwright-report/`. Open the report with
  `npx playwright show-report`.
