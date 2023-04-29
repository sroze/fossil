import { ManagementApi } from 'fossil-api-client';
import { storeApiBaseUrl } from '~/modules/api-client/config';
import axios from 'axios';

export const managementApi = new ManagementApi(
  undefined,
  storeApiBaseUrl,
  axios.create({
    headers: {
      authorization: `Bearer ${process.env.FOSSIL_MANAGEMENT_TOKEN}`,
    },
  })
);
