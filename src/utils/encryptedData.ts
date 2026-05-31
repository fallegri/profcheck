/**
 * Encrypted Data Management Utility
 * 
 * This module provides utilities for transparently encrypting and decrypting
 * sensitive data in database operations. It ensures that:
 * - Tokens (access and refresh) are encrypted before storage
 * - Folder IDs are encrypted before storage
 * - Data is automatically decrypted when retrieved
 * - The encryption/decryption is transparent to the rest of the application
 * 
 * Validates: Requirements 11.0, 11.1, 11.2, 11.3, 11.4
 */

import { encrypt, decrypt } from './encryption';
import { logger } from './logger';

/**
 * Sensitive data fields that should be encrypted in the database
 */
export const ENCRYPTED_FIELDS = {
  USER: {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
  },
  EVENT: {
    googleFolderId: 'googleFolderId',
    googleFolderUrl: 'googleFolderUrl',
  },
} as const;

/**
 * Encrypt sensitive user data before storing in database
 * @param userData - User data object
 * @returns User data with encrypted sensitive fields
 */
export function encryptUserData(userData: any): any {
  if (!userData) return userData;

  const encrypted = { ...userData };

  try {
    if (userData.accessToken && typeof userData.accessToken === 'string') {
      encrypted.accessToken = encrypt(userData.accessToken);
    }
    if (userData.refreshToken && typeof userData.refreshToken === 'string') {
      encrypted.refreshToken = encrypt(userData.refreshToken);
    }
  } catch (error) {
    logger.error('Error encrypting user data:', error);
    throw new Error('Failed to encrypt user data');
  }

  return encrypted;
}

/**
 * Decrypt sensitive user data after retrieving from database
 * @param userData - User data object with encrypted fields
 * @returns User data with decrypted sensitive fields
 */
export function decryptUserData(userData: any): any {
  if (!userData) return userData;

  const decrypted = { ...userData };

  try {
    if (userData.accessToken && typeof userData.accessToken === 'string') {
      try {
        decrypted.accessToken = decrypt(userData.accessToken);
      } catch (e) {
        // Token might not be encrypted, use as-is
        logger.warn('Failed to decrypt accessToken, using as-is');
        decrypted.accessToken = userData.accessToken;
      }
    }
    if (userData.refreshToken && typeof userData.refreshToken === 'string') {
      try {
        decrypted.refreshToken = decrypt(userData.refreshToken);
      } catch (e) {
        // Token might not be encrypted, use as-is
        logger.warn('Failed to decrypt refreshToken, using as-is');
        decrypted.refreshToken = userData.refreshToken;
      }
    }
  } catch (error) {
    logger.error('Error decrypting user data:', error);
    throw new Error('Failed to decrypt user data');
  }

  return decrypted;
}

/**
 * Encrypt sensitive event data before storing in database
 * @param eventData - Event data object
 * @returns Event data with encrypted sensitive fields
 */
export function encryptEventData(eventData: any): any {
  if (!eventData) return eventData;

  const encrypted = { ...eventData };

  try {
    if (eventData.googleFolderId && typeof eventData.googleFolderId === 'string') {
      encrypted.googleFolderId = encrypt(eventData.googleFolderId);
    }
    if (eventData.googleFolderUrl && typeof eventData.googleFolderUrl === 'string') {
      encrypted.googleFolderUrl = encrypt(eventData.googleFolderUrl);
    }
  } catch (error) {
    logger.error('Error encrypting event data:', error);
    throw new Error('Failed to encrypt event data');
  }

  return encrypted;
}

/**
 * Decrypt sensitive event data after retrieving from database
 * @param eventData - Event data object with encrypted fields
 * @returns Event data with decrypted sensitive fields
 */
export function decryptEventData(eventData: any): any {
  if (!eventData) return eventData;

  const decrypted = { ...eventData };

  try {
    if (eventData.googleFolderId && typeof eventData.googleFolderId === 'string') {
      try {
        decrypted.googleFolderId = decrypt(eventData.googleFolderId);
      } catch (e) {
        // Folder ID might not be encrypted, use as-is
        logger.warn('Failed to decrypt googleFolderId, using as-is');
        decrypted.googleFolderId = eventData.googleFolderId;
      }
    }
    if (eventData.googleFolderUrl && typeof eventData.googleFolderUrl === 'string') {
      try {
        decrypted.googleFolderUrl = decrypt(eventData.googleFolderUrl);
      } catch (e) {
        // Folder URL might not be encrypted, use as-is
        logger.warn('Failed to decrypt googleFolderUrl, using as-is');
        decrypted.googleFolderUrl = eventData.googleFolderUrl;
      }
    }
  } catch (error) {
    logger.error('Error decrypting event data:', error);
    throw new Error('Failed to decrypt event data');
  }

  return decrypted;
}

/**
 * Encrypt sensitive data in an array of objects
 * @param items - Array of items
 * @param encryptFn - Function to encrypt individual items
 * @returns Array with encrypted items
 */
export function encryptArray<T>(items: T[], encryptFn: (item: T) => T): T[] {
  if (!Array.isArray(items)) return items;
  return items.map(encryptFn);
}

/**
 * Decrypt sensitive data in an array of objects
 * @param items - Array of items with encrypted fields
 * @param decryptFn - Function to decrypt individual items
 * @returns Array with decrypted items
 */
export function decryptArray<T>(items: T[], decryptFn: (item: T) => T): T[] {
  if (!Array.isArray(items)) return items;
  return items.map(decryptFn);
}

/**
 * Verify that sensitive data is properly encrypted
 * @param data - Data to verify
 * @param fields - Fields to check
 * @returns True if all specified fields are encrypted
 */
export function isDataEncrypted(data: any, fields: string[]): boolean {
  if (!data) return false;

  return fields.every((field) => {
    const value = data[field];
    if (!value || typeof value !== 'string') return false;

    // Encrypted data from CryptoJS typically contains 'U2FsdGVkX1' prefix
    // This is a heuristic check
    return value.includes('U2FsdGVkX1') || value.length > 50;
  });
}

/**
 * Safely get encrypted field value
 * @param data - Data object
 * @param field - Field name
 * @param decrypt - Whether to decrypt the value
 * @returns Field value (encrypted or decrypted)
 */
export function getSensitiveField(
  data: any,
  field: string,
  shouldDecrypt: boolean = true
): string | null {
  if (!data || !data[field]) return null;

  const value = data[field];

  if (shouldDecrypt) {
    try {
      return decrypt(value);
    } catch (e) {
      logger.warn(`Failed to decrypt field ${field}, returning as-is`);
      return value;
    }
  }

  return value;
}

/**
 * Safely set encrypted field value
 * @param data - Data object
 * @param field - Field name
 * @param value - Value to encrypt and set
 * @returns Updated data object
 */
export function setSensitiveField(data: any, field: string, value: string): any {
  if (!data) return data;

  const updated = { ...data };

  try {
    updated[field] = encrypt(value);
  } catch (error) {
    logger.error(`Error encrypting field ${field}:`, error);
    throw new Error(`Failed to encrypt field ${field}`);
  }

  return updated;
}
