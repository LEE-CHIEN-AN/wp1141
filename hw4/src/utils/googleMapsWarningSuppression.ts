/**
 * Google Maps API 棄用警告抑制工具
 * 暫時抑制 Google Maps 的棄用警告，直到遷移到新 API
 */

// 保存原始的 console.warn
const originalConsoleWarn = console.warn;

// 抑制 Google Maps 棄用警告
export const suppressGoogleMapsDeprecationWarnings = () => {
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('AutocompleteService') || 
         message.includes('PlacesService') || 
         message.includes('Marker') ||
         message.includes('google.maps.places.AutocompleteService') ||
         message.includes('google.maps.places.PlacesService') ||
         message.includes('google.maps.Marker'))) {
      // 抑制 Google Maps 棄用警告
      return;
    }
    originalConsoleWarn(...args);
  };
};

// 恢復原始的 console.warn
export const restoreConsoleWarn = () => {
  console.warn = originalConsoleWarn;
};

// 自動抑制警告（在應用啟動時調用）
export const initGoogleMapsWarningSuppression = () => {
  suppressGoogleMapsDeprecationWarnings();
  
  // 在組件卸載時恢復
  return () => {
    restoreConsoleWarn();
  };
};
