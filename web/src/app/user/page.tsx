import { redirect } from 'next/navigation';

export default function UserPageRedirect() {
    redirect('/user/main');
}
