import { getAuthenticatedStoreApi } from '~/modules/stores/service';

export async function generatePlaygroundToken(storeId: string) {
  const api = await getAuthenticatedStoreApi(storeId);
  const {
    data: { token },
  } = await api.generateToken(storeId, {
    claims: {
      read: { streams: ['*'] },
      write: { streams: ['*'] },
    },
  });

  return token;
}

export async function generateManagementToken(storeId: string) {
  const api = await getAuthenticatedStoreApi(storeId);
  const {
    data: { token },
  } = await api.generateToken(storeId, {
    claims: {
      management: ['subscriptions'],
    },
  });

  return token;
}
