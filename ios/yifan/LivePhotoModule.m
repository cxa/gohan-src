#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <Photos/Photos.h>
#import <PhotosUI/PhotosUI.h>
#import <AVFoundation/AVFoundation.h>
#import <ImageIO/ImageIO.h>
#import <UIKit/UIKit.h>

static const int kMaxGifDimension = 480;
static const int kMaxFrames = 60;
static const float kMaxGifFPS = 20.0;
static const float kDefaultGifFPS = 20.0;
static const CGFloat kMaxStillImageDimension = 1920.0;
static const CGFloat kStillImageCompressionQuality = 0.85;
static const NSUInteger kMaxPhotoFileSize = 2 * 1024 * 1024;

static NSString *YFMimeTypeForExtension(NSString *extension) {
  NSString *ext = extension.lowercaseString;
  if ([ext isEqualToString:@"gif"]) return @"image/gif";
  if ([ext isEqualToString:@"png"]) return @"image/png";
  if ([ext isEqualToString:@"heic"]) return @"image/heic";
  if ([ext isEqualToString:@"heif"]) return @"image/heif";
  return @"image/jpeg";
}

static NSString *YFFileNameForMimeType(NSString *mimeType) {
  if ([mimeType isEqualToString:@"image/gif"]) return @"image.gif";
  if ([mimeType isEqualToString:@"image/png"]) return @"image.png";
  if ([mimeType isEqualToString:@"image/heic"]) return @"image.heic";
  if ([mimeType isEqualToString:@"image/heif"]) return @"image.heif";
  return @"image.jpg";
}

static NSString *YFWriteGifPreviewFile(NSData *gifData) {
  NSString *fileName = [NSString stringWithFormat:@"livephoto-%@.gif", [[NSUUID UUID] UUIDString]];
  NSURL *fileURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:fileName]];
  BOOL didWrite = [gifData writeToURL:fileURL atomically:YES];
  return didWrite ? fileURL.absoluteString : nil;
}

static NSData *YFNormalizedGifData(NSData *gifData) {
  if (gifData.length < 6) {
    return gifData;
  }
  const unsigned char *bytes = gifData.bytes;
  if (memcmp(bytes, "GIF87a", 6) != 0) {
    return gifData;
  }
  NSMutableData *normalized = [gifData mutableCopy];
  const char version[] = {'8', '9', 'a'};
  [normalized replaceBytesInRange:NSMakeRange(3, 3) withBytes:version];
  return normalized;
}

static NSString *YFFileNameByReplacingExtension(NSString *fileName, NSString *extension) {
  if (fileName.length == 0) {
    return YFFileNameForMimeType([NSString stringWithFormat:@"image/%@", extension]);
  }
  NSString *baseName = [fileName stringByDeletingPathExtension];
  if (baseName.length == 0) {
    baseName = @"image";
  }
  return [baseName stringByAppendingPathExtension:extension];
}

static NSMutableDictionary *YFImageResult(NSData *data, NSString *mimeType, NSString *fileName) {
  if (data.length == 0) {
    return nil;
  }

  NSString *resolvedMimeType = mimeType.length > 0 ? mimeType : @"image/jpeg";
  NSString *resolvedFileName = fileName.length > 0 ? fileName : YFFileNameForMimeType(resolvedMimeType);
  NSString *extension = resolvedFileName.pathExtension.length > 0
    ? resolvedFileName.pathExtension
    : YFFileNameForMimeType(resolvedMimeType).pathExtension;
  NSString *tempName = [NSString stringWithFormat:@"picked-%@.%@", [[NSUUID UUID] UUIDString], extension];
  NSURL *fileURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:tempName]];
  [data writeToURL:fileURL atomically:YES];

  NSMutableDictionary *result = [@{
    @"base64": [data base64EncodedStringWithOptions:0],
    @"mimeType": resolvedMimeType,
    @"fileName": resolvedFileName,
  } mutableCopy];
  if ([[NSFileManager defaultManager] fileExistsAtPath:fileURL.path]) {
    result[@"fileUrl"] = fileURL.absoluteString;
  }
  return result;
}

