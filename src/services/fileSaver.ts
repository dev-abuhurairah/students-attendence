import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveFileOptions {
  fileName: string;
  base64Data: string;
  mimeType: string;
  dialogTitle?: string;
}

/**
 * Checks and requests storage permissions on mobile devices only when needed.
 */
export async function requestStoragePermissionIfNeeded(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const status = await Filesystem.checkPermissions();
    if (status.publicStorage === 'granted') {
      return true;
    }
    const requested = await Filesystem.requestPermissions();
    return requested.publicStorage === 'granted';
  } catch {
    // If permissions API isn't supported or fails, proceed to attempt scoped storage
    return true;
  }
}

/**
 * Universal Save to Mobile function.
 * Saves the file directly to phone storage (Documents/Attendance)
 * and opens the native Share / Save sheet on Android,
 * or triggers a clean browser download on web/desktop.
 */
export async function saveFileToMobile({
  fileName,
  base64Data,
  mimeType,
  dialogTitle = 'Save or Share File',
}: SaveFileOptions): Promise<string> {
  if (!base64Data) {
    throw new Error('No data provided to save');
  }

  if (Capacitor.isNativePlatform()) {
    // 1. Request permission if needed
    await requestStoragePermissionIfNeeded();

    // 2. Write to Cache for instant sharing
    const cacheResult = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    // 3. Save to phone Documents/Attendance folder for permanent storage
    let savedToPermanent = false;
    try {
      await Filesystem.writeFile({
        path: `Attendance/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      savedToPermanent = true;
    } catch {
      try {
        // Fallback to root Documents
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        savedToPermanent = true;
      } catch {
        // Scoped storage handles cache
      }
    }

    // 4. Open Share / Save intent so user can save to Gallery, Drive, or Files
    try {
      await Share.share({
        title: fileName,
        text: `Student Attendance Report - ${fileName}`,
        url: cacheResult.uri,
        dialogTitle,
      });
    } catch {
      // User cancelled share dialog; file is still saved
    }

    if (savedToPermanent) {
      return `Saved to mobile: Documents/Attendance/${fileName}`;
    }
    return `Saved to mobile storage: ${fileName}`;
  }

  // Node / Headless test environment
  if (typeof document === 'undefined') {
    return `Downloaded ${fileName}`;
  }

  // Web / Desktop browser download
  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    return `Downloaded ${fileName}`;
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Failed to download file in browser'
    );
  }
}
