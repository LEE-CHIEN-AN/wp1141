import { X, MapPin, Star, Globe, Phone, Navigation2, Save, Share2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlaceDetails } from '@/utils/places';
import { SearchBox } from './SearchBox';
import type { PlacePrediction } from '@/utils/places';

type PlaceDetailsCardProps = {
  place: PlaceDetails;
  onClose: () => void;
  onRoute: () => void;
  isOpen: boolean;
  // Search box props
  destinationQuery: string;
  onDestinationChange: (value: string) => void;
  onSearch: () => void;
  onRouteClick: () => void;
  onOptionsClick: () => void;
  onPlaceSelect?: (prediction: PlacePrediction) => void;
  suggestions?: PlacePrediction[];
  suggestionsLoading?: boolean;
  loading?: boolean;
};

export function PlaceDetailsCard({
  place,
  onClose,
  onRoute,
  isOpen,
  destinationQuery,
  onDestinationChange,
  onSearch,
  onRouteClick,
  onOptionsClick,
  onPlaceSelect,
  suggestions = [],
  suggestionsLoading = false,
  loading = false,
}: PlaceDetailsCardProps) {
  // Get photo URL if available
  const photoUrl = place.photos && place.photos.length > 0
    ? place.photos[0].photoReference
    : null;

  // Get category/type for display
  const category = place.types?.[0]?.replace(/_/g, ' ') || '地點';

  if (!isOpen) return null;

  return (
    <aside className="fixed left-0 top-0 z-[50] h-full w-[400px] flex flex-col border-r bg-white shadow-2xl">
      {/* Search Box at the top */}
      <div className="p-3 flex-shrink-0">
        <SearchBox
          destinationQuery={destinationQuery}
          onDestinationChange={onDestinationChange}
          onSearch={onSearch}
          onRouteClick={onRouteClick}
          onOptionsClick={onOptionsClick}
          onPlaceSelect={onPlaceSelect}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          loading={loading}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
      {/* Header with image */}
      <div className="relative h-64 w-full bg-gradient-to-br from-blue-100 to-blue-200">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={place.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails
              const target = e.target as HTMLImageElement;
              if (place.icon) {
                target.src = place.icon;
              } else {
                target.style.display = 'none';
              }
            }}
          />
        ) : place.icon ? (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <img
              src={place.icon}
              alt={place.name}
              className="h-20 w-20 object-contain"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <MapPin className="h-20 w-20 text-gray-400" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/90 hover:bg-white"
          onClick={onClose}
          aria-label="關閉"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {place.name}
        </h2>

        {/* Rating and Category */}
        <div className="flex items-center gap-3 mb-4">
          {place.rating !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{place.rating}</span>
            </div>
          )}
          {place.userRatingsTotal && (
            <span className="text-xs text-gray-500">
              ({place.userRatingsTotal.toLocaleString()})
            </span>
          )}
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-600">{category}</span>
        </div>

        {/* Navigation Tabs (Google Maps style) */}
        <div className="flex gap-4 mb-4 border-b">
          <button className="px-2 pb-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
            總覽
          </button>
          <button className="px-2 pb-2 text-sm text-gray-600 hover:text-gray-900">
            評論
          </button>
          <button className="px-2 pb-2 text-sm text-gray-600 hover:text-gray-900">
            簡介
          </button>
        </div>

        {/* Action Buttons Row (Google Maps style) */}
        <div className="grid grid-cols-5 gap-2 mb-4 pb-4 border-b">
          <button
            onClick={onRoute}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
              <Navigation2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs text-gray-700">規劃路線</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Save className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-700">儲存</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-700">附近</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Send className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-700">傳送</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-700">分享</span>
          </button>
        </div>

        {/* Address and Contact Info */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="text-sm text-gray-700">{place.formattedAddress}</span>
          </div>

          {place.website && (
            <div className="text-sm text-gray-600">
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                {place.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {place.phoneNumber && (
            <div className="text-sm text-gray-600">
              <a
                href={`tel:${place.phoneNumber}`}
                className="hover:text-primary"
              >
                {place.phoneNumber}
              </a>
            </div>
          )}
        </div>
      </div>
      </div>
    </aside>
  );
}

