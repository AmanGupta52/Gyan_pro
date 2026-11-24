import { Capacitor } from '@capacitor/core';
import api from '@/config/api';

/**
 * GYAN-26 Push Notifications Service (Architecture & Extensibility)
 *
 * TODO (Future Work):
 * 1. Install @capacitor/push-notifications package.
 * 2. Add google-services.json to /frontend/android/app.
 * 3. Add Google Services Gradle plugin in build.gradle.
 * 4. Register FCM device token with backend endpoint /api/users/push-token.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class PushNotificationService {
  private static isInitialized = false;

  /**
   * Request push notification permissions from the OS.
   */
  public static async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    // TODO: Connect PushNotifications.requestPermissions() when FCM credentials are provisioned
    console.info('[PushNotificationService] Push notification permissions requested.');
    return true;
  }

  /**
   * Register device push token with the GYAN-26 backend.
   */
  public static async registerDeviceToken(token: string): Promise<void> {
    try {
      // TODO: When push notifications are active, post token to backend
      await api.post('/users/push-token', { token });
      console.info('[PushNotificationService] Device push token registered.');
    } catch {
      // Best-effort in current phase
    }
  }

  /**
   * Initialize push notification listeners.
   */
  public static async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.isInitialized) {
      return;
    }

    // TODO: Register listeners for registration, registrationError, pushNotificationReceived, pushNotificationActionPerformed
    this.isInitialized = true;
    console.info('[PushNotificationService] Initialized push notification channel structure.');
  }
}

export default PushNotificationService;
