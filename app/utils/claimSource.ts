import { ClaimSource } from '@/types/types';

export function getIconAndName(claimSrc: ClaimSource) {
  switch (claimSrc) {
    case ClaimSource.FACEBOOK:
      return { icon: '/fb.png', name: 'Facebook' };
    case ClaimSource.X:
      return { icon: '/x.png', name: 'X' };
    case ClaimSource.TIKTOK:
      return { icon: '/fb.png', name: 'TikTok' };
    case ClaimSource.INSTAGRAM:
      return { icon: '/fb.png', name: 'Instagram' };
    case ClaimSource.REDDIT:
      return { icon: '/fb.png', name: 'Reddit' };
    case ClaimSource.WEBPAGE:
      return { icon: '/search_gray.svg', name: 'Web' };
    case ClaimSource.WHATSAPP:
      return { icon: '/platform-logos/whatsapp.png', name: 'WhatsApp' };
    case ClaimSource.TELEGRAM:
      return { icon: '/platform-logos/telegram.png', name: 'Telegram' };
    case ClaimSource.SIGNAL:
      return { icon: '/platform-logos/signal.png', name: 'Signal' };
    default:
      return { icon: '/search_gray.svg', name: 'Other' };
  }
}
