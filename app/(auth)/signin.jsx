import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ImageBackground,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import images from '@/constants/images';
import * as WebBrowser from "expo-web-browser";
import Ionicons from '@expo/vector-icons/Ionicons';
import RBSheet from 'react-native-raw-bottom-sheet';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useUser } from '../../context/UserContext';
WebBrowser.maybeCompleteAuthSession();

const Signin = () => {
  const { updateUser } = useUser();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpShow, setOtpShow] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtpSheet, setShowOtpSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const otpSheetRef = useRef(null);
  const [userInfo, setUserInfo] = useState(null);
  const otpRefs = useRef([...Array(6)].map(() => React.createRef())); // Refs for OTP inputs
  const [resendCountdown, setResendCountdown] = useState(0); // Countdown state
  const [isResendDisabled, setIsResendDisabled] = useState(true); // Button disabled state


  const generateOtp = async () => {
    const mobileRegex = /^\d{10}$/;
    if (!mobileNumber || !mobileRegex.test(mobileNumber)) {
      Alert.alert("Invalid Mobile Number", "Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // console.log('Sending request to:', 'https://landsquire.in/api/generateotp');
      // console.log('Request body:', { mobilenumber: mobileNumber });
      const response = await fetch('https://landsquire.in/api/generateotp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilenumber: mobileNumber }),
      });

      const text = await response.text();
      // console.log('Raw response:', text);
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
      }

      // console.log('Parsed response:', data);

      if (data.success) {
        setOtpShow(data.data.otp);
        setUserInfo({ id: data.data.id });
        setShowOtpSheet(true);
        otpSheetRef.current?.open();
        startResendCountdown(); // Start countdown after successful OTP generation
      } else {
        setError(data.message || "Mobile number not found or invalid.");
      }
    } catch (error) {
      console.error('Fetch error details (generate):', error.message, 'Status:', response?.status);
      setError(`An unexpected error occurred while generating OTP: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndLogin = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // console.log('Verifying OTP with userInfo:', userInfo, 'OTP Array:', otp, 'OTP String:', otpString);
      const payload = {
        loginformidval: userInfo?.id || '',
        1: otp[0],
        2: otp[1],
        3: otp[2],
        4: otp[3],
        5: otp[4],
        6: otp[5],
      };
      // console.log('Verification payload:', payload);
      const response = await fetch('https://landsquire.in/api/verifyotp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // console.log('Verification response:', response);
      // console.log('Verification response status:', response.status);
      const text = await response.text();
      // console.log('Raw verification response:', text);
      let data;
      try {
        data = JSON.parse(text);
        // console.log('Parsed verification response:', data);
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message, 'Raw text:', text.substring(0, 200));
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

      if (data.success) {
        const token = data.token || '';
        const user = data.data || {};

        if (!token || !user.id) {
          console.log('Invalid token or user data');
        }

        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));

        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserData = await AsyncStorage.getItem('userData');
        // console.log('token sigin', storedToken);
        // Update context with user data and token
        await updateUser(user, token);
        if (storedToken && storedUserData) {
          otpSheetRef.current?.close();
          const userObj = JSON.parse(storedUserData);

          // ✅ Redirect based on user type
          const userType = userObj?.user_type?.toLowerCase(); // match API key

          if (userType === 'user') {
            // console.log('1');
            router.push('/mapview');
          } else if (userType === 'broker' || userType === 'bankagent') {
            // console.log('2');
            router.push('/(root)/(tabs)/home');
          } else {
            // console.log('3');
            // fallback if userType is unknown
            router.push('/(root)/(tabs)/home');
          }
        } else {
          // console.log('4');
          throw new Error('Failed to store authentication data');
        }
      }

    } catch (error) {
      console.error('Fetch error details (verify):', error.message, 'Status:', response?.status, 'Response:', await response?.text());
      setError(`An unexpected error occurred while verifying OTP: ${error.message}`);
    } finally {
      setLoading(false);
      // Do not close RBSheet on error
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      // console.log('Resending OTP for:', { mobilenumber: mobileNumber });
      const response = await fetch('https://landsquire.in/api/generateotp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilenumber: mobileNumber }),
      });

      const text = await response.text();
      // console.log('Raw response (resend):', text);
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
      }

      // console.log('Parsed response (resend):', data);
      if (data.success) {
        setOtpShow(data.data.otp);
        setUserInfo({ id: data.data.id });
        setOtp(['', '', '', '', '', '']); // Clear OTP fields on resend
        startResendCountdown(); // Restart countdown
      } else {
        setError(data.message || "Failed to resend OTP.");
      }
    } catch (error) {
      console.error('Fetch error details (resend):', error.message, 'Status:', response?.status);
      setError(`An unexpected error occurred while resending OTP: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(30);
    setIsResendDisabled(true);
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (text, index) => {
    if (/^\d$/.test(text) || text === '') {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      // Move focus to next input if a digit is entered
      if (text && index < 5) {
        otpRefs.current[index + 1].current.focus();
      }
      // Move focus to previous input if backspace is used
      else if (!text && index > 0) {
        otpRefs.current[index - 1].current.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <ImageBackground
          source={images.loginbanner}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        <View style={styles.formContainer}>
          <Image
            source={images.applogo}
            style={styles.applogo}
            resizeMode="cover"
          />
          <Text style={styles.title}>
            Let's <Text style={styles.highlight}>Sign In</Text>
          </Text>

          <Text style={styles.subtitle}>Get You Closer To Your Dream Home</Text>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={moderateScale(20)} color="black" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholderTextColor="#555"
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobileNumber}
              onChangeText={setMobileNumber}
            />
          </View>

          <TouchableOpacity onPress={generateOtp} style={styles.loginButton} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" style={styles.loginButtonText} />
            ) : (
              <Text style={styles.loginButtonText}>Get OTP</Text>
            )}
          </TouchableOpacity>

          <RBSheet
            ref={otpSheetRef}
            closeOnDragDown={true}
            closeOnPressMask={true}
            height={verticalScale(400)}
            customStyles={{
              container: styles.bottomSheetContainer,
            }}
          >
            <View style={styles.otpSheetContent}>
              <Text style={styles.otpSheetHeader}>Verify Your OTP</Text>
              <Text style={styles.otpSheetSubtext}>Enter the 6-digit code sent to +91 {mobileNumber}</Text>
              {/* <Text style={styles.otpSheetSubtext}>Enter OTP: {otpShow}</Text> */}
              <View style={styles.otpInputContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpRefs.current[index]}
                    style={styles.otpInput}
                    keyboardType="numeric"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    autoFocus={index === 0}
                  />
                ))}
              </View>
              {error && (
                <Text style={styles.otpErrorText}>{error}</Text>
              )}
              <TouchableOpacity onPress={verifyOtpAndLogin} style={styles.verifyButton} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>
              <View style={styles.resendContainer}>
                {resendCountdown > 0 ? (
                  <Text style={styles.resendText}>Resend in {resendCountdown}s</Text>
                ) : (
                  <TouchableOpacity
                    onPress={resendOtp}
                    style={[styles.resendButton, isResendDisabled && styles.resendButtonDisabled]}
                    disabled={isResendDisabled || loading}
                  >
                    <Text style={styles.resendButtonText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </RBSheet>
        </View>

        <Link href="./signup" style={styles.registerLink}>
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.highlight}>Register</Text>
          </Text>
        </Link>
      </ScrollView>
    </View>
  );
};

