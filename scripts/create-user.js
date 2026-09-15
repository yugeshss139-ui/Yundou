/**
 * Yundo Admin Script: Create User
 *
 * Creates a new Yundo user securely using Firebase Admin SDK.
 * Uses Application Default Credentials (ADC) — no service-account JSON needed.
 *
 * Usage:
 *   cd D:\Yundo_New
 *   firebase login          (first time only — authenticates ADC)
 *   node scripts/create-user.js
 *
 * The script will prompt for:
 *   - Username
 *   - Password (hidden input)
 *   - Role (default: user)
 *
 * What it does:
 *   1. Creates Firebase Auth account (password hashed by Firebase)
 *   2. Creates Firestore users/{uid} profile document
 *   3. Creates Firestore usernames/{username} mapping document
 *   4. NEVER stores the password in Firestore or logs
 *
 * Firestore model:
 *   users/{uid}      → { username, email, role, createdAt }
 *   usernames/{name} → { email }  (minimal — only what login needs)
 *
 * Environment:
 *   Uses GOOGLE_CLOUD_PROJECT or FIREBASE_CONFIG for project ID.
 *   ADC must be authenticated via `firebase login`.
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const readline = require("readline");

// Initialize with Application Default Credentials (v14 modular API)
const app = initializeApp({
  credential: applicationDefault(),
  projectId: "yundo-b83a7",
});
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Standard readline prompt for non-sensitive input (username, role).
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Windows-compatible hidden password prompt.
 *
 * Uses raw mode to capture individual keypresses without echoing.
 * Displays asterisks for each character typed.
 * Handles Backspace and Enter correctly.
 * Completely independent of readline to avoid stream conflicts.
 */
function promptPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);

    // Save current stdin state and switch to raw mode
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let password = "";

    const onData = (char) => {
      const key = char.toString();

      if (key === "\n" || key === "\r") {
        // Enter pressed — finish
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(wasRaw);
        process.stdin.pause();
        console.log();
        resolve(password);
      } else if (key === "\u0003") {
        // Ctrl+C — abort
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(wasRaw);
        process.stdin.pause();
        process.exit(130);
      } else if (key === "\u007F" || key === "\b") {
        // Backspace — remove last character
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + "*".repeat(password.length));
        }
      } else if (key >= " ") {
        // Printable character — append to password
        password += key;
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(question + "*".repeat(password.length));
      }
    };

    process.stdin.on("data", onData);
  });
}

async function createUser() {
  console.log("\n=== Yundo User Creator ===\n");

  try {
    // Get username
    const usernameInput = await prompt("Username: ");
    const username = usernameInput.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      console.error(
        "\nError: Username must be 3-20 characters, lowercase alphanumeric or underscore."
      );
      process.exit(1);
    }

    // Get password (hidden — uses raw mode, works on Windows)
    const password = await promptPassword("Password: ");

    if (password.length < 8) {
      console.error("\nError: Password must be at least 8 characters.");
      process.exit(1);
    }

    // Get role
    const roleInput = await prompt("Role (user/admin) [user]: ");
    const role = roleInput.trim() || "user";

    if (!["user", "admin"].includes(role)) {
      console.error("\nError: Role must be 'user' or 'admin'.");
      process.exit(1);
    }

    console.log("\nCreating user...");

    // 1. Check username uniqueness via usernames collection
    const usernameDoc = await db.collection("usernames").doc(username).get();
    if (usernameDoc.exists) {
      console.error(`\nError: Username '${username}' already exists.`);
      process.exit(1);
    }

    // 2. Generate internal email for Firebase Auth
    const firebaseEmail = `${username}@yundo.app`;

    // 3. Create Firebase Auth account (password hashed by Firebase servers)
    const userRecord = await auth.createUser({
      email: firebaseEmail,
      password: password,
      displayName: username,
    });

    // 4. Create Firestore users/{uid} profile document (NEVER stores password)
    await db.collection("users").doc(userRecord.uid).set({
      username: username,
      email: firebaseEmail,
      role: role,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 5. Create Firestore usernames/{username} mapping document
    //    Only stores what the client login flow needs: the email.
    await db.collection("usernames").doc(username).set({
      email: firebaseEmail,
    });

    console.log("\nUser created successfully!");
    console.log(`  UID:      ${userRecord.uid}`);
    console.log(`  Username: ${username}`);
    console.log(`  Email:    ${firebaseEmail} (internal, not used for login)`);
    console.log(`  Role:     ${role}`);
    console.log(
      "\n  The user can now log in with their username and password."
    );
    console.log(
      "  Firebase Auth handles password hashing — no plaintext stored anywhere.\n"
    );
  } catch (error) {
    console.error("\nError creating user:", error.message || error);
    process.exit(1);
  }
}

createUser();
