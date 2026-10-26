import {
  FaAmazon,
  FaApple,
  FaBehance,
  FaBluesky,
  FaDiscord,
  FaDribbble,
  FaFacebook,
  FaFacebookMessenger,
  FaGithub,
  FaGoogle,
  FaInstagram,
  FaLine,
  FaLinkedin,
  FaMastodon,
  FaPinterest,
  FaReddit,
  FaSkype,
  FaSnapchat,
  FaSoundcloud,
  FaSpotify,
  FaTelegram,
  FaThreads,
  FaTiktok,
  FaTumblr,
  FaTwitch,
  FaViber,
  FaVimeo,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export const FOOTER_SOCIAL_ICONS: {
  name: string;
  title: string;
  Icon: IconType;
}[] = [
  { name: 'FaFacebook', title: 'Facebook', Icon: FaFacebook },
  {
    name: 'FaFacebookMessenger',
    title: 'Facebook Messenger',
    Icon: FaFacebookMessenger,
  },
  { name: 'FaInstagram', title: 'Instagram', Icon: FaInstagram },
  { name: 'FaYoutube', title: 'YouTube', Icon: FaYoutube },
  { name: 'FaWhatsapp', title: 'WhatsApp', Icon: FaWhatsapp },
  { name: 'FaTiktok', title: 'TikTok', Icon: FaTiktok },
  { name: 'FaXTwitter', title: 'X', Icon: FaXTwitter },
  { name: 'FaLinkedin', title: 'LinkedIn', Icon: FaLinkedin },
  { name: 'FaPinterest', title: 'Pinterest', Icon: FaPinterest },
  { name: 'FaTelegram', title: 'Telegram', Icon: FaTelegram },
  { name: 'FaDiscord', title: 'Discord', Icon: FaDiscord },
  { name: 'FaSnapchat', title: 'Snapchat', Icon: FaSnapchat },
  { name: 'FaReddit', title: 'Reddit', Icon: FaReddit },
  { name: 'FaViber', title: 'Viber', Icon: FaViber },
  { name: 'FaLine', title: 'LINE', Icon: FaLine },
  { name: 'FaThreads', title: 'Threads', Icon: FaThreads },
  { name: 'FaGithub', title: 'GitHub', Icon: FaGithub },
  { name: 'FaTwitch', title: 'Twitch', Icon: FaTwitch },
  { name: 'FaSpotify', title: 'Spotify', Icon: FaSpotify },
  { name: 'FaSoundcloud', title: 'SoundCloud', Icon: FaSoundcloud },
  { name: 'FaApple', title: 'Apple', Icon: FaApple },
  { name: 'FaGoogle', title: 'Google', Icon: FaGoogle },
  { name: 'FaAmazon', title: 'Amazon', Icon: FaAmazon },
  { name: 'FaSkype', title: 'Skype', Icon: FaSkype },
  { name: 'FaVimeo', title: 'Vimeo', Icon: FaVimeo },
  { name: 'FaTumblr', title: 'Tumblr', Icon: FaTumblr },
  { name: 'FaBehance', title: 'Behance', Icon: FaBehance },
  { name: 'FaDribbble', title: 'Dribbble', Icon: FaDribbble },
  { name: 'FaMastodon', title: 'Mastodon', Icon: FaMastodon },
  { name: 'FaBluesky', title: 'Bluesky', Icon: FaBluesky },
];

export const FOOTER_SOCIAL_ICON_MAP = Object.fromEntries(
  FOOTER_SOCIAL_ICONS.map(({ name, Icon }) => [name, Icon])
) as Record<string, IconType>;
