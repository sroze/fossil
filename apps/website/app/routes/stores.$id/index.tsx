import { LoaderFunction } from '@remix-run/node';
import { loaderWithAuthorization } from '../../modules/identity-and-authorization/remix-utils.server';
import { StoreService } from '../../modules/stores/service';
import { fossilEventStore } from '../../modules/event-store/store.backend';
import { StoreState } from '../../modules/stores/store';
import { useLoaderData } from '@remix-run/react';
import { Navbar } from '../../modules/layout/organisms/Navbar';

type LoaderData = {
  store: StoreState;
};

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization(args, async ({ params }) => {
    const store = await new StoreService(fossilEventStore).load(params.id!);

    return {
      store: store.state,
    };
  });

export default function Store() {
  const { store } = useLoaderData<LoaderData>();

  return (
    <div className="relative flex min-h-full flex-col">
      {/* Navbar */}
      <Navbar />

      <div className="p-5">
        <h1>{store.name}</h1>
      </div>
    </div>
  );
}
