// src/pages/citizen/ReportMissingPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import missingPersonService from '../../services/missingPerson.service';
import { validateMissingPersonForm } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errorHandler';
import ErrorAlert from '../../components/common/ErrorAlert';
import toast from 'react-hot-toast';

export default function ReportMissingPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    lastSeenLocation: '',
    lastSeenDate: '',
    description: '',
    urgency: 'medium',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactRelationship: '',
  });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    const validationErrors = validateMissingPersonForm({
      ...formData,
      fullName,
      photos,
    });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', fullName);
      formDataToSend.append('age', formData.age);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('lastSeenLocation', formData.lastSeenLocation);
      formDataToSend.append('lastSeenDate', formData.lastSeenDate || new Date().toISOString());
      formDataToSend.append('additionalInfo', formData.description);
      formDataToSend.append('urgency', formData.urgency);

      // Contact info as JSON string (controller parses it)
      formDataToSend.append('contactInfo', JSON.stringify({
        name: formData.contactName,
        phone: formData.contactPhone,
        email: formData.contactEmail,
        relationship: formData.contactRelationship,
      }));

      photos.forEach((photo) => {
        formDataToSend.append('photos', photo);
      });

      const response = await missingPersonService.create(formDataToSend);
      const created = response.data || response;
      toast.success('Missing person reported successfully!');
      navigate(`/citizen/missing/${created._id || created.id}`);
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-maroon-50 text-gray-600 hover:text-maroon-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Missing Person</h1>
          <p className="text-gray-600 mt-1">
            Provide as much detail as possible to help with the search.
          </p>
        </div>
      </div>

      {apiError && <ErrorAlert message={apiError} className="mb-6" onDismiss={() => setApiError('')} />}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Personal Information */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="label">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input-field"
                disabled={loading}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="label">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input-field"
                disabled={loading}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="age" className="label">Age *</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="0"
                max="120"
                className="input-field"
                disabled={loading}
              />
              {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
            </div>
            <div>
              <label htmlFor="gender" className="label">Gender *</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-field"
                disabled={loading}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
            </div>
          </div>
        </div>

        {/* Location & Details */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Location & Details</h2>

          <div>
            <label htmlFor="lastSeenLocation" className="label">Last Known Location *</label>
            <input
              type="text"
              id="lastSeenLocation"
              name="lastSeenLocation"
              value={formData.lastSeenLocation}
              onChange={handleChange}
              placeholder="e.g., 123 Main Street, City, State"
              className="input-field"
              disabled={loading}
            />
            {errors.lastSeenLocation && <p className="mt-1 text-sm text-red-600">{errors.lastSeenLocation}</p>}
          </div>

          <div>
            <label htmlFor="lastSeenDate" className="label">Last Seen Date *</label>
            <input
              type="date"
              id="lastSeenDate"
              name="lastSeenDate"
              value={formData.lastSeenDate}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="input-field"
              disabled={loading}
            />
            {errors.lastSeenDate && <p className="mt-1 text-sm text-red-600">{errors.lastSeenDate}</p>}
          </div>

          <div>
            <label htmlFor="description" className="label">Physical Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe any distinguishing features, clothing last worn, etc."
              className="input-field resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="urgency" className="label">Urgency Level</label>
            <select
              id="urgency"
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="input-field"
              disabled={loading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Your Contact Information</h2>
          <p className="text-sm text-gray-500">
            Authorities will use this to reach you regarding this case.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactName" className="label">Your Full Name *</label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className="input-field"
                disabled={loading}
              />
              {errors.contactName && <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>}
            </div>
            <div>
              <label htmlFor="contactRelationship" className="label">Relationship to Missing Person *</label>
              <input
                type="text"
                id="contactRelationship"
                name="contactRelationship"
                value={formData.contactRelationship}
                onChange={handleChange}
                placeholder="e.g., Parent, Sibling, Friend"
                className="input-field"
                disabled={loading}
              />
              {errors.contactRelationship && <p className="mt-1 text-sm text-red-600">{errors.contactRelationship}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactPhone" className="label">Phone Number *</label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="e.g., +234 800 000 0000"
                className="input-field"
                disabled={loading}
              />
              {errors.contactPhone && <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>}
            </div>
            <div>
              <label htmlFor="contactEmail" className="label">Email Address</label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className="input-field"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Photographs *</h2>
          <p className="text-sm text-gray-500">
            Upload clear photos of the missing person. These will be used for facial recognition.
          </p>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-maroon-800 hover:bg-maroon-50 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Click to upload photos (max 5)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={loading || photos.length >= 5}
            />
          </label>
          {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-8 py-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
