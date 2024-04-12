import { ResolvedCoMap, useAutoSub, useJazz } from 'jazz-react';
import {
  Link,
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import { CoID } from 'cojson';
import { Brand, Post } from './sharedDataModel';
import { Button } from './components/ui/button';
import { router } from './router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { Profile } from 'cojson';
import { AccountRoot } from './dataModel';
import { ImageTagView } from './components/draftPost/ImageTagView';

type ContextType = {
  post: Post | null;
};

export function BrandHome() {
  const { me } = useJazz<Profile, AccountRoot>();
  const brandId = useParams<{ brandId: CoID<Brand> }>().brandId;
  const brand = useAutoSub(brandId);
  const [currentPage, setCurrentPage] = useState('schedule');
  const navItems = ['schedule', 'insights', 'drafts', 'preferences'];
  const [activeDraftPost, setActiveDraftPost] =
    useState<ResolvedCoMap<Post | null>>(null);
  const isMobile = true;
  let location = useLocation();

  const handleClick = (item: string) => {
    setCurrentPage(item);
    router.navigate(`/brand/${brandId}/${item}`);
  };

  const selectBrand = (brand: ResolvedCoMap<Brand>) => {
    console.log('brand', brand);
  };

  console.log('activeDraftPost', activeDraftPost);

  useEffect(() => {
    const path = location.pathname.split('/');
    setCurrentPage(path[path.length - 1]);
  }, []);

  return (
    <div className="flex flex-col-reverse lg:flex-col max-h-[100dvh]">
      <nav className="flex-none flex gap-6 px-0 py-2 lg:py-3 w-full max-w-[100vw] items-center bg-stone-950 z-10 sm:sticky sm:bottom-0 lg:mt-1">
        <h1 className="text-stone-300 pl-6 flex flex-shrink-0">
          <Link to="/" className="tracking-wider flex align-middle">
            🪴
          </Link>{' '}
          /
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">{brand?.name}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem key={`mobile-${brand}`}>
                <Link to="/">+ Add brand</Link>
              </DropdownMenuItem>
              {me.root?.brands?.map((brand) => (
                <DropdownMenuItem
                  key={`mobile-${brand}`}
                  onClick={() => selectBrand(brand)}
                >
                  {brand?.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </h1>
        {!isMobile &&
          navItems.map((item) => (
            <Button
              onClick={() => handleClick(item)}
              variant="ghost"
              key={`desktop-${item}`}
              size="sm"
            >
              {item}
            </Button>
          ))}
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">{currentPage}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {navItems?.map((item) => (
                <DropdownMenuItem
                  key={`mobile-${item}`}
                  onClick={() => handleClick(item)}
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
      <main className="flex flex-col flex-shrink min-h-0 lg:my-3 overflow-scroll">
        <Outlet context={[activeDraftPost, setActiveDraftPost]} />
        {activeDraftPost && (
          <ImageTagView
            activeDraftPost={activeDraftPost}
            setActiveDraft={setActiveDraftPost}
          />
        )}
      </main>
    </div>
  );
}

export function useActiveDraftPost() {
  return useOutletContext<ContextType>();
}
