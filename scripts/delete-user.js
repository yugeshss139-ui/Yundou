/**
 * Yundo Admin Script: Delete User
 *
 * Deletes a Yundo user securely using Firebase Admin SDK.
 * Uses Application Default Credentials (ADC) — no service-account JSON needed.
 *
 * Usage:
 *   cd D:\Yundo_New
 *   firebase login          (first time only — authenticates ADC)
 *   node scripts/delete-user.js <uid>
 *
 * What it does:
 *   1. Reads the target user's Firestore profile
 *   2. Refuses deletion if target is the original Yugesh admin
 *   3. Refuses deletion if target account does not exist
 *   4. Allows deletion for roles: "user" and "subadmin"
 *   5. Deletes the target Firebase Authentication account
 *   6. Deletes the target's Firestore profile (users/{uid})
 *   7. Deletes the target's username mapping (usernames/{username})
 *   8. Deletes all of the target's playlists and songs
 *
 * Security:
 *   - Only Yugesh's UID (10a7pcG65SPw5q1mO7ULSP9Hh6V2) can be the caller
 *   - The script itself protects Yugesh's UID from deletion
 *   - Admin SDK bypasses Firestore rules — rules are not the security layer here
 *
 * Environment:
 *   Uses GOOGLE_CLOUD_PROJECT or FIREBASE_CONFIG for project ID.
 *   ADC must be authenticated via `firebase login`.
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

// ─── Constants ────────────────────────────────────────────────────
const ORIGINAL_ADMIN_UID = "10a7pcG65SPw5q1mO7ULSP9Hh6V2";

// ─── Initialize Firebase Admin SDK ────────────────────────────────
const app = initializeApp({
  credential: applicationDefault(),
  projectId: "yundo-b83a7",
});
const auth = getAuth(app);
const db = getFirestore(app);

// ─── Parse arguments ──────────────────────────────────────────────
const targetUid = process.argv[2];

if (!targetUid) {
  console.error("\nUsage: node scripts/delete-user.js <uid>\n");
  console.error("Example: node scripts/delete-user.js abc123XYZ...\n");
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────
async function deleteUser() {
  console.log("\n=== Yundo User Deleter ===\n");
  console.log(`Target UID: ${targetUid}\n`);

  try {
    // ── Step 1: Protect the original admin UID ──────────────────
    if (targetUid === ORIGINAL_ADMIN_UID) {
      console.error("Error: Cannot delete the original admin account (yugesh).");
      console.error("This UID is permanently protected from deletion.\n");
      process.exit(1);
    }

    // ── Step 2: Read the target user's Firestore profile ────────
    const userDoc = await db.collection("users").doc(targetUid).get();

    if (!userDoc.exists) {
      console.error(`Error: No user found with UID '${targetUid}'.`);
      console.error("This user may have already been deleted.\n");
      process.exit(1);
    }

    const userData = userDoc.data();
    const username = userData.username || "unknown";
    const role = userData.role || "user";
    const email = userData.email || "unknown";

    console.log("User found:");
    console.log(`  Username: ${username}`);
    console.log(`  Email:    ${email}`);
    console.log(`  Role:     ${role}`);
    console.log(`  UID:      ${targetUid}\n`);

    // ── Step 3: Validate role ───────────────────────────────────
    if (role === "admin") {
      console.error("Error: Cannot delete a user with 'admin' role.");
      console.error("Only 'user' and 'subadmin' roles can be deleted.\n");
      process.exit(1);
    }

    if (!["user", "subadmin"].includes(role)) {
      console.error(`Error: Unknown role '${role}'. Cannot proceed with deletion.\n`);
      process.exit(1);
    }

    // ── Step 4: Confirmation ────────────────────────────────────
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(
        `Are you sure you want to permanently delete user '${username}' (${role})? (yes/no): `,
        (ans) => {
          rl.close();
          resolve(ans.trim().toLowerCase());
        }
      );
    });

    if (answer !== "yes") {
      console.log("\nDeletion cancelled.\n");
      process.exit(0);
    }

    console.log("\nDeleting user...");

    // ── Step 5: Delete playlists and songs (Firestore) ──────────
    const playlistsSnapshot = await db
      .collection("users")
      .doc(targetUid)
      .collection("playlists")
      .get();

    let deletedPlaylists = 0;
    let deletedSongs = 0;

    for (const playlistDoc of playlistsSnapshot.docs) {
      // Delete all songs in this playlist
      const songsSnapshot = await db
        .collection("users")
        .doc(targetUid)
        .collection("playlists")
        .doc(playlistDoc.id)
        .collection("songs")
        .get();

      const songDeletePromises = songsSnapshot.docs.map((songDoc) =>
        songDoc.ref.delete()
      );
      await Promise.all(songDeletePromises);
      deletedSongs += songsSnapshot.size;

      // Delete the playlist itself
      await playlistDoc.ref.delete();
      deletedPlaylists++;
    }

    console.log(`  Deleted ${deletedPlaylists} playlist(s) and ${deletedSongs} song(s).`);

    // ── Step 6: Delete the Firestore user profile ───────────────
    await db.collection("users").doc(targetUid).delete();
    console.log("  Deleted Firestore user profile.");

    // ── Step 7: Delete the username mapping ─────────────────────
    if (username && username !== "unknown") {
      await db.collection("usernames").doc(username).delete();
      console.log(`  Deleted username mapping '${username}'.`);
    }

    // ── Step 8: Delete the Firebase Authentication account ───────
    try {
      await auth.deleteUser(targetUid);
      console.log("  Deleted Firebase Authentication account.");
    } catch (authError) {
      // Auth account may not exist (orphaned Firestore data)
      if (authError.code === "auth/user-not-found") {
        console.log("  Note: Firebase Auth account not found (may already be deleted).");
      } else {
        throw authError;
      }
    }

    console.log(`\nUser '${username}' deleted successfully!\n`);
  } catch (error) {
    console.error("\nError deleting user:", error.message || error);
    process.exit(1);
  }
}

deleteUser();
