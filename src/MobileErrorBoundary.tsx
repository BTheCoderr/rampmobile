import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Native crash fallback for unexpected React rendering failures.
 * It does not upload health or device information or silently restart the app.
 */
export class MobileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (__DEV__) console.error('RAMP mobile rendering issue', error);
  }

  reset = (): void => this.setState({ hasError: false });

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.heading}>Something went wrong</Text>
          <Text style={styles.body}>
            This screen could not load. Your saved places and private visit checklist remain on this device.
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Try loading RAMP Mobile again"
            onPress={this.reset} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
          <Text style={styles.caption}>
            If the problem continues, close and reopen the app. This is an unofficial development prototype.
          </Text>
        </ScrollView>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F8F8' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 30, gap: 18 },
  heading: { color: '#123648', fontSize: 28, lineHeight: 36, fontWeight: '900' },
  body: { fontSize: 17, lineHeight: 27, color: '#153346' },
  caption: { fontSize: 14, lineHeight: 22, color: '#45616B' },
  button: { backgroundColor: '#006D60', minHeight: 54, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
