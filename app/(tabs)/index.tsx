import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { auth } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
    });
    
    return unsubscribe;
  }, []);
  
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      Alert.alert(
        isLogin ? 'Login Error' : 'Signup Error',
        error.message
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      Alert.alert('Error signing out', error.message);
    }
  };
  
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
          <ThemedText style={styles.buttonText} lightColor="#fff" darkColor="#fff">
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
      
      <TextInput
        style={[styles.input, { borderColor: tintColor }]}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={[styles.input, { borderColor: tintColor }]}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: tintColor }]}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText} lightColor="#fff" darkColor="#fff">
            {isLogin ? 'Log In' : 'Sign Up'}
          </ThemedText>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
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
});