static NSMutableDictionary *YFUploadableImageResult(NSData *data, NSString *mimeType, NSString *fileName) {
  if ([mimeType isEqualToString:@"image/gif"]) {
    return YFImageResult(data, mimeType, fileName);
  }

  UIImage *image = [UIImage imageWithData:data];
  if (!image) {
    return YFImageResult(data, mimeType, fileName);
  }

  CGSize sourceSize = image.size;
  CGFloat maxDim = kMaxStillImageDimension;
  NSData *jpegData = nil;

  for (int attempt = 0; attempt < 3; attempt++) {
    CGFloat longestSide = MAX(sourceSize.width, sourceSize.height);
    CGFloat dimScale = longestSide > maxDim ? maxDim / longestSide : 1.0;
    CGSize targetSize = CGSizeMake(MAX(1.0, sourceSize.width * dimScale), MAX(1.0, sourceSize.height * dimScale));
    UIGraphicsBeginImageContextWithOptions(targetSize, NO, 1.0);
    [image drawInRect:CGRectMake(0, 0, targetSize.width, targetSize.height)];
    UIImage *resized = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    jpegData = resized ? UIImageJPEGRepresentation(resized, kStillImageCompressionQuality) : nil;
    if (!jpegData || jpegData.length == 0) break;
    if (jpegData.length <= kMaxPhotoFileSize) break;
    CGFloat sizeRatio = sqrt((double)kMaxPhotoFileSize / (double)jpegData.length) * 0.9;
    maxDim = MAX(maxDim * sizeRatio, 320);
  }

  if (jpegData.length > 0) {
    return YFImageResult(jpegData, @"image/jpeg", YFFileNameByReplacingExtension(fileName, @"jpg"));
  }

  return YFImageResult(data, mimeType, fileName);
}

@interface LivePhotoModule : NSObject <RCTBridgeModule, PHPickerViewControllerDelegate>
@property (nonatomic, copy) RCTPromiseResolveBlock pickerResolve;
@property (nonatomic, copy) RCTPromiseRejectBlock pickerReject;
@end

@implementation LivePhotoModule

RCT_EXPORT_MODULE()

/// Pick one image with PHPicker. Live Photos are converted from the picker-provided
/// bundle directly, so this does not require Photos library permission.
RCT_EXPORT_METHOD(pickImageFromLibrary:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (@available(iOS 14, *)) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (self.pickerResolve) {
        reject(@"PICKER_BUSY", @"Image picker is already open", nil);
        return;
      }

      self.pickerResolve = resolve;
      self.pickerReject = reject;

      PHPickerConfiguration *configuration = [[PHPickerConfiguration alloc] init];
      configuration.selectionLimit = 1;
      configuration.filter = [PHPickerFilter imagesFilter];
      configuration.preferredAssetRepresentationMode = PHPickerConfigurationAssetRepresentationModeCurrent;

      PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:configuration];
      picker.delegate = self;
      picker.modalPresentationStyle = UIModalPresentationFullScreen;

      UIViewController *presented = RCTPresentedViewController();
      [presented presentViewController:picker animated:YES completion:nil];
    });
  } else {
    reject(@"PICKER_UNAVAILABLE", @"PHPicker requires iOS 14 or newer", nil);
  }
}

- (void)resolvePicker:(id)value {
  RCTPromiseResolveBlock resolve = self.pickerResolve;
  self.pickerResolve = nil;
  self.pickerReject = nil;
  if (resolve) {
    resolve(value ?: [NSNull null]);
  }
}

- (void)rejectPicker:(NSString *)code message:(NSString *)message error:(NSError *)error {
  RCTPromiseRejectBlock reject = self.pickerReject;
  self.pickerResolve = nil;
  self.pickerReject = nil;
  if (reject) {
    reject(code, message, error);
  }
}

