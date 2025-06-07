# Expo Auth App with WebRTC Video Calling

This is a React Native application built with Expo that features:

1. Firebase email/password authentication
2. WebRTC-based video calling functionality 
3. Light and dark mode support

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Features

### Authentication
- Firebase email/password authentication
- User sign-up and login
- Session persistence using AsyncStorage

### Video Calling
- Peer-to-peer video calls using WebRTC
- Firestore-based signaling for WebRTC connection establishment
- Call controls:
  - Mute/unmute audio
  - Enable/disable video
  - Switch camera (front/back)
  - End call
- Share call ID to invite others to join
- Adaptive UI for both light and dark modes

## Technical Implementation

### WebRTC Architecture
The video calling feature uses a peer-to-peer WebRTC connection architecture with Firebase Firestore as the signaling server. Here's how it works:

1. **Call Creation**:
   - User creates a call which generates a unique call ID
   - An SDP offer is created and stored in Firestore
   - ICE candidates are collected and stored in Firestore

2. **Call Joining**:
   - Other user joins using the call ID
   - Retrieves the SDP offer from Firestore
   - Creates an SDP answer and stores it back in Firestore
   - ICE candidates are exchanged through Firestore

3. **Media Handling**:
   - Local and remote video streams are managed using RTCView
   - Camera and microphone access permissions are requested
   - Video/audio can be toggled on/off during the call

### Firebase Resources
- **Authentication**: Email/password authentication
- **Firestore Collections**:
  - `calls`: Stores call information, offers, and answers
  - `calls/{callId}/callerCandidates`: Stores ICE candidates from the caller
  - `calls/{callId}/calleeCandidates`: Stores ICE candidates from the callee

## Using the App

1. **Authentication**:
   - Sign up with email and password
   - Log in with existing credentials
   
2. **Video Calling**:
   - Navigate to the Video Call tab
   - Tap "Start New Call" to create a call
   - Share the generated call ID with another user
   - Other user enters ID and taps "Join"
   - Use on-screen controls for mute, camera toggle, etc.

## Development

This project uses [Expo Router](https://docs.expo.dev/router/introduction) for file-based routing and navigation.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
