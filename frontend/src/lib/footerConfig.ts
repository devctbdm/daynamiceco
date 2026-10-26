export type FooterLink = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
};

export type FooterSocialLink = FooterLink & {
  icon: string;
};

export type FooterConfig = {
  enabled: boolean;
  support: {
    enabled: boolean;
    title: string;
    hours: string;
    phone: string;
    locationTitle: string;
    location: string;
  };
  about: {
    enabled: boolean;
    title: string;
    links: FooterLink[];
  };
  contact: {
    enabled: boolean;
    title: string;
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
  };
  apps: {
    enabled: boolean;
    title: string;
    googlePlayLabel: string;
    googlePlayUrl: string;
    appStoreLabel: string;
    appStoreUrl: string;
  };
  social: {
    enabled: boolean;
    links: FooterSocialLink[];
  };
  copyright: {
    text: string;
    poweredBy: boolean;
    poweredByLabel: string;
    poweredByText: string;
  };
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  enabled: true,
  support: {
    enabled: true,
    title: 'Support',
    hours: '9:00 AM - 8:00 PM',
    phone: '',
    locationTitle: 'Store Locator',
    location: 'Dhaka, Bangladesh',
  },
  about: {
    enabled: true,
    title: 'About Us',
    links: [
      'Online Delivery',
      'Refund and Returns policy',
      'Blog',
      'EMI Terms',
      'Privacy Policy',
      'Contact Us',
      'Terms and Conditions',
      'Brands',
    ].map((label, index) => ({
      id: `about-${index}`,
      label,
      url: '/',
      enabled: true,
    })),
  },
  contact: {
    enabled: true,
    title: 'Stay Connected',
    addressLabel: 'Address',
    phoneLabel: 'Phone',
    emailLabel: 'Email',
  },
  apps: {
    enabled: true,
    title: 'Get our app on your mobile',
    googlePlayLabel: 'Google Play',
    googlePlayUrl: '',
    appStoreLabel: 'App Store',
    appStoreUrl: '',
  },
  social: {
    enabled: true,
    links: [
      {
        id: 'social-whatsapp',
        label: 'WhatsApp',
        icon: 'FaWhatsapp',
        url: 'https://wa.me/',
        enabled: true,
      },
      {
        id: 'social-facebook',
        label: 'Facebook',
        icon: 'FaFacebook',
        url: 'https://www.facebook.com/',
        enabled: true,
      },
      {
        id: 'social-youtube',
        label: 'YouTube',
        icon: 'FaYoutube',
        url: 'https://www.youtube.com/',
        enabled: true,
      },
      {
        id: 'social-instagram',
        label: 'Instagram',
        icon: 'FaInstagram',
        url: 'https://www.instagram.com/',
        enabled: true,
      },
    ],
  },
  copyright: {
    text: '',
    poweredBy: true,
    poweredByLabel: 'Powered by',
    poweredByText: 'Apple IT Zone',
  },
};
