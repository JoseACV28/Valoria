import { ui } from "../../i18n/runtime.js";
import { useEffect, useState } from 'react';
import { workspaceRequest } from '../../api/workspaceApi';
export function SiteNotice() {
  const [settings, setSettings] = useState(null);
  useEffect(() => { let active = true; workspaceRequest('admin/public-settings').then(data => { if (active) setSettings(data.settings); }).catch(() => {}); return () => { active = false; }; }, []);
  if (!settings?.announcement && !settings?.communityGuidelines) return null;
  return <aside aria-label={ui("Información de la comunidad")} style={{ padding: 20, borderRadius:'var(--radius-panel)', border: '1px solid var(--line-soft)', background: 'var(--bg-surface)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{settings.announcement && <p>{settings.announcement}</p>}{settings.communityGuidelines && <details><summary>{ui("Normas de la comunidad")}</summary><p>{settings.communityGuidelines}</p></details>}</aside>;
}
