import { useEffect, useRef, useState } from 'react';
import { mascotAvatars, defaultAvatar, accountErrorMessage, type ProfileUpdate } from './lib/account-profile';
import { prepareProfilePhoto } from './lib/profile-photo';
import { ProfileAvatar } from './profile-avatar';

export function ProfileEditor({ displayName, avatarUrl, onSave, onClose }: { displayName: string; avatarUrl: string; onSave(update: ProfileUpdate): Promise<void>; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false);
  const operation = useRef(false);
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState(avatarUrl || defaultAvatar);
  const [imageBase64, setImageBase64] = useState<string>();
  const [imageChanged, setImageChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { mounted.current = false; element.close(); previous?.focus(); };
  }, []);
  async function pick(file?: File) {
    if (!file || operation.current) return;
    operation.current = true; setBusy(true); setMessage('');
    try {
      const image = await prepareProfilePhoto(file);
      if (mounted.current) { setImageBase64(image); setImageChanged(true); }
    } catch { if (mounted.current) setMessage('اختر صورة JPEG أو PNG بحجم لا يتجاوز 4 ميجابايت و16 مليون بكسل، أو اختر إحدى شخصيات هدهد.'); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  async function save() {
    if (operation.current) return;
    if (name.trim().length < 2 || name.trim().length > 120) { setMessage('أدخل اسماً من حرفين إلى 120 حرفاً.'); return; }
    operation.current = true; setBusy(true); setMessage('');
    try {
      await onSave({ displayName: name.trim(), ...(imageChanged ? imageBase64 ? { imageBase64 } : { avatarUrl: avatar } : {}) });
      if (mounted.current) onClose();
    } catch (error) { if (mounted.current) setMessage(accountErrorMessage(error)); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  return <dialog ref={dialog} className="profile-dialog" dir="rtl" aria-labelledby="profile-editor-title" onCancel={event => { event.preventDefault(); if (!operation.current) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2 id="profile-editor-title">تعديل الملف الشخصي</h2>
      {imageBase64 ? <img className="profile-avatar-large" src={`data:image/jpeg;base64,${imageBase64}`} alt="معاينة الصورة الشخصية" width={88} height={88} /> : <ProfileAvatar avatar={avatar} className="profile-avatar-large" />}
      <fieldset disabled={busy}>
        <legend>صورتك واسمك</legend>
        <div className="profile-photo-options">
          <label>اختيار صورة<input type="file" accept="image/jpeg,image/png" onChange={event => { void pick(event.target.files?.[0]); event.target.value = ''; }} /></label>
          <label>التقاط صورة<input type="file" accept="image/jpeg,image/png" capture="user" onChange={event => { void pick(event.target.files?.[0]); event.target.value = ''; }} /></label>
        </div>
        <p className="profile-hint">تتوفر الكاميرا على الأجهزة المدعومة. تُحفظ الصورة عند الضغط على «حفظ التغييرات»، وتظهر مع ملفك وتعليقاتك.</p>
        <span id="avatar-options-label">أو اختر شخصية هدهد</span>
        <div className="avatar-options" role="group" aria-labelledby="avatar-options-label">{mascotAvatars.map(option => <button key={option.value} type="button" aria-label={option.label} aria-pressed={!imageBase64 && avatar === option.value} onClick={() => { setAvatar(option.value); setImageBase64(undefined); setImageChanged(true); }}><ProfileAvatar avatar={option.value} /></button>)}</div>
        <label>الاسم<input autoComplete="name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={120} required /></label>
        <div className="detail-actions"><button type="submit" className="account-primary">حفظ التغييرات</button><button type="button" onClick={onClose}>إلغاء</button></div>
      </fieldset>
      <p role="status">{busy ? 'جارٍ تجهيز الملف الشخصي…' : message}</p>
    </form>
  </dialog>;
}
