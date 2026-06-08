// src/utils/validators.js

export function validateEmail(email) {
  if (!email) return 'Email is required';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return 'Please enter a valid email address';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return '';
}

export function validateRequired(value, fieldName = 'This field') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return '';
}

export function validatePhone(phone) {
  if (!phone) return '';
  const regex = /^\+?[\d\s()-]{7,15}$/;
  if (!regex.test(phone)) return 'Please enter a valid phone number';
  return '';
}

export function validateAge(age) {
  if (!age) return 'Age is required';
  const numAge = Number(age);
  if (isNaN(numAge)) return 'Age must be a number';
  if (numAge < 0) return 'Age cannot be negative';
  if (numAge > 120) return 'Please enter a valid age';
  return '';
}

export function validateImage(file) {
  if (!file) return 'Image is required';
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!acceptedTypes.includes(file.type)) {
    return 'File must be a JPEG, PNG, or WebP image';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Image must be less than 5MB';
  }
  return '';
}

export function validateMissingPersonForm(data) {
  const errors = {};

  // Name — accepts either fullName or firstName/lastName combo
  const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
  if (!data.firstName || !data.firstName.trim()) errors.firstName = 'First name is required';
  if (!data.lastName || !data.lastName.trim()) errors.lastName = 'Last name is required';

  const ageError = validateAge(data.age);
  if (ageError) errors.age = ageError;

  if (!data.gender) errors.gender = 'Gender is required';

  const locationError = validateRequired(data.lastSeenLocation, 'Last known location');
  if (locationError) errors.lastSeenLocation = locationError;

  const dateError = validateRequired(data.lastSeenDate, 'Last seen date');
  if (dateError) errors.lastSeenDate = dateError;

  // Contact info
  const contactNameError = validateRequired(data.contactName, 'Your full name');
  if (contactNameError) errors.contactName = contactNameError;

  const contactPhoneError = validateRequired(data.contactPhone, 'Phone number');
  if (contactPhoneError) errors.contactPhone = contactPhoneError;

  const contactRelationshipError = validateRequired(data.contactRelationship, 'Relationship');
  if (contactRelationshipError) errors.contactRelationship = contactRelationshipError;

  if (!data.photos || data.photos.length === 0) {
    errors.photos = 'At least one photo is required';
  }

  return errors;
}

export function validateSightingForm(data) {
  const errors = {};

  const locationError = validateRequired(data.location, 'Location');
  if (locationError) errors.location = locationError;

  if (!data.photo) {
    errors.photo = 'A photo is required for sighting verification';
  }

  return errors;
}

export function validateLoginForm(data) {
  const errors = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validateRequired(data.password, 'Password');
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateAdminEmail(email) {
  if (!email) return 'Email is required';
  const adminDomains = ['@reuniteai.com', '@admin.reuniteai.com', '@gov.ng'];
  const isAdminDomain = adminDomains.some((domain) => email.toLowerCase().endsWith(domain));
  if (!isAdminDomain) {
    return `Admin accounts require an official email (${adminDomains.join(', ')})`;
  }
  return '';
}

export function validateRegisterForm(data) {
  const errors = {};

  const nameError = validateRequired(data.name, 'Full name');
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}
