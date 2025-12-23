import {
  Bike,
  Car,
  Footprints,
  Navigation2,
  Route,
  Train,
  X,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RouteFormValues } from '@/types/forms';

type RoutePlannerCardProps = {
  open: boolean;
  onClose: () => void;
  formValues: RouteFormValues;
  onFormChange: (name: keyof RouteFormValues, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  onOptionsClick: () => void;
};

const modeButtons = [
  { icon: Car, label: '汽車' },
  { icon: Train, label: '大眾運輸' },
  { icon: Bike, label: '自行車' },
  { icon: Footprints, label: '步行' },
];

export function RoutePlannerCard({
  open,
  onClose,
  formValues,
  onFormChange,
  onSubmit,
  loading,
  onOptionsClick,
}: RoutePlannerCardProps) {
  if (!open) return null;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFormChange(name as keyof RouteFormValues, value);
  };

  const handleSwap = () => {
    onFormChange('startLat', String(formValues.endLat));
    onFormChange('startLon', String(formValues.endLon));
    onFormChange('endLat', String(formValues.startLat));
    onFormChange('endLon', String(formValues.startLon));
  };

  return (
    <div className="absolute left-6 top-24 z-30 w-[360px] max-w-full rounded-3xl bg-white shadow-2xl">
      <form className="space-y-4 p-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">選單</p>
            <div className="flex items-center gap-2">
              {modeButtons.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    label === '步行'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-label="更多設定"
                onClick={onOptionsClick}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 rounded-2xl bg-muted/60 p-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">起點</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                name="startLat"
                value={formValues.startLat}
                onChange={handleInput}
                step="0.000001"
                placeholder="緯度"
                required
              />
              <Input
                type="number"
                name="startLon"
                value={formValues.startLon}
                onChange={handleInput}
                step="0.000001"
                placeholder="經度"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">目的地</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                name="endLat"
                value={formValues.endLat}
                onChange={handleInput}
                step="0.000001"
                placeholder="緯度"
                required
              />
              <Input
                type="number"
                name="endLon"
                value={formValues.endLon}
                onChange={handleInput}
                step="0.000001"
                placeholder="經度"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-primary"
              onClick={handleSwap}
              aria-label="交換起訖點"
            >
              <RefreshCw className="h-4 w-4" />
              交換起訖
            </button>
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={onOptionsClick}
            >
              更多選項
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border px-4 py-2">
          <div>
            <p className="text-sm font-semibold">立即出發</p>
            <p className="text-xs text-muted-foreground">可在選項中更改時間</p>
          </div>
          <Navigation2 className="h-5 w-5 text-primary" />
        </div>

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? '計算中...' : '規劃路線'}
          <Route className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

