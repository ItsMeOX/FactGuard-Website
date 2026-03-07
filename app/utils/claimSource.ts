import { ClaimSource } from '@/types/types';

export function getIconAndName(claimSrc: ClaimSource) {
  switch (claimSrc) {
    case ClaimSource.FACEBOOK:
      return { icon: '/fb.png', name: 'Facebook' };
    case ClaimSource.X:
      return { icon: '/x.png', name: 'X' };
    case ClaimSource.TIKTOK:
      return { icon: '/tiktok.png', name: 'TikTok' };
    case ClaimSource.INSTAGRAM:
      return { icon: '/instagram.png', name: 'Instagram' };
    case ClaimSource.REDDIT:
      return { icon: '/reddit.png', name: 'Reddit' };
    case ClaimSource.WEBPAGE:
      return { icon: '/search_gray.svg', name: 'Web' };
    case ClaimSource.WHATSAPP:
      return { icon: '/whatsapp.jpg', name: 'WhatsApp' };
    case ClaimSource.TELEGRAM:
      return { icon: '/telegram.jpg', name: 'Telegram' };
    case ClaimSource.SIGNAL:
      return { icon: '/signal.png', name: 'Signal' };
    default:
      return { icon: '/search_gray.svg', name: 'Other' };
  }
}
