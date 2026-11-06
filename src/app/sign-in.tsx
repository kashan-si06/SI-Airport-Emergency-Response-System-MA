import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/errors';
import { useSession, type SignInStep } from '@/auth/session';
import { log } from '@/lib/log';
import { useColors } from '@/theme/theme';
import { gutter, motion, space } from '@/theme/tokens';
import { heroHeadline, heroMessage } from '@/theme/typography';
import { Button, IconButton } from '@/ui/button';
import { Banner, describeError } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { HeroGlow } from '@/ui/hero-glow';
import { Text } from '@/ui/text';

const MIN_PASSWORD = 12;
/** The glow fills this share of the screen; the words sit just under its curve. */
const HERO_SHARE = 0.56;
/** Gap under the landing copy, as a share of the screen. Raise it to lift the headline and text. */
const LANDING_LIFT = 0.06;
/** Most the form lifts off its button, as a share of the screen. It gives this up when the keyboard needs the room. */
const FORM_LIFT = 0.1;
/** Gap between the button and the keyboard while it is open. */
const KEYBOARD_GAP = space[3];

/** Credential failures come back with a message written for the person signing in. */
function describeSignInError(e: unknown): { title: string; message: string } {
  if (e instanceof ApiError) {
    if (e.kind === 'forbidden') return { title: 'Account not enabled', message: e.message };
    if (e.kind === 'unauthorized' || e.status === 423) return { title: 'Couldn’t sign in', message: e.message };
  }
  return describeError(e);
}

