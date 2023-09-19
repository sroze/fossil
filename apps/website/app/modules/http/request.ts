export function request<T>(
  url: string,
  options: Parameters<typeof fetch>[1]
): Promise<T> {
  return fetch(url, options)
    .then((response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }

      throw new Error(`Something went wrong.`);
    })
    .then((response) => response.json());
}
