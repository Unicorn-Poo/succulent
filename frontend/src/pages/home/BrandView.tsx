import { Brand } from '@/sharedDataModel';
import { InviteButton } from '../../components/InviteButton';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { useAccount } from 'jazz-react';
import { filterAndSortScheduledAndPostedPosts } from '@/lib/filterAndSortPosts';
import { ProgressiveImg } from 'jazz-react';
import { InstagramIcon, TrashIcon } from 'lucide-react';

export function BrandView({ brand }: { brand: Brand }) {
  const { me } = useAccount();

  const [pagesToChoose, setPagesToChoose] = useState<
    { name: string; instagram_business_account: { id: string } }[]
  >([]);

  const previewPosts =
    brand.posts && filterAndSortScheduledAndPostedPosts(brand.posts);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap  items-center mb-2">
        <h1 className="text-2xl">{brand.name} </h1>
        {brand.instagramPage && (
          <>
            <InstagramIcon size="1.2em" /> {brand.instagramPage.name}{' '}
          </>
        )}
        {!brand.metaAPIConnection?.isValid() &&
          me.root?.metaAPIConnection?.isValid() && (
            <Button
              onClick={() => {
                if (!me.root?.metaAPIConnection) return;
                // TODO: actually share with whole group of brand!
                brand.metaAPIConnection = me.root.metaAPIConnection;
              }}
            >
              Control with your account
            </Button>
          )}
        <div className="ml-auto">
          <InviteButton value={brand} />
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm('Really delete ' + brand.name + '?')) {
              const idx = me.root?.brands?.findIndex((b) => b?.id === brand.id);
              typeof idx === 'number' &&
                idx !== -1 &&
                me.root?.brands?.splice(idx, 1);
            }
          }}
        >
          <TrashIcon size="1.2em" />
        </Button>
      </div>
      {brand.metaAPIConnection &&
        !brand.instagramPage &&
        pagesToChoose.length === 0 && (
          <Button
            onClick={async () => {
              const pages = await (
                await fetch(
                  `https://graph.facebook.com/v11.0/me/accounts?fields=instagram_business_account,name&access_token=${brand.metaAPIConnection?.longLivedToken}`
                )
              ).json();
              setPagesToChoose(pages.data);
            }}
          >
            Choose Instagram Page ID
          </Button>
        )}
      {pagesToChoose.length > 0 && (
        <div>
          Choose an Instagram page:
          {pagesToChoose.map((page) =>
            page.instagram_business_account ? (
              <Button
                key={page.instagram_business_account.id}
                onClick={() => {
                  brand.instagramPage = {
                    id: page.instagram_business_account.id,
                    name: page.name,
                  };
                  setPagesToChoose([]);
                }}
              >
                {page.name} ({page.instagram_business_account.id})
              </Button>
            ) : null
          )}
        </div>
      )}
      {/* <div>
        IG Access Token{' '}
        {brand.metaAPIConnection &&
          brand.metaAPIConnection?.longLivedToken +
            '(expires : ' +
            new Date(brand.metaAPIConnection.validUntil).toLocaleString() +
            ')'}
      </div> */}

      <Link to={`/brand/${brand.id}/posting/feed`}>
        <div className="rounded grid grid-cols-3 gap-px w-full overflow-hidden">
          {Array.from({ length: 9 }, (_, i) => previewPosts?.[i]).map(
            (post, i) => (
              <ProgressiveImg
                key={post?.id || i}
                image={post?.images?.[0]?.imageFile}
                maxWidth={256}
              >
                {({ src }) =>
                  src ? (
                    <img
                      className="block w-full aspect-square object-cover"
                      src={src}
                    />
                  ) : (
                    <div className="block w-full aspect-square bg-neutral-800" />
                  )
                }
              </ProgressiveImg>
            )
          )}
        </div>
      </Link>
      <div className="flex gap-2">
        <Button asChild>
          <Link className="flex-1" to={`/brand/${brand.id}/posting/feed`}>
            Posting
          </Link>
        </Button>
        <Button asChild>
          <Link className="flex-1" to={`/brand/${brand.id}/insights/brand`}>
            Insights
          </Link>
        </Button>
      </div>
    </div>
  );
}
