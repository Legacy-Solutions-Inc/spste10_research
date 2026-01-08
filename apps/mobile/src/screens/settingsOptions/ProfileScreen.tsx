import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useGetProfile } from "./hooks/useGetProfile";
import { useUpdateProfile } from "./hooks/useUpdateProfile";
import { useUploadProfileImage } from "./hooks/useUploadProfileImage";

type ProfileNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Profile"
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { profileData, loading: loadingProfile, error: profileError, refetch } = useGetProfile();
  const { updateProfile, loading: savingProfile } = useUpdateProfile();
  const { uploadImage, loading: uploadingImage } = useUploadProfileImage();
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null); // Local URI before upload
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    birthday: "",
    age: "",
    bloodType: "",
    gender: "",
    email: "",
  });

  // Load profile data when it's fetched
  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        address: profileData.address || "",
        birthday: profileData.birthday || "",
        age: profileData.age?.toString() || "",
        bloodType: profileData.blood_type || "",
        gender: profileData.gender || "",
        email: profileData.email || "",
      });
      setProfileImage(profileData.avatar_url);
    }
  }, [profileData]);

  // Check if required fields are filled (for enabling SAVE button)
  const isFormValid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.email.trim() !== ""
    );
  };

  const handleAddPhoto = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImageUri(result.assets[0].uri);
        setProfileImage(result.assets[0].uri); // Show immediately
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      // First, upload profile image if a new one was selected
      let avatarUrl = profileImage;
      if (profileImageUri && profileImageUri !== profileData?.avatar_url) {
        const uploadedUrl = await uploadImage(profileImageUri);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          setProfileImage(uploadedUrl);
        }
      }

      // Calculate full_name from first_name + last_name
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim() || null;

      // Save profile data
      const success = await updateProfile({
        full_name: fullName,
        email: formData.email.trim() || undefined,
        avatar_url: avatarUrl || undefined,
        first_name: formData.firstName.trim() || undefined,
        last_name: formData.lastName.trim() || undefined,
        address: formData.address.trim() || undefined,
        birthday: formData.birthday.trim() || undefined,
        age: formData.age.trim() || undefined,
        blood_type: formData.bloodType.trim() || undefined,
        gender: formData.gender.trim() || undefined,
      });

      if (success) {
        // Refresh profile data
        await refetch();
        setProfileImageUri(null); // Clear local URI
      }
    } catch (error) {
      console.error("Save profile error:", error);
      // Error is already handled in the hook
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#0b376c" />
        <Text className="mt-4 text-gray-600">Loading profile...</Text>
      </View>
    );
  }

  if (profileError) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
        <Text className="mt-4 text-lg font-bold text-gray-900 text-center">
          Error Loading Profile
        </Text>
        <Text className="mt-2 text-gray-600 text-center">{profileError}</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-6 bg-blue-900 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-20 pb-4">
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings1")}
          className="h-12 w-12 rounded-full bg-blue-900 items-center justify-center mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-900 flex-1 text-center -ml-14">
          Profile
        </Text>
      </View>

      {/* Profile Picture Section */}
      <View className="items-center mt-6 mb-6">
        <View className="h-32 w-32 rounded-full border-2 border-gray-300 items-center justify-center overflow-hidden bg-gray-100">
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={64}
              color="#9CA3AF"
            />
          )}
        </View>
        <TouchableOpacity
          onPress={handleAddPhoto}
          className="bg-blue-900 rounded-full py-1 px-4 mt-3"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-sm">Add Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View className="px-4 pb-8">
        {/* First Name */}
        <TextInput
          placeholder="First name"
          placeholderTextColor="#93C5FD"
          value={formData.firstName}
          onChangeText={(value) => updateField("firstName", value)}
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Last Name */}
        <TextInput
          placeholder="Last name"
          placeholderTextColor="#93C5FD"
          value={formData.lastName}
          onChangeText={(value) => updateField("lastName", value)}
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Address */}
        <TextInput
          placeholder="Address"
          placeholderTextColor="#93C5FD"
          value={formData.address}
          onChangeText={(value) => updateField("address", value)}
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Birthday */}
        <TextInput
          placeholder="Birthday"
          placeholderTextColor="#93C5FD"
          value={formData.birthday}
          onChangeText={(value) => updateField("birthday", value)}
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Age */}
        <TextInput
          placeholder="Age"
          placeholderTextColor="#93C5FD"
          value={formData.age}
          onChangeText={(value) => updateField("age", value)}
          keyboardType="numeric"
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Blood Type */}
        <TextInput
          placeholder="Blood Type"
          placeholderTextColor="#93C5FD"
          value={formData.bloodType}
          onChangeText={(value) => updateField("bloodType", value)}
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Gender */}
        <TextInput
          placeholder="Gender"
          placeholderTextColor="#93C5FD"
          value={formData.gender}
          onChangeText={(value) => updateField("gender", value)}
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Email */}
        <TextInput
          placeholder="Email"
          placeholderTextColor="#93C5FD"
          value={formData.email}
          onChangeText={(value) => updateField("email", value)}
          keyboardType="email-address"
          autoCapitalize="none"
          className="border border-blue-300 rounded-lg px-4 py-2 text-sm mt-2 text-gray-900"
        />

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isFormValid() || savingProfile || uploadingImage}
          className={`rounded-full px-6 py-2 self-end mt-4 flex-row items-center ${
            isFormValid() && !savingProfile && !uploadingImage
              ? "bg-blue-900"
              : "bg-blue-100"
          }`}
          activeOpacity={isFormValid() && !savingProfile && !uploadingImage ? 0.8 : 1}
        >
          {(savingProfile || uploadingImage) && (
            <ActivityIndicator size="small" color="white" className="mr-2" />
          )}
          <Text
            className={`font-bold text-base ${
              isFormValid() && !savingProfile && !uploadingImage ? "text-white" : "text-blue-300"
            }`}
          >
            {savingProfile || uploadingImage ? "SAVING..." : "SAVE"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

