package com.rnfanfouclient

object FanfouSecrets {
  @Volatile private var consumerKey: String? = null
  @Volatile private var consumerSecret: String? = null

  fun configure(consumerKey: String, consumerSecret: String) {
    this.consumerKey = consumerKey
    this.consumerSecret = consumerSecret
  }

  fun resolveConsumerKey(): String = consumerKey.orEmpty()

  fun resolveConsumerSecret(): String = consumerSecret.orEmpty()
}
