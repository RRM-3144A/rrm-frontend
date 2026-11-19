import {redirect} from 'next/navigation';

/** The app starts at the sign-in page. */
export default function HomePage() {
  redirect('/conectare');
}
