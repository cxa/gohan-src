// App-configured consumer secrets (no JS exposure)

#import <Foundation/Foundation.h>

FOUNDATION_EXPORT void FanfouSecretsConfigure(NSString *consumerKey,
                                              NSString *consumerSecret);
FOUNDATION_EXPORT NSString *FanfouSecretsConsumerKey(void);
FOUNDATION_EXPORT NSString *FanfouSecretsConsumerSecret(void);
