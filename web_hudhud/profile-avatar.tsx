import { useState } from 'react';
import { avatarSource, defaultAvatar } from './lib/account-profile';

export function ProfileAvatar({ avatar, className = 'account-avatar' }: { avatar: string; className?: string }) {
  const source = avatarSource(avatar);
  const [failedSource, setFailedSource] = useState('');
  return <img key={source} className={className} src={failedSource === source ? `/${defaultAvatar}` : source} alt="" width={88} height={88} referrerPolicy="no-referrer" onError={event => { if (failedSource === source) event.currentTarget.style.visibility = 'hidden'; else setFailedSource(source); }} />;
}