+ (NSString *)livePhotoBundleIdentifierForProvider:(NSItemProvider *)provider {
  for (NSString *identifier in provider.registeredTypeIdentifiers) {
    if ([identifier containsString:@"live-photo-bundle"] ||
        [identifier isEqualToString:@"com.apple.live-photo"]) {
      return identifier;
    }
  }
  return nil;
}

+ (NSString *)imageIdentifierForProvider:(NSItemProvider *)provider {
  NSArray<NSString *> *preferred = @[
    @"com.compuserve.gif",
    @"public.png",
    @"public.jpeg",
    @"public.heic",
    @"public.heif",
    @"public.image",
  ];
  for (NSString *identifier in preferred) {
    if ([provider hasItemConformingToTypeIdentifier:identifier]) {
      return identifier;
    }
  }
  return nil;
}

+ (NSURL *)firstFileInURL:(NSURL *)rootURL extensions:(NSSet<NSString *> *)extensions {
  NSString *rootExtension = rootURL.pathExtension.lowercaseString;
  if ([extensions containsObject:rootExtension]) {
    return rootURL;
  }

  NSDirectoryEnumerator<NSURL *> *enumerator = [[NSFileManager defaultManager]
    enumeratorAtURL:rootURL
    includingPropertiesForKeys:nil
    options:0
    errorHandler:nil];
  for (NSURL *url in enumerator) {
    NSString *extension = url.pathExtension.lowercaseString;
    if ([extensions containsObject:extension]) {
      return url;
    }
  }
  return nil;
}

- (void)loadImageFromProvider:(NSItemProvider *)provider {
  NSString *imageIdentifier = [LivePhotoModule imageIdentifierForProvider:provider];
  if (!imageIdentifier) {
    [self rejectPicker:@"NO_IMAGE" message:@"Selected item is not an image" error:nil];
    return;
  }

  [provider loadFileRepresentationForTypeIdentifier:imageIdentifier completionHandler:^(NSURL *url, NSError *error) {
    if (error || !url) {
      [self rejectPicker:@"IMAGE_LOAD_FAILED" message:error.localizedDescription ?: @"Failed to load image" error:error];
      return;
    }

    BOOL scoped = [url startAccessingSecurityScopedResource];
    NSData *data = [NSData dataWithContentsOfURL:url];
    if (scoped) {
      [url stopAccessingSecurityScopedResource];
    }

    NSString *mimeType = YFMimeTypeForExtension(url.pathExtension);
    NSString *fileName = url.lastPathComponent.length > 0 ? url.lastPathComponent : YFFileNameForMimeType(mimeType);
    NSMutableDictionary *result = YFUploadableImageResult(data, mimeType, fileName);
    if (!result) {
      [self rejectPicker:@"IMAGE_INVALID" message:@"Selected image data is empty" error:nil];
      return;
    }
    [self resolvePicker:result];
  }];
}

