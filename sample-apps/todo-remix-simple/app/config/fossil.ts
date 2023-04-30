import { StoreApi } from 'fossil-api-client';
import axios from 'axios';

export const storeApi = new StoreApi(
  undefined,
  process.env.FOSSIL_API_BASE_URL,
  axios.create({
    headers: {
      authorization: `Bearer ${process.env.FOSSIL_MANAGEMENT_TOKEN}`,
    },
  })
);
