import { MapPin } from 'lucide-react';
import type { PlacePrediction } from '@/utils/places';

type PlaceSuggestionsProps = {
  suggestions: PlacePrediction[];
  onSelect: (prediction: PlacePrediction) => void;
  loading?: boolean;
};

export function PlaceSuggestions({
  suggestions,
  onSelect,
  loading,
}: PlaceSuggestionsProps) {
  if (loading) {
    return (
      <div className="absolute top-full z-[90] mt-2 w-full rounded-lg border bg-white shadow-lg">
        <div className="p-4 text-center text-sm text-muted-foreground">
          搜尋中...
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-lg border bg-white shadow-lg max-h-96 overflow-y-auto z-[90]">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.placeId}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {suggestion.mainText}
            </div>
            {suggestion.secondaryText && (
              <div className="text-xs text-gray-500 truncate">
                {suggestion.secondaryText}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

