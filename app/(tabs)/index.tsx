import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Animated, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity 
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { auth } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const tintColor = currentColors.tint;
  const textColor = currentColors.text;
  const placeholderTextColor = currentColors.icon; // Using icon color for placeholder
  
  // Fix for input background color - use more distinct colors for better contrast with text
  const inputBackgroundColor = colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF'; 
  
  // Fixed button text colors for better visibility
  const buttonTextColorLight = '#FFFFFF'; // Always white for light theme (on blue button)
  const buttonTextColorDark = '#000000'; // Always black for dark theme (on white button)

  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Animation values
  const formAnimation = useState(new Animated.Value(1))[0];
  const errorAnimation = useState(new Animated.Value(0))[0];

  // Animation functions
  const animateFormChange = () => {
    // Animate form when switching between login and signup
    Animated.sequence([
      Animated.timing(formAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(formAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const showErrorAnimation = () => {
    // Show error message with fade in animation
    Animated.sequence([
      Animated.timing(errorAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000), // Show error for 3 seconds
      Animated.timing(errorAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setErrorMsg(null));
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error: any) { // Added type any to error
      Alert.alert('Error signing out', error.message);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      showErrorAnimation();
      return;
    }
    
    try {
      setLoading(true);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) { // Added type any to error
      setLoading(false);
      setErrorMsg(error.message);
      showErrorAnimation();
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser); // currentUser is User | null, matching the state type
    });
    return () => unsubscribe();
  }, []);

  if (user) {
    // User is signed in, show profile screen
    return (
      <ThemedView style={styles.container}>
        <Image 
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <ThemedText type="title" style={styles.title}>Welcome!</ThemedText>
        <ThemedText style={styles.userInfo}>Email: {user.email}</ThemedText>
        <ThemedText style={styles.userInfo}>User ID: {user.uid}</ThemedText>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: tintColor }]} 
          onPress={handleSignOut}
        >
          <ThemedText style={styles.buttonText} lightColor={buttonTextColorLight} darkColor={buttonTextColorDark}> 
            Sign Out
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // User is not signed in, show auth screen
  return (
    <ThemedView style={styles.container}>
      <Image 
        source={require('@/assets/images/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      
      <ThemedText type="title" style={styles.title}>
        {isLogin ? 'Log In' : 'Sign Up'}
      </ThemedText>
      
      <KeyboardAvoidingView
        style={{ width: '100%' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <Animated.View style={{ 
          width: '100%',
          transform: [{ scale: formAnimation }],
        }}>
          <TextInput
            style={[
              styles.input, 
              { 
                borderColor: tintColor,
                color: textColor,
                backgroundColor: inputBackgroundColor
              }
            ]}
            placeholder="Email"
            placeholderTextColor={placeholderTextColor}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            style={[
              styles.input,
              { 
                borderColor: tintColor,
                color: textColor,
                backgroundColor: inputBackgroundColor
              }
            ]}
            placeholder="Password"
            placeholderTextColor={placeholderTextColor}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </Animated.View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText} lightColor={buttonTextColorLight} darkColor={buttonTextColorDark}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </ThemedText>
          )}
        </TouchableOpacity>
        
        {errorMsg && (
          <Animated.View style={{ 
            opacity: errorAnimation,
            marginBottom: 15,
          }}>
            <ThemedText style={[styles.errorText, { color: colorScheme === 'dark' ? '#ff6b6b' : '#d00000' }]}>
              {errorMsg}
            </ThemedText>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
      
      <TouchableOpacity onPress={() => {
        setIsLogin(!isLogin);
        animateFormChange();
      }}>
        <ThemedText type="link" style={styles.switchText}>
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    marginTop: 15,
  },
  userInfo: {
    marginBottom: 10,
  },
  errorText: {
    textAlign: 'center',
  },
});