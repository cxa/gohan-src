#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>

@interface SharedImageModule : NSObject <RCTBridgeModule>
@end

@implementation SharedImageModule

RCT_EXPORT_MODULE()

// Read a specific file by name and delete it.
RCT_EXPORT_METHOD(readAndClear:(NSString *)fileName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *containerURL = [[NSFileManager defaultManager]
    containerURLForSecurityApplicationGroupIdentifier:@"group.im.cxa.fanatter"];
  if (!containerURL) {
    reject(@"NO_CONTAINER", @"App Group container unavailable", nil);
    return;
  }

  NSURL *fileURL = [containerURL URLByAppendingPathComponent:fileName];
  NSData *data = [NSData dataWithContentsOfURL:fileURL];
  if (!data) {
    reject(@"NO_FILE", @"No shared image found", nil);
    return;
  }

  [[NSFileManager defaultManager] removeItemAtURL:fileURL error:nil];
  resolve([data base64EncodedStringWithOptions:0]);
}

// Find the oldest pending share-image-*.jpg in the App Group container,
// read it as base64, delete it, and return the base64 string.
// Returns nil (resolves with NSNull) if no pending image exists.
RCT_EXPORT_METHOD(readAndClearPending:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *containerURL = [[NSFileManager defaultManager]
    containerURLForSecurityApplicationGroupIdentifier:@"group.im.cxa.fanatter"];
  if (!containerURL) {
    resolve([NSNull null]);
    return;
  }

  NSArray *contents = [[NSFileManager defaultManager]
    contentsOfDirectoryAtURL:containerURL
    includingPropertiesForKeys:@[NSURLCreationDateKey]
    options:NSDirectoryEnumerationSkipsHiddenFiles
    error:nil];

  // Find all share-image-*.jpg files sorted by creation date (oldest first)
  NSArray *shareFiles = [contents filteredArrayUsingPredicate:
    [NSPredicate predicateWithBlock:^BOOL(NSURL *url, NSDictionary *bindings) {
      return [url.lastPathComponent hasPrefix:@"share-image-"] &&
             [url.pathExtension isEqualToString:@"jpg"];
    }]];

  if (shareFiles.count == 0) {
    resolve([NSNull null]);
    return;
  }

  // Sort by name (timestamp-based, so oldest = lowest number = first alphabetically)
  NSArray *sorted = [shareFiles sortedArrayUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
    return [a.lastPathComponent compare:b.lastPathComponent];
  }];

  NSURL *fileURL = sorted.firstObject;
  NSData *data = [NSData dataWithContentsOfURL:fileURL];
  if (!data) {
    // File exists but can't be read — delete and return null
    [[NSFileManager defaultManager] removeItemAtURL:fileURL error:nil];
    resolve([NSNull null]);
    return;
  }

  [[NSFileManager defaultManager] removeItemAtURL:fileURL error:nil];
  resolve([data base64EncodedStringWithOptions:0]);
}

// Find the oldest pending share-text-*.txt in the App Group container,
// read it as a string, delete it, and return the text.
// Returns nil (resolves with NSNull) if no pending text exists.
RCT_EXPORT_METHOD(readAndClearPendingText:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *containerURL = [[NSFileManager defaultManager]
    containerURLForSecurityApplicationGroupIdentifier:@"group.im.cxa.fanatter"];
  if (!containerURL) {
    resolve([NSNull null]);
    return;
  }

  NSArray *contents = [[NSFileManager defaultManager]
    contentsOfDirectoryAtURL:containerURL
    includingPropertiesForKeys:@[NSURLCreationDateKey]
    options:NSDirectoryEnumerationSkipsHiddenFiles
    error:nil];

  NSArray *shareFiles = [contents filteredArrayUsingPredicate:
    [NSPredicate predicateWithBlock:^BOOL(NSURL *url, NSDictionary *bindings) {
      return [url.lastPathComponent hasPrefix:@"share-text-"] &&
             [url.pathExtension isEqualToString:@"txt"];
    }]];

  if (shareFiles.count == 0) {
    resolve([NSNull null]);
    return;
  }

  NSArray *sorted = [shareFiles sortedArrayUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
    return [a.lastPathComponent compare:b.lastPathComponent];
  }];

  NSURL *fileURL = sorted.firstObject;
  NSString *text = [NSString stringWithContentsOfURL:fileURL encoding:NSUTF8StringEncoding error:nil];
  [[NSFileManager defaultManager] removeItemAtURL:fileURL error:nil];

  if (!text || text.length == 0) {
    resolve([NSNull null]);
    return;
  }

  resolve(text);
}

@end
