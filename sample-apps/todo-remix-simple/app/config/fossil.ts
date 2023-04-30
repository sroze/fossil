import { StoreApi } from 'fossil-api-client';
import axios from 'axios';

require('dotenv').config();

export const storeId = process.env.FOSSIL_STORE_ID!;
export const fossilAxiosClient = axios.create({
  headers: {
    authorization: `Bearer ${process.env.FOSSIL_MANAGEMENT_TOKEN}`,
  },
});

export const storeApi = new StoreApi(
  undefined,
  process.env.FOSSIL_API_BASE_URL,
  fossilAxiosClient
);
