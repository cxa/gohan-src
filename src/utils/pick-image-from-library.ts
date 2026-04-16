import { launchImageLibrary } from 'react-native-image-picker';
import { NativeModules, Platform } from 'react-native';

export type PickedImageData = {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

export type PickedImage = PickedImageData & {
  livePhotoStaticFallback?: boolean;
  stillImage?: PickedImageData;
};

const IMAGE_PICKER_OPTIONS = {
  mediaType: 'photo',
  selectionLimit: 1,
  includeBase64: true,
  quality: 1,
} as const;

type LivePhotoResult = {
  base64: string;
  mimeType: string;
  fileName: string;
  fileUrl?: string;
  stillImage?: {
    base64: string;
    mimeType: string;
    fileName: string;
    fileUrl?: string;
  };
};

type LivePhotoModuleType = {
  pickImageFromLibrary: () => Promise<LivePhotoResult | null>;
};

const getLivePhotoModule = (): LivePhotoModuleType | undefined =>
  Platform.OS === 'ios'
    ? (NativeModules.LivePhotoModule as LivePhotoModuleType | undefined)
    : undefined;

const inferMimeType = (
  type: string | undefined,
  fileName: string | undefined,
): string => {
  if (type && type !== 'application/octet-stream') {
    // iOS image picker reports 'image/jpg' which is not a registered MIME type
    if (type === 'image/jpg') return 'image/jpeg';
    return type;
  }
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'gif') return 'image/gif';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
};

const inferFileName = (
  fileName: string | undefined,
  mimeType: string,
): string => {
  if (fileName) return fileName;
  const ext = mimeType.split('/')[1] ?? 'jpg';
  return `image.${ext}`;
};

const toPickedImage = (image: LivePhotoResult): PickedImage => {
  const result: PickedImage = {
    uri: image.fileUrl ?? `data:${image.mimeType};base64,${image.base64}`,
    base64: image.base64,
    mimeType: image.mimeType,
    fileName: image.fileName,
  };
  if (image.stillImage) {
    result.stillImage = {
      uri:
        image.stillImage.fileUrl ??
        `data:${image.stillImage.mimeType};base64,${image.stillImage.base64}`,
      base64: image.stillImage.base64,
      mimeType: image.stillImage.mimeType,
      fileName: image.stillImage.fileName,
    };
  }
  return result;
};

export const pickImageFromLibrary = async (): Promise<PickedImage | null> => {
  const livePhotoModule = getLivePhotoModule();
  if (livePhotoModule) {
    const image = await livePhotoModule.pickImageFromLibrary();
    return image ? toPickedImage(image) : null;
  }

  const result = await launchImageLibrary(IMAGE_PICKER_OPTIONS);

  if (result.didCancel) {
    return null;
  }

  if (result.errorCode) {
    throw new Error(result.errorMessage ?? result.errorCode);
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('Unable to read selected photo.');
  }

  if (!asset.base64) {
    throw new Error('Selected photo is missing base64 data.');
  }

  const mimeType = inferMimeType(asset.type, asset.fileName);
  const fileName = inferFileName(asset.fileName, mimeType);

  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType,
    fileName,
  };
};
