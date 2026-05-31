import { google } from "googleapis";
import { logger } from "@/utils/logger";

/**
 * Create a folder in Google Drive for an event
 * @param accessToken - Google OAuth access token
 * @param eventName - Name of the event
 * @returns Folder ID
 */
export async function createEventFolder(
  accessToken: string,
  eventName: string
): Promise<string> {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    );

    // Set credentials
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({
      version: "v3",
      auth,
    });

    // Create folder name with date
    const today = new Date().toISOString().split("T")[0];
    const folderName = `${eventName}_${today}`;

    logger.info(`Creating Google Drive folder: ${folderName}`);

    // Create folder
    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, webViewLink",
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error("Failed to create folder: No folder ID returned");
    }

    logger.info(`Google Drive folder created: ${folderId}`);
    return folderId;
  } catch (error) {
    logger.error("Error creating Google Drive folder:", error);
    throw new Error("Failed to create Google Drive folder");
  }
}

/**
 * Share a folder with a user in Google Drive
 * @param accessToken - Google OAuth access token
 * @param folderId - Folder ID to share
 * @param userEmail - Email of the user to share with
 */
export async function shareFolderWithUser(
  accessToken: string,
  folderId: string,
  userEmail: string
): Promise<void> {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    );

    // Set credentials
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({
      version: "v3",
      auth,
    });

    logger.info(`Sharing folder ${folderId} with ${userEmail}`);

    // Share folder
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: "owner",
        type: "user",
        emailAddress: userEmail,
      },
    });

    logger.info(`Folder ${folderId} shared with ${userEmail}`);
  } catch (error) {
    logger.error("Error sharing Google Drive folder:", error);
    throw new Error("Failed to share Google Drive folder");
  }
}

/**
 * Get folder details from Google Drive
 * @param accessToken - Google OAuth access token
 * @param folderId - Folder ID
 * @returns Folder details
 */
export async function getFolderDetails(
  accessToken: string,
  folderId: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    );

    // Set credentials
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({
      version: "v3",
      auth,
    });

    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, webViewLink",
    });

    return {
      id: response.data.id || "",
      name: response.data.name || "",
      webViewLink: response.data.webViewLink || "",
    };
  } catch (error) {
    logger.error("Error getting Google Drive folder details:", error);
    throw new Error("Failed to get Google Drive folder details");
  }
}
