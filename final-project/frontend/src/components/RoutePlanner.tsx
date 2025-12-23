import { useState, useRef, useEffect } from 'react';
import {
  Navigation2,
  Route,
  RefreshCw,
  MapPin,
  Search,
  ChevronLeft,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PlaceSuggestions } from './PlaceSuggestions';
import type { PlacePrediction } from '@/utils/places';
import type { RouteFormValues } from '@/types/forms';
import type { SidebarRouteStats } from './Sidebar';

type RoutePlannerProps = {
  isOpen: boolean;
  onClose: () => void;
  originQuery: string;
  destinationQuery: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onOriginSelect?: (prediction: PlacePrediction) => void;
  onDestinationSelect?: (prediction: PlacePrediction) => void;
  originSuggestions?: PlacePrediction[];
  destinationSuggestions?: PlacePrediction[];
  originSuggestionsLoading?: boolean;
  destinationSuggestionsLoading?: boolean;
  onSwap: () => void;
  onSubmit: () => void;
  loading?: boolean;
  onCancel?: () => void;
  showShortestRoute?: boolean;
  onToggleShortestRoute?: (value: boolean) => void;
  formValues: RouteFormValues;
  onFormChange: (name: keyof RouteFormValues, value: string) => void;
  routeStats?: SidebarRouteStats;
  error?: string | null;
  showExampleHint?: boolean;
  onDismissExampleHint?: () => void;
};

