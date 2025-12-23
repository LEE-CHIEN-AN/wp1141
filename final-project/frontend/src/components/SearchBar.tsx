import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RouteFormValues } from '@/types/forms';

type SearchBarProps = {
  formValues: RouteFormValues;
  onFormChange: (name: keyof RouteFormValues, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
};

export function SearchBar({
  formValues,
  onFormChange,
  onSubmit,
  loading,
}: SearchBarProps) {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFormChange(name as keyof RouteFormValues, value);
  };

  return (
    <div className="absolute left-1/2 top-4 z-10 w-full max-w-2xl -translate-x-1/2 px-4">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-lg border bg-card/95 p-4 shadow-lg backdrop-blur-sm"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startLat" className="text-xs">
              起點緯度
            </Label>
            <Input
              id="startLat"
              type="number"
              name="startLat"
              step="0.000001"
              value={formValues.startLat}
              onChange={handleInput}
              required
              placeholder="緯度"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startLon" className="text-xs">
              起點經度
            </Label>
            <Input
              id="startLon"
              type="number"
              name="startLon"
              step="0.000001"
              value={formValues.startLon}
              onChange={handleInput}
              required
              placeholder="經度"
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="endLat" className="text-xs">
              終點緯度
            </Label>
            <Input
              id="endLat"
              type="number"
              name="endLat"
              step="0.000001"
              value={formValues.endLat}
              onChange={handleInput}
              required
              placeholder="緯度"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endLon" className="text-xs">
              終點經度
            </Label>
            <Input
              id="endLon"
              type="number"
              name="endLon"
              step="0.000001"
              value={formValues.endLon}
              onChange={handleInput}
              required
              placeholder="經度"
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="routeTime" className="text-xs">
              時間
            </Label>
            <Input
              id="routeTime"
              type="datetime-local"
              name="routeTime"
              value={formValues.routeTime}
              onChange={handleInput}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alpha" className="text-xs">
              陰影偏好 (0=距離, 1=陰影)
            </Label>
            <Input
              id="alpha"
              type="number"
              name="alpha"
              min="0"
              max="1"
              step="0.1"
              value={formValues.alpha}
              onChange={handleInput}
              required
              placeholder="0.5"
              className="h-9"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="h-9 w-full">
          <Search className="mr-2 h-4 w-4" />
          {loading ? '計算中...' : '計算路線'}
        </Button>
      </form>
    </div>
  );
}

