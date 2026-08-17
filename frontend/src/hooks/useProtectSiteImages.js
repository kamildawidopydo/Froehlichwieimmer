import { useEffect } from 'react';
import { installSiteImageProtection } from '@/lib/imageProtect';

export function useProtectSiteImages() {
  useEffect(() => installSiteImageProtection(), []);
}

export default useProtectSiteImages;
