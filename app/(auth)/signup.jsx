import { View, StyleSheet, Text, Image, TextInput, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Link } from 'expo-router';
import Constants from 'expo-constants';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Ionicons, Octicons } from '@expo/vector-icons';
import axios from 'axios';
import images from '@/constants/images';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useNavigation } from 'expo-router';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bankName, setBankName] = useState('');
  const [companyDocument, setCompanyDocument] = useState(null);
  const [userType, setUserType] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', title: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sessionToken, setSessionToken] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const rbSheetRef = useRef(null);
  const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || '';
  const navigation = useNavigation();

  useEffect(() => {
    setSessionToken(Math.random().toString(36).substring(2) + Date.now().toString(36));
  }, []);

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (text.length > 2) {
      fetchSuggestions(text);
    } else {
      setSuggestions([]);
    }
  };

  const fetchSuggestions = async (input) => {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
        params: {
          input,
          components: 'country:IN',
          types: '(cities)',
          key: GOOGLE_MAPS_API_KEY,
          sessiontoken: sessionToken,
        },
      });
      if (response.data.status === 'OK') {
        setSuggestions(response.data.predictions);
      } else {
        setSuggestions([]);
        setMessage({ type: 'error', title: 'Error', text: response.data.error_message || 'Failed to fetch suggestions.' });
      }
    } catch (error) {
      setSuggestions([]);
      setMessage({ type: 'error', title: 'Error', text: 'An unexpected error occurred during search.' });
    }
  };

  const handleSelect = async (placeId) => {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: 'address_components',
          key: GOOGLE_MAPS_API_KEY,
          sessiontoken: sessionToken,
        },
      });
      if (response.data.status === 'OK') {
        const components = response.data.result.address_components;
        let selectedCity = '';
        let selectedState = '';
        components.forEach(comp => {
          if (comp.types.includes('locality') || comp.types.includes('sublocality')) {
            selectedCity = comp.long_name;
          }
          if (comp.types.includes('administrative_area_level_1')) {
            selectedState = comp.long_name;
          }
        });
        if (selectedCity && selectedState) {
          setCity(selectedCity);
          setState(selectedState);
          setSearchTerm(selectedCity);
          setSuggestions([]);
        } else {
          setMessage({ type: 'error', title: 'Error', text: 'Could not extract city and state from selection.' });
        }
      } else {
        setMessage({ type: 'error', title: 'Error', text: response.data.error_message || 'Failed to fetch place details.' });
      }
    } catch (error) {
      setMessage({ type: 'error', title: 'Error', text: 'An unexpected error occurred during selection.' });
    }
  };

  useEffect(() => {
    if (message.type) {
      rbSheetRef.current?.open();
    }
  }, [message]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const selectedFile = result.assets[0];

      if (!['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(selectedFile.mimeType)) {
        setMessage({ type: 'error', title: 'Invalid File', text: 'Please select a PDF or an image file (PNG, JPG, JPEG).' });
        return;
      }

      setCompanyDocument(selectedFile);
    } catch (error) {
      console.error('Document Picker Error:', error);
      setMessage({ type: 'error', title: 'Error', text: 'An error occurred while selecting a document.' });
    }
  };

  const handleRegister = async () => {
    if (
      email &&
      password &&
      username &&
      mobile &&
      city &&
      state &&
      (userType === 'user' || (userType === 'broker' && companyName && companyDocument) || (userType === 'bankagent' && bankName))
    ) {
      setIsLoading(true); // Start loading
      const formData = new FormData();
      formData.append('user_type', userType);
      formData.append('name', username);
      formData.append('mobile', mobile);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('email', email);
      formData.append('password', password);

      if (userType === 'broker' && companyName && companyDocument) {
        formData.append('company_name', companyName);
        formData.append('company_document', {
          uri: companyDocument.uri,
          name: companyDocument.name,
          type: companyDocument.mimeType || 'application/octet-stream',
        });
      } else if (userType === 'bankagent' && bankName) {
        formData.append('bankname', bankName);
      }

      try {
        const response = await fetch('https://landsquire.in/api/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setMessage({ type: 'success', title: 'Success', text: 'User registered successfully!' });
          setUsername('');
          setMobile('');
          setCity('');
          setState('');
          setEmail('');
          setPassword('');
          setCompanyName('');
          setBankName('');
          setCompanyDocument(null);
          setSearchTerm('');
          setTimeout(() => {
            navigation.navigate('signin');
          }, 2000);
        } else {
          setMessage({ type: 'error', title: 'Error', text: result.message || 'Registration failed' });
        }
      } catch (error) {
        console.error('Registration Error:', error);
        setMessage({ type: 'error', title: 'Error', text: 'An unexpected error occurred' });
      } finally {
        setIsLoading(false); // Stop loading
      }
    } else {
      setMessage({ type: 'error', title: 'Error', text: 'Please fill in all required fields' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Image source={images.applogo} style={styles.applogo} resizeMode="cover" />
        <View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join Us and Explore New Opportunities</Text>
        </View>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity onPress={() => setUserType('user')}>
          <View style={[styles.toggleButton, userType === 'user' ? styles.toggleButtonActive : {}]}>
            <Text style={[styles.toggleText, userType === 'user' ? styles.toggleTextActive : {}]}>User</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setUserType('broker')}>
          <View style={[styles.toggleButton, userType === 'broker' ? styles.toggleButtonActive : {}]}>
            <Text style={[styles.toggleText, userType === 'broker' ? styles.toggleTextActive : {}]}>Broker</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setUserType('bankagent')}>
          <View style={[styles.toggleButton, userType === 'bankagent' ? styles.toggleButtonActive : {}]}>
            <Text style={[styles.toggleText, userType === 'bankagent' ? styles.toggleTextActive : {}]}>Bank Agent</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {userType === 'broker' && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingLeft: 10 }]}
                  placeholder="Company Name"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                <Text style={[styles.input, { paddingTop: 13, color: '#555' }]}>
                  {companyDocument ? companyDocument.name : 'Company Document'}
                </Text>
                <TouchableOpacity onPress={pickDocument} style={styles.uploadButton}>
                  <Text style={styles.uploadText}>Upload</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {userType === 'bankagent' && (
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingLeft: 10 }]}
                placeholder="Bank Name"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your Full name"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.inputContainer}>
            <Octicons name="device-mobile" size={20} color="#1F4C6B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mobile No."
              keyboardType="number-pad"
              value={mobile}
              onChangeText={setMobile}
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, styles.inputContainerHalf]}>
              <Ionicons name="location-outline" size={20} color="#1F4C6B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search City"
                value={searchTerm}
                onChangeText={handleSearch}
              />
            </View>
            <View style={[styles.inputContainer, styles.inputContainerHalf]}>
              <Ionicons name="map-outline" size={20} color="#1F4C6B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="State"
                value={state}
                editable={false}
              />
            </View>
          </View>

          {suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelect(item.place_id)}>
                  <Text style={styles.suggestionText}>{item.description}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionsList}
            />
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#1F4C6B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#1F4C6B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Create Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showPassword}>{showPassword ? 'Hide password' : 'Show password'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={handleRegister} 
            style={[styles.registerButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Link href="/signin" style={styles.loginLink}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginHighlight}>Login now!</Text>
        </Text>
      </Link>

      <RBSheet
        ref={rbSheetRef}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={verticalScale(200)}
        openDuration={250}
        customStyles={{
          container: {
            borderTopLeftRadius: moderateScale(20),
            borderTopRightRadius: moderateScale(20),
            backgroundColor: '#fff',
            padding: moderateScale(20),
            alignItems: 'center',
            justifyContent: 'center',
          },
          draggableIcon: {
            backgroundColor: '#ccc',
            width: scale(60),
            height: verticalScale(5),
          },
        }}
      >
        <View style={styles.sheetContainer}>
          <Ionicons
            name={message.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={scale(40)}
            color={message.type === 'success' ? '#8BC83F' : '#FF4C4C'}
            style={{ marginBottom: verticalScale(10) }}
          />
          <Text style={styles.sheetTitle}>{message.title}</Text>
          <Text style={styles.sheetText}>{message.text}</Text>
          <TouchableOpacity style={styles.sheetButton} onPress={() => rbSheetRef.current?.close()}>
            <Text style={styles.sheetButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </RBSheet>
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingBottom: verticalScale(20) },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: verticalScale(10) },
  applogo: { width: scale(50), height: scale(50), borderRadius: moderateScale(10), marginRight: scale(10) },
  formContainer: { paddingInline: 20, width: '100%', alignItems: 'center' },
  title: { fontSize: scale(20), fontFamily: 'Rubik-Bold', color: '#1F4C6B', textAlign: 'left' },
  subtitle: { fontSize: scale(14), fontFamily: 'Rubik-Regular', color: '#555', textAlign: 'left', marginVertical: verticalScale(5) },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: verticalScale(7) },
  toggleButton: { paddingVertical: verticalScale(4), paddingHorizontal: scale(15), borderRadius: moderateScale(20), borderWidth: 1, borderColor: '#ccc', marginHorizontal: scale(5) },
  toggleButtonActive: { backgroundColor: '#1F4C6B' },
  toggleText: { fontSize: scale(14), fontFamily: 'Rubik-Medium', color: '#555' },
  toggleTextActive: { color: 'white' },
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  inputContainer: { flexDirection: 'row', padding: moderateScale(10), alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: moderateScale(10), marginBottom: verticalScale(10), width: '100%' },
  inputContainerHalf: { width: '48%' },
  inputIcon: { marginLeft: scale(10) },
  input: { flex: 1, height: verticalScale(45), paddingHorizontal: scale(10), fontFamily: 'Rubik-Regular' },
  suggestionsList: { backgroundColor: '#fff', borderRadius: moderateScale(10), maxHeight: verticalScale(200), width: '100%', marginBottom: verticalScale(10) },
  suggestionItem: { padding: moderateScale(10), borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionText: { fontFamily: 'Rubik-Regular', color: '#555', fontSize: scale(14) },
  uploadButton: { padding: moderateScale(10) },
  uploadText: { color: '#1e40af', fontFamily: 'Rubik-Medium' },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: verticalScale(10) },
  showPassword: { color: '#234F68', fontFamily: 'Rubik-Regular' },
  registerButton: { backgroundColor: '#8BC83F', borderRadius: moderateScale(10), paddingVertical: verticalScale(14), alignItems: 'center', marginTop: verticalScale(10), width: '100%' },
  disabledButton: { backgroundColor: '#cccccc', opacity: 0.6 },
  registerButtonText: { fontSize: scale(18), fontFamily: 'Rubik-Medium', color: 'white' },
  loginLink: { marginVertical: verticalScale(20), alignItems: 'center' },
  loginText: { fontSize: scale(16), fontFamily: 'Rubik-Regular', color: '#000' },
  loginHighlight: { color: '#234F68', fontFamily: 'Rubik-Bold' },
  sheetContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  sheetTitle: { fontSize: scale(18), fontFamily: 'Rubik-Bold', color: '#1F4C6B', marginBottom: verticalScale(10) },
  sheetText: { fontSize: scale(14), fontFamily: 'Rubik-Regular', color: '#555', textAlign: 'center', marginBottom: verticalScale(20) },
  sheetButton: { backgroundColor: '#1F4C6B', borderRadius: moderateScale(10), paddingVertical: verticalScale(10), paddingHorizontal: scale(20), width: scale(200), alignItems: 'center' },
  sheetButtonText: { fontSize: scale(16), fontFamily: 'Rubik-Medium', color: 'white' },
});