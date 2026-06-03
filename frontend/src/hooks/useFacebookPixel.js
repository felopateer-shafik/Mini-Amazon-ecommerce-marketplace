import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  initFacebookPixel,
  isFacebookPixelReady,
  trackFacebookPageView,
} from "@/lib/facebookPixel";

export function useFacebookPixel(settings) {
  const location = useLocation();

  useEffect(() => {
    initFacebookPixel(settings);
  }, [settings?.facebook_pixel_enabled, settings?.facebook_pixel_id]);

  useEffect(() => {
    if (!isFacebookPixelReady()) return;
    trackFacebookPageView();
  }, [location.pathname, location.search]);
}
