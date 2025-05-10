import { Button } from '@/components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Brand,
  ListOfHashtagGroups,
  ListOfPosts,
  ListOfUsertagGroups,
} from '../../sharedDataModel';
import { BrandView } from './BrandView';
import { Account, Group, ID } from 'jazz-tools';
import { useAccount } from 'jazz-react';

const scopes = [
  'instagram_basic',
  'pages_show_list',
  'business_management',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_read_user_content',
  'pages_manage_ads',
  'pages_manage_posts',
  'pages_manage_engagement',
  'read_insights',
  'instagram_manage_insights',
  'ads_management',
  'instagram_content_publish',
];

export function HomePage() {
  const scheduleWorkerId = 'co_zjCnxyEB93sdMwGBHeF5xPY17H9' as ID<Account>;
  const { me } = useAccount();

  return (
    <main className="p-10 flex flex-col gap-5">
      <h1 className="text-2xl">My brands</h1>
      {/* {JSON.stringify(me.root)} */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2">
        {me.root?.brands?.map(
          (brand) =>
            brand && (
              <div className="border rounded p-4">
                <BrandView key={brand.id} brand={brand} />
              </div>
            )
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!me.root?.brands) return;
            const el = event.currentTarget;
            const brandName = el.brand.value;

            const scheduleWorker = await Account.load(scheduleWorkerId);
            if (!scheduleWorker) {
              throw new Error('scheduleWorker unavailable');
            }

            const brandGroup = Group.create({
              owner: me,
            });
            brandGroup.addMember(scheduleWorker, 'writer');

            const brand = Brand.create(
              {
                name: brandName,
                posts: ListOfPosts.create([], { owner: brandGroup }),
                hashtagGroups: ListOfHashtagGroups.create([], {
                  owner: brandGroup,
                }),
                usertagGroups: ListOfUsertagGroups.create([], {
                  owner: brandGroup,
                }),
              },
              { owner: brandGroup }
            );

            me.root?.brands.push(brand);
          }}
          className="border rounded p-4 flex flex-col gap-2"
        >
          <Input type="text" name="brand" placeholder="Brand name" />
          <Button asChild>
            <input type="submit" value="Add brand" />
          </Button>
        </form>
      </div>
      <Button
        onClick={() => {
          window.location =
            `https://www.facebook.com/v18.0/dialog/oauth?client_id=${'851322152980071'}&redirect_uri=${encodeURIComponent(
              (import.meta.env.VITE_SUCCULENT_BACKEND_ADDR ||
                'http://localhost:3331') + '/connectFB'
            )}&state=${me.id}&scope=${encodeURIComponent(
              scopes.join(',')
            )}&response_type=code` as string & Location;
        }}
        className="mr-auto"
        variant={me.root?.metaAPIConnection ? 'ghost' : 'default'}
      >
        {(me.root?.metaAPIConnection ? 'Reconnect' : 'Connect') +
          ' to Instagram/Facebook'}
      </Button>
    </main>
  );
}