- (void)loadLivePhotoFromProvider:(NSItemProvider *)provider identifier:(NSString *)identifier {
  [provider loadFileRepresentationForTypeIdentifier:identifier completionHandler:^(NSURL *url, NSError *error) {
    if (error || !url) {
      [self loadImageFromProvider:provider];
      return;
    }

    BOOL scoped = [url startAccessingSecurityScopedResource];
    NSURL *videoURL = [LivePhotoModule firstFileInURL:url extensions:[NSSet setWithObjects:@"mov", @"mp4", nil]];
    NSURL *stillURL = [LivePhotoModule firstFileInURL:url extensions:[NSSet setWithObjects:@"heic", @"heif", @"jpg", @"jpeg", @"png", nil]];

    NSData *gifData = nil;
    if (videoURL) {
      NSError *gifError = nil;
      gifData = [LivePhotoModule createGifFromVideoAtURL:videoURL
                                            maxDimension:kMaxGifDimension
                                               maxFrames:kMaxFrames
                                                   error:&gifError];
    }

    if (gifData.length > 0) {
      NSMutableDictionary *result = YFImageResult(gifData, @"image/gif", @"livephoto.gif");
      NSString *fileUrl = YFWriteGifPreviewFile(gifData);
      if (fileUrl.length > 0) {
        result[@"fileUrl"] = fileUrl;
      }
      if (scoped) {
        [url stopAccessingSecurityScopedResource];
      }
      [self resolvePicker:result];
      return;
    }

    if (stillURL) {
      NSData *data = [NSData dataWithContentsOfURL:stillURL];
      NSString *mimeType = YFMimeTypeForExtension(stillURL.pathExtension);
      NSString *fileName = stillURL.lastPathComponent.length > 0 ? stillURL.lastPathComponent : YFFileNameForMimeType(mimeType);
      NSMutableDictionary *result = YFUploadableImageResult(data, mimeType, fileName);
      if (scoped) {
        [url stopAccessingSecurityScopedResource];
      }
      if (result) {
        [self resolvePicker:result];
      } else {
        [self loadImageFromProvider:provider];
      }
      return;
    }

    if (scoped) {
      [url stopAccessingSecurityScopedResource];
    }
    [self loadImageFromProvider:provider];
  }];
}

- (void)picker:(PHPickerViewController *)picker didFinishPicking:(NSArray<PHPickerResult *> *)results API_AVAILABLE(ios(14))
{
  [picker dismissViewControllerAnimated:YES completion:nil];

  PHPickerResult *result = results.firstObject;
  if (!result) {
    [self resolvePicker:[NSNull null]];
    return;
  }

  NSItemProvider *provider = result.itemProvider;
  NSString *livePhotoIdentifier = [LivePhotoModule livePhotoBundleIdentifierForProvider:provider];
  if (livePhotoIdentifier) {
    [self loadLivePhotoFromProvider:provider identifier:livePhotoIdentifier];
    return;
  }

  [self loadImageFromProvider:provider];
}

/// Request full Photos library access (needed for Live Photo video extraction).
/// Resolves with the authorization status string.
RCT_EXPORT_METHOD(requestFullAccess:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelReadWrite handler:^(PHAuthorizationStatus status) {
    NSString *statusStr;
    switch (status) {
      case PHAuthorizationStatusAuthorized: statusStr = @"authorized"; break;
      case PHAuthorizationStatusLimited:    statusStr = @"limited"; break;
      case PHAuthorizationStatusDenied:     statusStr = @"denied"; break;
      case PHAuthorizationStatusRestricted: statusStr = @"restricted"; break;
      default:                              statusStr = @"notDetermined"; break;
    }
    resolve(statusStr);
  }];
}