export function RoutePlanner({
  isOpen,
  onClose,
  originQuery,
  destinationQuery,
  onOriginChange,
  onDestinationChange,
  onOriginSelect,
  onDestinationSelect,
  originSuggestions = [],
  destinationSuggestions = [],
  originSuggestionsLoading = false,
  destinationSuggestionsLoading = false,
  onSwap,
  onSubmit,
  loading = false,
  onCancel,
  showShortestRoute = false,
  onToggleShortestRoute,
  formValues,
  onFormChange,
  routeStats,
  error,
  showExampleHint = false,
  onDismissExampleHint,
}: RoutePlannerProps) {
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss example hint after 5 seconds
  useEffect(() => {
    if (showExampleHint && onDismissExampleHint) {
      const timer = setTimeout(() => {
        onDismissExampleHint();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showExampleHint, onDismissExampleHint]);

  if (!isOpen) return null;

  const handleOriginFocus = () => {
    setShowOriginSuggestions(true);
    setShowDestinationSuggestions(false);
  };

  const handleDestinationFocus = () => {
    setShowDestinationSuggestions(true);
    setShowOriginSuggestions(false);
  };

  const handleOriginBlur = () => {
    setTimeout(() => setShowOriginSuggestions(false), 200);
  };

  const handleDestinationBlur = () => {
    setTimeout(() => setShowDestinationSuggestions(false), 200);
  };

  const handleOriginSelect = (prediction: PlacePrediction) => {
    setShowOriginSuggestions(false);
    onOriginSelect?.(prediction);
    onOriginChange(prediction.description);
  };

  const handleDestinationSelect = (prediction: PlacePrediction) => {
    setShowDestinationSuggestions(false);
    onDestinationSelect?.(prediction);
    onDestinationChange(prediction.description);
  };

  // Get button container ref to position hint at same level
  const submitButtonContainerRef = useRef<HTMLDivElement>(null);
  const [buttonTop, setButtonTop] = useState<number | null>(null);

  useEffect(() => {
    if (showExampleHint && submitButtonContainerRef.current) {
      const updatePosition = () => {
        const rect = submitButtonContainerRef.current?.getBoundingClientRect();
        if (rect) {
          // Position hint at the center of the button container vertically
          setButtonTop(rect.top + rect.height / 2);
        }
      };
      updatePosition();
      // Update on next frame to ensure layout is complete
      requestAnimationFrame(updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showExampleHint, isOpen]);

  return (
    <>
      <aside className="fixed left-0 top-0 z-[50] h-full w-[400px] flex flex-col border-r bg-white shadow-2xl">
        {/* Hint positioned outside sidebar, at same level as button */}
        {showExampleHint && buttonTop !== null && (
          <div 
            className="fixed left-[400px] z-[60] animate-fade-in ml-2"
            style={{ top: `${buttonTop}px`, transform: 'translateY(-50%)' }}
          >
            <div className="bg-white rounded-full shadow-2xl px-6 py-4 w-[320px] border-2 border-blue-500">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <Navigation2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 mb-1 whitespace-normal">
                    點擊按鈕查看路線
                  </p>
                  <p className="text-xs text-gray-600 whitespace-normal">
                    我們已經為您準備好起點和終點
                  </p>
                </div>
                <button
                  onClick={onDismissExampleHint}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Header with title and close button */}
        <div className="relative flex-shrink-0">
          <div className="px-4 py-3">
            <h2 className="text-lg font-bold text-gray-900">路線設定</h2>
          </div>
          {/* Divider with close button */}
          <div className="relative border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50 transition-colors"
              aria-label="關閉"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Input fields section */}
        <div className="p-3 flex-shrink-0 border-b">
          {/* Origin input */}
          <div className="relative mb-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <Input
              ref={originInputRef}
              type="text"
              placeholder="選擇起點或點擊地圖..."
              value={originQuery}
              onChange={(e) => {
                onOriginChange(e.target.value);
                setShowOriginSuggestions(true);
              }}
              onFocus={handleOriginFocus}
              onBlur={handleOriginBlur}
              className="flex-1 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
              disabled={loading}
            />
            {originQuery && (
              <button
                type="button"
                onClick={() => {
                  onOriginChange('');
                  setShowOriginSuggestions(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {showOriginSuggestions && originQuery.trim() && !loading && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[90]">
              <PlaceSuggestions
                suggestions={originSuggestions}
                onSelect={handleOriginSelect}
                loading={originSuggestionsLoading}
              />
            </div>
          )}
        </div>

        {/* Destination input */}
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <Input
              ref={destinationInputRef}
              type="text"
              placeholder="選擇目的地..."
              value={destinationQuery}
              onChange={(e) => {
                onDestinationChange(e.target.value);
                setShowDestinationSuggestions(true);
              }}
              onFocus={handleDestinationFocus}
              onBlur={handleDestinationBlur}
              className="flex-1 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
              disabled={loading}
            />
            {destinationQuery && (
              <button
                type="button"
                onClick={() => {
                  onDestinationChange('');
                  setShowDestinationSuggestions(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {showDestinationSuggestions && destinationQuery.trim() && !loading && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[90]">
              <PlaceSuggestions
                suggestions={destinationSuggestions}
                onSelect={handleDestinationSelect}
                loading={destinationSuggestionsLoading}
              />
            </div>
          )}
        </div>

        {/* Swap button */}
        {(originQuery || destinationQuery) && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onSwap}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              交換起訖
            </button>
          </div>
        )}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
        {/* Selected locations display */}
        {originQuery && (
          <div className="p-3 border-b">
            <div className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">你的位置</p>
                <p className="text-xs text-gray-600">{originQuery}</p>
              </div>
            </div>
          </div>
        )}

        {destinationQuery && (
          <div className="p-3 border-b">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{destinationQuery}</p>
              </div>
            </div>
          </div>
        )}

        {/* Route Information */}
        {routeStats && (
          <div className="p-3 border-t">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-center">路線資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center text-3xl font-bold text-blue-500">
                  {routeStats.shadowRatio ?? '-'}%
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">總長度</dt>
                    <dd className="font-medium">{routeStats.totalLength}</dd>
                  </div>
                </dl>
                
                {/* Comparison notice */}
                {routeStats.shortestShadowRatio && (() => {
                  // Show loading message if still computing
                  if (routeStats.shortestShadowRatio === '計算中') {
                    return (
                      <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                        正在計算增加的陰影路段比例...
                      </div>
                    );
                  }
                  
                  const shadowRatio = parseFloat(routeStats.shadowRatio);
                  const shortestRatio = parseFloat(routeStats.shortestShadowRatio);
                  
                  // Check if parsing was successful
                  if (isNaN(shortestRatio)) {
                    return null;
                  }
                  
                  const improvement = shadowRatio - shortestRatio;
                  
                  if (improvement > 0) {
                    return (
                      <div className="text-xs text-center text-blue-500 pt-2 border-t">
                        哦耶～我們的路線增加了 {improvement.toFixed(1)}% 的蔭涼路段！
                      </div>
                    );
                  } else {
                    // If shadow route doesn't improve (improvement <= 0), show neutral message
                    // Never show "最短路線的蔭涼路段多 xxx%"
                    return (
                      <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                        與最短路徑的蔭涼路段比例相近
                      </div>
                    );
                  }
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 border-t">
            <Card className="border-destructive/30 bg-destructive/10 text-destructive">
              <CardContent className="p-4 text-sm">{error}</CardContent>
            </Card>
          </div>
        )}

        {/* Time and Weight Settings */}
        <div className="border-t">
          <div className="p-3 space-y-2">
            <Label htmlFor="routeTime" className="text-xs">行走時間 (當地時間)</Label>
            <Input
              id="routeTime"
              type="datetime-local"
              name="routeTime"
              value={formValues.routeTime}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  onFormChange('routeTime', value);
                  return;
                }
                
                // Parse the datetime value
                const dateTime = new Date(value);
                const hours = dateTime.getHours();
                const minutes = dateTime.getMinutes();
                
                // Clamp time between 7:00 AM and 5:00 PM
                let clampedValue = value;
                if (hours < 7) {
                  // Before 7:00 AM, set to 7:00 AM
                  const dateStr = value.split('T')[0];
                  clampedValue = `${dateStr}T07:00`;
                } else if (hours > 17 || (hours === 17 && minutes > 0)) {
                  // After 5:00 PM, set to 5:00 PM
                  const dateStr = value.split('T')[0];
                  clampedValue = `${dateStr}T17:00`;
                }
                
                onFormChange('routeTime', clampedValue);
              }}
              required
              className="text-sm"
              min={(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}T07:00`;
              })()}
              max={(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}T17:00`;
              })()}
            />
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-200" />
          
          {/* Shortest route toggle */}
          {onToggleShortestRoute && (
            <div className="p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="showShortestRoute" className="text-sm font-medium text-gray-900">
                  最短路線
                </Label>
                <span className="text-xs text-gray-500 mt-0.5">
                  顯示最短距離路線 (對比用)
                </span>
              </div>
              <Switch
                id="showShortestRoute"
                checked={showShortestRoute}
                onCheckedChange={onToggleShortestRoute}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          )}
          
          {/* Divider */}
          <div className="border-t border-gray-200" />
          
          <div className="p-3 space-y-2">
            <Label htmlFor="alpha" className="text-xs">陰影偏好 (Alpha: 0=距離, 1=陰影)</Label>
            <Input
              id="alpha"
              type="number"
              name="alpha"
              min="0"
              max="1"
              step="0.1"
              value={formValues.alpha}
              onChange={(e) => onFormChange('alpha', e.target.value)}
              required
              className="text-sm"
            />
          </div>
        </div>

        {/* Submit button */}
        <div ref={submitButtonContainerRef} className="p-3 border-t">
          {loading && onCancel ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                onClick={onCancel}
              >
                取消計算
                <X className="ml-2 h-4 w-4" />
              </Button>
              <Button
                type="button"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                disabled
              >
                計算中
                <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              onClick={onSubmit}
              disabled={loading || !originQuery.trim() || !destinationQuery.trim()}
            >
              {loading ? '計算中' : '規劃路線'}
              <Navigation2 className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        </div>
      </aside>
    </>
  );
}

