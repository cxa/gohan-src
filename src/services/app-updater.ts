import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

const CURRENT_VERSION: string = (require('../../package.json') as { version: string }).version;

const GITHUB_OWNER = 'cxa';
const GITHUB_REPO = 'yifan';

export type UpdateInfo = {
  version: string;
  downloadUrl: string;
};

function isNewer(latest: string, current: string): boolean {
  const lParts = latest.split('.').map(p => parseInt(p, 10));
  const cParts = current.split('.').map(p => parseInt(p, 10));
  const len = Math.max(lParts.length, cParts.length);
  for (let i = 0; i < len; i++) {
    const l = lParts[i] ?? 0;
    const c = cParts[i] ?? 0;
    if (l !== c) return l > c;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (Platform.OS !== 'android') return null;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    { headers: { Accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) return null;

  const release: {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
  } = await res.json();

  const latestVersion = release.tag_name.replace(/^v/, '');
  if (!isNewer(latestVersion, CURRENT_VERSION)) return null;

  const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
  if (!apkAsset) return null;

  return { version: latestVersion, downloadUrl: apkAsset.browser_download_url };
}

export async function downloadAndInstall(
  downloadUrl: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/yifan-update.apk`;

  if (await RNBlobUtil.fs.exists(destPath)) {
    await RNBlobUtil.fs.unlink(destPath);
  }

  await RNBlobUtil.config({ path: destPath })
    .fetch('GET', downloadUrl)
    .progress({ interval: 300 }, (received, total) => {
      const t = Number(total);
      if (t > 0) onProgress(Math.floor((Number(received) / t) * 100));
    });

  await RNBlobUtil.android.actionViewIntent(
    destPath,
    'application/vnd.android.package-archive',
  );
}