/// Convert a Live Photo's video component to an animated GIF.
/// Returns { base64, mimeType, fileName } or rejects if not a Live Photo.
RCT_EXPORT_METHOD(convertToGif:(NSString *)assetIdentifier
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    PHFetchResult *fetchResult = [PHAsset fetchAssetsWithLocalIdentifiers:@[assetIdentifier] options:nil];
    PHAsset *asset = fetchResult.firstObject;

    if (!asset || !(asset.mediaSubtypes & PHAssetMediaSubtypePhotoLive)) {
      reject(@"NOT_LIVE_PHOTO", @"Asset is not a Live Photo", nil);
      return;
    }

    // Find the paired video resource
    NSArray<PHAssetResource *> *resources = [PHAssetResource assetResourcesForAsset:asset];
    PHAssetResource *videoResource = nil;
    for (PHAssetResource *resource in resources) {
      if (resource.type == PHAssetResourceTypePairedVideo) {
        videoResource = resource;
        break;
      }
    }

    if (!videoResource) {
      reject(@"NO_VIDEO", @"No paired video found in Live Photo", nil);
      return;
    }

    // Export video to a temp file
    NSString *tempFileName = [NSString stringWithFormat:@"livephoto-%@.mov", [[NSUUID UUID] UUIDString]];
    NSString *tempPath = [NSTemporaryDirectory() stringByAppendingPathComponent:tempFileName];
    NSURL *tempURL = [NSURL fileURLWithPath:tempPath];

    PHAssetResourceRequestOptions *exportOptions = [[PHAssetResourceRequestOptions alloc] init];
    exportOptions.networkAccessAllowed = YES;

    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block NSError *exportError = nil;

    [[PHAssetResourceManager defaultManager] writeDataForAssetResource:videoResource
                                                                toFile:tempURL
                                                               options:exportOptions
                                                     completionHandler:^(NSError *error) {
      exportError = error;
      dispatch_semaphore_signal(semaphore);
    }];
    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

    if (exportError) {
      reject(@"EXPORT_FAILED", exportError.localizedDescription, exportError);
      return;
    }

    // Convert video frames to GIF
    NSError *gifError = nil;
    NSData *gifData = [LivePhotoModule createGifFromVideoAtURL:tempURL
                                                  maxDimension:kMaxGifDimension
                                                     maxFrames:kMaxFrames
                                                         error:&gifError];

    // Clean up temp video
    [[NSFileManager defaultManager] removeItemAtURL:tempURL error:nil];

    if (!gifData) {
      reject(@"GIF_FAILED", gifError.localizedDescription ?: @"GIF conversion failed", gifError);
      return;
    }

    NSString *base64 = [gifData base64EncodedStringWithOptions:0];
    NSString *fileUrl = YFWriteGifPreviewFile(gifData);
    NSMutableDictionary *result = [@{
      @"base64": base64,
      @"mimeType": @"image/gif",
      @"fileName": @"livephoto.gif",
    } mutableCopy];
    if (fileUrl.length > 0) {
      result[@"fileUrl"] = fileUrl;
    }
    resolve(result);
  });
}

