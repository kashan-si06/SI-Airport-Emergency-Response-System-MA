import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/errors';
import { useSession } from '@/auth/session';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner, describeError } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { ScrollScreen } from '@/ui/screen';
import { toast } from '@/ui/toast';

const MIN_PASSWORD = 12;

export default function ChangePassword() {
  const changePassword = useSession((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const nextRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmationRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = () => {
    if (busy) return;
    const problem = !current ? 'Enter your current password.' : next.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : next !== confirmation ? 'The two new passwords do not match.' : null;
    if (problem) {
      setError({ title: 'Check the details', message: problem });
      return;
    }
    setBusy(true);
    setError(null);
    changePassword({ currentPassword: current, newPassword: next })
      .then(() => {
        toast.success('Password changed');
        router.back();
      })
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 423 ? { title: 'Account locked', message: e.message } : describeError(e)))
      .finally(() => setBusy(false));
  };

  return (
    <ScrollScreen footer={<Button label="Change password" size="lg" fullWidth loading={busy} disabled={busy} onPress={submit} />}>
      <View style={styles.form}>
        {error ? <Banner flush tone="danger" icon="warning" title={error.title} message={error.message} /> : null}
        <TextField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nextRef.current?.focus()}
        />
        <TextField
          ref={nextRef}
          label="New password"
          helper={`At least ${MIN_PASSWORD} characters. You stay signed in here; other devices sign out.`}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmationRef.current?.focus()}
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
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3], paddingHorizontal: gutter, paddingVertical: space[4] },
});
