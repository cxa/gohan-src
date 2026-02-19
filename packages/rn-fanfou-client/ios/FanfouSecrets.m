// App-configured consumer secrets (no JS exposure)

#import "FanfouSecrets.h"

static NSString *FFConsumerKeyValue = nil;
static NSString *FFConsumerSecretValue = nil;

void FanfouSecretsConfigure(NSString *consumerKey, NSString *consumerSecret) {
  FFConsumerKeyValue = [consumerKey copy];
  FFConsumerSecretValue = [consumerSecret copy];
}

NSString *FanfouSecretsConsumerKey(void) { return FFConsumerKeyValue ?: @""; }

NSString *FanfouSecretsConsumerSecret(void) {
  return FFConsumerSecretValue ?: @"";
}