/// Convert a Live Photo to GIF by matching its EXIF creation date.
/// The date string is in EXIF format: "yyyy:MM:dd HH:mm:ss".
/// Used when the share extension can't extract the video itself.
RCT_EXPORT_METHOD(convertLivePhotoByDate:(NSString *)exifDateString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  // Ensure Photos authorization before accessing the library
  [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelReadWrite handler:^(PHAuthorizationStatus status) {
    if (status != PHAuthorizationStatusAuthorized && status != PHAuthorizationStatusLimited) {
      reject(@"NO_AUTH", @"Photos library access denied", nil);
      return;
    }

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    // Parse the EXIF date string (format: "yyyy:MM:dd HH:mm:ss")
    NSDateFormatter *exifFormatter = [[NSDateFormatter alloc] init];
    exifFormatter.dateFormat = @"yyyy:MM:dd HH:mm:ss";
    exifFormatter.locale = [[NSLocale alloc] initWithLocaleIdentifier:@"en_US_POSIX"];
    NSDate *targetDate = [exifFormatter dateFromString:exifDateString];

    PHFetchOptions *fetchOptions = [[PHFetchOptions alloc] init];
    if (targetDate) {
      // Search within a 5-second window around the EXIF date
      NSDate *startDate = [targetDate dateByAddingTimeInterval:-2.5];
      NSDate *endDate = [targetDate dateByAddingTimeInterval:2.5];
      fetchOptions.predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[
        [NSPredicate predicateWithFormat:@"mediaSubtype == %d", PHAssetMediaSubtypePhotoLive],
        [NSPredicate predicateWithFormat:@"creationDate >= %@", startDate],
        [NSPredicate predicateWithFormat:@"creationDate <= %@", endDate],
      ]];
    } else {
      // Fallback: most recent Live Photo
      fetchOptions.predicate = [NSPredicate predicateWithFormat:@"mediaSubtype == %d", PHAssetMediaSubtypePhotoLive];
      fetchOptions.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"creationDate" ascending:NO]];
      fetchOptions.fetchLimit = 1;
    }

    PHFetchResult *fetchResult = [PHAsset fetchAssetsWithMediaType:PHAssetMediaTypeImage options:fetchOptions];
    PHAsset *asset = fetchResult.firstObject;

    if (!asset) {
      reject(@"NO_LIVE_PHOTO", @"No Live Photo found in library", nil);
      return;
    }

    // Find the paired video resource
    NSArray<PHAssetResource *> *resources = [PHAssetResource assetResourcesForAsset:asset];
    PHAssetResource *videoResource = nil;
    for (PHAssetResource *resource in resources) {
      if (resource.type == PHAssetResourceTypePairedVideo) {
        videoResource = resource;
        break;
      }
    }

    if (!videoResource) {
      reject(@"NO_VIDEO", @"No paired video found in Live Photo", nil);
      return;
    }

    // Export video to a temp file
    NSString *tempFileName = [NSString stringWithFormat:@"livephoto-%@.mov", [[NSUUID UUID] UUIDString]];
    NSString *tempPath = [NSTemporaryDirectory() stringByAppendingPathComponent:tempFileName];
    NSURL *tempURL = [NSURL fileURLWithPath:tempPath];

    PHAssetResourceRequestOptions *exportOptions = [[PHAssetResourceRequestOptions alloc] init];
    exportOptions.networkAccessAllowed = YES;

    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block NSError *exportError = nil;

    [[PHAssetResourceManager defaultManager] writeDataForAssetResource:videoResource
                                                                toFile:tempURL
                                                               options:exportOptions
                                                     completionHandler:^(NSError *error) {
      exportError = error;
      dispatch_semaphore_signal(semaphore);
    }];
    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

    if (exportError) {
      reject(@"EXPORT_FAILED", exportError.localizedDescription, exportError);
      return;
    }

    NSError *gifError = nil;
    NSData *gifData = [LivePhotoModule createGifFromVideoAtURL:tempURL
                                                  maxDimension:kMaxGifDimension
                                                     maxFrames:kMaxFrames
                                                         error:&gifError];

    [[NSFileManager defaultManager] removeItemAtURL:tempURL error:nil];

    if (!gifData) {
      reject(@"GIF_FAILED", gifError.localizedDescription ?: @"GIF conversion failed", gifError);
      return;
    }

    NSString *base64 = [gifData base64EncodedStringWithOptions:0];
    NSString *fileUrl = YFWriteGifPreviewFile(gifData);
    NSMutableDictionary *result = [@{
      @"base64": base64,
      @"mimeType": @"image/gif",
      @"fileName": @"livephoto.gif",
    } mutableCopy];
    if (fileUrl.length > 0) {
      result[@"fileUrl"] = fileUrl;
    }
    resolve(result);
  }); // dispatch_async
  }]; // requestAuthorizationForAccessLevel
}