type Pending = Exclude<SignInStep, { step: 'done' }>;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const signIn = useSession((s) => s.signIn);
  const verifyMfa = useSession((s) => s.verifyMfa);
  const setNewPassword = useSession((s) => s.setNewPassword);
  const sessionExpired = useSession((s) => s.sessionExpired);

  // False shows the landing view.
  const [formOpen, setFormOpen] = useState(false);

  // Null until the password has been accepted; then whichever step the account still owes.
  const [pending, setPending] = useState<Pending | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPasswordValue] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmationRef = useRef<ComponentRef<typeof TextInput>>(null);

  const showForm = formOpen || pending !== null;

  const openForm = () => {
    setError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setError(null);
  };

  const run = (action: () => Promise<SignInStep>) => {
    setBusy(true);
    setError(null);
    action()
      .then((next) => {
        if (next.step !== 'done') setPending(next);
        setPassword('');
        setCode('');
      })
      .catch((e: unknown) => {
        log.warn('signin.failed', e instanceof ApiError ? (e.code ?? e.kind) : String(e));
        setError(describeSignInError(e));
        if (e instanceof ApiError && e.code === 'challenge_expired') {
          setPending(null);
          setPassword('');
        }
      })
      .finally(() => setBusy(false));
  };

  const submit = () => {
    if (busy) return;
    if (!pending) {
      if (!username.trim() || !password) {
        setError({ title: 'Check the details', message: 'Enter your email and password.' });
        return;
      }
      run(() => signIn({ username: username.trim(), password }));
    } else if (pending.step === 'mfa') {
      if (!/^\d{6}$/.test(code)) {
        setError({ title: 'Check the details', message: 'Enter the 6-digit code from your authenticator.' });
        return;
      }
      run(() => verifyMfa({ challenge: pending.challenge, code }));
    } else {
      if (newPassword.length < MIN_PASSWORD) {
        setError({ title: 'Check the details', message: `Use at least ${MIN_PASSWORD} characters.` });
        return;
      }
      if (newPassword !== confirmation) {
        setError({ title: 'Check the details', message: 'The two passwords do not match.' });
        return;
      }
      run(() => setNewPassword({ challenge: pending.challenge, newPassword }));
    }
  };

  const restart = () => {
    setPending(null);
    setError(null);
    setPassword('');
    setCode('');
    setNewPasswordValue('');
    setConfirmation('');
    setFormOpen(false);
  };

  const notice = error
    ? { tone: 'danger' as const, icon: 'warning' as const, ...error }
    : sessionExpired && !pending
      ? { tone: 'caution' as const, icon: 'lock' as const, title: 'You were signed out', message: 'Sign in again to continue.' }
      : null;

  const noticeBanner = notice ? (
    <Banner flush tone={notice.tone} icon={notice.icon} title={notice.title} message={notice.message} />
  ) : null;

  // Both scale with the phone's width, so the line breaks below hold on every size.
  const headlineSize = Math.round(Math.min(56, width * 0.125));
  const pitchSize = Math.round(Math.min(20, width * 0.044));
  const bottomPad = Math.max(insets.bottom, space[4]) + space[6];

  const formTitle = pending
    ? pending.step === 'mfa'
      ? 'Enter code'
      : 'Choose password'
    : 'Sign in';

  const formMessage = pending
    ? pending.step === 'mfa'
      ? 'Enter the 6-digit code from your authenticator.'
      : 'Choose your own password to continue.'
    : 'Use your service account.';

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <StatusBar style="light" />

      {/* Fields and copy cross the glow while a form is open, so it steps back and its light stops. */}
      <HeroGlow height={height * HERO_SHARE} dimmed={showForm} running={!showForm} />

      {/* Android apps are edge-to-edge, so the window never resizes for the keyboard: both platforms need padding.
          The negative offset gives back the button's resting gap, so it sits close above the keyboard. */}
      <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={KEYBOARD_GAP - bottomPad}>
        <ScrollView
          ref={scrollRef}
          style={styles.root}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + space[3] }]}
          // When the keyboard shrinks the view, bring the lower fields up with it.
          onLayout={() => {
            if (showForm) scrollRef.current?.scrollToEnd();
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {showForm ? (
            <View style={styles.backRow}>
              <IconButton
                icon="chevronLeft"
                label={pending ? 'Start over' : 'Back'}
                disabled={busy}
                onPress={pending ? restart : closeForm}
              />
            </View>
          ) : null}

          {showForm ? (
            <Animated.View key="form" entering={FadeIn.duration(motion.base)} style={styles.formBody}>
              <View style={styles.formHeading}>
                <Text variant="largeTitle">{formTitle}</Text>
                <Text variant="callout" tone="textSecondary">
                  {formMessage}
                </Text>
              </View>
              {noticeBanner}

              {!pending ? (
                <>
                  <TextField
                    label="Email"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    keyboardType="email-address"
                    keyboardAppearance="dark"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    testID="sign-in-username"
                  />
                  <View style={styles.passwordBlock}>
                    <TextField
                      ref={passwordRef}
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      textContentType="password"
                      keyboardAppearance="dark"
                      returnKeyType="go"
                      onSubmitEditing={submit}
                      testID="sign-in-password"
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: showPassword }}
                      hitSlop={10}
                      style={styles.toggle}>
                      <Text variant="footnote" weight="500" tone="textSecondary">
                        {showPassword ? 'Hide password' : 'Show password'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : pending.step === 'mfa' ? (
                <TextField
                  label="Verification code"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  counter={false}
                  mono
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  testID="sign-in-code"
                />
              ) : (
                <>
                  <TextField
                    label="New password"
                    helper={`At least ${MIN_PASSWORD} characters.`}
                    value={newPassword}
                    onChangeText={setNewPasswordValue}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    keyboardAppearance="dark"
                    autoFocus
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => confirmationRef.current?.focus()}
                    testID="sign-in-new-password"
                  />
                  <TextField
                    ref={confirmationRef}
                    label="Confirm new password"
                    value={confirmation}
                    onChangeText={setConfirmation}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    keyboardAppearance="dark"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    testID="sign-in-confirm-password"
                  />
                </>
              )}

              <View style={styles.helpRow}>
                <Text variant="footnote" tone="textTertiary" style={styles.helpText}>
                  Locked out? Ask your ENS administrator.
                </Text>
              </View>
            </Animated.View>
          ) : (
            <Animated.View key="landing" entering={FadeIn.duration(motion.base)} style={[styles.landingBody, { paddingBottom: Math.round(height * LANDING_LIFT) }]}>
              <Text accessibilityRole="header" dense style={heroHeadline(headlineSize)}>
                {'Declare once,\nreach\neveryone.'}
              </Text>
              <View style={styles.pitch}>
                <Text dense tone="textSecondary" style={[styles.pitchText, heroMessage(pitchSize)]}>
                  {'Get emergency alerts, acknowledge\nin one tap and work through your\ndepartment’s checklist.'}
                </Text>
              </View>
              {noticeBanner}
            </Animated.View>
          )}

          {showForm ? <View style={[styles.formLift, { maxHeight: Math.round(height * FORM_LIFT) }]} /> : null}
        </ScrollView>

        {/* Outside the scroll view, so it stays on screen and rides up with the keyboard. */}
        <View style={[styles.actions, { paddingBottom: bottomPad, borderTopColor: colors.separator }]}>
          {showForm ? (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              testID="sign-in"
              label={!pending ? 'Sign in' : pending.step === 'mfa' ? 'Verify' : 'Set password'}
              accessibilityLabel={
                !pending ? undefined : pending.step === 'mfa' ? 'Verify and sign in' : 'Set password and sign in'
              }
              loading={busy}
              onPress={submit}
            />
          ) : (
            <Button label="Sign in" variant="secondary" size="lg" fullWidth onPress={openForm} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  landingBody: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: space[5],
    paddingHorizontal: gutter,
    paddingTop: space[10],
  },
  pitch: { flexDirection: 'row', alignItems: 'flex-start', gap: space[4] },
  pitchText: { flex: 1 },
  formBody: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: space[4],
    paddingHorizontal: gutter,
    paddingTop: space[4],
    paddingBottom: space[5],
  },
  backRow: { alignItems: 'flex-start', marginLeft: space[3] },
  formLift: { flexGrow: 1 },
  formHeading: { gap: space[1.5], marginBottom: space[1] },
  passwordBlock: { gap: space[2] },
  toggle: { alignSelf: 'flex-start', minHeight: 24, justifyContent: 'center' },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  helpText: { flexShrink: 1 },
  actions: {
    marginHorizontal: gutter,
    paddingTop: space[6],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
