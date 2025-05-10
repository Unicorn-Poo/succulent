import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { NavLink, useParams } from 'react-router-dom';
import { ID } from 'jazz-tools';
import { useAccount, useCoState } from 'jazz-react';
import { Brand } from './sharedDataModel';
import { LineChartIcon, RadioTowerIcon, UserIcon } from 'lucide-react';

export function Nav() {
  const { me } = useAccount();
  const { brandId } = useParams<{ brandId: ID<Brand> }>();
  const brand = useCoState(Brand, brandId);

  return (
    <nav className="relative justify-between bg-black border-t md:border-t-0 h-[3rem] overflow-y-hidden border-b border-stone-800 -mx-2 md:-mx-8 px-2 md:px-8 flex py-2 md:mb-2 gap-2 lg:gap-4">
      <div className="hidden md:block text-3xl text-stone-700 absolute left-0 right-0 top-1.5 text-center pointer-events-none">
        succulent
      </div>
      <h1 className="text-stone-300 p-1 md:p-0 flex items-center gap-2">
        {/* <NavLink to="/" className="tracking-wider flex align-middle">
          🪴
        </NavLink>
        / */}
        <DropdownMenu>
          <DropdownMenuTrigger>{brand?.name}</DropdownMenuTrigger>
          <DropdownMenuContent>
            {me.root?.brands?.map((brand, idx) => (
              <DropdownMenuItem key={brand?.id || idx} asChild>
                <NavLink
                  to={`/brand/${brand?.id}/posting/feed`}
                  className="cursor-pointer"
                >
                  {brand?.name}
                </NavLink>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem>
              <NavLink to="/">Manage brands</NavLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </h1>
      <NavLink
        className="text-sm justify-center p-2 flex gap-1 items-center text-stone-400 [&.active]:text-white hover:text-stone-200"
        to={`/brand/${brandId}/posting/feed`}
      >
        <RadioTowerIcon size="1em" /> Posting
      </NavLink>

      <DropdownMenu>
        <DropdownMenuTrigger className="text-sm justify-center p-2 flex gap-1 items-center text-stone-400 [&.active]:text-white hover:text-stone-200">
          <LineChartIcon size="1em" /> Insights
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <NavLink
              to={`/brand/${brandId}/insights/brand`}
              className="cursor-pointer"
            >
              Brand
            </NavLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <NavLink
              to={`/brand/${brandId}/insights/hashtags`}
              className="cursor-pointer"
            >
              Hashtags
            </NavLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <NavLink
              to={`/brand/${brandId}/insights/posts`}
              className="cursor-pointer"
            >
              Posts
            </NavLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="ml-auto text-sm justify-center p-2 flex gap-1 items-center text-stone-400 [&.active]:text-white hover:text-stone-200">
          <UserIcon size="1em" />{' '}
          <span className="hidden md:inline">{me.profile?.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <NavLink
              className="md:ml-auto text-sm p-2 justify-center flex gap-1 items-center text-stone-400 [&.active]:text-white hover:text-stone-200"
              to={`/brand/${brandId}/settings/preferences`}
            >
              Preferences
            </NavLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

export function LayoutWithNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 md:px-8 flex flex-col-reverse md:flex-col">
      <Nav />
      <main className="h-[calc(100dvh-3rem)] md:h-[calc(100dvh-4rem)] pt-2 md:pt-0 overflow-y-auto overscroll-contain flex flex-col gap-4">
        {children}
      </main>
    </div>
  );
}
