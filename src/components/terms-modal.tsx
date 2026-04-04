import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Dialog } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/app-text';
import { useAppFontFamily } from '@/settings/app-font-preference';

type TermsModalProps = {
  isOpen: boolean;
  onAgree: () => void;
  onDecline: () => void;
};

const EULA_EN = [
  {
    heading: null,
    body: 'Yifan is an independent third-party client for Fanfou. It is not affiliated with, authorized by, or endorsed by Fanfou.',
  },
  {
    heading: 'User-Generated Content',
    body: 'All content displayed in this app is published by users on the Fanfou platform. Yifan does not host, create, or control any user content. Fanfou\'s Terms of Service and Community Guidelines apply to all content.',
  },
  {
    heading: 'Zero Tolerance Policy',
    body: 'This app has zero tolerance for objectionable content or abusive behavior. By using this app, you agree not to post, share, or promote content that is hateful, violent, threatening, sexually explicit, or otherwise harmful or illegal.',
  },
  {
    heading: 'Blocking Users',
    body: 'You may block any user from their profile page. Blocking immediately removes their content from your feed.',
  },
  {
    heading: 'Reporting Content',
    body: 'To report content that violates community standards, please use Fanfou\'s official reporting tools at fanfou.com.',
  },
  {
    heading: 'Age Requirement',
    body: 'You must be at least 13 years old to use this app.',
  },
  {
    heading: null,
    body: 'By tapping "I Agree," you confirm that you have read and accept these terms.',
  },
] as const;

const EULA_ZH = [
  {
    heading: null,
    body: '一饭是饭否的独立第三方客户端，与饭否官方无关联，未经其授权或认可。',
  },
  {
    heading: '用户生成内容',
    body: '本应用展示的所有内容均由用户在饭否平台发布。一饭不托管、创建或控制任何用户内容，所有内容受饭否服务条款和社区准则的约束。',
  },
  {
    heading: '零容忍政策',
    body: '本应用对不当内容及滥用行为零容忍。使用本应用即表示您同意不发布、分享或传播任何仇恨、暴力、威胁、色情或其他有害、违法的内容。',
  },
  {
    heading: '屏蔽用户',
    body: '您可随时在用户主页屏蔽该用户，屏蔽后其内容将立即从您的时间轴中移除。',
  },
  {
    heading: '举报内容',
    body: '如需举报违反社区准则的内容，请使用饭否官方举报工具（fanfou.com）。',
  },
  {
    heading: '年龄要求',
    body: '使用本应用须年满 13 周岁。',
  },
  {
    heading: null,
    body: '点击「同意」即表示您已阅读并接受上述条款。',
  },
] as const;

const TermsModal = ({ isOpen, onAgree, onDecline }: TermsModalProps) => {
  const { t, i18n } = useTranslation();
  const fontFamily = useAppFontFamily();
  const isZh = i18n.resolvedLanguage?.startsWith('zh') ?? false;
  const sections = isZh ? EULA_ZH : EULA_EN;

  return (
    <Dialog isOpen={isOpen} onOpenChange={open => { if (!open) onDecline(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-foreground/55 dark:bg-background/85" />
        <Dialog.Content className="w-[92%] max-w-[400px] self-center rounded-3xl bg-surface px-5 py-5">
          <Dialog.Title
            className="text-[20px] leading-[26px] font-bold text-foreground mb-3"
            style={fontFamily ? { fontFamily } : undefined}
          >
            {t('termsTitle')}
          </Dialog.Title>

          <View className="h-[340px]">
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={styles.scrollContent}
            >
              {sections.map((section, index) => (
                <View key={index} className={index > 0 ? 'mt-4' : undefined}>
                  {section.heading ? (
                    <Text
                      className="text-[14px] font-bold text-foreground mb-1"
                      style={fontFamily ? { fontFamily } : undefined}
                    >
                      {section.heading}
                    </Text>
                  ) : null}
                  <Text
                    className="text-[13px] leading-5 text-muted"
                    style={fontFamily ? { fontFamily } : undefined}
                  >
                    {section.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={onDecline}
              className="flex-1 items-center justify-center rounded-2xl bg-surface-secondary px-3 py-3 active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel={t('termsDecline')}
            >
              <Text
                className="text-[14px] font-semibold text-foreground"
                style={fontFamily ? { fontFamily } : undefined}
              >
                {t('termsDecline')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onAgree}
              className="flex-[2] items-center justify-center rounded-2xl bg-accent px-3 py-3 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={t('termsAgree')}
            >
              <Text
                className="text-[14px] font-bold text-accent-foreground"
                style={fontFamily ? { fontFamily } : undefined}
              >
                {t('termsAgree')}
              </Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 8,
  },
});

export default TermsModal;
