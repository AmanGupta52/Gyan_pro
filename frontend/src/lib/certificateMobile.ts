import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import api from '@/config/api';

/**
 * Handle certificate PDF download and sharing across Web and Capacitor Android.
 * - On Native Android: downloads file to Cache directory via @capacitor/filesystem
 *   and presents native Android open/share sheet via @capacitor/share.
 * - On Web: triggers browser download window.
 */
export async function downloadOrShareCertificate(
  certificateId: string,
  title = 'GYAN-26 Official Certificate'
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // 1. Fetch PDF binary blob from API
    const response = await api.get(`/certificates/download/${certificateId}`, {
      responseType: 'blob',
    });

    // 2. Convert blob to base64
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(response.data);
    });

    const fileName = `GYAN26_${certificateId}.pdf`;

    // 3. Write file to device cache directory
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    // 4. Open native Android sharing / document viewer intent
    await Share.share({
      title,
      text: `Official Verified Certificate ${certificateId} - GYAN-26 Tournament`,
      url: savedFile.uri,
      dialogTitle: 'Open or Share Certificate',
    });
  } else {
    // Web fallback
    const downloadUrl = `${import.meta.env.VITE_API_URL ?? '/api'}/certificates/download/${certificateId}`;
    window.open(downloadUrl, '_blank');
  }
}
