import { FontAwesome } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  Text
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { auth, db } from '@/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CounsellorProfile, Session } from '@/types/user';

export default function HomeScreen() {
  const { user } = useAuth();
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

  // Data for the home screen
  const [recommendedCounsellors, setRecommendedCounsellors] = useState<CounsellorProfile[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loadingCounsellors, setLoadingCounsellors] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Auth screen state
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
    // Fetch counsellors and sessions when user is logged in
    if (user) {
      fetchRecommendedCounsellors();
      fetchUpcomingSessions();
    }
  }, [user]);
  
  // Fetch recommended counsellors
  const fetchRecommendedCounsellors = async () => {
    try {
      setLoadingCounsellors(true);
      // Query counsellors collection - get verified counsellors
      const counsellorsRef = collection(db, 'profiles');
      const q = query(
        counsellorsRef,
        where('type', '==', 'counsellor'),
        where('verificationStatus', '==', 'verified')
      );
      
      const snapshot = await getDocs(q);
      const counsellors = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as unknown as CounsellorProfile) }))
        .slice(0, 5); // Limit to 5 counsellors for the recommendation section
      
      setRecommendedCounsellors(counsellors);
    } catch (error) {
      console.error("Failed to fetch recommended counsellors:", error);
    } finally {
      setLoadingCounsellors(false);
    }
  };
  
  // Fetch upcoming sessions for the user
  const fetchUpcomingSessions = async () => {
    if (!user) return;
    
    try {
      setLoadingSessions(true);
      const sessionsRef = collection(db, 'sessions');
      const today = new Date();
      
      // Query for upcoming sessions for this user
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid),
        where('status', '==', 'confirmed'),
        where('startTime', '>=', today)
      );
      
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Session)
        .sort((a, b) => {
          // Convert timestamps to Date objects for comparison
          const dateA = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
          const dateB = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
          return dateA.getTime() - dateB.getTime();
        });
      
      setUpcomingSessions(sessions);
    } catch (error) {
      console.error("Failed to fetch upcoming sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };  
  
  if (user) {
    // User is signed in, show home screen with counselor recommendations
    return (
      <View className="flex-1 p-5 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="flex-row justify-between items-center w-full mb-5 pt-10 ios:pt-10">
          <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mindful Path</Text>
          <TouchableOpacity className="p-1">
            <Image 
              source={require('@/assets/images/react-logo.png')} 
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-3xl px-4 mb-6 h-11">
          <Image 
            source={require('@/assets/images/react-logo.png')} 
            className="w-[18px] h-[18px] mr-2 opacity-50"
            resizeMode="contain"
          />
          <TextInput
            className="flex-1 h-11 text-base text-gray-800 dark:text-gray-200"
            placeholder="Search for counselors"
            placeholderTextColor={placeholderTextColor}
          />
        </View>
        
        {/* Recommended Counselors Section */}
        <Text className="text-lg font-bold mb-4 ml-1 text-gray-800 dark:text-gray-100">
          Recommended Counselors
        </Text>
        
        {recommendedCounsellors.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-6"
          >
            {recommendedCounsellors.map((counsellor) => (
              <TouchableOpacity 
                key={counsellor.id} 
                className="w-[150px] mr-4 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-sm" 
                onPress={() => router.push({
                  pathname: "/explore",
                  params: { counsellorId: counsellor.id }
                })}
              >
                {counsellor.photoURL ? (
                  <Image 
                    source={{ uri: counsellor.photoURL }} 
                    className="w-full h-[140px] rounded-lg mb-2"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-[140px] rounded-lg mb-2 justify-center items-center bg-primary-600">
                    <Text className="text-4xl font-bold text-white dark:text-black">
                      {counsellor.displayName?.charAt(0)?.toUpperCase() || 'C'}
                    </Text>
                  </View>
                )}
                <Text className="text-sm font-semibold mb-1 text-gray-800 dark:text-gray-100">
                  {counsellor.displayName}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {counsellor.specialties?.length > 0 
                    ? `Specializes in ${counsellor.specialties[0]}`
                    : 'Counsellor'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View className="p-5 items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Loading counsellors...
            </Text>
          </View>
        )}
        
        {/* Upcoming Appointments Section */}
        <Text className="text-lg font-bold mb-4 ml-1 text-gray-800 dark:text-gray-100">
          Upcoming Appointments
        </Text>
        
        {upcomingSessions.length > 0 ? (
          <FlatList
            data={upcomingSessions.slice(0, 2)} // Show only first 2 sessions
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              // Convert timestamp to Date
              const sessionDate = item.startTime instanceof Date
                ? item.startTime
                : 'toDate' in item.startTime
                  ? item.startTime.toDate()
                  : new Date();
              
              // Format date and time
              const formattedDate = sessionDate.toLocaleDateString();
              const formattedTime = sessionDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
                
              return (
                <TouchableOpacity 
                  className="flex-row bg-white dark:bg-gray-800 rounded-xl p-3 mb-6 shadow-sm"
                  onPress={() => router.push(`/sessions?id=${item.id}`)}
                >
                  {item.counsellor?.photoURL ? (
                    <Image 
                      source={{ uri: item.counsellor.photoURL }} 
                      className="w-10 h-10 rounded-full mr-3"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-10 h-10 rounded-full mr-3 justify-center items-center bg-primary-600">
                      <Text className="text-base font-bold text-white dark:text-black">
                        {item.counsellor?.displayName?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1 justify-center">
                    <Text className="text-[15px] font-semibold mb-1 text-gray-800 dark:text-gray-100">
                      Session with {item.counsellor?.displayName || 'Counsellor'}
                    </Text>
                    <Text className="text-[13px] text-gray-500 dark:text-gray-400">
                      {formattedDate}, {formattedTime}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <TouchableOpacity 
            className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl items-center mb-6"
            onPress={() => router.push('/explore')}
          >
            <Text className="text-[15px] text-gray-500 dark:text-gray-400">
              No upcoming appointments. Book a session?
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Resources Section */}
        <Text className="text-lg font-bold mb-4 ml-1 text-gray-800 dark:text-gray-100">
          Resources
        </Text>
        
        <View className="flex-row flex-wrap justify-between">
          <TouchableOpacity 
            className="w-[48%] bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 items-center flex-row shadow-sm"
            onPress={() => Alert.alert("Articles", "Articles section coming soon!")}
          >
            <FontAwesome name="file-text-o" size={24} color={tintColor} className="mr-2" />
            <Text className="text-[15px] font-medium text-gray-800 dark:text-gray-100">Articles</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-[48%] bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 items-center flex-row shadow-sm"
            onPress={() => Alert.alert("FAQs", "FAQs section coming soon!")}
          >
            <FontAwesome name="question-circle-o" size={24} color={tintColor} className="mr-2" />
            <Text className="text-[15px] font-medium text-gray-800 dark:text-gray-100">FAQs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-[48%] bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 items-center flex-row shadow-sm"
            onPress={() => Alert.alert("Community", "Community section coming soon!")}
          >
            <FontAwesome name="users" size={24} color={tintColor} className="mr-2" />
            <Text className="text-[15px] font-medium text-gray-800 dark:text-gray-100">Community</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // User is not signed in, show auth screen
  return (
    <View className="flex-1 p-5 items-center justify-start bg-white dark:bg-gray-900">
      <Image 
        source={require('@/assets/images/icon.png')}
        className="w-[120px] h-[120px] mb-8"
        resizeMode="contain"
      />
      
      <Text className="text-2xl font-bold mb-8 text-gray-800 dark:text-gray-100">
        {isLogin ? 'Log In' : 'Sign Up'}
      </Text>
      
      <KeyboardAvoidingView
        className="w-full"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <Animated.View style={{ 
          width: '100%',
          transform: [{ scale: formAnimation }],
        }}>
          <TextInput
            className="w-full h-[50px] border border-primary-600 rounded-lg mb-4 px-4 text-base bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            placeholder="Email"
            placeholderTextColor={placeholderTextColor}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            className="w-full h-[50px] border border-primary-600 rounded-lg mb-4 px-4 text-base bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            placeholder="Password"
            placeholderTextColor={placeholderTextColor}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </Animated.View>
        
        <TouchableOpacity
          className="w-full h-[50px] rounded-lg items-center justify-center mt-2 mb-4 bg-primary-600"
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white dark:text-black">
              {isLogin ? 'Log In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>
        
        {errorMsg && (
          <Animated.View style={{ 
            opacity: errorAnimation,
            marginBottom: 15,
          }}>
            <Text className="text-center text-red-600 dark:text-red-400">
              {errorMsg}
            </Text>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
      
      <TouchableOpacity 
        className="mt-4" 
        onPress={() => {
          setIsLogin(!isLogin);
          animateFormChange();
        }}>
        <Text className="text-primary-600 dark:text-primary-400">
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}