import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { createCertificate, getCounsellorCertificates, uploadCertificate } from '@/services/counsellorService';
import { Certificate, CounsellorProfile } from '@/types/user';

export default function CounsellorVerificationScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [specialties, setSpecialties] = useState<string>('');
  const [education, setEducation] = useState<string>('');
  const [experience, setExperience] = useState<string>('');
  
  useEffect(() => {
    if (!user || authLoading) return;
    
    // Load existing certificates
    const fetchCertificates = async () => {
      try {
        const certs = await getCounsellorCertificates(user.uid);
        setCertificates(certs);
        
        // If profile has specialties, education, etc., populate those fields
        if (profile && profile.type === 'counsellor') {
          const counsellorProfile = profile as CounsellorProfile;
          setSpecialties(counsellorProfile.specialties?.join(', ') || '');
          setEducation(counsellorProfile.education || '');
          setExperience(counsellorProfile.experience || '');
        }
      } catch (error) {
        console.error('Failed to fetch certificates:', error);
        Alert.alert('Error', 'Failed to load your certificate information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCertificates();
  }, [user, profile, authLoading]);
  
  const handleCertificateUpload = async () => {
    try {
      setUploading(true);
      
      // Pick a document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }
      
      const file = result.assets[0];
      
      if (!file.uri) {
        Alert.alert('Error', 'Could not access the selected file');
        setUploading(false);
        return;
      }
      
      // Get file data
      let fileData;
      if (Platform.OS === 'web') {
        // For web, we'd need different handling
        // This is simplified for the example
        fileData = await fetch(file.uri).then(r => r.blob());
      } else {
        // For mobile
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = new Blob([
          new Uint8Array(
            atob(base64)
              .split('')
              .map(char => char.charCodeAt(0))
          )
        ], { type: file.mimeType });
      }
      
      // Upload to Firebase Storage
      const fileURL = await uploadCertificate(fileData, file.name, user!.uid);
      
      // Create certificate record in Firestore
      const newCertificate = await createCertificate(
        user!.uid,
        file.name,
        fileURL,
        file.mimeType || 'application/octet-stream'
      );
      
      // Update local state
      setCertificates(prev => [...prev, newCertificate]);
      
      Alert.alert('Success', 'Your certificate was uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'There was a problem uploading your certificate');
    } finally {
      setUploading(false);
    }
  };
  
  if (authLoading || loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={currentColors.tint} />
        <ThemedText style={{ marginTop: 20 }}>Loading your profile...</ThemedText>
      </ThemedView>
    );
  }
  
  if (!user) {
    // User is not logged in, redirect to auth
    router.replace('/auth');
    return null;
  }

  if (!profile || profile.type !== 'counsellor') {
    // Not a counsellor profile
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Counsellor Access Only
        </ThemedText>
        <ThemedText style={styles.message}>
          This section is only available to counsellor accounts.
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentColors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText} lightColor="#FFFFFF" darkColor="#000000">
            Go Back
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const verificationStatus = (profile as CounsellorProfile).verificationStatus;
  
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Counsellor Verification
      </ThemedText>
      
      {/* Verification Status */}
      <View style={[styles.statusCard, getStatusStyle(verificationStatus)]}>
        <MaterialIcons 
          name={getStatusIcon(verificationStatus)} 
          size={28} 
          color={getStatusColor(verificationStatus, colorScheme)} 
        />
        <View style={styles.statusTextContainer}>
          <ThemedText style={styles.statusTitle}>
            Verification Status: {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
          </ThemedText>
          <ThemedText style={styles.statusDescription}>
            {getStatusDescription(verificationStatus)}
          </ThemedText>
        </View>
      </View>
      
      {/* Profile Info */}
      <ThemedText style={styles.sectionTitle}>Professional Information</ThemedText>
      <View style={styles.formSection}>
        <ThemedText style={styles.label}>Specialties</ThemedText>
        <TextInput
          style={[styles.input, { 
            color: currentColors.text, 
            backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' 
          }]}
          value={specialties}
          onChangeText={setSpecialties}
          placeholder="e.g., Depression, Anxiety, Stress Management"
          placeholderTextColor={currentColors.icon}
          multiline
        />
        
        <ThemedText style={styles.label}>Education</ThemedText>
        <TextInput
          style={[styles.input, { 
            color: currentColors.text, 
            backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' 
          }]}
          value={education}
          onChangeText={setEducation}
          placeholder="e.g., Master's in Psychology, Harvard University"
          placeholderTextColor={currentColors.icon}
          multiline
        />
        
        <ThemedText style={styles.label}>Experience</ThemedText>
        <TextInput
          style={[styles.input, { 
            color: currentColors.text, 
            backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
            height: 100
          }]}
          value={experience}
          onChangeText={setExperience}
          placeholder="Brief description of your professional experience"
          placeholderTextColor={currentColors.icon}
          multiline
          textAlignVertical="top"
        />
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentColors.tint, marginTop: 10 }]}
          onPress={() => {
            // TODO: Save profile info
            Alert.alert('Success', 'Your profile information has been updated');
          }}
        >
          <ThemedText style={styles.buttonText} lightColor="#FFFFFF" darkColor="#000000">
            Save Profile Info
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Certificates */}
      <ThemedText style={styles.sectionTitle}>Certificates</ThemedText>
      <View style={styles.certificatesSection}>
        {certificates.length > 0 ? (
          <FlatList
            data={certificates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.certificateItem}>
                <MaterialIcons name="description" size={24} color={currentColors.text} />
                <View style={styles.certificateInfo}>
                  <ThemedText style={styles.certificateName}>{item.name}</ThemedText>
                  <ThemedText style={styles.certificateStatus}>
                    Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </ThemedText>
                </View>
              </View>
            )}
            style={styles.certificatesList}
          />
        ) : (
          <ThemedText style={styles.noCertificates}>
            No certificates uploaded yet
          </ThemedText>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.uploadButton, { backgroundColor: currentColors.tint }]}
        onPress={handleCertificateUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
        ) : (
          <>
            <MaterialIcons name="upload-file" size={24} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
            <ThemedText style={styles.uploadButtonText} lightColor="#FFFFFF" darkColor="#000000">
              Upload Certificate
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

// Helper functions for status styles
function getStatusStyle(status: string) {
  switch (status) {
    case 'verified':
      return styles.verifiedStatus;
    case 'rejected':
      return styles.rejectedStatus;
    case 'pending':
    default:
      return styles.pendingStatus;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'verified':
      return 'verified';
    case 'rejected':
      return 'cancel';
    case 'pending':
    default:
      return 'hourglass-empty';
  }
}

function getStatusColor(status: string, colorScheme: string) {
  switch (status) {
    case 'verified':
      return '#4CAF50';
    case 'rejected':
      return '#F44336';
    case 'pending':
    default:
      return '#FFC107';
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case 'verified':
      return 'Your profile has been verified. You can now offer counseling services.';
    case 'rejected':
      return 'Your verification was not approved. Please update your information and certificates.';
    case 'pending':
    default:
      return 'Your verification is under review. This process typically takes 1-3 business days.';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
  },
  pendingStatus: {
    borderColor: '#FFC107',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  verifiedStatus: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  rejectedStatus: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  statusTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 48,
  },
  certificatesSection: {
    marginBottom: 24,
  },
  certificatesList: {
    maxHeight: 200,
  },
  certificateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    borderRadius: 8,
    marginBottom: 8,
  },
  certificateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  certificateName: {
    fontSize: 16,
    marginBottom: 4,
  },
  certificateStatus: {
    fontSize: 14,
  },
  noCertificates: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
