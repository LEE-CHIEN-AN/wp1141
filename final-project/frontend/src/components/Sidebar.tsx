import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SidebarRouteStats = {
  shadowRatio: string;
  totalLength: string;
  shortestShadowRatio?: string;
  shortestTotalLength?: string;
} | null;

type SidebarProps = {
  showBuildings: boolean;
  showShadows: boolean;
  onToggleChange: (key: 'buildings' | 'shadows', value: boolean) => void;
  showShortestRoute: boolean;
  onToggleShortestRoute: (value: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  routeTime: string;
  onTimeChange: (time: string) => void;
};

export function Sidebar({
  showBuildings,
  showShadows,
  onToggleChange,
  showShortestRoute,
  onToggleShortestRoute,
  isOpen,
  onClose,
  routeTime,
  onTimeChange,
}: SidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed left-0 top-0 z-[70] h-full w-[400px] overflow-y-auto border-r bg-white shadow-2xl">
        {/* Header with proper spacing to avoid search box overlap */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 pt-20">
          <div>
            <p className="text-sm font-medium text-muted-foreground">更多選項</p>
            <h2 className="text-xl font-semibold">陰影導航設定</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="關閉選單"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 p-6 pb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">時間設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sidebar-routeTime" className="text-sm">
                  陰影時間 (當地時間)
                </Label>
                <Input
                  id="sidebar-routeTime"
                  type="datetime-local"
                  value={routeTime}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      onTimeChange(value);
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
                    
                    onTimeChange(clampedValue);
                  }}
                  className="w-full"
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
                <p className="text-xs text-muted-foreground">
                  調整時間以查看不同時段的陰影分布 (僅限 7:00 AM - 5:00 PM)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">圖層顯示</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">3D 建築物</p>
                  <p className="text-xs text-muted-foreground">顯示本地建物資料</p>
                </div>
                <Switch
                  checked={showBuildings}
                  onCheckedChange={(value) => onToggleChange('buildings', value)}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">陰影區域</p>
                  <p className="text-xs text-muted-foreground">顯示當前陰影資料</p>
                </div>
                <Switch
                  checked={showShadows}
                  onCheckedChange={(value) => onToggleChange('shadows', value)}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">最短路線</p>
                  <p className="text-xs text-muted-foreground">顯示最短距離路線（對比用）</p>
                </div>
                <Switch
                  checked={showShortestRoute}
                  onCheckedChange={onToggleShortestRoute}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">圖例</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-6 rounded-full bg-blue-500" />
                <span>陰影路段（遮蔭）</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-6 rounded-full bg-yellow-500" />
                <span>非陰影路段</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-6 border-2 border-green-500 border-dashed bg-transparent" />
                <span>最短路線（對比）</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>
    </>
  );
}

