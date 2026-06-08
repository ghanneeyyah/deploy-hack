// src/pages/public/LandingPage.jsx
import { Link } from 'react-router-dom';
import { Search, Shield, Eye, MapPin, ArrowRight, Users, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated, isAdmin } = useAuth();

  const features = [
    {
      icon: Search,
      title: 'AI Face Recognition',
      description: 'Advanced facial recognition technology matches sighting photos against missing person databases with high accuracy.',
    },
    {
      icon: MapPin,
      title: 'Live Tracking',
      description: 'Real-time map visualization of missing person reports and sightings across different locations.',
    },
    {
      icon: Eye,
      title: 'Instant Alerts',
      description: 'Get notified immediately when a missing person is reported in your area. Help the community stay vigilant.',
    },
    {
      icon: Shield,
      title: 'Verified Matches',
      description: 'All AI-generated matches are reviewed by authorized personnel before any action is taken.',
    },
  ];

  const stats = [
    { icon: Users, label: 'Active Cases', value: '1,200+' },
    { icon: Activity, label: 'Matches Found', value: '850+' },
    { icon: Eye, label: 'Sightings Reported', value: '3,400+' },
    { icon: Shield, label: 'Families Reunited', value: '600+' },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-maroon-800 to-maroon-950 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-6 backdrop-blur-sm">
              <Shield className="w-4 h-4" />
              <span>AI-Powered Missing Persons Recovery</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Bringing Loved Ones{' '}
              <span className="text-maroon-200">Home</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed">
              Reunite AI uses advanced facial recognition technology to help find missing persons. 
              Report a missing person, submit sightings, and help reunite families faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/citizen/dashboard'}
                  className="btn-primary bg-white text-maroon-800 hover:bg-maroon-50 flex items-center justify-center gap-2 px-8 py-3.5 text-lg"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary bg-white text-maroon-800 hover:bg-maroon-50 flex items-center justify-center gap-2 px-8 py-3.5 text-lg"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="btn-secondary border-white text-white hover:bg-white/10 flex items-center justify-center gap-2 px-8 py-3.5 text-lg"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative -mt-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
          {stats.map((stat) => (
            <div key={stat.label} className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-maroon-50 rounded-xl mb-3">
                <stat.icon className="w-5 h-5 text-maroon-800" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform combines community reporting with AI technology to accelerate the search for missing persons.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="card-maroon text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-maroon-50 rounded-xl mb-4">
                <feature.icon className="w-7 h-7 text-maroon-800" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple Steps to Help
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're reporting a missing person or submitting a sighting, the process is straightforward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="card text-center relative z-10">
                <div className="w-12 h-12 bg-maroon-800 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Report Missing Person
                </h3>
                <p className="text-sm text-gray-600">
                  Submit details, photos, and last known location of the missing person. The system generates an immediate alert.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="card text-center relative z-10">
                <div className="w-12 h-12 bg-maroon-800 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Submit Sightings
                </h3>
                <p className="text-sm text-gray-600">
                  If you see someone matching a missing person, submit a photo and location. Every sighting helps narrow the search.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="card text-center relative z-10">
                <div className="w-12 h-12 bg-maroon-800 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI Matching & Verification
                </h3>
                <p className="text-sm text-gray-600">
                  Our AI compares sighting photos with missing persons. Verified matches are reviewed by administrators before action is taken.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-maroon-800 rounded-2xl p-10 sm:p-14 text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Join our community of citizens helping to reunite missing persons with their loved ones.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="btn-primary bg-white text-maroon-800 hover:bg-maroon-50 inline-flex items-center gap-2 px-8 py-3.5 text-lg"
            >
              Join Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}