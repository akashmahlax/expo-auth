import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { auth, db } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import { UserProfile } from '@/types/user';

export default function AuthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const tintColor = currentColors.tint;
  const textColor = currentColors.text;
  const placeholderTextColor = currentColors.icon;
  const inputBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF';
  const buttonTextColorLight = '#FFFFFF';
  const buttonTextColorDark = '#000000';

  const [isLogin, setIsLogin] = useState(true);
  const [isCounsellor, setIsCounsellor] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    
    if (!isLogin && !displayName) {
      setError('Name is required for signup.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        // Navigate to home screen on success
        router.replace('/');
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile in Firestore
        const userProfile: UserProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: displayName,
          type: isCounsellor ? 'counsellor' : 'user',
          createdAt: Timestamp.now(),
        };
        
        // If registering as counsellor, add verification status
        if (isCounsellor) {
          userProfile.type = 'counsellor';
          (userProfile as any).verificationStatus = 'pending';
        }
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
        
        // Navigate to home screen on success
        router.replace('/');
      }
    } catch (error: any) {
      // Handle specific error cases for better UX
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError(error.message || 'An unexpected error occurred.');
      }
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Image 
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <ThemedText type="title" style={styles.title}>
          Mental Wellness
        </ThemedText>
        
        <ThemedText style={styles.subtitle}>
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </ThemedText>
        
        <KeyboardAvoidingView
          style={{ width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.formContainer}>
            {!isLogin && (
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackgroundColor, color: textColor }
                ]}
                placeholder="Your Name"
                placeholderTextColor={placeholderTextColor}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackgroundColor, color: textColor }
              ]}
              placeholder="Email"
              placeholderTextColor={placeholderTextColor}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackgroundColor, color: textColor }
              ]}
              placeholder="Password"
              placeholderTextColor={placeholderTextColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLogin && (
              <View style={styles.checkboxContainer}>
                <TouchableOpacity 
                  style={styles.checkbox} 
                  onPress={() => setIsCounsellor(!isCounsellor)}
                >
                  {isCounsellor && <View style={[styles.checkedBox, { backgroundColor: tintColor }]} />}
                </TouchableOpacity>
                <ThemedText style={styles.checkboxLabel}>
                  Register as a counselor
                </ThemedText>
              </View>
            )}
            
            {error && (
              <ThemedText style={styles.errorText}>
                {error}
              </ThemedText>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: tintColor }]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colorScheme === 'dark' ? '#000' : '#fff'} />
              ) : (
                <ThemedText 
                  style={styles.buttonText} 
                  lightColor={buttonTextColorLight} 
                  darkColor={buttonTextColorDark}
                >
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </ThemedText>
              )}
            </TouchableOpacity>
            
            <View style={styles.switchContainer}>
              <ThemedText style={styles.switchText}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <ThemedText style={[styles.switchButton, { color: tintColor }]}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
  },
  switchButton: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 10,
    width: '100%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.5)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkedBox: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 16,
  },
});
