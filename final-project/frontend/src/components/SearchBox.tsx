import { useId, useRef, useEffect, useState } from 'react';
import { SearchIcon, Route, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceSuggestions } from './PlaceSuggestions';
import type { PlacePrediction } from '@/utils/places';

type SearchBoxProps = {
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

export function SearchBox({
  destinationQuery,
  onDestinationChange,
  onSearch,
  onRouteClick,
  onOptionsClick,
  onPlaceSelect,
  suggestions = [],
  suggestionsLoading = false,
  loading,
}: SearchBoxProps) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuggestions(false); // Hide suggestions when searching
    onSearch();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Suggestions will be hidden when query is cleared
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <div className="relative flex flex-1 items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-lg">
          <Input
            id={inputId}
            type="search"
            placeholder="搜尋地圖"
            value={destinationQuery}
            onChange={(e) => {
              onDestinationChange(e.target.value);
              setShowSuggestions(true); // Show suggestions when typing
            }}
            onFocus={() => {
              setShowSuggestions(true); // Show suggestions on focus
            }}
            onBlur={() => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className="h-9 flex-1 rounded-full border-0 bg-transparent px-3 text-sm focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white text-gray-600 hover:bg-gray-100 flex-shrink-0"
            aria-label="搜尋"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              setShowSuggestions(false); // Hide suggestions when clicking search
              onSearch();
            }}
          >
            <SearchIcon className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 flex-shrink-0"
            aria-label="規劃路線"
            onClick={onRouteClick}
            disabled={loading}
          >
            <Route className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white text-gray-600 hover:bg-gray-100 flex-shrink-0"
            aria-label="更多選項"
            onClick={onOptionsClick}
            disabled={loading}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          {/* Autocomplete suggestions - only show when typing, not after search */}
          {showSuggestions && destinationQuery.trim() && !loading && (
            <div className="absolute top-full left-0 right-0 mt-2 z-[90]">
              <PlaceSuggestions
                suggestions={suggestions}
                onSelect={(prediction) => {
                  setShowSuggestions(false);
                  onPlaceSelect?.(prediction);
                  onDestinationChange(prediction.description);
                }}
                loading={suggestionsLoading}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

