import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { createSession } from '@/services/sessionService';
import { CounsellorProfile } from '@/types/user';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Mental health categories for filtering
const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'depression', name: 'Depression', icon: 'cloud' },
  { id: 'anxiety', name: 'Anxiety', icon: 'bolt' },
  { id: 'stress', name: 'Stress', icon: 'warning' },
  { id: 'relationships', name: 'Relationships', icon: 'people' },
  { id: 'grief', name: 'Grief', icon: 'healing' },
  { id: 'trauma', name: 'Trauma', icon: 'psychology' },
  { id: 'addiction', name: 'Addiction', icon: 'priority-high' },
];

export default function ExploreScreen() {
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [counsellors, setCounsellors] = useState<CounsellorProfile[]>([]);
  const [filteredCounsellors, setFilteredCounsellors] = useState<CounsellorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    
    const fetchCounsellors = async () => {
      try {
        // Query verified counsellors
        const counsellorsQuery = query(
          collection(db, 'users'),
          where('type', '==', 'counsellor'),
          where('verificationStatus', '==', 'verified')
        );
        
        const snapshot = await getDocs(counsellorsQuery);
        const counsellorsList = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as CounsellorProfile));
        
        setCounsellors(counsellorsList);
        setFilteredCounsellors(counsellorsList);
      } catch (error) {
        console.error('Error fetching counsellors:', error);
        Alert.alert('Error', 'Failed to load counsellors');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCounsellors();
  }, [user, authLoading]);
  
  // Filter counsellors based on category and search query
  useEffect(() => {
    if (counsellors.length === 0) return;
    
    let filtered = counsellors;
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(counsellor => 
        counsellor.specialties?.some(
          specialty => specialty.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(counsellor => 
        counsellor.displayName?.toLowerCase().includes(query) ||
        counsellor.specialties?.some(s => s.toLowerCase().includes(query)) ||
        counsellor.education?.toLowerCase().includes(query) ||
        counsellor.experience?.toLowerCase().includes(query)
      );
    }
    
    setFilteredCounsellors(filtered);
  }, [selectedCategory, searchQuery, counsellors]);
  
  const handleBookSession = (counsellor: CounsellorProfile) => {
    // Show a date/time picker here
    // For simplicity, we're creating a session 1 hour from now
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    startTime.setMinutes(0);
    startTime.setSeconds(0);
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    Alert.alert(
      'Book Session',
      `Would you like to book a session with ${counsellor.displayName} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: async () => {
            try {
              const sessionId = await createSession(counsellor.uid, startTime, endTime);
              Alert.alert(
                'Success', 
                'Your session has been booked!',
                [
                  { 
                    text: 'View Sessions', 
                    onPress: () => router.push('/sessions')
                  },
                  { text: 'OK' }
                ]
              );
            } catch (error) {
              console.error('Error booking session:', error);
              Alert.alert('Error', 'Failed to book session');
            }
          }
        }
      ]
    );
  };
  
  const renderCounsellorCard = ({ item }: { item: CounsellorProfile }) => (
    <View style={styles.counsellorCard}>
      <View style={styles.counsellorHeader}>
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: currentColors.tint }]}>
              <ThemedText style={styles.avatarInitial} lightColor="#FFFFFF" darkColor="#000000">
                {item.displayName?.charAt(0)?.toUpperCase() || '?'}
              </ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.counsellorInfo}>
          <ThemedText style={styles.counsellorName}>
            {item.displayName}
          </ThemedText>
          
          {item.specialties && (
            <View style={styles.specialtiesContainer}>
              {item.specialties.slice(0, 3).map((specialty, index) => (
                <View 
                  key={`${item.uid}-specialty-${index}`} 
                  style={[styles.specialtyBadge, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}
                >
                  <ThemedText style={[styles.specialtyText, { color: '#2196F3' }]}>
                    {specialty}
                  </ThemedText>
                </View>
              ))}
              {item.specialties.length > 3 && (
                <ThemedText style={styles.moreSpecialties}>
                  +{item.specialties.length - 3} more
                </ThemedText>
              )}
            </View>
          )}
        </View>
      </View>
      
      {item.education && (
        <View style={styles.detailItem}>
          <MaterialIcons name="school" size={16} color={currentColors.icon} />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {item.education}
          </ThemedText>
        </View>
      )}
      
      {item.experience && (
        <View style={styles.detailItem}>
          <MaterialIcons name="work" size={16} color={currentColors.icon} />
          <ThemedText style={styles.detailText} numberOfLines={2}>
            {item.experience}
          </ThemedText>
        </View>
      )}
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => {
            router.push({
              pathname: '/chat/conversation',
              params: { userId: item.uid }
            });
          }}
        >
          <FontAwesome name="comment" size={16} color="#2196F3" />
          <ThemedText style={[styles.actionButtonText, { color: '#2196F3' }]}>
            Chat
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: currentColors.tint }]}
          onPress={() => handleBookSession(item)}
        >
          <FontAwesome name="calendar-plus-o" size={16} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
          <ThemedText 
            style={styles.actionButtonText} 
            lightColor="#FFFFFF" 
            darkColor="#000000"
          >
            Book Session
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (authLoading || loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
        <ThemedText style={{ marginTop: 20 }}>Finding counsellors...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.headerContainer}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Find a Counsellor</ThemedText>
            
            <View style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F0F0' }]}>
              <FontAwesome name="search" size={18} color={currentColors.icon} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: currentColors.text }]}
                placeholder="Search by name or specialty..."
                placeholderTextColor={currentColors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <FontAwesome name="times-circle" size={18} color={currentColors.icon} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && [
                    styles.selectedCategory,
                    { borderColor: currentColors.tint }
                  ]
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <MaterialIcons 
                  name={category.icon} 
                  size={20} 
                  color={selectedCategory === category.id ? currentColors.tint : currentColors.icon} 
                />
                <ThemedText 
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id && { 
                      color: currentColors.tint,
                      fontWeight: 'bold'
                    }
                  ]}
                >
                  {category.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
        
        <View style={styles.contentContainer}>
          <View style={styles.resultsHeader}>
            <ThemedText style={styles.resultCount}>
              Found {filteredCounsellors.length} counsellor{filteredCounsellors.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          
          {filteredCounsellors.length > 0 ? (
            filteredCounsellors.map(counsellor => (
              <View key={counsellor.uid} style={styles.counsellorCardContainer}>
                {renderCounsellorCard({ item: counsellor })}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={64} color={currentColors.icon} />
              <ThemedText style={styles.emptyText}>
                No counsellors found matching your criteria
              </ThemedText>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: currentColors.tint }]}
                onPress={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
              >
                <ThemedText style={[styles.resetButtonText, { color: currentColors.tint }]}>
                  Reset Filters
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  selectedCategory: {
    borderWidth: 2,
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
  },
  contentContainer: {
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 16,
  },
  counsellorCardContainer: {
    marginBottom: 16,
  },
  counsellorCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  counsellorHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counsellorInfo: {
    flex: 1,
  },
  counsellorName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specialtyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreSpecialties: {
    fontSize: 12,
    opacity: 0.7,
    alignSelf: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  chatButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
