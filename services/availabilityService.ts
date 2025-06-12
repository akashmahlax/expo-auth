import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';

// Type definitions for availability
export interface TimeSlot {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface DayAvailability {
  slots: TimeSlot[];
}

export interface WeeklyAvailability {
  [key: string]: DayAvailability; // Keys: "monday", "tuesday", etc.
}

// Days of the week
export const DAYS_OF_WEEK = [
  'monday', 
  'tuesday', 
  'wednesday', 
  'thursday', 
  'friday', 
  'saturday', 
  'sunday'
];

// Get counselor availability
export const getCounselorAvailability = async (): Promise<WeeklyAvailability> => {
  if (!auth.currentUser) {
    throw new Error("No authenticated user");
  }
  
  const counselorId = auth.currentUser.uid;
  const counselorRef = doc(db, 'users', counselorId);
  const counselorSnap = await getDoc(counselorRef);
  
  if (!counselorSnap.exists()) {
    throw new Error("Counselor profile not found");
  }
  
  const userData = counselorSnap.data();
  
  // If no availability is set yet, return a default empty structure
  if (!userData.availability) {
    const defaultAvailability: WeeklyAvailability = {};
    DAYS_OF_WEEK.forEach(day => {
      defaultAvailability[day] = { slots: [] };
    });
    return defaultAvailability;
  }
  
  return userData.availability as WeeklyAvailability;
};

// Update counselor availability
export const updateCounselorAvailability = async (
  availability: WeeklyAvailability
): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error("No authenticated user");
  }
  
  const counselorId = auth.currentUser.uid;
  const counselorRef = doc(db, 'users', counselorId);
  const counselorSnap = await getDoc(counselorRef);
  
  if (!counselorSnap.exists()) {
    throw new Error("Counselor profile not found");
  }
  
  // Validate the availability data
  validateAvailabilityData(availability);
  
  // Update the availability field
  await updateDoc(counselorRef, {
    availability
  });
};

// Add a new time slot to a specific day
export const addTimeSlot = async (
  day: string,
  newSlot: TimeSlot
): Promise<void> => {
  if (!DAYS_OF_WEEK.includes(day)) {
    throw new Error("Invalid day of week");
  }
  
  validateTimeSlot(newSlot);
  
  const availability = await getCounselorAvailability();
  
  if (!availability[day]) {
    availability[day] = { slots: [] };
  }
  
  // Check for overlapping slots
  const overlapping = availability[day].slots.some(
    slot => (
      (newSlot.start < slot.end && newSlot.end > slot.start)
    )
  );
  
  if (overlapping) {
    throw new Error("Time slot overlaps with an existing slot");
  }
  
  // Add the new slot
  availability[day].slots.push(newSlot);
  
  // Sort slots by start time
  availability[day].slots.sort((a, b) => (a.start > b.start ? 1 : -1));
  
  // Update availability
  await updateCounselorAvailability(availability);
};

// Remove a time slot from a specific day
export const removeTimeSlot = async (
  day: string, 
  slotIndex: number
): Promise<void> => {
  if (!DAYS_OF_WEEK.includes(day)) {
    throw new Error("Invalid day of week");
  }
  
  const availability = await getCounselorAvailability();
  
  if (!availability[day] || !availability[day].slots[slotIndex]) {
    throw new Error("Time slot not found");
  }
  
  // Remove the slot
  availability[day].slots.splice(slotIndex, 1);
  
  // Update availability
  await updateCounselorAvailability(availability);
};

// Helper function to validate availability data
const validateAvailabilityData = (availability: WeeklyAvailability): void => {
  for (const day in availability) {
    if (!DAYS_OF_WEEK.includes(day)) {
      throw new Error(`Invalid day: ${day}`);
    }
    
    if (!availability[day].slots) {
      throw new Error(`No slots array for ${day}`);
    }
    
    availability[day].slots.forEach(slot => {
      validateTimeSlot(slot);
    });
  }
};

// Helper function to validate a time slot
const validateTimeSlot = (slot: TimeSlot): void => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  
  if (!timeRegex.test(slot.start)) {
    throw new Error(`Invalid start time format: ${slot.start}`);
  }
  
  if (!timeRegex.test(slot.end)) {
    throw new Error(`Invalid end time format: ${slot.end}`);
  }
  
  if (slot.start >= slot.end) {
    throw new Error('End time must be after start time');
  }
};

// Check if a specific time slot is available
export const checkTimeSlotAvailable = async (
  counselorId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  const counselorRef = doc(db, 'users', counselorId);
  const counselorSnap = await getDoc(counselorRef);
  
  if (!counselorSnap.exists()) {
    throw new Error("Counselor profile not found");
  }
  
  const userData = counselorSnap.data();
  const availability = userData.availability as WeeklyAvailability || {};
  
  // Get day of week from date
  const dayOfWeek = DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust to our format
  
  // Check if the day has any availability
  if (!availability[dayOfWeek] || !availability[dayOfWeek].slots.length) {
    return false;
  }
  
  // Check if the requested time fits within any available slot
  return availability[dayOfWeek].slots.some(slot => {
    return (startTime >= slot.start && endTime <= slot.end);
  });
};
