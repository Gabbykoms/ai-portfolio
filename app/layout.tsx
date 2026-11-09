import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Gabriel Koomson — Software Engineer',description:'Projects in systems, performance, and applied AI by Gabriel Koomson.'};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
