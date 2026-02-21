#import "EnvSecrets.h"
#import <rn-fanfou-client/FanfouSecrets.h>

__attribute__((constructor)) static void FFConfigureFanfouSecrets(void) {
  NSString *consumerKey = FFConsumerKey();
  NSString *consumerSecret = FFConsumerSecret();
  if (consumerKey.length == 0 || consumerSecret.length == 0) {
    return;
  }
  FanfouSecretsConfigure(consumerKey, consumerSecret);
}
