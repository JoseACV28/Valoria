import { useSyncExternalStore } from 'react';
import { getLocale, subscribeLocale } from './runtime';
import App from '../App';
// Re-render without remounting forms, rich text editors or authenticated state.
export function LocaleRoot(){useSyncExternalStore(subscribeLocale,getLocale,()=> 'es');return <App/>;}
