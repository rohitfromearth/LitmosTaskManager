import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  MAX_CONTENT_WIDTH,
  spacing,
} from '../../../../shared/theme/theme';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  testID: string;
}

/** The scrolling, width-limited page shared by Sign In and Sign Up. */
export function AuthLayout({
  title,
  subtitle,
  children,
  testID,
}: AuthLayoutProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>Litmos Task Manager</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    fontSize: 15,
    color: colors.textSecondary,
  },
});
