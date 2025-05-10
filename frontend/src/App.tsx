import { RouterProvider } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import { router } from './router';
import { Brand } from './sharedDataModel';
import { useAccount, useAcceptInvite } from 'jazz-react';
function App() {
  const { me } = useAccount({ resolve: { root: { brands: true } } });

  useAcceptInvite<Brand>({
    invitedObjectSchema: Brand,
    onAccept: async (brandID) => {
      if (!me) return;
      const brand = await Brand.load(brandID);

      if (!brand) {
        console.log('Failed to accept invite');
        return;
      }

      me.root.brands?.push(brand);
      router.navigate('/');
    },
  });

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
