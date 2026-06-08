// src/pages/citizen/ReportSightingPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, MapPin } from 'lucide-react';
import sightingService from '../../services/sighting.service';
import { validateSightingForm } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errorHandler';
import ErrorAlert from '../../components/common/ErrorAlert';
import toast from 'react-hot-toast';

export default function ReportSightingPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    location: '',
    description: '',
    latitude: '',
    longitude: '',
    missingPersonId: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
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
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      if (errors.photo) setErrors((prev) => ({ ...prev, photo: '' }));
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
          toast.success('Location captured!');
        },
        () => {
          toast.error('Unable to get location. Please enter manually.');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateSightingForm({ ...formData, photo });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const formDataToSend = new FormData();

      // Field name must match uploadSightingImage middleware: .single('image')
      formDataToSend.append('image', photo);

      // Location as JSON string — controller parses it
      formDataToSend.append('location', JSON.stringify({
        address: formData.location,
        lat: formData.latitude ? parseFloat(formData.latitude) : null,
        lng: formData.longitude ? parseFloat(formData.longitude) : null,
      }));

      formDataToSend.append('description', formData.description);
      formDataToSend.append('sightingTime', new Date().toISOString());

      if (formData.missingPersonId) {
        formDataToSend.append('missingPersonId', formData.missingPersonId);
      }

      await sightingService.create(formDataToSend);
      toast.success('Sighting reported successfully!');
      navigate('/citizen/dashboard');
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
          <h1 className="text-2xl font-bold text-gray-900">Report Sighting</h1>
          <p className="text-gray-600 mt-1">
            Submit a sighting of someone who may match a missing person.
          </p>
        </div>
      </div>

      {apiError && <ErrorAlert message={apiError} className="mb-6" onDismiss={() => setApiError('')} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Photograph *</h2>
          <p className="text-sm text-gray-500">
            Upload a clear photo of the person you sighted. This is crucial for facial recognition matching.
          </p>

          {photoPreview ? (
            <div className="relative w-48 aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-maroon-800 hover:bg-maroon-50 transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">Click to upload a photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
          )}
          {errors.photo && <p className="text-sm text-red-600">{errors.photo}</p>}
        </div>

        {/* Location */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Location *</h2>

          <div>
            <label htmlFor="location" className="label">Location Address</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Market Square, City Center"
              className="input-field"
              disabled={loading}
            />
            {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="label">Latitude</label>
              <input
                type="text"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g., 9.0820"
                className="input-field"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="longitude" className="label">Longitude</label>
              <input
                type="text"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g., 8.6753"
                className="input-field"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <MapPin className="w-4 h-4" />
            Use My Current Location
          </button>
        </div>

        {/* Details */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>

          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what you saw, what the person was wearing, etc."
              className="input-field resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="missingPersonId" className="label">Related Missing Person (optional)</label>
            <input
              type="text"
              id="missingPersonId"
              name="missingPersonId"
              value={formData.missingPersonId}
              onChange={handleChange}
              placeholder="Enter case number if known"
              className="input-field"
              disabled={loading}
            />
          </div>
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
              'Submit Sighting'
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