+ (NSData *)createGifFromVideoAtURL:(NSURL *)videoURL
                        maxDimension:(int)maxDimension
                           maxFrames:(int)maxFrames
                               error:(NSError **)outError {
  AVURLAsset *videoAsset = [AVURLAsset assetWithURL:videoURL];
  AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:videoAsset];
  generator.appliesPreferredTrackTransform = YES;
  generator.requestedTimeToleranceBefore = kCMTimeZero;
  generator.requestedTimeToleranceAfter = kCMTimeZero;
  generator.maximumSize = CGSizeMake(maxDimension, maxDimension);

  CMTime duration = videoAsset.duration;
  Float64 durationSeconds = CMTimeGetSeconds(duration);
  if (durationSeconds <= 0) {
    if (outError) {
      *outError = [NSError errorWithDomain:@"LivePhoto" code:1
                                  userInfo:@{NSLocalizedDescriptionKey: @"Video has zero duration"}];
    }
    return nil;
  }

  // Read the native video frame rate from the first video track
  float nativeFPS = kDefaultGifFPS;
  NSArray<AVAssetTrack *> *videoTracks = [videoAsset tracksWithMediaType:AVMediaTypeVideo];
  if (videoTracks.count > 0) {
    float trackFPS = videoTracks.firstObject.nominalFrameRate;
    if (trackFPS > 0) {
      nativeFPS = trackFPS;
    }
  }
  // Cap at a reasonable max to keep file size in check
  float gifFPS = MIN(nativeFPS, kMaxGifFPS);

  int frameCount = (int)(durationSeconds * gifFPS);
  if (frameCount < 1) frameCount = 1;
  if (frameCount > maxFrames) frameCount = maxFrames;
  Float64 frameInterval = durationSeconds / frameCount;
  Float64 frameDelay = frameInterval; // actual delay per frame to match real duration

  NSMutableData *gifData = [NSMutableData data];
  CGImageDestinationRef dest = CGImageDestinationCreateWithData(
    (__bridge CFMutableDataRef)gifData,
    CFSTR("com.compuserve.gif"),
    frameCount,
    NULL);

  if (!dest) {
    if (outError) {
      *outError = [NSError errorWithDomain:@"LivePhoto" code:2
                                  userInfo:@{NSLocalizedDescriptionKey: @"Failed to create GIF destination"}];
    }
    return nil;
  }

  // Infinite loop
  NSDictionary *gifProperties = @{
    (__bridge NSString *)kCGImagePropertyGIFDictionary: @{
      (__bridge NSString *)kCGImagePropertyGIFLoopCount: @0,
    },
  };
  CGImageDestinationSetProperties(dest, (__bridge CFDictionaryRef)gifProperties);

  NSDictionary *frameProperties = @{
    (__bridge NSString *)kCGImagePropertyGIFDictionary: @{
      (__bridge NSString *)kCGImagePropertyGIFDelayTime: @(frameDelay),
    },
  };

  int addedFrames = 0;
  for (int i = 0; i < frameCount; i++) {
    CMTime time = CMTimeMakeWithSeconds(i * frameInterval, 600);
    NSError *frameError = nil;
    CGImageRef image = [generator copyCGImageAtTime:time actualTime:NULL error:&frameError];
    if (image) {
      CGImageDestinationAddImage(dest, image, (__bridge CFDictionaryRef)frameProperties);
      CGImageRelease(image);
      addedFrames++;
    }
  }

  if (addedFrames == 0) {
    CFRelease(dest);
    if (outError) {
      *outError = [NSError errorWithDomain:@"LivePhoto" code:3
                                  userInfo:@{NSLocalizedDescriptionKey: @"No frames extracted from video"}];
    }
    return nil;
  }

  BOOL success = CGImageDestinationFinalize(dest);
  CFRelease(dest);

  if (!success) {
    if (outError) {
      *outError = [NSError errorWithDomain:@"LivePhoto" code:4
                                  userInfo:@{NSLocalizedDescriptionKey: @"Failed to finalize GIF"}];
    }
    return nil;
  }

  NSData *normalizedData = YFNormalizedGifData(gifData);
  if (normalizedData.length > kMaxPhotoFileSize && maxDimension > 160) {
    CGFloat scale = sqrt((double)kMaxPhotoFileSize / (double)normalizedData.length) * 0.9;
    int newDimension = MAX((int)(maxDimension * scale), 160);
    NSLog(@"[LivePhoto] GIF %lu bytes exceeds %lu limit, retrying at %dpx",
          (unsigned long)normalizedData.length, (unsigned long)kMaxPhotoFileSize, newDimension);
    NSData *retry = [self createGifFromVideoAtURL:videoURL maxDimension:newDimension maxFrames:maxFrames error:outError];
    if (retry) return retry;
  }
  return normalizedData;
}

@end
