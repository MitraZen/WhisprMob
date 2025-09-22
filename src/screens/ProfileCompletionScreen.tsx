import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Modal,
  FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { useAuth } from '@/store/AuthContext';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';

interface ProfileCompletionScreenProps {
  onComplete: (profileData: ProfileData) => void;
  onSkip: () => void;
  user?: any;
  onNavigate?: (screen: string) => void;
}

interface ProfileData {
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  country: string;
  bio: string;
}

// Comprehensive country list
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China',
  'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany',
  'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia',
  'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'North Korea', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea',
  'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export const ProfileCompletionScreen: React.FC<ProfileCompletionScreenProps> = ({ 
  onComplete, 
  onSkip, 
  user, 
  onNavigate 
}) => {
  const [gender, setGender] = useState<ProfileData['gender'] | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { markProfileComplete } = useAuth();

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  // Generate years (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

  // Generate months
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Generate days based on selected month and year
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getDays = () => {
    if (!selectedMonth || !selectedYear) return [];
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Filter countries based on search (case-insensitive, partial match)
  const filteredCountries = countries.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase().trim())
  );

  const handleComplete = async () => {
    if (!gender || !selectedYear || !selectedMonth || !selectedDay || !country) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Validate date
    const dateOfBirth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    const birthDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const today = new Date();
    
    if (birthDate > today) {
      Alert.alert('Invalid Date', 'Date of birth cannot be in the future.');
      return;
    }

    const age = today.getFullYear() - selectedYear;
    if (age < 13) {
      Alert.alert('Age Restriction', 'You must be at least 13 years old to use this app.');
      return;
    }

    setIsLoading(true);
    try {
      const profileData: ProfileData = {
        gender,
        dateOfBirth,
        country,
        bio: bio.trim(),
      };

      console.log('ProfileCompletionScreen - User object:', user);
      console.log('ProfileCompletionScreen - User ID:', user?.id);
      
      // Try different possible ID properties
      const userId = user?.id || user?.user_id || user?.uuid;
      console.log('ProfileCompletionScreen - Resolved User ID:', userId);
      
      if (!userId) {
        console.error('ProfileCompletionScreen - No user ID found in any property');
        throw new Error('No authenticated user');
      }

          const update: Record<string, any> = {
            gender: profileData.gender,
            country: profileData.country,
            bio: profileData.bio,
            profile_completed: true,
            date_of_birth: profileData.dateOfBirth,
            updated_at: new Date().toISOString(),
          };

      const ok = await FlexibleDatabaseService.updateUserProfile(userId, update);
      if (!ok) {
        throw new Error('Failed to save profile');
      }

      markProfileComplete();
      onComplete(profileData);
    } catch (error) {
      console.error('Profile completion error:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectCountry = (selectedCountry: string) => {
    setCountry(selectedCountry);
    setCountrySearch(selectedCountry);
    setShowCountryModal(false);
  };

  const openCountryModal = () => {
    setCountrySearch('');
    setShowCountryModal(true);
  };

  const renderCountryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        country === item && styles.selectedCountryItem
      ]}
      onPress={() => selectCountry(item)}
    >
      <Text style={[
        styles.countryItemText,
        country === item && styles.selectedCountryItemText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Help others get to know you better</Text>
      </View>

      <View style={styles.form}>
        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={(value) => setGender(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value={null} />
              {genderOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.section}>
          <Text style={styles.label}>Date of Birth *</Text>
          <View style={styles.dateContainer}>
            {/* Year Picker */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Year</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={(value) => setSelectedYear(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Year" value={null} />
                  {years.map((year) => (
                    <Picker.Item key={year} label={year.toString()} value={year} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Month Picker */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Month</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={(value) => setSelectedMonth(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Month" value={null} />
                  {months.map((month) => (
                    <Picker.Item
                      key={month.value}
                      label={month.label}
                      value={month.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Day Picker */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Day</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={(value) => setSelectedDay(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Day" value={null} />
                  {getDays().map((day) => (
                    <Picker.Item key={day} label={day.toString()} value={day} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Country Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Country *</Text>
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={openCountryModal}
            disabled={isLoading}
          >
            <Text style={[
              styles.countrySelectorText,
              !country && styles.placeholderText
            ]}>
              {country || 'Select Country'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>Bio (Optional)</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#9ca3af"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isLoading}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.completeButtonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={styles.modalSpacer} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#9ca3af"
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {countrySearch.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setCountrySearch('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredCountries.length > 0 ? (
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              renderItem={renderCountryItem}
              style={styles.countryList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              initialNumToRender={20}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {countrySearch ? 'No countries found matching your search' : 'No countries available'}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: spacing.md,
  },
  pickerContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  picker: {
    height: 50,
    color: theme.colors.onBackground,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  datePickerContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onBackground,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  countrySelector: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countrySelectorText: {
    fontSize: 16,
    color: theme.colors.onBackground,
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  chevron: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onBackground,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalCloseText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
  },
  modalSpacer: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.onBackground,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: spacing.sm,
  },
  clearButton: {
    padding: spacing.sm,
    backgroundColor: '#f3f4f6',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  countryList: {
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  countryItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedCountryItem: {
    backgroundColor: '#dbeafe',
  },
  countryItemText: {
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  selectedCountryItemText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default ProfileCompletionScreen;