import { Navigation, MapPin, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { NavigationStep } from '@/utils/navigation';

type NavigationCardProps = {
  currentStep: NavigationStep | null;
  distanceToNextTurn: number;
  isNavigating: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function NavigationCard({
  currentStep,
  distanceToNextTurn,
  isNavigating,
  onStart,
  onStop,
}: NavigationCardProps) {
  const getTurnIcon = (turnType: NavigationStep['turn_type']) => {
    switch (turnType) {
      case 'left':
        return <ArrowLeft className="h-8 w-8" />;
      case 'right':
        return <ArrowRight className="h-8 w-8" />;
      case 'straight':
        return <ArrowUp className="h-8 w-8" />;
      case 'start':
        return <Navigation className="h-8 w-8" />;
      case 'arrive':
        return <MapPin className="h-8 w-8" />;
      default:
        return <ArrowUp className="h-8 w-8" />;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} 公尺`;
    }
    return `${(meters / 1000).toFixed(1)} 公里`;
  };

  if (!isNavigating) {
    return (
      <Card className="absolute bottom-4 left-1/2 z-10 w-full max-w-md -translate-x-1/2 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              準備開始導航
            </p>
            <Button onClick={onStart} className="w-full">
              <Navigation className="mr-2 h-4 w-4" />
              開始導航
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentStep) {
    return null;
  }

  return (
    <Card className="absolute bottom-4 left-1/2 z-10 w-full max-w-md -translate-x-1/2 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-primary">
            {getTurnIcon(currentStep.turn_type)}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-lg font-semibold">{currentStep.instruction}</p>
            {distanceToNextTurn > 0 && currentStep.turn_type !== 'arrive' && (
              <p className="text-sm text-muted-foreground">
                距離下一個轉彎: {formatDistance(distanceToNextTurn)}
              </p>
            )}
            {currentStep.turn_type === 'arrive' && (
              <p className="text-sm font-medium text-green-600">
                已抵達目的地
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onStop}
            className="flex-shrink-0"
            aria-label="停止導航"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