export default Signin;

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: verticalScale(20) },
  backgroundImage: { width: '100%', height: verticalScale(100) },
  applogo: { width: scale(100), height: scale(100), borderRadius: moderateScale(100) },
  formContainer: { paddingHorizontal: scale(20), width: '100%', alignItems: 'center' },
  title: { fontSize: moderateScale(24), textAlign: 'center', fontFamily: 'Rubik-Bold', color: '#333', marginTop: verticalScale(20) },
  highlight: { color: '#1F4C6B', fontFamily: 'Rubik-Bold' },
  subtitle: { fontSize: moderateScale(18), fontFamily: 'Rubik-Regular', color: '#000', textAlign: 'center', marginVertical: verticalScale(15) },
  errorText: { backgroundColor: '#1e3a8a', color: 'white', padding: scale(10), borderRadius: moderateScale(5), marginBottom: verticalScale(10), width: '100%', textAlign: 'center' },
  inputContainer: { flexDirection: 'row', padding: scale(10), alignItems: 'center', backgroundColor: '#f5f4f8', borderWidth: 0, borderRadius: moderateScale(10), marginBottom: verticalScale(10), width: '100%' },
  inputIcon: { marginLeft: scale(10) },
  input: { flex: 1, paddingHorizontal: scale(10) },
  loginButton: { backgroundColor: '#8BC83F', borderRadius: moderateScale(10), paddingVertical: verticalScale(14), alignItems: 'center', marginTop: verticalScale(10), width: '100%' },
  loginButtonText: { fontSize: moderateScale(18), fontFamily: 'Rubik-Medium', color: 'white' },
  bottomSheetContainer: {
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    padding: scale(15),
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 5,
  },
  otpSheetContent: { alignItems: 'center', width: '100%' },
  otpSheetHeader: { fontSize: moderateScale(22), fontFamily: 'Rubik-Bold', color: '#333', marginBottom: verticalScale(10) },
  otpSheetSubtext: { fontSize: moderateScale(14), fontFamily: 'Rubik-Regular', color: '#000', textAlign: 'center', marginBottom: verticalScale(20) },
  otpInputContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: verticalScale(10), gap: 5 },
  otpInput: {
    width: scale(50),
    height: verticalScale(50),
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: moderateScale(10),
    textAlign: 'center',
    fontSize: moderateScale(18),
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  otpErrorText: { color: 'red', fontSize: moderateScale(14), textAlign: 'center', marginBottom: verticalScale(15), width: '80%' },
  verifyButton: { backgroundColor: '#8BC83F', borderRadius: moderateScale(10), paddingVertical: verticalScale(12), alignItems: 'center', width: '80%', marginTop: verticalScale(10) },
  verifyButtonText: { fontSize: moderateScale(16), fontFamily: 'Rubik-Medium', color: 'white' },
  resendContainer: { marginTop: verticalScale(10), alignItems: 'center' },
  resendText: { fontSize: moderateScale(14), fontFamily: 'Rubik-Regular', color: '#666' },
  resendButton: { backgroundColor: '#f4f2f7', borderRadius: moderateScale(10), paddingVertical: verticalScale(8), paddingInline: verticalScale(18), alignItems: 'center', width: '80%' },
  resendButtonDisabled: { backgroundColor: '#cccccc' },
  resendButtonText: { fontSize: moderateScale(14), fontFamily: 'Rubik-Medium', color: '#234F68' },
  registerLink: { marginBlock: verticalScale(20), alignItems: 'center' },
  registerText: { fontSize: moderateScale(16), fontFamily: 'Rubik-Regular', color: '#000', textAlign: 'center' },
});